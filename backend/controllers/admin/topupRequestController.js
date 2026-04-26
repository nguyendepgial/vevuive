const pool = require("../../config/db");
const {
  creditBalance,
} = require("../../services/internalWalletService");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

// =========================
// Admin - Get Topup Requests
// GET /api/admin/topup-requests
// =========================
const getTopupRequests = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const status = normalizeString(req.query.status || "");
    const search = normalizeString(req.query.search || "");

    const whereClauses = [];
    const values = [];

    if (status) {
      whereClauses.push("wtr.status = ?");
      values.push(status);
    }

    if (search) {
      whereClauses.push(
        "(wtr.topup_code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)"
      );
      values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM wallet_topup_requests wtr
      INNER JOIN users u ON u.id = wtr.user_id
      ${whereSql}
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT
        wtr.id,
        wtr.topup_code,
        wtr.user_id,
        u.full_name,
        u.email,
        u.phone,
        wtr.amount,
        wtr.currency,
        wtr.payment_method,
        wtr.transfer_content,
        wtr.payment_note,
        wtr.proof_image_url,
        wtr.status,
        wtr.admin_id,
        admin.full_name AS admin_name,
        wtr.admin_note,
        wtr.wallet_transaction_id,
        wtr.requested_at,
        wtr.submitted_at,
        wtr.approved_at,
        wtr.rejected_at,
        wtr.cancelled_at,
        wtr.created_at,
        wtr.updated_at
      FROM wallet_topup_requests wtr
      INNER JOIN users u ON u.id = wtr.user_id
      LEFT JOIN users admin ON admin.id = wtr.admin_id
      ${whereSql}
      ORDER BY wtr.created_at DESC, wtr.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách yêu cầu nạp tiền thành công",
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
      message: "Lỗi server khi lấy yêu cầu nạp tiền",
      error: err.message,
    });
  }
};

// =========================
// Admin - Approve Topup Request
// PUT /api/admin/topup-requests/:id/approve
// =========================
const approveTopupRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const adminId = req.user.id;
    const requestId = parsePositiveInt(req.params.id);
    const adminNote = normalizeString(req.body.admin_note || "Admin xác nhận nạp tiền");

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "ID yêu cầu nạp tiền không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const [requestRows] = await connection.query(
      `
      SELECT
        wtr.id,
        wtr.topup_code,
        wtr.user_id,
        wtr.amount,
        wtr.status,
        u.full_name,
        u.email,
        u.status AS user_status
      FROM wallet_topup_requests wtr
      INNER JOIN users u ON u.id = wtr.user_id
      WHERE wtr.id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [requestId]
    );

    if (requestRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Yêu cầu nạp tiền không tồn tại",
      });
    }

    const request = requestRows[0];

    if (request.status !== "paid_submitted") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ yêu cầu đã xác nhận thanh toán mới được duyệt",
      });
    }

    if (request.user_status !== "active") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Tài khoản người dùng hiện không hoạt động",
      });
    }

    const transaction = await creditBalance(connection, {
      userId: request.user_id,
      amount: request.amount,
      transactionType: "topup",
      referenceType: "manual",
      referenceId: request.id,
      note: `Nạp tiền theo yêu cầu ${request.topup_code}`,
      adminId,
    });

    await connection.query(
      `
      UPDATE wallet_topup_requests
      SET status = 'approved',
          admin_id = ?,
          admin_note = ?,
          wallet_transaction_id = ?,
          approved_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [adminId, adminNote, transaction.id, request.id]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Duyệt yêu cầu nạp tiền thành công",
      data: {
        request_id: request.id,
        topup_code: request.topup_code,
        wallet_transaction: transaction,
      },
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi duyệt yêu cầu nạp tiền",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// Admin - Reject Topup Request
// PUT /api/admin/topup-requests/:id/reject
// =========================
const rejectTopupRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const adminId = req.user.id;
    const requestId = parsePositiveInt(req.params.id);
    const adminNote = normalizeString(req.body.admin_note || "Admin từ chối yêu cầu nạp tiền");

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "ID yêu cầu nạp tiền không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const [requestRows] = await connection.query(
      `
      SELECT id, status
      FROM wallet_topup_requests
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [requestId]
    );

    if (requestRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Yêu cầu nạp tiền không tồn tại",
      });
    }

    const request = requestRows[0];

    if (!["pending", "paid_submitted"].includes(request.status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Yêu cầu này không thể từ chối",
      });
    }

    await connection.query(
      `
      UPDATE wallet_topup_requests
      SET status = 'rejected',
          admin_id = ?,
          admin_note = ?,
          rejected_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [adminId, adminNote, request.id]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Từ chối yêu cầu nạp tiền thành công",
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi từ chối yêu cầu nạp tiền",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getTopupRequests,
  approveTopupRequest,
  rejectTopupRequest,
};