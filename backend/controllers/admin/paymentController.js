const pool = require("../../config/db");
const blockchainService = require("../../services/blockchainService");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWalletAddress(address) {
  return typeof address === "string" ? address.trim().toLowerCase() : "";
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function isAllowedPaymentStatus(status) {
  return ["pending", "success", "failed", "refunded", "cancelled"].includes(status);
}

function generateTicketCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const i = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TCK${y}${m}${d}${h}${i}${s}${rand}`;
}

async function generateUniqueTicketCode(connection) {
  let code;
  let exists = true;

  while (exists) {
    code = generateTicketCode();
    const [rows] = await connection.query(
      "SELECT id FROM tickets WHERE ticket_code = ? LIMIT 1",
      [code]
    );
    exists = rows.length > 0;
  }

  return code;
}

function buildDefaultMetadataUri(ticketId) {
  const baseUrl = (process.env.BASE_URL || "http://localhost:5001").replace(/\/+$/, "");
  return `${baseUrl}/api/users/tickets/${ticketId}`;
}

async function issueTicketsAutomatically(connection, orderId, userId, walletAddress) {
  const normalizedWallet = normalizeWalletAddress(walletAddress);

  if (!normalizedWallet) {
    throw new Error("Người dùng chưa có ví hợp lệ để phát hành vé");
  }

  const [orderItemRows] = await connection.query(
    `
    SELECT
      oi.id,
      oi.order_id,
      oi.ticket_type_id,
      oi.ticket_type_name_snapshot,
      oi.unit_price,
      oi.quantity,
      oi.subtotal,
      tt.event_id
    FROM order_items oi
    INNER JOIN ticket_types tt ON tt.id = oi.ticket_type_id
    WHERE oi.order_id = ?
    FOR UPDATE
    `,
    [orderId]
  );

  if (orderItemRows.length === 0) {
    throw new Error("Đơn hàng không có chi tiết vé");
  }

  const createdTicketIds = [];

  for (const item of orderItemRows) {
    const [issuedCountRows] = await connection.query(
      `
      SELECT COUNT(*) AS issued_count
      FROM tickets
      WHERE order_item_id = ?
      `,
      [item.id]
    );

    const issuedCount = Number(issuedCountRows[0].issued_count || 0);

    if (issuedCount > Number(item.quantity)) {
      throw new Error(`Dữ liệu vé của order item ${item.id} không hợp lệ`);
    }

    const remainingToIssue = Number(item.quantity) - issuedCount;

    for (let index = 0; index < remainingToIssue; index++) {
      const ticketCode = await generateUniqueTicketCode(connection);

      const [insertResult] = await connection.query(
        `
        INSERT INTO tickets (
          ticket_code,
          order_id,
          order_item_id,
          event_id,
          ticket_type_id,
          owner_user_id,
          owner_wallet_address,
          unit_price,
          ticket_status,
          blockchain_ticket_id,
          contract_address,
          mint_tx_hash,
          metadata_uri,
          mint_status,
          minted_at,
          transferred_count,
          last_transfer_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_mint', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, NOW(), NOW())
        `,
        [
          ticketCode,
          orderId,
          item.id,
          item.event_id,
          item.ticket_type_id,
          userId,
          normalizedWallet,
          item.unit_price,
        ]
      );

      createdTicketIds.push(insertResult.insertId);
    }
  }

  return createdTicketIds;
}

async function mintSingleTicketInternal(ticketId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [ticketRows] = await connection.query(
      `
      SELECT
        t.id,
        t.ticket_code,
        t.order_id,
        t.order_item_id,
        t.event_id,
        t.ticket_type_id,
        t.owner_user_id,
        t.owner_wallet_address,
        t.unit_price,
        t.ticket_status,
        t.blockchain_ticket_id,
        t.contract_address,
        t.mint_tx_hash,
        t.metadata_uri,
        t.mint_status,
        t.minted_at,
        o.payment_status,
        o.order_status,
        w.wallet_address AS linked_wallet_address
      FROM tickets t
      INNER JOIN orders o ON o.id = t.order_id
      LEFT JOIN wallets w ON w.user_id = t.owner_user_id
      WHERE t.id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [ticketId]
    );

    if (ticketRows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        code: 404,
        message: "Vé không tồn tại",
      };
    }

    const ticket = ticketRows[0];

    if (ticket.mint_status === "minted") {
      await connection.commit();
      return {
        success: true,
        already_minted: true,
        message: "Vé đã được mint trước đó",
      };
    }

    if (ticket.payment_status !== "paid") {
      await connection.rollback();
      return {
        success: false,
        code: 400,
        message: "Chỉ được mint vé của đơn hàng đã thanh toán",
      };
    }

    if (!["pending_mint", "active"].includes(ticket.ticket_status)) {
      await connection.rollback();
      return {
        success: false,
        code: 400,
        message: "Trạng thái vé hiện không thể mint",
      };
    }

    const walletAddress = normalizeWalletAddress(
      ticket.owner_wallet_address || ticket.linked_wallet_address
    );

    if (!walletAddress) {
      await connection.rollback();
      return {
        success: false,
        code: 400,
        message: "Vé chưa có địa chỉ ví sở hữu",
      };
    }

    const metadataUri = ticket.metadata_uri || buildDefaultMetadataUri(ticket.id);

    let mintResult;
    try {
      mintResult = await blockchainService.mintTicket({
        to: walletAddress,
        tokenURI: metadataUri,
      });
    } catch (err) {
      await connection.query(
        `
        UPDATE tickets
        SET mint_status = 'failed',
            updated_at = NOW()
        WHERE id = ?
        `,
        [ticketId]
      );

      await connection.commit();

      return {
        success: false,
        code: 500,
        message: "Mint NFT thất bại",
        error: err.message,
      };
    }

    await connection.query(
      `
      UPDATE tickets
      SET owner_wallet_address = ?,
          blockchain_ticket_id = ?,
          contract_address = ?,
          mint_tx_hash = ?,
          metadata_uri = ?,
          ticket_status = 'active',
          mint_status = 'minted',
          minted_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [
        walletAddress,
        mintResult.tokenId,
        mintResult.contractAddress,
        mintResult.txHash,
        metadataUri,
        ticketId,
      ]
    );

    await connection.commit();

    return {
      success: true,
      already_minted: false,
      message: "Mint NFT thành công",
      blockchain: mintResult,
    };
  } catch (err) {
    await connection.rollback();
    return {
      success: false,
      code: 500,
      message: "Lỗi server khi mint vé",
      error: err.message,
    };
  } finally {
    connection.release();
  }
}

async function mintPendingTicketsByOrder(orderId) {
  const [ticketRows] = await pool.query(
    `
    SELECT id
    FROM tickets
    WHERE order_id = ?
      AND mint_status IN ('pending', 'failed')
    ORDER BY id ASC
    `,
    [orderId]
  );

  if (ticketRows.length === 0) {
    return {
      total: 0,
      success_count: 0,
      failed_count: 0,
      results: [],
    };
  }

  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (const row of ticketRows) {
    const result = await mintSingleTicketInternal(row.id);

    if (result.success) {
      successCount += 1;
      results.push({
        ticket_id: row.id,
        success: true,
        already_minted: result.already_minted || false,
        message: result.message,
        blockchain: result.blockchain || null,
      });
    } else {
      failedCount += 1;
      results.push({
        ticket_id: row.id,
        success: false,
        message: result.message,
        error: result.error || null,
      });
    }
  }

  return {
    total: ticketRows.length,
    success_count: successCount,
    failed_count: failedCount,
    results,
  };
}

// =========================
// Admin - Get All Payments
// =========================
const getAllPayments = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const status = normalizeString(req.query.status || "");
    const paymentMethod = normalizeString(req.query.payment_method || "").toLowerCase();
    const orderCode = normalizeString(req.query.order_code || "");

    const whereClauses = ["1 = 1"];
    const values = [];

    if (status) {
      whereClauses.push("p.status = ?");
      values.push(status);
    }

    if (paymentMethod) {
      whereClauses.push("p.payment_method = ?");
      values.push(paymentMethod);
    }

    if (orderCode) {
      whereClauses.push("o.order_code LIKE ?");
      values.push(`%${orderCode}%`);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM payments p
      INNER JOIN orders o ON o.id = p.order_id
      WHERE ${whereSql}
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.payment_code,
        p.order_id,
        o.order_code,
        o.user_id,
        u.full_name,
        u.email,
        p.payment_method,
        p.amount,
        p.currency,
        p.gateway_transaction_id,
        p.blockchain_tx_hash,
        p.payer_wallet_address,
        p.status,
        p.paid_at,
        p.created_at,
        p.updated_at
      FROM payments p
      INNER JOIN orders o ON o.id = p.order_id
      INNER JOIN users u ON u.id = o.user_id
      WHERE ${whereSql}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách thanh toán thành công",
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
      message: "Lỗi server khi lấy danh sách thanh toán",
      error: err.message,
    });
  }
};

// =========================
// Admin - Get Payment Detail
// =========================
const getPaymentDetail = async (req, res) => {
  try {
    const paymentId = parsePositiveInt(req.params.id);

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "ID thanh toán không hợp lệ",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        p.id,
        p.payment_code,
        p.order_id,
        o.order_code,
        o.user_id,
        u.full_name,
        u.email,
        u.phone,
        o.total_amount,
        o.payment_status,
        o.order_status,
        p.payment_method,
        p.amount,
        p.currency,
        p.gateway_transaction_id,
        p.blockchain_tx_hash,
        p.payer_wallet_address,
        p.status,
        p.paid_at,
        p.gateway_response,
        p.created_at,
        p.updated_at
      FROM payments p
      INNER JOIN orders o ON o.id = p.order_id
      INNER JOIN users u ON u.id = o.user_id
      WHERE p.id = ?
      LIMIT 1
      `,
      [paymentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Thanh toán không tồn tại",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết thanh toán thành công",
      data: rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết thanh toán",
      error: err.message,
    });
  }
};

// =========================
// Admin - Update Payment Status
// =========================
const updatePaymentStatus = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const paymentId = parsePositiveInt(req.params.id);
    let { status, gateway_transaction_id, blockchain_tx_hash, gateway_response } = req.body;

    status = normalizeString(status).toLowerCase();
    gateway_transaction_id = normalizeString(gateway_transaction_id);
    blockchain_tx_hash = normalizeString(blockchain_tx_hash);
    gateway_response =
      gateway_response !== undefined && gateway_response !== null
        ? JSON.stringify(gateway_response)
        : null;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "ID thanh toán không hợp lệ",
      });
    }

    if (!isAllowedPaymentStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái thanh toán không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const [paymentRows] = await connection.query(
      `
      SELECT
        id,
        order_id,
        payment_method,
        status
      FROM payments
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [paymentId]
    );

    if (paymentRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Thanh toán không tồn tại",
      });
    }

    const payment = paymentRows[0];

    const [orderRows] = await connection.query(
      `
      SELECT
        id,
        user_id,
        payment_status,
        order_status
      FROM orders
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [payment.order_id]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    const order = orderRows[0];

    const updateFields = ["status = ?", "updated_at = NOW()"];
    const updateValues = [status];

    if (gateway_transaction_id) {
      updateFields.push("gateway_transaction_id = ?");
      updateValues.push(gateway_transaction_id);
    }

    if (blockchain_tx_hash) {
      updateFields.push("blockchain_tx_hash = ?");
      updateValues.push(blockchain_tx_hash);
    }

    if (gateway_response !== null) {
      updateFields.push("gateway_response = ?");
      updateValues.push(gateway_response);
    }

    if (status === "success") {
      updateFields.push("paid_at = NOW()");
    }

    updateValues.push(paymentId);

    await connection.query(
      `UPDATE payments SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    let createdTicketIds = [];
    let mintSummary = {
      total: 0,
      success_count: 0,
      failed_count: 0,
      results: [],
    };

    if (status === "success") {
      const [walletRows] = await connection.query(
        `
        SELECT wallet_address
        FROM wallets
        WHERE user_id = ?
        LIMIT 1
        `,
        [order.user_id]
      );

      if (walletRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Người dùng chưa liên kết ví, không thể phát hành và mint vé",
        });
      }

      const linkedWalletAddress = normalizeWalletAddress(walletRows[0].wallet_address);

      if (!linkedWalletAddress) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Ví người dùng không hợp lệ",
        });
      }

      await connection.query(
        `
        UPDATE orders
        SET payment_status = 'paid',
            order_status = 'processing',
            updated_at = NOW()
        WHERE id = ?
        `,
        [payment.order_id]
      );

      createdTicketIds = await issueTicketsAutomatically(
        connection,
        payment.order_id,
        order.user_id,
        linkedWalletAddress
      );
    } else if (status === "failed" || status === "cancelled") {
      await connection.query(
        `
        UPDATE orders
        SET payment_status = ?,
            updated_at = NOW()
        WHERE id = ?
        `,
        [status === "failed" ? "failed" : "pending", payment.order_id]
      );
    } else if (status === "refunded") {
      await connection.query(
        `
        UPDATE orders
        SET payment_status = 'refunded',
            updated_at = NOW()
        WHERE id = ?
        `,
        [payment.order_id]
      );
    }

    await connection.commit();

    if (status === "success") {
      mintSummary = await mintPendingTicketsByOrder(payment.order_id);

      const nextOrderStatus =
        mintSummary.failed_count === 0 ? "completed" : "processing";

      await pool.query(
        `
        UPDATE orders
        SET order_status = ?,
            updated_at = NOW()
        WHERE id = ?
        `,
        [nextOrderStatus, payment.order_id]
      );
    }

    const [updatedRows] = await pool.query(
      `
      SELECT
        p.id,
        p.payment_code,
        p.order_id,
        o.order_code,
        o.payment_status,
        o.order_status,
        p.payment_method,
        p.amount,
        p.currency,
        p.gateway_transaction_id,
        p.blockchain_tx_hash,
        p.payer_wallet_address,
        p.status,
        p.paid_at,
        p.gateway_response,
        p.created_at,
        p.updated_at
      FROM payments p
      INNER JOIN orders o ON o.id = p.order_id
      WHERE p.id = ?
      LIMIT 1
      `,
      [paymentId]
    );

    const [ticketRows] = await pool.query(
      `
      SELECT
        id,
        ticket_code,
        order_id,
        order_item_id,
        event_id,
        ticket_type_id,
        owner_user_id,
        owner_wallet_address,
        unit_price,
        ticket_status,
        blockchain_ticket_id,
        contract_address,
        mint_tx_hash,
        metadata_uri,
        mint_status,
        minted_at,
        transferred_count,
        last_transfer_at,
        created_at,
        updated_at
      FROM tickets
      WHERE order_id = ?
      ORDER BY id ASC
      `,
      [payment.order_id]
    );

    return res.status(200).json({
      success: true,
      message:
        status === "success"
          ? mintSummary.failed_count === 0
            ? "Cập nhật thanh toán thành công, đơn hàng đã hoàn tất và NFT đã được mint tự động"
            : "Cập nhật thanh toán thành công, nhưng vẫn còn vé mint chưa thành công"
          : "Cập nhật trạng thái thanh toán thành công",
      data: {
        payment: updatedRows[0],
        tickets: status === "success" ? ticketRows : [],
        created_ticket_count: status === "success" ? createdTicketIds.length : 0,
        mint_summary: status === "success" ? mintSummary : null,
      },
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật trạng thái thanh toán",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllPayments,
  getPaymentDetail,
  updatePaymentStatus,
};