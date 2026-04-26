const pool = require("../../config/db");

function fillLast7Days(rows, valueKey = "value") {
  const map = new Map();

  rows.forEach((row) => {
    const key = row.day_key;
    map.set(key, Number(row[valueKey] || 0));
  });

  const result = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const key = date.toISOString().slice(0, 10);

    result.push({
      day_key: key,
      label: date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }),
      value: map.get(key) || 0,
    });
  }

  return result;
}

// =========================
// Admin - Dashboard Overview
// GET /api/admin/dashboard
// =========================
const getAdminDashboard = async (req, res) => {
  try {
    const [statRows] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM events) AS total_events,
        (SELECT COUNT(*) FROM events WHERE status = 'on_sale') AS on_sale_events,

        (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers,
        (SELECT COUNT(*) FROM users WHERE role = 'admin') AS total_admins,

        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT COUNT(*) FROM orders WHERE order_status = 'completed') AS completed_orders,
        (SELECT COUNT(*) FROM orders WHERE order_status = 'awaiting_payment') AS awaiting_payment_orders,
        (SELECT COUNT(*) FROM orders WHERE payment_status = 'pending') AS pending_payment_orders,

        (SELECT COUNT(*) FROM tickets) AS total_tickets,
        (SELECT COUNT(*) FROM tickets WHERE ticket_status = 'active') AS active_tickets,
        (SELECT COUNT(*) FROM tickets WHERE ticket_status = 'used') AS used_tickets,
        (SELECT COUNT(*) FROM tickets WHERE ticket_status = 'transfer_pending') AS transfer_pending_tickets,

        COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'success'), 0) AS total_revenue,
        COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'success' AND DATE(paid_at) = CURDATE()), 0) AS today_revenue,
        COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'success' AND MONTH(paid_at) = MONTH(CURDATE()) AND YEAR(paid_at) = YEAR(CURDATE())), 0) AS month_revenue,

        COALESCE((SELECT SUM(balance) FROM user_balances), 0) AS total_internal_balance,

        (SELECT COUNT(*) FROM wallet_topup_requests WHERE status = 'pending') AS pending_topup_requests,
        (SELECT COUNT(*) FROM wallet_topup_requests WHERE status = 'paid_submitted') AS submitted_topup_requests,
        (SELECT COUNT(*) FROM wallet_topup_requests WHERE status = 'approved') AS approved_topup_requests,

        (SELECT COUNT(*) FROM ticket_listings WHERE status = 'active') AS active_marketplace_listings,
        (SELECT COUNT(*) FROM ticket_listings WHERE status = 'waiting_admin') AS waiting_admin_marketplace_listings,
        (SELECT COUNT(*) FROM ticket_listings WHERE status = 'sold') AS sold_marketplace_listings,

        COALESCE((SELECT SUM(asking_price) FROM ticket_listings WHERE status = 'sold'), 0) AS marketplace_sold_value,

        (SELECT COUNT(*) FROM ticket_transfers WHERE status = 'pending') AS pending_transfer_requests,
        (SELECT COUNT(*) FROM ticket_transfers WHERE status = 'completed') AS completed_transfer_requests
    `);

    const [revenueRows] = await pool.query(`
      SELECT
        DATE(paid_at) AS day_key,
        COALESCE(SUM(amount), 0) AS value
      FROM payments
      WHERE status = 'success'
        AND paid_at IS NOT NULL
        AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(paid_at)
      ORDER BY DATE(paid_at)
    `);

    const [orderStatusRows] = await pool.query(`
      SELECT order_status AS status, COUNT(*) AS total
      FROM orders
      GROUP BY order_status
      ORDER BY total DESC
    `);

    const [ticketStatusRows] = await pool.query(`
      SELECT ticket_status AS status, COUNT(*) AS total
      FROM tickets
      GROUP BY ticket_status
      ORDER BY total DESC
    `);

    const [topupStatusRows] = await pool.query(`
      SELECT status, COUNT(*) AS total
      FROM wallet_topup_requests
      GROUP BY status
      ORDER BY total DESC
    `);

    const [marketplaceStatusRows] = await pool.query(`
      SELECT status, COUNT(*) AS total
      FROM ticket_listings
      GROUP BY status
      ORDER BY total DESC
    `);

    const [ticketTypeRows] = await pool.query(`
      SELECT
        tt.id,
        tt.name,
        tt.quantity_total,
        tt.quantity_sold,
        tt.price,
        e.title AS event_title,
        CASE
          WHEN tt.quantity_total > 0
          THEN ROUND((tt.quantity_sold / tt.quantity_total) * 100, 0)
          ELSE 0
        END AS sold_percent
      FROM ticket_types tt
      INNER JOIN events e ON e.id = tt.event_id
      ORDER BY sold_percent DESC, tt.quantity_sold DESC
      LIMIT 6
    `);

    const [topEventRows] = await pool.query(`
      SELECT
        e.id,
        e.title,
        e.location,
        e.event_date,
        e.status,
        COALESCE(SUM(tt.quantity_total), 0) AS total_capacity,
        COALESCE(SUM(tt.quantity_sold), 0) AS total_reserved,
        COALESCE(SUM(tt.quantity_sold * tt.price), 0) AS estimated_revenue
      FROM events e
      LEFT JOIN ticket_types tt ON tt.event_id = e.id
      GROUP BY e.id
      ORDER BY estimated_revenue DESC, total_reserved DESC
      LIMIT 5
    `);

    const [recentOrderRows] = await pool.query(`
      SELECT
        o.id,
        o.order_code,
        o.total_amount,
        o.payment_status,
        o.order_status,
        o.created_at,
        u.full_name,
        u.email
      FROM orders o
      INNER JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC, o.id DESC
      LIMIT 6
    `);

    const [recentTopupRows] = await pool.query(`
      SELECT
        wtr.id,
        wtr.topup_code,
        wtr.amount,
        wtr.currency,
        wtr.status,
        wtr.requested_at,
        wtr.submitted_at,
        wtr.approved_at,
        u.full_name,
        u.email
      FROM wallet_topup_requests wtr
      INNER JOIN users u ON u.id = wtr.user_id
      ORDER BY wtr.created_at DESC, wtr.id DESC
      LIMIT 6
    `);

    const [recentMarketplaceRows] = await pool.query(`
      SELECT
        tl.id,
        tl.listing_code,
        tl.asking_price,
        tl.status,
        tl.listed_at,
        tl.buyer_selected_at,
        tl.sold_at,
        t.ticket_code,
        e.title AS event_title,
        seller.full_name AS seller_name,
        buyer.full_name AS buyer_name
      FROM ticket_listings tl
      INNER JOIN tickets t ON t.id = tl.ticket_id
      INNER JOIN events e ON e.id = t.event_id
      INNER JOIN users seller ON seller.id = tl.seller_user_id
      LEFT JOIN users buyer ON buyer.id = tl.buyer_user_id
      ORDER BY tl.created_at DESC, tl.id DESC
      LIMIT 6
    `);

    const [eventRows] = await pool.query(`
      SELECT
        id,
        title,
        location,
        event_date,
        status,
        created_at
      FROM events
      ORDER BY event_date ASC
      LIMIT 6
    `);

    return res.status(200).json({
      success: true,
      message: "Lấy dữ liệu dashboard admin thành công",
      data: {
        stats: statRows[0],
        revenue_last_7_days: fillLast7Days(revenueRows, "value"),
        order_status_summary: orderStatusRows,
        ticket_status_summary: ticketStatusRows,
        topup_status_summary: topupStatusRows,
        marketplace_status_summary: marketplaceStatusRows,
        ticket_type_performance: ticketTypeRows,
        top_events: topEventRows,
        recent_orders: recentOrderRows,
        recent_topups: recentTopupRows,
        recent_marketplace: recentMarketplaceRows,
        upcoming_events: eventRows,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy dữ liệu dashboard admin",
      error: err.message,
    });
  }
};

module.exports = {
  getAdminDashboard,
};