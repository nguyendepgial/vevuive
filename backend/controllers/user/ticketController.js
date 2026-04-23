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

// =========================
// User - Get My Tickets
// =========================
const getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id;

    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const ticketStatus = normalizeString(req.query.ticket_status || "");
    const mintStatus = normalizeString(req.query.mint_status || "");
    const ticketCode = normalizeString(req.query.ticket_code || "");
    const orderId = parsePositiveInt(req.query.order_id);

    const whereClauses = ["t.owner_user_id = ?"];
    const values = [userId];

    if (ticketStatus) {
      whereClauses.push("t.ticket_status = ?");
      values.push(ticketStatus);
    }

    if (mintStatus) {
      whereClauses.push("t.mint_status = ?");
      values.push(mintStatus);
    }

    if (ticketCode) {
      whereClauses.push("t.ticket_code LIKE ?");
      values.push(`%${ticketCode}%`);
    }

    if (orderId) {
      whereClauses.push("t.order_id = ?");
      values.push(orderId);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM tickets t
      WHERE ${whereSql}
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT
        t.id,
        t.ticket_code,
        t.order_id,
        o.order_code,
        t.order_item_id,
        t.event_id,
        e.title AS event_title,
        e.event_date,
        t.ticket_type_id,
        tt.name AS ticket_type_name,
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
      INNER JOIN orders o ON o.id = t.order_id
      INNER JOIN events e ON e.id = t.event_id
      INNER JOIN ticket_types tt ON tt.id = t.ticket_type_id
      WHERE ${whereSql}
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách vé của tôi thành công",
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
      message: "Lỗi server khi lấy danh sách vé",
      error: err.message,
    });
  }
};

// =========================
// User - Get My Ticket Detail
// =========================
const getMyTicketDetail = async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketId = parsePositiveInt(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: "ID vé không hợp lệ",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        t.id,
        t.ticket_code,
        t.order_id,
        o.order_code,
        t.order_item_id,
        t.event_id,
        e.title AS event_title,
        e.event_date,
        t.ticket_type_id,
        tt.name AS ticket_type_name,
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
        t.transferred_count,
        t.last_transfer_at,
        t.created_at,
        t.updated_at
      FROM tickets t
      INNER JOIN orders o ON o.id = t.order_id
      INNER JOIN events e ON e.id = t.event_id
      INNER JOIN ticket_types tt ON tt.id = t.ticket_type_id
      WHERE t.id = ? AND t.owner_user_id = ?
      LIMIT 1
      `,
      [ticketId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vé không tồn tại",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết vé thành công",
      data: rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết vé",
      error: err.message,
    });
  }
};

module.exports = {
  getMyTickets,
  getMyTicketDetail,
};