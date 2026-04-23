const pool = require("../../config/db");

// =========================
// Helpers
// =========================
function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

// =========================
// User - Get Public Ticket Types By Event
// =========================
const getPublicTicketTypesByEvent = async (req, res) => {
  try {
    const eventId = parsePositiveInt(req.params.eventId);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "ID sự kiện không hợp lệ",
      });
    }

    const [eventRows] = await pool.query(
      `
      SELECT
        id,
        title,
        slug,
        status,
        event_date
      FROM events
      WHERE id = ?
        AND status IN ('upcoming', 'on_sale', 'sold_out')
      LIMIT 1
      `,
      [eventId]
    );

    if (eventRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sự kiện không tồn tại hoặc không công khai",
      });
    }

    const [ticketTypeRows] = await pool.query(
      `
      SELECT
        tt.id,
        tt.event_id,
        tt.name,
        tt.description,
        tt.price,
        tt.quantity_total,
        tt.quantity_sold,
        (tt.quantity_total - tt.quantity_sold) AS quantity_available,
        tt.max_per_order,
        tt.sale_start,
        tt.sale_end,
        tt.status,
        tt.created_at,
        tt.updated_at
      FROM ticket_types tt
      WHERE tt.event_id = ?
        AND tt.status = 'active'
        AND (tt.sale_start IS NULL OR tt.sale_start <= NOW())
        AND (tt.sale_end IS NULL OR tt.sale_end >= NOW())
      ORDER BY tt.price ASC, tt.id ASC
      `,
      [eventId]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách loại vé thành công",
      data: {
        event: eventRows[0],
        ticket_types: ticketTypeRows,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách loại vé",
      error: err.message,
    });
  }
};

module.exports = {
  getPublicTicketTypesByEvent,
};