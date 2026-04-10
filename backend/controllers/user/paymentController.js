const pool = require("../../config/db");

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
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function isAllowedPaymentMethod(paymentMethod) {
  return ["demo", "metamask", "stripe", "bank_transfer", "cash"].includes(paymentMethod);
}

function isValidWalletAddress(address) {
  return /^0x[a-f0-9]{40}$/.test(address);
}

function isValidBlockchainTxHash(hash) {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
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

// =========================
// User - Pay My Order
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
      gateway_transaction_id,
      blockchain_tx_hash,
      payer_wallet_address,
      gateway_response,
    } = req.body;

    order_id = parsePositiveInt(order_id);
    payment_method = normalizeString(payment_method || "demo").toLowerCase();
    amount = parsePositiveNumber(amount);
    currency = normalizeString(currency || "VND").toUpperCase();
    gateway_transaction_id = normalizeString(gateway_transaction_id);
    blockchain_tx_hash = normalizeString(blockchain_tx_hash);
    payer_wallet_address = normalizeWalletAddress(payer_wallet_address);
    gateway_response =
      gateway_response !== undefined && gateway_response !== null
        ? JSON.stringify(gateway_response)
        : null;

    const errors = {};

    if (!order_id) {
      errors.order_id = "order_id không hợp lệ";
    }

    if (!isAllowedPaymentMethod(payment_method)) {
      errors.payment_method = "Phương thức thanh toán không hợp lệ";
    }

    if (!amount) {
      errors.amount = "Số tiền thanh toán không hợp lệ";
    }

    if (!currency || currency.length !== 3) {
      errors.currency = "Mã tiền tệ không hợp lệ";
    }

    if (payment_method === "metamask") {
      if (!blockchain_tx_hash || !isValidBlockchainTxHash(blockchain_tx_hash)) {
        errors.blockchain_tx_hash = "Blockchain tx hash không hợp lệ";
      }

      if (!payer_wallet_address || !isValidWalletAddress(payer_wallet_address)) {
        errors.payer_wallet_address = "Địa chỉ ví thanh toán không hợp lệ";
      }
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

      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Đơn hàng đã hết hạn thanh toán",
      });
    }

    if (Number(amount) !== Number(order.total_amount)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Số tiền thanh toán không khớp với tổng tiền đơn hàng",
      });
    }

    if (payment_method === "metamask") {
      const [walletRows] = await connection.query(
        `
        SELECT wallet_address
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
          message: "Người dùng chưa liên kết ví",
        });
      }

      const linkedWallet = String(walletRows[0].wallet_address || "").toLowerCase();
      if (linkedWallet !== payer_wallet_address) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Ví thanh toán không khớp với ví đã liên kết",
        });
      }
    }

    const paymentCode = generatePaymentCode();

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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'success', NOW(), ?, NOW(), NOW())
      `,
      [
        paymentCode,
        order_id,
        payment_method,
        amount,
        currency,
        gateway_transaction_id || null,
        blockchain_tx_hash || null,
        payer_wallet_address || null,
        gateway_response,
      ]
    );

    await connection.query(
      `
      UPDATE orders
      SET payment_status = 'paid',
          order_status = 'processing',
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

    return res.status(200).json({
      success: true,
      message: "Thanh toán thành công",
      data: {
        order: updatedOrderRows[0],
        payment: paymentRows[0],
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