const pool = require("../../config/db");
const {
  debitBalance,
  creditBalance,
} = require("../../services/internalWalletService");

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

function parseNonNegativeNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed < 0 ? null : Number(parsed.toFixed(2));
}

function isValidWalletAddress(address) {
  return /^0x[a-f0-9]{40}$/.test(address);
}

function isAllowedTransferType(type) {
  return ["gift", "resale_private"].includes(type);
}

/**
 * DB hiện tại chưa có enum app_wallet.
 * Nên phần thanh toán chuyển nhượng qua ví nội bộ sẽ lưu payment_method = demo.
 */
function normalizePaymentMethodForDb(paymentMethod) {
  const method = normalizeString(paymentMethod || "demo").toLowerCase();

  if (["demo", "app_wallet", "internal_wallet", "metamask"].includes(method)) {
    return "demo";
  }

  return null;
}

function getDefaultPaymentStatusByTransferType(transferType) {
  return transferType === "gift" ? "not_required" : "pending";
}

async function getLinkedWalletByUserId(connection, userId) {
  const [rows] = await connection.query(
    `
    SELECT
      w.user_id,
      w.wallet_address,
      w.wallet_type,
      w.network_name,
      u.full_name,
      u.email,
      u.status AS user_status
    FROM wallets w
    INNER JOIN users u ON u.id = w.user_id
    WHERE w.user_id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows.length > 0 ? rows[0] : null;
}

async function getLinkedWalletByAddress(connection, walletAddress) {
  const [rows] = await connection.query(
    `
    SELECT
      w.user_id,
      w.wallet_address,
      w.wallet_type,
      w.network_name,
      u.full_name,
      u.email,
      u.status AS user_status
    FROM wallets w
    INNER JOIN users u ON u.id = w.user_id
    WHERE w.wallet_address = ?
    LIMIT 1
    `,
    [walletAddress]
  );

  return rows.length > 0 ? rows[0] : null;
}

async function getTransferDetailById(connection, transferId) {
  const [rows] = await connection.query(
    `
    SELECT
      tt.id,
      tt.ticket_id,
      t.ticket_code,
      t.ticket_status,
      t.mint_status,
      t.owner_user_id,
      t.owner_wallet_address,
      t.blockchain_ticket_id,
      t.contract_address,
      t.metadata_uri,
      t.unit_price AS original_ticket_price,
      t.transferred_count,
      t.last_transfer_at,
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
      tt.transfer_type,
      tt.asking_price,
      tt.payment_status,
      tt.approved_by_admin_id,
      a.full_name AS approved_by_admin_name,
      tt.transfer_tx_hash,
      tt.status,
      tt.admin_note,
      tt.failure_reason,
      tt.requested_at,
      tt.accepted_at,
      tt.expires_at,
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

  return rows.length > 0 ? rows[0] : null;
}

async function unlockTicketIfStillLocked(connection, ticketId, ownerUserId) {
  await connection.query(
    `
    UPDATE tickets
    SET ticket_status = 'active',
        updated_at = NOW()
    WHERE id = ?
      AND owner_user_id = ?
      AND ticket_status = 'transfer_pending'
    `,
    [ticketId, ownerUserId]
  );
}

// =========================
// User - Create Transfer Request
// POST /api/users/transfers
// =========================
const createTransferRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;

    let {
      ticket_id,
      receiver_wallet_address,
      transfer_type,
      asking_price,
      note,
      expires_in_minutes,
    } = req.body;

    ticket_id = parsePositiveInt(ticket_id);
    receiver_wallet_address = normalizeAddress(receiver_wallet_address);
    transfer_type = normalizeString(transfer_type || "gift").toLowerCase();
    asking_price = parseNonNegativeNumber(asking_price ?? 0);
    note = normalizeString(note);
    expires_in_minutes = parsePositiveInt(expires_in_minutes);

    const errors = {};

    if (!ticket_id) {
      errors.ticket_id = "ticket_id không hợp lệ";
    }

    if (!receiver_wallet_address) {
      errors.receiver_wallet_address = "Địa chỉ ví nhận không được để trống";
    } else if (!isValidWalletAddress(receiver_wallet_address)) {
      errors.receiver_wallet_address = "Địa chỉ ví nhận không đúng định dạng";
    }

    if (!isAllowedTransferType(transfer_type)) {
      errors.transfer_type = "Loại chuyển nhượng không hợp lệ";
    }

    if (asking_price === null) {
      errors.asking_price = "Giá chuyển nhượng không hợp lệ";
    }

    if (transfer_type === "gift" && Number(asking_price || 0) !== 0) {
      errors.asking_price = "Chuyển nhượng dạng tặng phải có giá bằng 0";
    }

    if (transfer_type === "resale_private" && (!asking_price || Number(asking_price) <= 0)) {
      errors.asking_price = "Giá chuyển nhượng phải lớn hơn 0";
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
        t.unit_price,
        t.order_id,
        t.event_id,
        e.title AS event_title,
        e.event_date
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

    if (ticket.event_date && new Date(ticket.event_date) <= new Date()) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Sự kiện đã diễn ra nên vé không thể chuyển nhượng",
      });
    }

    if (normalizeAddress(ticket.owner_wallet_address) === receiver_wallet_address) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Không thể chuyển nhượng cho chính ví hiện tại",
      });
    }

    const receiver = await getLinkedWalletByAddress(connection, receiver_wallet_address);

    if (!receiver) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Ví nhận chưa được liên kết với tài khoản nào trong hệ thống",
      });
    }

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

    if (transfer_type === "resale_private" && Number(asking_price) > Number(ticket.unit_price)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Giá chuyển nhượng phải nhỏ hơn hoặc bằng giá gốc của vé",
      });
    }

    const [pendingTransferRows] = await connection.query(
      `
      SELECT id
      FROM ticket_transfers
      WHERE ticket_id = ?
        AND status IN ('pending', 'approved')
      LIMIT 1
      `,
      [ticket_id]
    );

    if (pendingTransferRows.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Vé này đang có yêu cầu chuyển nhượng đang chờ xử lý",
      });
    }

    let expiresAt = null;

    if (expires_in_minutes) {
      const [expireRows] = await connection.query(
        `SELECT DATE_ADD(NOW(), INTERVAL ? MINUTE) AS expires_at`,
        [expires_in_minutes]
      );
      expiresAt = expireRows[0].expires_at;
    } else if (transfer_type === "resale_private") {
      const [expireRows] = await connection.query(
        `SELECT DATE_ADD(NOW(), INTERVAL 60 MINUTE) AS expires_at`
      );
      expiresAt = expireRows[0].expires_at;
    }

    const [insertResult] = await connection.query(
      `
      INSERT INTO ticket_transfers (
        ticket_id,
        from_user_id,
        from_wallet_address,
        to_user_id,
        to_wallet_address,
        requested_by_user_id,
        transfer_type,
        asking_price,
        payment_status,
        approved_by_admin_id,
        transfer_tx_hash,
        status,
        admin_note,
        failure_reason,
        requested_at,
        accepted_at,
        expires_at,
        approved_at,
        rejected_at,
        failed_at,
        cancelled_at,
        transferred_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'pending', ?, NULL, NOW(), NULL, ?, NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
      `,
      [
        ticket.id,
        userId,
        normalizeAddress(ticket.owner_wallet_address),
        receiver.user_id,
        receiver_wallet_address,
        userId,
        transfer_type,
        Number(asking_price || 0),
        getDefaultPaymentStatusByTransferType(transfer_type),
        note || null,
        expiresAt,
      ]
    );

    await connection.query(
      `
      UPDATE tickets
      SET ticket_status = 'transfer_pending',
          updated_at = NOW()
      WHERE id = ?
      `,
      [ticket.id]
    );

    const transfer = await getTransferDetailById(connection, insertResult.insertId);

    await connection.commit();

    return res.status(201).json({
      success: true,
      message:
        transfer_type === "gift"
          ? "Tạo yêu cầu tặng vé thành công"
          : "Tạo yêu cầu chuyển nhượng có thu tiền thành công",
      data: transfer,
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
// User - Get My Sent Transfer Requests
// GET /api/users/transfers
// =========================
const getMyTransferRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const status = normalizeString(req.query.status || "");
    const ticketId = parsePositiveInt(req.query.ticket_id);
    const transferType = normalizeString(req.query.transfer_type || "").toLowerCase();

    const whereClauses = ["tt.from_user_id = ?"];
    const values = [userId];

    if (status) {
      whereClauses.push("tt.status = ?");
      values.push(status);
    }

    if (ticketId) {
      whereClauses.push("tt.ticket_id = ?");
      values.push(ticketId);
    }

    if (transferType) {
      whereClauses.push("tt.transfer_type = ?");
      values.push(transferType);
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
        t.unit_price AS original_ticket_price,
        t.ticket_status,
        t.mint_status,
        t.transferred_count,
        t.last_transfer_at,
        t.event_id,
        e.title AS event_title,
        e.event_date,
        tt.from_user_id,
        u1.full_name AS from_user_name,
        tt.from_wallet_address,
        tt.to_user_id,
        u2.full_name AS to_user_name,
        u2.email AS to_user_email,
        tt.to_wallet_address,
        tt.transfer_type,
        tt.asking_price,
        tt.payment_status,
        tt.transfer_tx_hash,
        tt.status,
        tt.admin_note,
        tt.failure_reason,
        tt.requested_at,
        tt.accepted_at,
        tt.expires_at,
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
      WHERE ${whereSql}
      ORDER BY tt.created_at DESC, tt.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách yêu cầu chuyển nhượng đã gửi thành công",
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
// User - Get Incoming Transfer Requests
// GET /api/users/transfers/incoming
// =========================
const getIncomingTransferRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const status = normalizeString(req.query.status || "");
    const transferType = normalizeString(req.query.transfer_type || "").toLowerCase();

    const whereClauses = ["tt.to_user_id = ?"];
    const values = [userId];

    if (status) {
      whereClauses.push("tt.status = ?");
      values.push(status);
    }

    if (transferType) {
      whereClauses.push("tt.transfer_type = ?");
      values.push(transferType);
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
        t.unit_price AS original_ticket_price,
        t.ticket_status,
        t.mint_status,
        t.transferred_count,
        t.last_transfer_at,
        t.event_id,
        e.title AS event_title,
        e.event_date,
        tt.from_user_id,
        u1.full_name AS from_user_name,
        u1.email AS from_user_email,
        tt.from_wallet_address,
        tt.to_user_id,
        u2.full_name AS to_user_name,
        tt.to_wallet_address,
        tt.transfer_type,
        tt.asking_price,
        tt.payment_status,
        tt.transfer_tx_hash,
        tt.status,
        tt.admin_note,
        tt.failure_reason,
        tt.requested_at,
        tt.accepted_at,
        tt.expires_at,
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
      WHERE ${whereSql}
      ORDER BY tt.created_at DESC, tt.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách yêu cầu nhận vé thành công",
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
      message: "Lỗi server khi lấy danh sách yêu cầu nhận vé",
      error: err.message,
    });
  }
};

// =========================
// User - Get Transfer Request Detail
// GET /api/users/transfers/:id
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
        t.ticket_status,
        t.mint_status,
        t.blockchain_ticket_id,
        t.contract_address,
        t.metadata_uri,
        t.owner_user_id,
        t.owner_wallet_address,
        t.unit_price AS original_ticket_price,
        t.transferred_count,
        t.last_transfer_at,
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
        tt.transfer_type,
        tt.asking_price,
        tt.payment_status,
        tt.transfer_tx_hash,
        tt.status,
        tt.admin_note,
        tt.failure_reason,
        tt.requested_at,
        tt.accepted_at,
        tt.expires_at,
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
        AND (tt.from_user_id = ? OR tt.to_user_id = ?)
      LIMIT 1
      `,
      [transferId, userId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Yêu cầu chuyển nhượng không tồn tại",
      });
    }

    const transfer = rows[0];

    const [paymentRows] = await pool.query(
      `
      SELECT
        id,
        transfer_id,
        ticket_id,
        seller_user_id,
        buyer_user_id,
        amount,
        currency,
        payment_method,
        gateway_transaction_id,
        blockchain_tx_hash,
        payer_wallet_address,
        status,
        paid_at,
        created_at,
        updated_at
      FROM ticket_transfer_payments
      WHERE transfer_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [transferId]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết yêu cầu chuyển nhượng thành công",
      data: {
        ...transfer,
        transfer_payment: paymentRows.length > 0 ? paymentRows[0] : null,
      },
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
// User - Respond To Incoming Transfer Request
// PUT /api/users/transfers/:id/respond
// =========================
const respondToTransferRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;

    let { action, payment_method } = req.body;
    const transferId = parsePositiveInt(req.params.id);

    action = normalizeString(action).toLowerCase();
    payment_method = normalizePaymentMethodForDb(payment_method);

    if (!transferId) {
      return res.status(400).json({
        success: false,
        message: "ID yêu cầu chuyển nhượng không hợp lệ",
      });
    }

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "action chỉ được là accept hoặc reject",
      });
    }

    if (action === "accept" && !payment_method) {
      return res.status(400).json({
        success: false,
        message: "Hiện hệ thống chỉ hỗ trợ thanh toán chuyển nhượng bằng ví nội bộ",
      });
    }

    await connection.beginTransaction();

    const [transferRows] = await connection.query(
      `
      SELECT
        id,
        ticket_id,
        from_user_id,
        from_wallet_address,
        to_user_id,
        to_wallet_address,
        transfer_type,
        asking_price,
        payment_status,
        status,
        requested_at,
        accepted_at,
        expires_at,
        rejected_at,
        failed_at,
        cancelled_at,
        transferred_at
      FROM ticket_transfers
      WHERE id = ?
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

    if (transfer.to_user_id !== userId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền phản hồi yêu cầu này",
      });
    }

    if (transfer.status !== "pending") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Yêu cầu chuyển nhượng này không còn ở trạng thái chờ xử lý",
      });
    }

    if (transfer.expires_at && new Date(transfer.expires_at) < new Date()) {
      await connection.query(
        `
        UPDATE ticket_transfers
        SET status = 'failed',
            payment_status = CASE
              WHEN transfer_type = 'gift' THEN 'not_required'
              ELSE 'cancelled'
            END,
            failure_reason = 'Yêu cầu chuyển nhượng đã hết hạn',
            failed_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
        `,
        [transferId]
      );

      await unlockTicketIfStillLocked(connection, transfer.ticket_id, transfer.from_user_id);

      await connection.commit();

      return res.status(400).json({
        success: false,
        message: "Yêu cầu chuyển nhượng đã hết hạn",
      });
    }

    if (action === "reject") {
      await connection.query(
        `
        UPDATE ticket_transfers
        SET status = 'rejected',
            payment_status = CASE
              WHEN transfer_type = 'gift' THEN 'not_required'
              ELSE 'cancelled'
            END,
            rejected_at = NOW(),
            updated_at = NOW()
        WHERE id = ?
        `,
        [transferId]
      );

      await unlockTicketIfStillLocked(connection, transfer.ticket_id, transfer.from_user_id);

      await connection.commit();

      return res.status(200).json({
        success: true,
        message: "Bạn đã từ chối yêu cầu chuyển nhượng",
      });
    }

    const [ticketRows] = await connection.query(
      `
      SELECT
        id,
        ticket_code,
        owner_user_id,
        owner_wallet_address,
        unit_price,
        ticket_status,
        mint_status,
        blockchain_ticket_id,
        transferred_count,
        event_id
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

    if (ticket.owner_user_id !== transfer.from_user_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Vé không còn thuộc quyền sở hữu của người gửi",
      });
    }

    if (normalizeAddress(ticket.owner_wallet_address) !== normalizeAddress(transfer.from_wallet_address)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Thông tin ví chủ sở hữu hiện tại không còn khớp",
      });
    }

    if (!["active", "transfer_pending"].includes(ticket.ticket_status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Vé hiện không thể hoàn tất chuyển nhượng",
      });
    }

    const receiverWallet = await getLinkedWalletByUserId(connection, userId);

    if (!receiverWallet) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Bạn chưa liên kết ví nên chưa thể nhận vé",
      });
    }

    if (receiverWallet.user_status !== "active") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Tài khoản nhận hiện không hoạt động",
      });
    }

    const normalizedReceiverWallet = normalizeAddress(receiverWallet.wallet_address);

    if (normalizedReceiverWallet !== normalizeAddress(transfer.to_wallet_address)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Ví hiện tại của người nhận không khớp với ví được chỉ định trong yêu cầu chuyển nhượng",
      });
    }

    let buyerWalletTransaction = null;
    let sellerWalletTransaction = null;

    if (transfer.transfer_type === "resale_private") {
      const transferAmount = Number(transfer.asking_price);

      if (!transferAmount || transferAmount <= 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Giá chuyển nhượng không hợp lệ",
        });
      }

      if (transferAmount > Number(ticket.unit_price)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Giá chuyển nhượng đang vượt quá giá gốc của vé",
        });
      }

      try {
        buyerWalletTransaction = await debitBalance(connection, {
          userId: transfer.to_user_id,
          amount: transferAmount,
          transactionType: "transfer_purchase",
          referenceType: "ticket_transfer",
          referenceId: transfer.id,
          note: `Thanh toán nhận chuyển nhượng vé ${ticket.ticket_code}`,
          adminId: null,
        });

        sellerWalletTransaction = await creditBalance(connection, {
          userId: transfer.from_user_id,
          amount: transferAmount,
          transactionType: "transfer_receive",
          referenceType: "ticket_transfer",
          referenceId: transfer.id,
          note: `Nhận tiền chuyển nhượng vé ${ticket.ticket_code}`,
          adminId: null,
        });
      } catch (walletErr) {
        await connection.rollback();

        if (walletErr.code === "INSUFFICIENT_BALANCE") {
          return res.status(400).json({
            success: false,
            message: "Số dư ví nội bộ không đủ để nhận chuyển nhượng vé",
            data: {
              current_balance: walletErr.currentBalance,
              required_amount: walletErr.requiredAmount,
            },
          });
        }

        return res.status(400).json({
          success: false,
          message: walletErr.message || "Không thể xử lý thanh toán chuyển nhượng",
        });
      }

      await connection.query(
        `
        INSERT INTO ticket_transfer_payments (
          transfer_id,
          ticket_id,
          seller_user_id,
          buyer_user_id,
          amount,
          currency,
          payment_method,
          gateway_transaction_id,
          blockchain_tx_hash,
          payer_wallet_address,
          status,
          paid_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'VND', ?, NULL, NULL, ?, 'success', NOW(), NOW(), NOW())
        `,
        [
          transfer.id,
          transfer.ticket_id,
          transfer.from_user_id,
          transfer.to_user_id,
          transferAmount,
          payment_method,
          normalizedReceiverWallet,
        ]
      );
    }

    await connection.query(
      `
      UPDATE tickets
      SET owner_user_id = ?,
          owner_wallet_address = ?,
          ticket_status = 'active',
          transferred_count = transferred_count + 1,
          last_transfer_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [transfer.to_user_id, normalizedReceiverWallet, transfer.ticket_id]
    );

    await connection.query(
      `
      UPDATE ticket_transfers
      SET status = 'completed',
          payment_status = CASE
            WHEN transfer_type = 'gift' THEN 'not_required'
            ELSE 'paid'
          END,
          accepted_at = NOW(),
          transferred_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [transfer.id]
    );

    const detail = await getTransferDetailById(connection, transfer.id);

    await connection.commit();

    return res.status(200).json({
      success: true,
      message:
        transfer.transfer_type === "gift"
          ? "Nhận vé thành công"
          : "Thanh toán chuyển nhượng thành công và vé đã được chuyển cho bạn",
      data: {
        transfer: detail,
        buyer_wallet_transaction: buyerWalletTransaction,
        seller_wallet_transaction: sellerWalletTransaction,
      },
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi phản hồi yêu cầu chuyển nhượng",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// User - Cancel My Pending Transfer Request
// PUT /api/users/transfers/:id/cancel
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
        ticket_id,
        from_user_id,
        status,
        transfer_type,
        payment_status
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
        message: "Chỉ có thể hủy yêu cầu đang chờ xử lý",
      });
    }

    await connection.query(
      `
      UPDATE ticket_transfers
      SET status = 'cancelled',
          payment_status = CASE
            WHEN transfer_type = 'gift' THEN 'not_required'
            ELSE 'cancelled'
          END,
          cancelled_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [transferId]
    );

    await unlockTicketIfStillLocked(connection, transfer.ticket_id, userId);

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
  getIncomingTransferRequests,
  getMyTransferRequestDetail,
  respondToTransferRequest,
  cancelMyTransferRequest,
};