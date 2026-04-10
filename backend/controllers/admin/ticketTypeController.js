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

function parsePositiveNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
}

function isValidTicketTypeStatus(status) {
  return ["active", "inactive"].includes(status);
}

function isValidDateTime(value) {
  return !Number.isNaN(Date.parse(value));
}

// =========================
// Admin - Get Ticket Types By Event
// =========================
const getTicketTypesByEvent = async (req, res) => {
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

// =========================
// Admin - Get Ticket Type Detail
// =========================
const getTicketTypeDetail = async (req, res) => {
  try {
    const ticketTypeId = parsePositiveInt(req.params.id);

    if (!ticketTypeId) {
      return res.status(400).json({
        success: false,
        message: "ID loại vé không hợp lệ",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        tt.id,
        tt.event_id,
        e.title AS event_title,
        e.slug AS event_slug,
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
      INNER JOIN events e ON e.id = tt.event_id
      WHERE tt.id = ?
      LIMIT 1
      `,
      [ticketTypeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Loại vé không tồn tại",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết loại vé thành công",
      data: rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết loại vé",
      error: err.message,
    });
  }
};

// =========================
// Admin - Create Ticket Type
// =========================
const createTicketType = async (req, res) => {
  try {
    const eventId = parsePositiveInt(req.params.eventId);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "ID sự kiện không hợp lệ",
      });
    }

    const [eventRows] = await pool.query(
      "SELECT id, status, event_date FROM events WHERE id = ? LIMIT 1",
      [eventId]
    );

    if (eventRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Sự kiện không tồn tại",
      });
    }

    let {
      name,
      description,
      price,
      quantity_total,
      max_per_order,
      sale_start,
      sale_end,
      status,
    } = req.body;

    name = normalizeString(name);
    description = normalizeString(description);
    price = parsePositiveNumber(price);
    quantity_total = parsePositiveInt(quantity_total);
    max_per_order = parsePositiveInt(max_per_order);
    sale_start = normalizeString(sale_start);
    sale_end = normalizeString(sale_end);
    status = normalizeString(status || "active").toLowerCase();

    const errors = {};

    if (!name) {
      errors.name = "Tên loại vé không được để trống";
    } else if (name.length > 100) {
      errors.name = "Tên loại vé không được vượt quá 100 ký tự";
    }

    if (description && description.length > 65535) {
      errors.description = "Mô tả loại vé quá dài";
    }

    if (price === null) {
      errors.price = "Giá vé không hợp lệ";
    } else if (price <= 0) {
      errors.price = "Giá vé phải lớn hơn 0";
    }

    if (!quantity_total) {
      errors.quantity_total = "Tổng số lượng vé phải lớn hơn 0";
    }

    if (!max_per_order) {
      errors.max_per_order = "Giới hạn mỗi đơn phải lớn hơn 0";
    }

    if (quantity_total && max_per_order && max_per_order > quantity_total) {
      errors.max_per_order = "Giới hạn mỗi đơn không được lớn hơn tổng số lượng vé";
    }

    if (sale_start && !isValidDateTime(sale_start)) {
      errors.sale_start = "Thời gian bắt đầu mở bán không hợp lệ";
    }

    if (sale_end && !isValidDateTime(sale_end)) {
      errors.sale_end = "Thời gian kết thúc mở bán không hợp lệ";
    }

    if (sale_start && sale_end && new Date(sale_start) >= new Date(sale_end)) {
      errors.sale_end = "Thời gian kết thúc mở bán phải lớn hơn thời gian bắt đầu";
    }

    if (!isValidTicketTypeStatus(status)) {
      errors.status = "Trạng thái loại vé không hợp lệ";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu loại vé không hợp lệ",
        errors,
      });
    }

    const [existingRows] = await pool.query(
      `
      SELECT id
      FROM ticket_types
      WHERE event_id = ? AND name = ?
      LIMIT 1
      `,
      [eventId, name]
    );

    if (existingRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Tên loại vé đã tồn tại trong sự kiện này",
        errors: {
          name: "Tên loại vé đã được sử dụng",
        },
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO ticket_types (
        event_id,
        name,
        description,
        price,
        quantity_total,
        quantity_sold,
        max_per_order,
        sale_start,
        sale_end,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, NOW(), NOW())
      `,
      [
        eventId,
        name,
        description || null,
        price,
        quantity_total,
        max_per_order,
        sale_start || null,
        sale_end || null,
        status,
      ]
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
        event_id,
        name,
        description,
        price,
        quantity_total,
        quantity_sold,
        (quantity_total - quantity_sold) AS quantity_available,
        max_per_order,
        sale_start,
        sale_end,
        status,
        created_at,
        updated_at
      FROM ticket_types
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo loại vé thành công",
      data: rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo loại vé",
      error: err.message,
    });
  }
};

// =========================
// Admin - Update Ticket Type
// =========================
const updateTicketType = async (req, res) => {
  try {
    const ticketTypeId = parsePositiveInt(req.params.id);

    if (!ticketTypeId) {
      return res.status(400).json({
        success: false,
        message: "ID loại vé không hợp lệ",
      });
    }

    const [existingRows] = await pool.query(
      `
      SELECT
        id,
        event_id,
        name,
        quantity_total,
        quantity_sold
      FROM ticket_types
      WHERE id = ?
      LIMIT 1
      `,
      [ticketTypeId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Loại vé không tồn tại",
      });
    }

    const current = existingRows[0];

    let {
      name,
      description,
      price,
      quantity_total,
      max_per_order,
      sale_start,
      sale_end,
      status,
    } = req.body;

    name = name !== undefined ? normalizeString(name) : undefined;
    description = description !== undefined ? normalizeString(description) : undefined;
    price = price !== undefined ? parsePositiveNumber(price) : undefined;
    quantity_total =
      quantity_total !== undefined ? parsePositiveInt(quantity_total) : undefined;
    max_per_order =
      max_per_order !== undefined ? parsePositiveInt(max_per_order) : undefined;
    sale_start = sale_start !== undefined ? normalizeString(sale_start) : undefined;
    sale_end = sale_end !== undefined ? normalizeString(sale_end) : undefined;
    status = status !== undefined ? normalizeString(status).toLowerCase() : undefined;

    if (
      name === undefined &&
      description === undefined &&
      price === undefined &&
      quantity_total === undefined &&
      max_per_order === undefined &&
      sale_start === undefined &&
      sale_end === undefined &&
      status === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu nào để cập nhật",
      });
    }

    const errors = {};

    if (name !== undefined) {
      if (!name) {
        errors.name = "Tên loại vé không được để trống";
      } else if (name.length > 100) {
        errors.name = "Tên loại vé không được vượt quá 100 ký tự";
      }
    }

    if (price !== undefined) {
      if (price === null) {
        errors.price = "Giá vé không hợp lệ";
      } else if (price <= 0) {
        errors.price = "Giá vé phải lớn hơn 0";
      }
    }

    const finalQuantityTotal =
      quantity_total !== undefined ? quantity_total : current.quantity_total;
    const finalMaxPerOrder =
      max_per_order !== undefined ? max_per_order : null;

    if (quantity_total !== undefined) {
      if (!quantity_total) {
        errors.quantity_total = "Tổng số lượng vé phải lớn hơn 0";
      } else if (quantity_total < current.quantity_sold) {
        errors.quantity_total =
          "Tổng số lượng vé không được nhỏ hơn số vé đã bán";
      }
    }

    if (max_per_order !== undefined) {
      if (!max_per_order) {
        errors.max_per_order = "Giới hạn mỗi đơn phải lớn hơn 0";
      } else if (finalQuantityTotal && maxPerOrderExceeds(finalMaxPerOrder, finalQuantityTotal)) {
  errors.max_per_order =
    "Giới hạn mỗi đơn không được lớn hơn tổng số lượng vé";
}
    } else if (
      finalQuantityTotal &&
      maxPerOrderExceeds(current.max_per_order, finalQuantityTotal)
    ) {
      errors.max_per_order =
        "Tổng số lượng vé mới không được nhỏ hơn giới hạn mỗi đơn hiện tại";
    }

    if (sale_start !== undefined) {
      if (sale_start && !isValidDateTime(sale_start)) {
        errors.sale_start = "Thời gian bắt đầu mở bán không hợp lệ";
      }
    }

    if (sale_end !== undefined) {
      if (sale_end && !isValidDateTime(sale_end)) {
        errors.sale_end = "Thời gian kết thúc mở bán không hợp lệ";
      }
    }

    const finalSaleStart =
      sale_start !== undefined ? sale_start : null;
    const finalSaleEnd =
      sale_end !== undefined ? sale_end : null;

    const compareSaleStart =
      sale_start !== undefined ? sale_start : undefined;
    const compareSaleEnd =
      sale_end !== undefined ? sale_end : undefined;

    if (
      compareSaleStart !== undefined &&
      compareSaleEnd !== undefined &&
      compareSaleStart &&
      compareSaleEnd &&
      new Date(compareSaleStart) >= new Date(compareSaleEnd)
    ) {
      errors.sale_end = "Thời gian kết thúc mở bán phải lớn hơn thời gian bắt đầu";
    }

    if (status !== undefined && !isValidTicketTypeStatus(status)) {
      errors.status = "Trạng thái loại vé không hợp lệ";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu cập nhật loại vé không hợp lệ",
        errors,
      });
    }

    if (name !== undefined) {
      const [duplicateRows] = await pool.query(
        `
        SELECT id
        FROM ticket_types
        WHERE event_id = ? AND name = ? AND id != ?
        LIMIT 1
        `,
        [current.event_id, name, ticketTypeId]
      );

      if (duplicateRows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Tên loại vé đã tồn tại trong sự kiện này",
          errors: {
            name: "Tên loại vé đã được sử dụng",
          },
        });
      }
    }

    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push("name = ?");
      updateValues.push(name);
    }

    if (description !== undefined) {
      updateFields.push("description = ?");
      updateValues.push(description || null);
    }

    if (price !== undefined) {
      updateFields.push("price = ?");
      updateValues.push(price);
    }

    if (quantity_total !== undefined) {
      updateFields.push("quantity_total = ?");
      updateValues.push(quantity_total);
    }

    if (max_per_order !== undefined) {
      updateFields.push("max_per_order = ?");
      updateValues.push(max_per_order);
    }

    if (sale_start !== undefined) {
      updateFields.push("sale_start = ?");
      updateValues.push(sale_start || null);
    }

    if (sale_end !== undefined) {
      updateFields.push("sale_end = ?");
      updateValues.push(sale_end || null);
    }

    if (status !== undefined) {
      updateFields.push("status = ?");
      updateValues.push(status);
    }

    updateFields.push("updated_at = NOW()");
    updateValues.push(ticketTypeId);

    await pool.query(
      `UPDATE ticket_types SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
        event_id,
        name,
        description,
        price,
        quantity_total,
        quantity_sold,
        (quantity_total - quantity_sold) AS quantity_available,
        max_per_order,
        sale_start,
        sale_end,
        status,
        created_at,
        updated_at
      FROM ticket_types
      WHERE id = ?
      LIMIT 1
      `,
      [ticketTypeId]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật loại vé thành công",
      data: rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật loại vé",
      error: err.message,
    });
  }
};

// helper local
function maxPerOrderExceeds(maxPerOrder, quantityTotal) {
  if (!maxPerOrder || !quantityTotal) return false;
  return maxPerOrder > quantityTotal;
}

// =========================
// Admin - Delete Ticket Type
// =========================
const deleteTicketType = async (req, res) => {
  try {
    const ticketTypeId = parsePositiveInt(req.params.id);

    if (!ticketTypeId) {
      return res.status(400).json({
        success: false,
        message: "ID loại vé không hợp lệ",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        event_id,
        quantity_sold
      FROM ticket_types
      WHERE id = ?
      LIMIT 1
      `,
      [ticketTypeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Loại vé không tồn tại",
      });
    }

    const ticketType = rows[0];

    if (ticketType.quantity_sold > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa loại vé đã có vé bán ra",
      });
    }

    const [orderItemRows] = await pool.query(
      "SELECT id FROM order_items WHERE ticket_type_id = ? LIMIT 1",
      [ticketTypeId]
    );

    if (orderItemRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa loại vé đã phát sinh đơn hàng",
      });
    }

    const [ticketRows] = await pool.query(
      "SELECT id FROM tickets WHERE ticket_type_id = ? LIMIT 1",
      [ticketTypeId]
    );

    if (ticketRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Không thể xóa loại vé đã phát hành",
      });
    }

    await pool.query("DELETE FROM ticket_types WHERE id = ?", [ticketTypeId]);

    return res.status(200).json({
      success: true,
      message: "Xóa loại vé thành công",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa loại vé",
      error: err.message,
    });
  }
};

module.exports = {
  getTicketTypesByEvent,
  getTicketTypeDetail,
  createTicketType,
  updateTicketType,
  deleteTicketType,
};