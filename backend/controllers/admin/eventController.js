const pool = require("../../config/db");

// =========================
// Helpers
// =========================
function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function generateSlug(value) {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function isValidEventStatus(status) {
  return ["draft", "upcoming", "on_sale", "sold_out", "ended", "cancelled"].includes(status);
}

function isValidDateTime(value) {
  return !Number.isNaN(Date.parse(value));
}

// =========================
// Admin - Get All Events
// =========================
const getAllEvents = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const keyword = normalizeString(req.query.keyword || "");
    const status = normalizeString(req.query.status || "");

    const whereClauses = ["1 = 1"];
    const values = [];

    if (keyword) {
      whereClauses.push(`(e.title LIKE ? OR e.location LIKE ? OR e.organizer_name LIKE ?)`);
      values.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (status) {
      if (!isValidEventStatus(status)) {
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
        e.created_by,
        e.created_at,
        e.updated_at
      FROM events e
      WHERE ${whereSql}
      ORDER BY e.created_at DESC, e.id DESC
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
// Admin - Get Event Detail
// =========================
const getEventDetail = async (req, res) => {
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
        e.created_by,
        e.created_at,
        e.updated_at
      FROM events e
      WHERE e.id = ?
      LIMIT 1
      `,
      [eventId]
    );

    if (eventRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sự kiện không tồn tại",
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
      ORDER BY tt.id ASC
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

// =========================
// Admin - Create Event
// =========================
const createEvent = async (req, res) => {
  try {
    const adminId = req.user.id;

    let {
      title,
      slug,
      description,
      location,
      event_date,
      banner_image,
      organizer_name,
      status,
    } = req.body;

    title = normalizeString(title);
    slug = normalizeString(slug);
    description = normalizeString(description);
    location = normalizeString(location);
    event_date = normalizeString(event_date);
    banner_image = normalizeString(banner_image);
    organizer_name = normalizeString(organizer_name);
    status = normalizeString(status || "draft").toLowerCase();

    const errors = {};

    if (!title) {
      errors.title = "Tên sự kiện không được để trống";
    } else if (title.length > 255) {
      errors.title = "Tên sự kiện không được vượt quá 255 ký tự";
    }

    if (!location) {
      errors.location = "Địa điểm không được để trống";
    } else if (location.length > 255) {
      errors.location = "Địa điểm không được vượt quá 255 ký tự";
    }

    if (!event_date) {
      errors.event_date = "Thời gian sự kiện không được để trống";
    } else if (!isValidDateTime(event_date)) {
      errors.event_date = "Thời gian sự kiện không hợp lệ";
    }

    if (banner_image && banner_image.length > 500) {
      errors.banner_image = "Banner image không được vượt quá 500 ký tự";
    }

    if (organizer_name && organizer_name.length > 150) {
      errors.organizer_name = "Tên ban tổ chức không được vượt quá 150 ký tự";
    }

    if (!isValidEventStatus(status)) {
      errors.status = "Trạng thái sự kiện không hợp lệ";
    }

    const finalSlug = slug || generateSlug(title);

    if (!finalSlug) {
      errors.slug = "Slug không hợp lệ";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu sự kiện không hợp lệ",
        errors,
      });
    }

    const [existingSlug] = await pool.query(
      "SELECT id FROM events WHERE slug = ? LIMIT 1",
      [finalSlug]
    );

    if (existingSlug.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Slug sự kiện đã tồn tại",
        errors: {
          slug: "Slug đã được sử dụng",
        },
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO events (
        title,
        slug,
        description,
        location,
        event_date,
        banner_image,
        organizer_name,
        status,
        created_by,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        title,
        finalSlug,
        description || null,
        location,
        event_date,
        banner_image || null,
        organizer_name || null,
        status,
        adminId,
      ]
    );

    const [eventRows] = await pool.query(
      `
      SELECT
        id,
        title,
        slug,
        description,
        location,
        event_date,
        banner_image,
        organizer_name,
        status,
        created_by,
        created_at,
        updated_at
      FROM events
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo sự kiện thành công",
      data: eventRows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo sự kiện",
      error: err.message,
    });
  }
};

// =========================
// Admin - Update Event
// =========================
const updateEvent = async (req, res) => {
  try {
    const eventId = parsePositiveInt(req.params.id);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "ID sự kiện không hợp lệ",
      });
    }

    let {
      title,
      slug,
      description,
      location,
      event_date,
      banner_image,
      organizer_name,
      status,
    } = req.body;

    title = title !== undefined ? normalizeString(title) : undefined;
    slug = slug !== undefined ? normalizeString(slug) : undefined;
    description = description !== undefined ? normalizeString(description) : undefined;
    location = location !== undefined ? normalizeString(location) : undefined;
    event_date = event_date !== undefined ? normalizeString(event_date) : undefined;
    banner_image = banner_image !== undefined ? normalizeString(banner_image) : undefined;
    organizer_name =
      organizer_name !== undefined ? normalizeString(organizer_name) : undefined;
    status = status !== undefined ? normalizeString(status).toLowerCase() : undefined;

    const [existingEvents] = await pool.query(
      "SELECT id, title, slug, status FROM events WHERE id = ? LIMIT 1",
      [eventId]
    );

    if (existingEvents.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sự kiện không tồn tại",
      });
    }

    if (
      title === undefined &&
      slug === undefined &&
      description === undefined &&
      location === undefined &&
      event_date === undefined &&
      banner_image === undefined &&
      organizer_name === undefined &&
      status === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu nào để cập nhật",
      });
    }

    const errors = {};

    if (title !== undefined) {
      if (!title) {
        errors.title = "Tên sự kiện không được để trống";
      } else if (title.length > 255) {
        errors.title = "Tên sự kiện không được vượt quá 255 ký tự";
      }
    }

    if (location !== undefined) {
      if (!location) {
        errors.location = "Địa điểm không được để trống";
      } else if (location.length > 255) {
        errors.location = "Địa điểm không được vượt quá 255 ký tự";
      }
    }

    if (event_date !== undefined) {
      if (!event_date) {
        errors.event_date = "Thời gian sự kiện không được để trống";
      } else if (!isValidDateTime(event_date)) {
        errors.event_date = "Thời gian sự kiện không hợp lệ";
      }
    }

    if (banner_image !== undefined && banner_image.length > 500) {
      errors.banner_image = "Banner image không được vượt quá 500 ký tự";
    }

    if (organizer_name !== undefined && organizer_name.length > 150) {
      errors.organizer_name = "Tên ban tổ chức không được vượt quá 150 ký tự";
    }

    if (status !== undefined && !isValidEventStatus(status)) {
      errors.status = "Trạng thái sự kiện không hợp lệ";
    }

    let finalSlug;
    if (slug !== undefined) {
      finalSlug = slug || generateSlug(title || existingEvents[0].title);
      if (!finalSlug) {
        errors.slug = "Slug không hợp lệ";
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu cập nhật sự kiện không hợp lệ",
        errors,
      });
    }

    if (finalSlug) {
      const [existingSlug] = await pool.query(
        "SELECT id FROM events WHERE slug = ? AND id != ? LIMIT 1",
        [finalSlug, eventId]
      );

      if (existingSlug.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Slug sự kiện đã tồn tại",
          errors: {
            slug: "Slug đã được sử dụng",
          },
        });
      }
    }

    const updateFields = [];
    const updateValues = [];

    if (title !== undefined) {
      updateFields.push("title = ?");
      updateValues.push(title);
    }

    if (slug !== undefined) {
      updateFields.push("slug = ?");
      updateValues.push(finalSlug);
    }

    if (description !== undefined) {
      updateFields.push("description = ?");
      updateValues.push(description || null);
    }

    if (location !== undefined) {
      updateFields.push("location = ?");
      updateValues.push(location);
    }

    if (event_date !== undefined) {
      updateFields.push("event_date = ?");
      updateValues.push(event_date);
    }

    if (banner_image !== undefined) {
      updateFields.push("banner_image = ?");
      updateValues.push(banner_image || null);
    }

    if (organizer_name !== undefined) {
      updateFields.push("organizer_name = ?");
      updateValues.push(organizer_name || null);
    }

    if (status !== undefined) {
      updateFields.push("status = ?");
      updateValues.push(status);
    }

    updateFields.push("updated_at = NOW()");
    updateValues.push(eventId);

    await pool.query(
      `UPDATE events SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    const [eventRows] = await pool.query(
      `
      SELECT
        id,
        title,
        slug,
        description,
        location,
        event_date,
        banner_image,
        organizer_name,
        status,
        created_by,
        created_at,
        updated_at
      FROM events
      WHERE id = ?
      LIMIT 1
      `,
      [eventId]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật sự kiện thành công",
      data: eventRows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật sự kiện",
      error: err.message,
    });
  }
};

// =========================
// Admin - Delete Event
// =========================
const deleteEvent = async (req, res) => {
  try {
    const eventId = parsePositiveInt(req.params.id);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "ID sự kiện không hợp lệ",
      });
    }

    const [eventRows] = await pool.query(
      "SELECT id FROM events WHERE id = ? LIMIT 1",
      [eventId]
    );

    if (eventRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sự kiện không tồn tại",
      });
    }

    // Ràng buộc nghiệp vụ: không cho xóa nếu đã phát sinh order hoặc ticket
    const [orderRows] = await pool.query(
      `
      SELECT oi.id
      FROM order_items oi
      INNER JOIN ticket_types tt ON tt.id = oi.ticket_type_id
      WHERE tt.event_id = ?
      LIMIT 1
      `,
      [eventId]
    );

    if (orderRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa sự kiện đã phát sinh đơn hàng",
      });
    }

    const [ticketRows] = await pool.query(
      "SELECT id FROM tickets WHERE event_id = ? LIMIT 1",
      [eventId]
    );

    if (ticketRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa sự kiện đã phát hành vé",
      });
    }

    await pool.query("DELETE FROM events WHERE id = ?", [eventId]);

    return res.status(200).json({
      success: true,
      message: "Xóa sự kiện thành công",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa sự kiện",
      error: err.message,
    });
  }
};

module.exports = {
  getAllEvents,
  getEventDetail,
  createEvent,
  updateEvent,
  deleteEvent,
};