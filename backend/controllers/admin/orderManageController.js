const pool = require("../../config/db");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

const allowedOrderStatus = [
  "awaiting_payment",
  "processing",
  "completed",
  "cancelled",
  "expired",
];

const allowedPaymentStatus = [
  "pending",
  "paid",
  "failed",
  "expired",
  "refunded",
];

// =========================
// Admin - Get Orders
// GET /api/admin/manage/orders
// =========================
const getManageOrders = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const search = normalizeString(req.query.search || "");
    const orderStatus = normalizeString(req.query.order_status || "");
    const paymentStatus = normalizeString(req.query.payment_status || "");

    const whereClauses = [];
    const values = [];

    if (search) {
      whereClauses.push(
        "(o.order_code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)"
      );
      values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (orderStatus) {
      whereClauses.push("o.order_status = ?");
      values.push(orderStatus);
    }

    if (paymentStatus) {
      whereClauses.push("o.payment_status = ?");
      values.push(paymentStatus);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM orders o
      INNER JOIN users u ON u.id = o.user_id
      ${whereSql}
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

        COUNT(DISTINCT oi.id) AS item_count,
        COALESCE(SUM(oi.quantity), 0) AS total_quantity,
        COUNT(DISTINCT t.id) AS issued_ticket_count,
        MAX(p.paid_at) AS paid_at
      FROM orders o
      INNER JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN tickets t ON t.order_id = o.id
      LEFT JOIN payments p ON p.order_id = o.id AND p.status = 'success'
      ${whereSql}
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
// GET /api/admin/manage/orders/:id
// =========================
const getManageOrderDetail = async (req, res) => {
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
        u.status AS user_status,
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
        tt.event_id,
        e.title AS event_title,
        e.event_date,
        e.location AS event_location
      FROM order_items oi
      LEFT JOIN ticket_types tt ON tt.id = oi.ticket_type_id
      LEFT JOIN events e ON e.id = tt.event_id
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

    const [ticketRows] = await pool.query(
      `
      SELECT
        t.id,
        t.ticket_code,
        t.order_id,
        t.order_item_id,
        t.event_id,
        e.title AS event_title,
        t.ticket_type_id,
        tt.name AS ticket_type_name,
        t.owner_user_id,
        owner.full_name AS owner_name,
        owner.email AS owner_email,
        t.owner_wallet_address,
        t.unit_price,
        t.ticket_status,
        t.blockchain_ticket_id,
        t.contract_address,
        t.mint_tx_hash,
        t.metadata_uri,
        t.mint_status,
        t.minted_at,
        t.transferred_count,
        t.last_transfer_at,
        t.created_at,
        t.updated_at
      FROM tickets t
      LEFT JOIN events e ON e.id = t.event_id
      LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
      LEFT JOIN users owner ON owner.id = t.owner_user_id
      WHERE t.order_id = ?
      ORDER BY t.id ASC
      `,
      [orderId]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết đơn hàng thành công",
      data: {
        order: orderRows[0],
        items: itemRows,
        payments: paymentRows,
        tickets: ticketRows,
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

// =========================
// Admin - Update Order Status
// PUT /api/admin/manage/orders/:id/status
// =========================
const updateManageOrderStatus = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const orderId = parsePositiveInt(req.params.id);

    const orderStatus = normalizeString(req.body.order_status || "");
    const paymentStatus = normalizeString(req.body.payment_status || "");
    const cancelReason = normalizeString(req.body.cancel_reason || "");

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "ID đơn hàng không hợp lệ",
      });
    }

    const errors = {};

    if (orderStatus && !allowedOrderStatus.includes(orderStatus)) {
      errors.order_status = "Trạng thái đơn hàng không hợp lệ";
    }

    if (paymentStatus && !allowedPaymentStatus.includes(paymentStatus)) {
      errors.payment_status = "Trạng thái thanh toán không hợp lệ";
    }

    if (!orderStatus && !paymentStatus) {
      errors.status = "Cần gửi ít nhất một trạng thái để cập nhật";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu cập nhật không hợp lệ",
        errors,
      });
    }

    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `
      SELECT id, order_code, payment_status, order_status
      FROM orders
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [orderId]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    const updates = [];
    const values = [];

    if (orderStatus) {
      updates.push("order_status = ?");
      values.push(orderStatus);

      if (orderStatus === "cancelled") {
        updates.push("cancelled_at = NOW()");
        updates.push("cancel_reason = ?");
        values.push(cancelReason || "Admin hủy đơn hàng");
      }
    }

    if (paymentStatus) {
      updates.push("payment_status = ?");
      values.push(paymentStatus);
    }

    updates.push("updated_at = NOW()");
    values.push(orderId);

    await connection.query(
      `
      UPDATE orders
      SET ${updates.join(", ")}
      WHERE id = ?
      `,
      values
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái đơn hàng thành công",
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật trạng thái đơn hàng",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getManageOrders,
  getManageOrderDetail,
  updateManageOrderStatus,
};