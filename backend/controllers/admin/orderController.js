const pool = require("../../config/db");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

// =========================
// Admin - Get All Orders
// =========================
const getAllOrders = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const orderStatus = normalizeString(req.query.order_status || "");
    const paymentStatus = normalizeString(req.query.payment_status || "");
    const orderCode = normalizeString(req.query.order_code || "");
    const userId = parsePositiveInt(req.query.user_id);

    const whereClauses = ["1 = 1"];
    const values = [];

    if (orderStatus) {
      whereClauses.push("o.order_status = ?");
      values.push(orderStatus);
    }

    if (paymentStatus) {
      whereClauses.push("o.payment_status = ?");
      values.push(paymentStatus);
    }

    if (orderCode) {
      whereClauses.push("o.order_code LIKE ?");
      values.push(`%${orderCode}%`);
    }

    if (userId) {
      whereClauses.push("o.user_id = ?");
      values.push(userId);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM orders o
      WHERE ${whereSql}
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT
        o.id,
        o.order_code,
        o.user_id,
        u.full_name,
        u.email,
        u.phone,
        o.total_amount,
        o.payment_status,
        o.order_status,
        o.payment_method,
        o.notes,
        o.expires_at,
        o.cancelled_at,
        o.cancel_reason,
        o.created_at,
        o.updated_at,
        COUNT(oi.id) AS total_items,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity
      FROM orders o
      INNER JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE ${whereSql}
      GROUP BY o.id
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách đơn hàng thành công",
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
      message: "Lỗi server khi lấy danh sách đơn hàng",
      error: err.message,
    });
  }
};

// =========================
// Admin - Get Order Detail
// =========================
const getOrderDetail = async (req, res) => {
  try {
    const orderId = parsePositiveInt(req.params.id);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "ID đơn hàng không hợp lệ",
      });
    }

    const [orderRows] = await pool.query(
      `
      SELECT
        o.id,
        o.order_code,
        o.user_id,
        u.full_name,
        u.email,
        u.phone,
        o.total_amount,
        o.payment_status,
        o.order_status,
        o.payment_method,
        o.notes,
        o.expires_at,
        o.cancelled_at,
        o.cancel_reason,
        o.created_at,
        o.updated_at
      FROM orders o
      INNER JOIN users u ON u.id = o.user_id
      WHERE o.id = ?
      LIMIT 1
      `,
      [orderId]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    const [itemRows] = await pool.query(
      `
      SELECT
        oi.id,
        oi.order_id,
        oi.ticket_type_id,
        oi.ticket_type_name_snapshot,
        oi.unit_price,
        oi.quantity,
        oi.subtotal,
        oi.created_at,
        tt.event_id,
        e.title AS event_title,
        e.event_date
      FROM order_items oi
      INNER JOIN ticket_types tt ON tt.id = oi.ticket_type_id
      INNER JOIN events e ON e.id = tt.event_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
      `,
      [orderId]
    );

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
      WHERE order_id = ?
      ORDER BY created_at DESC, id DESC
      `,
      [orderId]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết đơn hàng thành công",
      data: {
        ...orderRows[0],
        items: itemRows,
        payments: paymentRows,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết đơn hàng",
      error: err.message,
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderDetail,
};