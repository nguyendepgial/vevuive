const pool = require("../../config/db");
const {
  getUserBalance,
  creditBalance,
} = require("../../services/internalWalletService");

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function parsePositiveNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed <= 0 ? null : Number(parsed.toFixed(2));
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

// =========================
// Admin - Get User Balances
// GET /api/admin/wallet-balances
// =========================
const getUserBalances = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = normalizeString(req.query.search || "");

    const whereClauses = ["u.role = 'customer'"];
    const values = [];

    if (search) {
      whereClauses.push(
        "(u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)"
      );
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM users u
      WHERE ${whereSql}
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT
        u.id AS user_id,
        u.full_name,
        u.email,
        u.phone,
        u.status AS user_status,
        COALESCE(ub.balance, 0.00) AS balance,
        COALESCE(ub.currency, 'VND') AS currency,
        ub.updated_at AS balance_updated_at,
        w.wallet_address,
        w.network_name,
        w.is_verified
      FROM users u
      LEFT JOIN user_balances ub ON ub.user_id = u.id
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE ${whereSql}
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách ví nội bộ thành công",
      data: rows,
      pagination: {
        page,
        limit,
        total: countRows[0].total,
        total_pages: Math.ceil(countRows[0].total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách ví nội bộ",
      error: err.message,
    });
  }
};

// =========================
// Admin - Get User Balance Detail
// GET /api/admin/wallet-balances/:userId
// =========================
const getUserBalanceDetail = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = parsePositiveInt(req.params.userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId không hợp lệ",
      });
    }

    const [userRows] = await connection.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.status,
        w.wallet_address,
        w.wallet_type,
        w.network_name,
        w.is_verified,
        w.linked_at
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    const balance = await getUserBalance(connection, userId, false);

    const [transactionRows] = await connection.query(
      `
      SELECT
        wt.id,
        wt.transaction_code,
        wt.transaction_type,
        wt.amount,
        wt.balance_before,
        wt.balance_after,
        wt.currency,
        wt.reference_type,
        wt.reference_id,
        wt.status,
        wt.note,
        wt.created_by_admin_id,
        admin.full_name AS created_by_admin_name,
        wt.created_at
      FROM wallet_transactions wt
      LEFT JOIN users admin ON admin.id = wt.created_by_admin_id
      WHERE wt.user_id = ?
      ORDER BY wt.created_at DESC, wt.id DESC
      LIMIT 50
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết ví nội bộ thành công",
      data: {
        user: userRows[0],
        balance,
        transactions: transactionRows,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết ví nội bộ",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// Admin - Topup User Balance
// POST /api/admin/wallet-balances/topup
// body: { user_id, amount, note }
// =========================
const topupUserBalance = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const adminId = req.user.id;

    const userId = parsePositiveInt(req.body.user_id);
    const amount = parsePositiveNumber(req.body.amount);
    const note = normalizeString(req.body.note || "Admin nạp tiền demo");

    const errors = {};

    if (!userId) {
      errors.user_id = "user_id không hợp lệ";
    }

    if (!amount) {
      errors.amount = "Số tiền nạp không hợp lệ";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu nạp tiền không hợp lệ",
        errors,
      });
    }

    await connection.beginTransaction();

    const [userRows] = await connection.query(
      `
      SELECT
        id,
        full_name,
        email,
        role,
        status
      FROM users
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [userId]
    );

    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    const user = userRows[0];

    if (user.role !== "customer") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ được nạp tiền cho tài khoản khách hàng",
      });
    }

    if (user.status !== "active") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Tài khoản khách hàng hiện không hoạt động",
      });
    }

    const transaction = await creditBalance(connection, {
      userId,
      amount,
      transactionType: "topup",
      referenceType: "manual",
      referenceId: null,
      note,
      adminId,
    });

    const balance = await getUserBalance(connection, userId, false);

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Nạp tiền ví nội bộ thành công",
      data: {
        user,
        balance,
        transaction,
      },
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi nạp tiền ví nội bộ",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getUserBalances,
  getUserBalanceDetail,
  topupUserBalance,
};