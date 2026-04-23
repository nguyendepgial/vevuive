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
// Get Public Events
// =========================
const getPublicEvents = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const keyword = normalizeString(req.query.keyword || "");
    const status = normalizeString(req.query.status || "");

    const whereClauses = [`e.status IN ('upcoming', 'on_sale', 'sold_out')`];
    const values = [];

    if (keyword) {
      whereClauses.push(`(e.title LIKE ? OR e.location LIKE ? OR e.organizer_name LIKE ?)`);
      values.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (status) {
      const allowedStatuses = ["upcoming", "on_sale", "sold_out"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái sự kiện không hợp lệ",
        });
      }
      whereClauses.push(`e.status = ?`);
      values.push(status);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM events e
      WHERE ${whereSql}
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT
        e.id,
        e.title,
        e.slug,
        e.description,
        e.location,
        e.event_date,
        e.banner_image,
        e.organizer_name,
        e.status,
        e.created_at,
        e.updated_at
      FROM events e
      WHERE ${whereSql}
      ORDER BY e.event_date ASC, e.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách sự kiện thành công",
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
      message: "Lỗi server khi lấy danh sách sự kiện",
      error: err.message,
    });
  }
};

// =========================
// Get Public Event Detail
// =========================
const getPublicEventDetail = async (req, res) => {
  try {
    const eventId = parsePositiveInt(req.params.id);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "ID sự kiện không hợp lệ",
      });
    }

    const [eventRows] = await pool.query(
      `
      SELECT
        e.id,
        e.title,
        e.slug,
        e.description,
        e.location,
        e.event_date,
        e.banner_image,
        e.organizer_name,
        e.status,
        e.created_at,
        e.updated_at
      FROM events e
      WHERE e.id = ?
        AND e.status IN ('upcoming', 'on_sale', 'sold_out')
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
      message: "Lấy chi tiết sự kiện thành công",
      data: {
        ...eventRows[0],
        ticket_types: ticketTypeRows,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết sự kiện",
      error: err.message,
    });
  }
};

module.exports = {
  getPublicEvents,
  getPublicEventDetail,
};