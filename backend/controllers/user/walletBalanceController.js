const pool = require("../../config/db");
const {
  getUserBalance,
} = require("../../services/internalWalletService");

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

// =========================
// User - Get My Internal Wallet Balance
// GET /api/users/wallet-balance
// =========================
const getMyWalletBalance = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;

    const [userRows] = await connection.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
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

    return res.status(200).json({
      success: true,
      message: "Lấy số dư ví nội bộ thành công",
      data: {
        user: userRows[0],
        balance,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy số dư ví nội bộ",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// User - Get My Internal Wallet Transactions
// GET /api/users/wallet-transactions
// =========================
const getMyWalletTransactions = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const transactionType = normalizeString(req.query.transaction_type || "");
    const referenceType = normalizeString(req.query.reference_type || "");

    const whereClauses = ["wt.user_id = ?"];
    const values = [userId];

    if (transactionType) {
      whereClauses.push("wt.transaction_type = ?");
      values.push(transactionType);
    }

    if (referenceType) {
      whereClauses.push("wt.reference_type = ?");
      values.push(referenceType);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM wallet_transactions wt
      WHERE ${whereSql}
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT
        wt.id,
        wt.transaction_code,
        wt.user_id,
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
      WHERE ${whereSql}
      ORDER BY wt.created_at DESC, wt.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy lịch sử giao dịch ví nội bộ thành công",
      data: rows,
      meta: {
        page,
        limit,
        total: countRows[0].total,
        total_pages: Math.ceil(countRows[0].total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy lịch sử ví nội bộ",
      error: err.message,
    });
  }
};

module.exports = {
  getMyWalletBalance,
  getMyWalletTransactions,
};