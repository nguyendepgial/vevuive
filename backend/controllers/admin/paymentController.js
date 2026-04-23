const pool = require("../../config/db");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function isAllowedPaymentStatus(status) {
  return ["pending", "success", "failed", "refunded", "cancelled"].includes(status);
}

function isAllowedPaymentMethod(paymentMethod) {
  return ["demo", "metamask", "stripe", "bank_transfer", "cash"].includes(paymentMethod);
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

    if (status === "success") {
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

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái thanh toán thành công",
      data: updatedRows[0],
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