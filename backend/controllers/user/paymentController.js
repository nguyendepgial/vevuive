const pool = require("../../config/db");
const {
  debitBalance,
} = require("../../services/internalWalletService");

// =========================
// Helpers
// =========================
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

function parsePositiveNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed <= 0 ? null : Number(parsed.toFixed(2));
}

function isValidWalletAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Hiện tại DB chưa có enum app_wallet.
 * Vì vậy backend lưu payment_method = 'demo',
 * nhưng nghiệp vụ hiểu là thanh toán bằng ví nội bộ.
 */
function normalizePaymentMethodForDb(paymentMethod) {
  const method = normalizeString(paymentMethod || "demo").toLowerCase();

  if (["demo", "app_wallet", "internal_wallet", "metamask"].includes(method)) {
    return "demo";
  }

  return null;
}

function generatePaymentCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const i = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PAY${y}${m}${d}${h}${i}${s}${rand}`;
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

async function generateUniquePaymentCode(connection) {
  let code;
  let exists = true;

  while (exists) {
    code = generatePaymentCode();

    const [rows] = await connection.query(
      `
      SELECT id
      FROM payments
      WHERE payment_code = ?
      LIMIT 1
      `,
      [code]
    );

    exists = rows.length > 0;
  }

  return code;
}

async function generateUniqueTicketCode(connection) {
  let code;
  let exists = true;

  while (exists) {
    code = generateTicketCode();

    const [rows] = await connection.query(
      `
      SELECT id
      FROM tickets
      WHERE ticket_code = ?
      LIMIT 1
      `,
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

async function releaseReservedTickets(connection, orderId) {
  await connection.query(
    `
    UPDATE ticket_types tt
    INNER JOIN order_items oi ON oi.ticket_type_id = tt.id
    SET tt.quantity_sold = GREATEST(tt.quantity_sold - oi.quantity, 0),
        tt.updated_at = NOW()
    WHERE oi.order_id = ?
    `,
    [orderId]
  );
}

/**
 * Phát hành vé sau khi thanh toán thành công.
 * Vé được active ngay trong hệ thống.
 * Blockchain/NFT chỉ là optional, không còn bắt buộc để đơn hoàn tất.
 */
async function issueTicketsAutomatically(connection, orderId, userId, walletAddress) {
  const normalizedWallet = normalizeWalletAddress(walletAddress);

  if (!normalizedWallet || !isValidWalletAddress(normalizedWallet)) {
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, NOW(), NOW())
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

      const ticketId = insertResult.insertId;
      const metadataUri = buildDefaultMetadataUri(ticketId);

      await connection.query(
        `
        UPDATE tickets
        SET metadata_uri = ?,
            updated_at = NOW()
        WHERE id = ?
        `,
        [metadataUri, ticketId]
      );

      createdTicketIds.push(ticketId);
    }
  }

  return createdTicketIds;
}

// =========================
// User - Pay My Order
// POST /api/users/payments/pay
// =========================
const payMyOrder = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;

    let {
      order_id,
      payment_method,
      amount,
      currency,
      gateway_response,
    } = req.body;

    order_id = parsePositiveInt(order_id);
    payment_method = normalizePaymentMethodForDb(payment_method);
    amount = parsePositiveNumber(amount);
    currency = normalizeString(currency || "VND").toUpperCase();

    const errors = {};

    if (!order_id) {
      errors.order_id = "order_id không hợp lệ";
    }

    if (!payment_method) {
      errors.payment_method = "Hiện hệ thống chỉ hỗ trợ thanh toán bằng ví nội bộ";
    }

    if (!currency || currency.length !== 3) {
      errors.currency = "Mã tiền tệ không hợp lệ";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu thanh toán không hợp lệ",
        errors,
      });
    }

    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `
      SELECT
        id,
        order_code,
        user_id,
        total_amount,
        payment_status,
        order_status,
        payment_method,
        expires_at,
        created_at,
        updated_at
      FROM orders
      WHERE id = ? AND user_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [order_id, userId]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    const order = orderRows[0];
    const orderTotalAmount = Number(order.total_amount);

    if (!amount) {
      amount = orderTotalAmount;
    }

    if (order.payment_status === "paid") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Đơn hàng đã được thanh toán",
      });
    }

    if (!["pending", "awaiting_payment"].includes(order.order_status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Đơn hàng hiện không thể thanh toán",
      });
    }

    if (order.expires_at && new Date(order.expires_at) < new Date()) {
      await releaseReservedTickets(connection, order_id);

      await connection.query(
        `
        UPDATE orders
        SET payment_status = 'expired',
            order_status = 'expired',
            updated_at = NOW()
        WHERE id = ?
        `,
        [order_id]
      );

      await connection.commit();

      return res.status(400).json({
        success: false,
        message: "Đơn hàng đã hết hạn thanh toán",
      });
    }

    if (Number(amount) !== orderTotalAmount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Số tiền thanh toán không khớp với tổng tiền đơn hàng",
      });
    }

    const [walletRows] = await connection.query(
      `
      SELECT
        id,
        wallet_address,
        wallet_type,
        network_name,
        is_verified
      FROM wallets
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (walletRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Bạn cần liên kết ví trước khi thanh toán",
      });
    }

    const linkedWalletAddress = normalizeWalletAddress(walletRows[0].wallet_address);

    if (!linkedWalletAddress || !isValidWalletAddress(linkedWalletAddress)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Ví đã liên kết không hợp lệ",
      });
    }

    let walletTransaction;

    try {
      walletTransaction = await debitBalance(connection, {
        userId,
        amount,
        transactionType: "purchase_ticket",
        referenceType: "order",
        referenceId: order_id,
        note: `Thanh toán đơn hàng ${order.order_code}`,
        adminId: null,
      });
    } catch (walletErr) {
      await connection.rollback();

      if (walletErr.code === "INSUFFICIENT_BALANCE") {
        return res.status(400).json({
          success: false,
          message: "Số dư ví nội bộ không đủ để thanh toán đơn hàng",
          data: {
            current_balance: walletErr.currentBalance,
            required_amount: walletErr.requiredAmount,
          },
        });
      }

      return res.status(400).json({
        success: false,
        message: walletErr.message || "Không thể trừ tiền ví nội bộ",
      });
    }

    const paymentCode = await generateUniquePaymentCode(connection);

    const normalizedGatewayResponse = JSON.stringify({
      source: "internal_wallet",
      note: "Thanh toán bằng ví nội bộ trong hệ thống",
      wallet_transaction_id: walletTransaction.id,
      submitted_data: gateway_response || null,
    });

    const [paymentResult] = await connection.query(
      `
      INSERT INTO payments (
        payment_code,
        order_id,
        payment_method,
        amount,
        currency,
        gateway_transaction_id,
        blockchain_tx_hash,
        payer_wallet_address,
        status,
        paid_at,
        gateway_response,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, 'success', NOW(), ?, NOW(), NOW())
      `,
      [
        paymentCode,
        order_id,
        payment_method,
        amount,
        currency,
        linkedWalletAddress,
        normalizedGatewayResponse,
      ]
    );

    const createdTicketIds = await issueTicketsAutomatically(
      connection,
      order_id,
      userId,
      linkedWalletAddress
    );

    await connection.query(
      `
      UPDATE orders
      SET payment_status = 'paid',
          order_status = 'completed',
          payment_method = ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [payment_method, order_id]
    );

    await connection.commit();

    const [paymentRows] = await pool.query(
      `
      SELECT
        id,
        payment_code,
        order_id,
        payment_method,
        amount,
        currency,
        gateway_transaction_id,
        blockchain_tx_hash,
        payer_wallet_address,
        status,
        paid_at,
        gateway_response,
        created_at,
        updated_at
      FROM payments
      WHERE id = ?
      LIMIT 1
      `,
      [paymentResult.insertId]
    );

    const [updatedOrderRows] = await pool.query(
      `
      SELECT
        id,
        order_code,
        user_id,
        total_amount,
        payment_status,
        order_status,
        payment_method,
        notes,
        expires_at,
        cancelled_at,
        cancel_reason,
        created_at,
        updated_at
      FROM orders
      WHERE id = ?
      LIMIT 1
      `,
      [order_id]
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
      [order_id]
    );

    return res.status(200).json({
      success: true,
      message: "Thanh toán thành công, vé đã được phát hành",
      data: {
        order: updatedOrderRows[0],
        payment: paymentRows[0],
        wallet_transaction: walletTransaction,
        tickets: ticketRows,
        created_ticket_count: createdTicketIds.length,
      },
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi xử lý thanh toán",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// User - Get My Payments
// GET /api/users/payments
// =========================
const getMyPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const status = normalizeString(req.query.status || "");
    const paymentMethod = normalizeString(req.query.payment_method || "").toLowerCase();

    const whereClauses = ["o.user_id = ?"];
    const values = [userId];

    if (status) {
      whereClauses.push("p.status = ?");
      values.push(status);
    }

    if (paymentMethod) {
      whereClauses.push("p.payment_method = ?");
      values.push(paymentMethod);
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
// User - Get My Payment Detail
// GET /api/users/payments/:id
// =========================
const getMyPaymentDetail = async (req, res) => {
  try {
    const userId = req.user.id;
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
      WHERE p.id = ? AND o.user_id = ?
      LIMIT 1
      `,
      [paymentId, userId]
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

module.exports = {
  payMyOrder,
  getMyPayments,
  getMyPaymentDetail,
};