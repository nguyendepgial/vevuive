const pool = require("../../config/db");

// =========================
// Helpers
// =========================
function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function generateOrderCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const i = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD${y}${m}${d}${h}${i}${s}${rand}`;
}

function isAllowedPaymentMethod(paymentMethod) {
  return ["demo", "metamask", "stripe", "bank_transfer", "cash"].includes(paymentMethod);
}

function aggregateItems(items) {
  const map = new Map();

  for (const item of items) {
    const ticketTypeId = parsePositiveInt(item.ticket_type_id);
    const quantity = parsePositiveInt(item.quantity);

    if (!ticketTypeId || !quantity) {
      return { error: "Dữ liệu ticket_type_id hoặc quantity không hợp lệ" };
    }

    const current = map.get(ticketTypeId) || 0;
    map.set(ticketTypeId, current + quantity);
  }

  return {
    items: Array.from(map.entries()).map(([ticket_type_id, quantity]) => ({
      ticket_type_id,
      quantity,
    })),
  };
}

// =========================
// User - Create Order
// =========================
const createOrder = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    let { items, notes, payment_method } = req.body;

    notes = normalizeString(notes);
    payment_method = normalizeString(payment_method || "demo").toLowerCase();

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sách vé đặt không hợp lệ",
      });
    }

    if (!isAllowedPaymentMethod(payment_method)) {
      return res.status(400).json({
        success: false,
        message: "Phương thức thanh toán không hợp lệ",
      });
    }

    const aggregated = aggregateItems(items);
    if (aggregated.error) {
      return res.status(400).json({
        success: false,
        message: aggregated.error,
      });
    }

    const normalizedItems = aggregated.items;
    const ticketTypeIds = normalizedItems.map((item) => item.ticket_type_id);

    await connection.beginTransaction();

    // Bắt buộc user phải có ví trước khi tạo order
    const [walletRows] = await connection.query(
      `
      SELECT id, wallet_address, wallet_type, network_name, is_verified
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
        message: "Bạn cần liên kết ví trước khi đặt vé",
      });
    }

    const [ticketTypeRows] = await connection.query(
      `
      SELECT
        tt.id,
        tt.event_id,
        tt.name,
        tt.price,
        tt.quantity_total,
        tt.quantity_sold,
        tt.max_per_order,
        tt.sale_start,
        tt.sale_end,
        tt.status,
        e.title AS event_title,
        e.status AS event_status,
        e.event_date
      FROM ticket_types tt
      INNER JOIN events e ON e.id = tt.event_id
      WHERE tt.id IN (?)
      FOR UPDATE
      `,
      [ticketTypeIds]
    );

    if (ticketTypeRows.length !== ticketTypeIds.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Có loại vé không tồn tại",
      });
    }

    const ticketTypeMap = new Map(ticketTypeRows.map((row) => [row.id, row]));

    // Chỉ cho order trong cùng 1 event
    const eventIds = new Set(ticketTypeRows.map((row) => row.event_id));
    if (eventIds.size !== 1) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Mỗi đơn hàng chỉ được chứa vé của một sự kiện",
      });
    }

    let totalAmount = 0;
    const orderItemsToInsert = [];

    for (const item of normalizedItems) {
      const ticketType = ticketTypeMap.get(item.ticket_type_id);

      if (!ticketType) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: "Loại vé không tồn tại",
        });
      }

      if (!["upcoming", "on_sale"].includes(ticketType.event_status)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Sự kiện "${ticketType.event_title}" hiện không cho phép đặt vé`,
        });
      }

      if (new Date(ticketType.event_date) <= new Date()) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Sự kiện "${ticketType.event_title}" đã diễn ra hoặc không còn hợp lệ`,
        });
      }

      if (ticketType.status !== "active") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Loại vé "${ticketType.name}" hiện không hoạt động`,
        });
      }

      if (ticketType.sale_start && new Date(ticketType.sale_start) > new Date()) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Loại vé "${ticketType.name}" chưa đến thời gian mở bán`,
        });
      }

      if (ticketType.sale_end && new Date(ticketType.sale_end) < new Date()) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Loại vé "${ticketType.name}" đã hết thời gian mở bán`,
        });
      }

      if (item.quantity > ticketType.max_per_order) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Số lượng vé "${ticketType.name}" vượt quá giới hạn mỗi đơn`,
        });
      }

      const available = ticketType.quantity_total - ticketType.quantity_sold;
      if (item.quantity > available) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Loại vé "${ticketType.name}" không đủ số lượng`,
        });
      }

      totalAmount += Number(ticketType.price) * item.quantity;

      orderItemsToInsert.push({
        ticket_type_id: ticketType.id,
        ticket_type_name_snapshot: ticketType.name,
        unit_price: ticketType.price,
        quantity: item.quantity,
      });
    }

    const orderCode = generateOrderCode();

    const [orderResult] = await connection.query(
      `
      INSERT INTO orders (
        order_code,
        user_id,
        total_amount,
        payment_status,
        order_status,
        payment_method,
        notes,
        expires_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 'pending', 'awaiting_payment', ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), NOW(), NOW())
      `,
      [orderCode, userId, totalAmount, payment_method, notes || null]
    );

    const orderId = orderResult.insertId;

    for (const item of orderItemsToInsert) {
      await connection.query(
        `
        INSERT INTO order_items (
          order_id,
          ticket_type_id,
          ticket_type_name_snapshot,
          unit_price,
          quantity,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, NOW())
        `,
        [
          orderId,
          item.ticket_type_id,
          item.ticket_type_name_snapshot,
          item.unit_price,
          item.quantity,
        ]
      );

      await connection.query(
        `
        UPDATE ticket_types
        SET quantity_sold = quantity_sold + ?, updated_at = NOW()
        WHERE id = ?
        `,
        [item.quantity, item.ticket_type_id]
      );
    }

    await connection.commit();

    const [orderRows] = await pool.query(
      `
      SELECT
        o.id,
        o.order_code,
        o.user_id,
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
      WHERE o.id = ?
      LIMIT 1
      `,
      [orderId]
    );

    const [createdItems] = await pool.query(
      `
      SELECT
        oi.id,
        oi.order_id,
        oi.ticket_type_id,
        oi.ticket_type_name_snapshot,
        oi.unit_price,
        oi.quantity,
        oi.subtotal,
        oi.created_at
      FROM order_items oi
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
      `,
      [orderId]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo đơn hàng thành công",
      data: {
        ...orderRows[0],
        items: createdItems,
      },
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo đơn hàng",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// User - Get My Orders
// =========================
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const orderStatus = normalizeString(req.query.order_status || "");
    const paymentStatus = normalizeString(req.query.payment_status || "");
    const orderCode = normalizeString(req.query.order_code || "");

    const whereClauses = ["o.user_id = ?"];
    const values = [userId];

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
// User - Get My Order Detail
// =========================
const getMyOrderDetail = async (req, res) => {
  try {
    const userId = req.user.id;
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
      WHERE o.id = ? AND o.user_id = ?
      LIMIT 1
      `,
      [orderId, userId]
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

// =========================
// User - Cancel My Order
// =========================
const cancelMyOrder = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const orderId = parsePositiveInt(req.params.id);
    let { cancel_reason } = req.body;

    cancel_reason = normalizeString(cancel_reason);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "ID đơn hàng không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `
      SELECT
        id,
        user_id,
        payment_status,
        order_status
      FROM orders
      WHERE id = ? AND user_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [orderId, userId]
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
        message: "Không thể hủy đơn hàng đã thanh toán",
      });
    }

    if (!["pending", "awaiting_payment"].includes(order.order_status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Đơn hàng hiện không thể hủy",
      });
    }

    const [orderItemRows] = await connection.query(
      `
      SELECT id, ticket_type_id, quantity
      FROM order_items
      WHERE order_id = ?
      FOR UPDATE
      `,
      [orderId]
    );

    for (const item of orderItemRows) {
      await connection.query(
        `
        UPDATE ticket_types
        SET quantity_sold = quantity_sold - ?, updated_at = NOW()
        WHERE id = ? AND quantity_sold >= ?
        `,
        [item.quantity, item.ticket_type_id, item.quantity]
      );
    }

    await connection.query(
      `
      UPDATE orders
      SET order_status = 'cancelled',
          cancelled_at = NOW(),
          cancel_reason = ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [cancel_reason || "Người dùng hủy đơn hàng", orderId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Hủy đơn hàng thành công",
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi hủy đơn hàng",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getMyOrderDetail,
  cancelMyOrder,
};