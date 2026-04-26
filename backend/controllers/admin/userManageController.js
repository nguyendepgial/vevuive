const pool = require("../../config/db");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

const allowedStatuses = ["active", "inactive"];
const allowedRoles = ["customer", "admin"];

// =========================
// Admin - Get Users
// GET /api/admin/manage/users
// =========================
const getManageUsers = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const search = normalizeString(req.query.search || "");
    const role = normalizeString(req.query.role || "");
    const status = normalizeString(req.query.status || "");

    const whereClauses = [];
    const values = [];

    if (search) {
      whereClauses.push(`
        (
          u.full_name LIKE ?
          OR u.email LIKE ?
          OR u.phone LIKE ?
          OR w.wallet_address LIKE ?
        )
      `);

      values.push(
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
      );
    }

    if (role) {
      whereClauses.push("u.role = ?");
      values.push(role);
    }

    if (status) {
      whereClauses.push("u.status = ?");
      values.push(status);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [countRows] = await pool.query(
      `
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      ${whereSql}
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.created_at,
        u.updated_at,

        w.wallet_address,
        w.wallet_type,
        w.network_name,
        w.is_verified,
        w.linked_at,

        COALESCE(ub.balance, 0) AS balance,
        COALESCE(ub.currency, 'VND') AS currency,

        COUNT(DISTINCT t.id) AS owned_ticket_count,
        COUNT(DISTINCT CASE WHEN t.ticket_status = 'active' THEN t.id END) AS active_ticket_count,

        COUNT(DISTINCT o.id) AS order_count,
        COALESCE(SUM(DISTINCT CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) AS total_paid_amount,

        COUNT(DISTINCT tl.id) AS listing_count,
        COUNT(DISTINCT CASE WHEN tl.status = 'sold' THEN tl.id END) AS sold_listing_count
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      LEFT JOIN user_balances ub ON ub.user_id = u.id
      LEFT JOIN tickets t ON t.owner_user_id = u.id
      LEFT JOIN orders o ON o.user_id = u.id
      LEFT JOIN ticket_listings tl ON tl.seller_user_id = u.id
      ${whereSql}
      GROUP BY u.id
      ORDER BY u.created_at DESC, u.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách người dùng thành công",
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
      message: "Lỗi server khi lấy danh sách người dùng",
      error: err.message,
    });
  }
};

// =========================
// Admin - Get User Detail
// GET /api/admin/manage/users/:id
// =========================
const getManageUserDetail = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.id);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ID người dùng không hợp lệ",
      });
    }

    const [userRows] = await pool.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.status,
        u.created_at,
        u.updated_at,

        w.wallet_address,
        w.wallet_type,
        w.network_name,
        w.is_verified,
        w.linked_at,

        COALESCE(ub.balance, 0) AS balance,
        COALESCE(ub.currency, 'VND') AS currency
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      LEFT JOIN user_balances ub ON ub.user_id = u.id
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

    const [summaryRows] = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM orders WHERE user_id = ?) AS order_count,
        (SELECT COUNT(*) FROM orders WHERE user_id = ? AND payment_status = 'paid') AS paid_order_count,
        COALESCE((SELECT SUM(total_amount) FROM orders WHERE user_id = ? AND payment_status = 'paid'), 0) AS total_paid_amount,

        (SELECT COUNT(*) FROM tickets WHERE owner_user_id = ?) AS owned_ticket_count,
        (SELECT COUNT(*) FROM tickets WHERE owner_user_id = ? AND ticket_status = 'active') AS active_ticket_count,
        (SELECT COUNT(*) FROM tickets WHERE owner_user_id = ? AND ticket_status = 'used') AS used_ticket_count,

        (SELECT COUNT(*) FROM ticket_transfers WHERE from_user_id = ?) AS sent_transfer_count,
        (SELECT COUNT(*) FROM ticket_transfers WHERE to_user_id = ?) AS received_transfer_count,

        (SELECT COUNT(*) FROM ticket_listings WHERE seller_user_id = ?) AS listing_count,
        (SELECT COUNT(*) FROM ticket_listings WHERE seller_user_id = ? AND status = 'sold') AS sold_listing_count,

        (SELECT COUNT(*) FROM wallet_topup_requests WHERE user_id = ?) AS topup_request_count,
        (SELECT COUNT(*) FROM wallet_topup_requests WHERE user_id = ? AND status = 'approved') AS approved_topup_count,
        COALESCE((SELECT SUM(amount) FROM wallet_topup_requests WHERE user_id = ? AND status = 'approved'), 0) AS total_topup_amount
      `,
      [
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
      ]
    );

    const [orderRows] = await pool.query(
      `
      SELECT
        id,
        order_code,
        total_amount,
        payment_status,
        order_status,
        payment_method,
        created_at,
        updated_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 8
      `,
      [userId]
    );

    const [ticketRows] = await pool.query(
      `
      SELECT
        t.id,
        t.ticket_code,
        t.order_id,
        o.order_code,
        t.event_id,
        e.title AS event_title,
        e.event_date,
        t.ticket_type_id,
        tt.name AS ticket_type_name,
        t.owner_wallet_address,
        t.unit_price,
        t.ticket_status,
        t.mint_status,
        t.transferred_count,
        t.created_at
      FROM tickets t
      LEFT JOIN orders o ON o.id = t.order_id
      LEFT JOIN events e ON e.id = t.event_id
      LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
      WHERE t.owner_user_id = ?
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT 8
      `,
      [userId]
    );

    const [walletTransactionRows] = await pool.query(
      `
      SELECT
        id,
        transaction_code,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        currency,
        reference_type,
        reference_id,
        status,
        note,
        created_at
      FROM wallet_transactions
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 10
      `,
      [userId]
    );

    const [topupRows] = await pool.query(
      `
      SELECT
        id,
        topup_code,
        amount,
        currency,
        payment_method,
        transfer_content,
        status,
        admin_note,
        requested_at,
        submitted_at,
        approved_at,
        rejected_at,
        cancelled_at
      FROM wallet_topup_requests
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 8
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết người dùng thành công",
      data: {
        user: userRows[0],
        summary: summaryRows[0],
        orders: orderRows,
        tickets: ticketRows,
        wallet_transactions: walletTransactionRows,
        topup_requests: topupRows,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết người dùng",
      error: err.message,
    });
  }
};

// =========================
// Admin - Update User Status
// PUT /api/admin/manage/users/:id/status
// =========================
const updateManageUserStatus = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = parsePositiveInt(req.params.id);
    const status = normalizeString(req.body.status || "");

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "ID người dùng không hợp lệ",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái người dùng không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const [userRows] = await connection.query(
      `
      SELECT id, full_name, email, role, status
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

    const targetUser = userRows[0];

    if (targetUser.role === "admin" && status !== "active") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Không nên khóa tài khoản admin từ màn hình này",
      });
    }

    await connection.query(
      `
      UPDATE users
      SET status = ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [status, userId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái người dùng thành công",
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật trạng thái người dùng",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getManageUsers,
  getManageUserDetail,
  updateManageUserStatus,
};