const pool = require("../../config/db");

// =========================
// Helpers
// =========================
function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAddress(address) {
  return typeof address === "string" ? address.trim().toLowerCase() : "";
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

// =========================
// Admin - Get All Transfer Requests
// =========================
const getAllTransferRequests = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const status = normalizeString(req.query.status || "");
    const ticketId = parsePositiveInt(req.query.ticket_id);
    const userId = parsePositiveInt(req.query.user_id);

    const whereClauses = ["1 = 1"];
    const values = [];

    if (status) {
      whereClauses.push("tt.status = ?");
      values.push(status);
    }

    if (ticketId) {
      whereClauses.push("tt.ticket_id = ?");
      values.push(ticketId);
    }

    if (userId) {
      whereClauses.push("(tt.from_user_id = ? OR tt.to_user_id = ?)");
      values.push(userId, userId);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM ticket_transfers tt
      WHERE ${whereSql}
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT
        tt.id,
        tt.ticket_id,
        t.ticket_code,
        t.blockchain_ticket_id,
        t.contract_address,
        t.event_id,
        e.title AS event_title,
        tt.from_user_id,
        u1.full_name AS from_user_name,
        u1.email AS from_user_email,
        tt.from_wallet_address,
        tt.to_user_id,
        u2.full_name AS to_user_name,
        u2.email AS to_user_email,
        tt.to_wallet_address,
        tt.requested_by_user_id,
        tt.approved_by_admin_id,
        a.full_name AS approved_by_admin_name,
        tt.transfer_tx_hash,
        tt.status,
        tt.admin_note,
        tt.failure_reason,
        tt.requested_at,
        tt.approved_at,
        tt.rejected_at,
        tt.failed_at,
        tt.cancelled_at,
        tt.transferred_at,
        tt.created_at,
        tt.updated_at
      FROM ticket_transfers tt
      INNER JOIN tickets t ON t.id = tt.ticket_id
      INNER JOIN events e ON e.id = t.event_id
      INNER JOIN users u1 ON u1.id = tt.from_user_id
      INNER JOIN users u2 ON u2.id = tt.to_user_id
      LEFT JOIN users a ON a.id = tt.approved_by_admin_id
      WHERE ${whereSql}
      ORDER BY tt.created_at DESC, tt.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách yêu cầu chuyển nhượng thành công",
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
      message: "Lỗi server khi lấy danh sách yêu cầu chuyển nhượng",
      error: err.message,
    });
  }
};

// =========================
// Admin - Get Transfer Request Detail
// =========================
const getTransferRequestDetail = async (req, res) => {
  try {
    const transferId = parsePositiveInt(req.params.id);

    if (!transferId) {
      return res.status(400).json({
        success: false,
        message: "ID yêu cầu chuyển nhượng không hợp lệ",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        tt.id,
        tt.ticket_id,
        t.ticket_code,
        t.blockchain_ticket_id,
        t.contract_address,
        t.ticket_status,
        t.mint_status,
        t.transferred_count,
        t.event_id,
        e.title AS event_title,
        e.event_date,
        tt.from_user_id,
        u1.full_name AS from_user_name,
        u1.email AS from_user_email,
        tt.from_wallet_address,
        tt.to_user_id,
        u2.full_name AS to_user_name,
        u2.email AS to_user_email,
        tt.to_wallet_address,
        tt.requested_by_user_id,
        tt.approved_by_admin_id,
        a.full_name AS approved_by_admin_name,
        tt.transfer_tx_hash,
        tt.status,
        tt.admin_note,
        tt.failure_reason,
        tt.requested_at,
        tt.approved_at,
        tt.rejected_at,
        tt.failed_at,
        tt.cancelled_at,
        tt.transferred_at,
        tt.created_at,
        tt.updated_at
      FROM ticket_transfers tt
      INNER JOIN tickets t ON t.id = tt.ticket_id
      INNER JOIN events e ON e.id = t.event_id
      INNER JOIN users u1 ON u1.id = tt.from_user_id
      INNER JOIN users u2 ON u2.id = tt.to_user_id
      LEFT JOIN users a ON a.id = tt.approved_by_admin_id
      WHERE tt.id = ?
      LIMIT 1
      `,
      [transferId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Yêu cầu chuyển nhượng không tồn tại",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết yêu cầu chuyển nhượng thành công",
      data: rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết yêu cầu chuyển nhượng",
      error: err.message,
    });
  }
};

// =========================
// Admin - Approve Transfer Request
// Business-only transfer: không gọi blockchain
// =========================
const approveTransferRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const adminId = req.user.id;
    const transferId = parsePositiveInt(req.params.id);
    let { admin_note } = req.body;

    admin_note = normalizeString(admin_note);

    if (!transferId) {
      return res.status(400).json({
        success: false,
        message: "ID yêu cầu chuyển nhượng không hợp lệ",
      });
    }

    await connection.beginTransaction();

    // 1. Khóa request transfer
    const [transferRows] = await connection.query(
      `
      SELECT
        tt.id,
        tt.ticket_id,
        tt.from_user_id,
        tt.from_wallet_address,
        tt.to_user_id,
        tt.to_wallet_address,
        tt.status
      FROM ticket_transfers tt
      WHERE tt.id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [transferId]
    );

    if (transferRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Yêu cầu chuyển nhượng không tồn tại",
      });
    }

    const transfer = transferRows[0];

    if (transfer.status !== "pending") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể duyệt yêu cầu đang chờ",
      });
    }

    // 2. Khóa ticket
    const [ticketRows] = await connection.query(
      `
      SELECT
        id,
        ticket_code,
        owner_user_id,
        owner_wallet_address,
        ticket_status,
        mint_status,
        blockchain_ticket_id,
        transferred_count
      FROM tickets
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [transfer.ticket_id]
    );

    if (ticketRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Vé không tồn tại",
      });
    }

    const ticket = ticketRows[0];

    // 3. Kiểm tra quyền sở hữu hiện tại vẫn khớp
    if (ticket.owner_user_id !== transfer.from_user_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chủ sở hữu hiện tại của vé không còn khớp với yêu cầu chuyển nhượng",
      });
    }

    if (normalizeAddress(ticket.owner_wallet_address) !== normalizeAddress(transfer.from_wallet_address)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Ví sở hữu hiện tại không còn khớp với yêu cầu chuyển nhượng",
      });
    }

    // 4. Vé phải đang active
    if (ticket.ticket_status !== "active") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ vé active mới được chuyển nhượng",
      });
    }

    // 5. Vé phải đã mint
    if (ticket.mint_status !== "minted" || !ticket.blockchain_ticket_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ vé đã mint NFT mới được chuyển nhượng",
      });
    }

    // 6. Giới hạn 1 lần chuyển nhượng
    if (Number(ticket.transferred_count || 0) >= 1) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Vé này đã chuyển nhượng đủ số lần cho phép",
      });
    }

    // 7. Kiểm tra user nhận / ví nhận vẫn hợp lệ
    const [receiverWalletRows] = await connection.query(
      `
      SELECT
        w.user_id,
        w.wallet_address,
        u.status AS user_status
      FROM wallets w
      INNER JOIN users u ON u.id = w.user_id
      WHERE w.wallet_address = ?
      LIMIT 1
      FOR UPDATE
      `,
      [normalizeAddress(transfer.to_wallet_address)]
    );

    if (receiverWalletRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Ví nhận không còn tồn tại trong hệ thống",
      });
    }

    const receiver = receiverWalletRows[0];

    if (receiver.user_id !== transfer.to_user_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Thông tin user nhận không còn khớp với ví nhận",
      });
    }

    if (receiver.user_status !== "active") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Tài khoản nhận hiện không hoạt động",
      });
    }

    // 8. Cập nhật ownership của ticket trong DB
    await connection.query(
      `
      UPDATE tickets
      SET owner_user_id = ?,
          owner_wallet_address = ?,
          transferred_count = transferred_count + 1,
          last_transfer_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [
        transfer.to_user_id,
        normalizeAddress(transfer.to_wallet_address),
        transfer.ticket_id,
      ]
    );

    // 9. Đánh dấu request hoàn tất
    await connection.query(
      `
      UPDATE ticket_transfers
      SET status = 'completed',
          approved_by_admin_id = ?,
          approved_at = NOW(),
          transferred_at = NOW(),
          admin_note = ?,
          transfer_tx_hash = NULL,
          updated_at = NOW()
      WHERE id = ?
      `,
      [
        adminId,
        admin_note || "Admin duyệt chuyển nhượng trong hệ thống",
        transferId,
      ]
    );

    await connection.commit();

    const [rows] = await pool.query(
      `
      SELECT
        tt.id,
        tt.ticket_id,
        t.ticket_code,
        t.blockchain_ticket_id,
        t.contract_address,
        t.owner_user_id,
        t.owner_wallet_address,
        tt.from_user_id,
        u1.full_name AS from_user_name,
        tt.from_wallet_address,
        tt.to_user_id,
        u2.full_name AS to_user_name,
        tt.to_wallet_address,
        tt.requested_by_user_id,
        tt.approved_by_admin_id,
        a.full_name AS approved_by_admin_name,
        tt.transfer_tx_hash,
        tt.status,
        tt.admin_note,
        tt.failure_reason,
        tt.requested_at,
        tt.approved_at,
        tt.rejected_at,
        tt.failed_at,
        tt.cancelled_at,
        tt.transferred_at,
        tt.updated_at
      FROM ticket_transfers tt
      INNER JOIN tickets t ON t.id = tt.ticket_id
      INNER JOIN users u1 ON u1.id = tt.from_user_id
      INNER JOIN users u2 ON u2.id = tt.to_user_id
      LEFT JOIN users a ON a.id = tt.approved_by_admin_id
      WHERE tt.id = ?
      LIMIT 1
      `,
      [transferId]
    );

    return res.status(200).json({
      success: true,
      message: "Duyệt chuyển nhượng thành công",
      data: rows[0],
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi duyệt chuyển nhượng",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// Admin - Reject Transfer Request
// =========================
const rejectTransferRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const adminId = req.user.id;
    const transferId = parsePositiveInt(req.params.id);
    let { admin_note } = req.body;

    admin_note = normalizeString(admin_note);

    if (!transferId) {
      return res.status(400).json({
        success: false,
        message: "ID yêu cầu chuyển nhượng không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT id, status
      FROM ticket_transfers
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [transferId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Yêu cầu chuyển nhượng không tồn tại",
      });
    }

    if (rows[0].status !== "pending") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể từ chối yêu cầu đang chờ",
      });
    }

    await connection.query(
      `
      UPDATE ticket_transfers
      SET status = 'rejected',
          approved_by_admin_id = ?,
          approved_at = NOW(),
          rejected_at = NOW(),
          admin_note = ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [
        adminId,
        admin_note || "Admin từ chối yêu cầu chuyển nhượng",
        transferId,
      ]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Từ chối yêu cầu chuyển nhượng thành công",
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi từ chối yêu cầu chuyển nhượng",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllTransferRequests,
  getTransferRequestDetail,
  approveTransferRequest,
  rejectTransferRequest,
};