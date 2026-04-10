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

function isValidWalletAddress(address) {
  return /^0x[a-f0-9]{40}$/.test(address);
}

// =========================
// User - Create Transfer Request
// =========================
const createTransferRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    let { ticket_id, receiver_wallet_address, note } = req.body;

    ticket_id = parsePositiveInt(ticket_id);
    receiver_wallet_address = normalizeAddress(receiver_wallet_address);
    note = normalizeString(note);

    const errors = {};

    if (!ticket_id) {
      errors.ticket_id = "ticket_id không hợp lệ";
    }

    if (!receiver_wallet_address) {
      errors.receiver_wallet_address = "Địa chỉ ví nhận không được để trống";
    } else if (!isValidWalletAddress(receiver_wallet_address)) {
      errors.receiver_wallet_address = "Địa chỉ ví nhận không đúng định dạng";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu yêu cầu chuyển nhượng không hợp lệ",
        errors,
      });
    }

    await connection.beginTransaction();

    const [ticketRows] = await connection.query(
      `
      SELECT
        t.id,
        t.ticket_code,
        t.owner_user_id,
        t.owner_wallet_address,
        t.ticket_status,
        t.mint_status,
        t.blockchain_ticket_id,
        t.transferred_count,
        t.event_id,
        e.title AS event_title
      FROM tickets t
      INNER JOIN events e ON e.id = t.event_id
      WHERE t.id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [ticket_id]
    );

    if (ticketRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Vé không tồn tại",
      });
    }

    const ticket = ticketRows[0];

    if (ticket.owner_user_id !== userId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Bạn không phải chủ sở hữu của vé này",
      });
    }

    if (ticket.ticket_status !== "active") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ vé đang active mới được chuyển nhượng",
      });
    }

    if (ticket.mint_status !== "minted" || !ticket.blockchain_ticket_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ vé đã mint NFT mới được chuyển nhượng",
      });
    }

    if (ticket.transferred_count >= 1) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Vé này đã chuyển nhượng đủ số lần cho phép",
      });
    }

    if (normalizeAddress(ticket.owner_wallet_address) === receiver_wallet_address) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Không thể chuyển nhượng cho chính ví hiện tại",
      });
    }

    const [receiverWalletRows] = await connection.query(
      `
      SELECT
        w.user_id,
        w.wallet_address,
        u.full_name,
        u.email,
        u.status AS user_status
      FROM wallets w
      INNER JOIN users u ON u.id = w.user_id
      WHERE w.wallet_address = ?
      LIMIT 1
      `,
      [receiver_wallet_address]
    );

    if (receiverWalletRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Ví nhận chưa được liên kết với tài khoản nào trong hệ thống",
      });
    }

    const receiver = receiverWalletRows[0];

    if (receiver.user_id === userId) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Không thể chuyển nhượng cho chính tài khoản của bạn",
      });
    }

    if (receiver.user_status !== "active") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Tài khoản nhận hiện không hoạt động",
      });
    }

    const [pendingTransferRows] = await connection.query(
      `
      SELECT id
      FROM ticket_transfers
      WHERE ticket_id = ?
        AND status = 'pending'
      LIMIT 1
      `,
      [ticket_id]
    );

    if (pendingTransferRows.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Vé này đang có yêu cầu chuyển nhượng chờ duyệt",
      });
    }

    const [result] = await connection.query(
      `
      INSERT INTO ticket_transfers (
        ticket_id,
        from_user_id,
        from_wallet_address,
        to_user_id,
        to_wallet_address,
        requested_by_user_id,
        approved_by_admin_id,
        transfer_tx_hash,
        status,
        admin_note,
        failure_reason,
        requested_at,
        approved_at,
        rejected_at,
        failed_at,
        cancelled_at,
        transferred_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, 'pending', ?, NULL, NOW(), NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
      `,
      [
        ticket.id,
        userId,
        normalizeAddress(ticket.owner_wallet_address),
        receiver.user_id,
        receiver_wallet_address,
        userId,
        note || null,
      ]
    );

    const [rows] = await connection.query(
      `
      SELECT
        tt.id,
        tt.ticket_id,
        t.ticket_code,
        t.event_id,
        e.title AS event_title,
        tt.from_user_id,
        u1.full_name AS from_user_name,
        tt.from_wallet_address,
        tt.to_user_id,
        u2.full_name AS to_user_name,
        u2.email AS to_user_email,
        tt.to_wallet_address,
        tt.requested_by_user_id,
        tt.approved_by_admin_id,
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
      WHERE tt.id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Tạo yêu cầu chuyển nhượng thành công",
      data: rows[0],
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo yêu cầu chuyển nhượng",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// User - Get My Transfer Requests
// =========================
const getMyTransferRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const status = normalizeString(req.query.status || "");

    const whereClauses = ["tt.from_user_id = ?"];
    const values = [userId];

    if (status) {
      whereClauses.push("tt.status = ?");
      values.push(status);
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
        t.event_id,
        e.title AS event_title,
        tt.from_user_id,
        u1.full_name AS from_user_name,
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
// User - Get My Transfer Request Detail
// =========================
const getMyTransferRequestDetail = async (req, res) => {
  try {
    const userId = req.user.id;
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
        t.event_id,
        e.title AS event_title,
        e.event_date,
        t.blockchain_ticket_id,
        t.contract_address,
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
      WHERE tt.id = ? AND tt.from_user_id = ?
      LIMIT 1
      `,
      [transferId, userId]
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
// User - Cancel My Pending Transfer Request
// =========================
const cancelMyTransferRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const transferId = parsePositiveInt(req.params.id);

    if (!transferId) {
      return res.status(400).json({
        success: false,
        message: "ID yêu cầu chuyển nhượng không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT
        id,
        from_user_id,
        status
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

    const transfer = rows[0];

    if (transfer.from_user_id !== userId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền hủy yêu cầu này",
      });
    }

    if (transfer.status !== "pending") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể hủy yêu cầu đang chờ duyệt",
      });
    }

    await connection.query(
      `
      UPDATE ticket_transfers
      SET status = 'cancelled',
          cancelled_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [transferId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Hủy yêu cầu chuyển nhượng thành công",
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi hủy yêu cầu chuyển nhượng",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  createTransferRequest,
  getMyTransferRequests,
  getMyTransferRequestDetail,
  cancelMyTransferRequest,
};