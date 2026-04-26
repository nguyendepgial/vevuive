const pool = require("../../config/db");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function parseTicketIdentifier(rawValue) {
  const value = normalizeString(rawValue);

  if (!value) {
    return {
      type: null,
      value: null,
    };
  }

  const urlTicketMatch = value.match(/tickets\/(\d+)/i);

  if (urlTicketMatch && urlTicketMatch[1]) {
    return {
      type: "id",
      value: Number(urlTicketMatch[1]),
    };
  }

  if (/^\d+$/.test(value)) {
    return {
      type: "id",
      value: Number(value),
    };
  }

  return {
    type: "code",
    value,
  };
}

function getTicketStatusMessage(ticketStatus) {
  switch (ticketStatus) {
    case "used":
      return "Vé đã được check-in trước đó, không thể dùng lại";
    case "cancelled":
      return "Vé đã bị hủy, không thể check-in";
    case "transfer_pending":
      return "Vé đang trong quá trình chuyển nhượng, không thể check-in";
    default:
      return "Vé không ở trạng thái hợp lệ để check-in";
  }
}

async function findTicketForCheckin(connection, rawValue, lock = false) {
  const identifier = parseTicketIdentifier(rawValue);

  if (!identifier.type) {
    return null;
  }

  const whereSql =
    identifier.type === "id"
      ? "t.id = ?"
      : "t.ticket_code = ?";

  const lockSql = lock ? "FOR UPDATE" : "";

  const [rows] = await connection.query(
    `
    SELECT
      t.id,
      t.ticket_code,
      t.order_id,
      o.order_code,
      t.event_id,
      e.title AS event_title,
      e.event_date,
      e.location AS event_location,
      e.status AS event_status,
      t.ticket_type_id,
      tt.name AS ticket_type_name,
      t.owner_user_id,
      owner.full_name AS owner_name,
      owner.email AS owner_email,
      owner.phone AS owner_phone,
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
    LEFT JOIN orders o ON o.id = t.order_id
    LEFT JOIN events e ON e.id = t.event_id
    LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
    LEFT JOIN users owner ON owner.id = t.owner_user_id
    WHERE ${whereSql}
    LIMIT 1
    ${lockSql}
    `,
    [identifier.value]
  );

  return rows.length > 0 ? rows[0] : null;
}

// =========================
// Admin - Lookup Ticket For Checkin
// GET /api/admin/checkin/lookup?code=TCK...
// =========================
const lookupTicketForCheckin = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const code = normalizeString(req.query.code || req.query.ticket_code || req.query.value || "");

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập hoặc quét mã vé",
      });
    }

    const ticket = await findTicketForCheckin(connection, code, false);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vé theo mã đã nhập/quét",
      });
    }

    const canCheckin = ticket.ticket_status === "active";

    return res.status(200).json({
      success: true,
      message: "Lấy thông tin vé thành công",
      data: {
        ticket,
        can_checkin: canCheckin,
        reason: canCheckin ? null : getTicketStatusMessage(ticket.ticket_status),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi tra cứu vé check-in",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// Admin - Checkin Ticket
// POST /api/admin/checkin
// body: { code, checkin_method }
// =========================
const checkinTicket = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const adminId = req.user.id;
    const code = normalizeString(req.body.code || req.body.ticket_code || req.body.value || "");
    const checkinMethod = normalizeString(req.body.checkin_method || "manual").toLowerCase();

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập hoặc quét mã vé",
      });
    }

    if (!["manual", "qr"].includes(checkinMethod)) {
      return res.status(400).json({
        success: false,
        message: "Phương thức check-in không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const ticket = await findTicketForCheckin(connection, code, true);

    if (!ticket) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy vé theo mã đã nhập/quét",
      });
    }

    if (ticket.event_status === "cancelled") {
      await connection.query(
        `
        INSERT INTO ticket_checkins (
          ticket_id,
          event_id,
          admin_id,
          ticket_code_snapshot,
          checkin_method,
          scanned_value,
          result,
          failure_reason,
          checked_in_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'failed', ?, NOW(), NOW(), NOW())
        `,
        [
          ticket.id,
          ticket.event_id,
          adminId,
          ticket.ticket_code,
          checkinMethod,
          code,
          "Sự kiện đã bị hủy",
        ]
      );

      await connection.commit();

      return res.status(400).json({
        success: false,
        message: "Sự kiện đã bị hủy, không thể check-in vé",
        data: {
          ticket,
        },
      });
    }

    if (ticket.ticket_status !== "active") {
      const reason = getTicketStatusMessage(ticket.ticket_status);

      await connection.query(
        `
        INSERT INTO ticket_checkins (
          ticket_id,
          event_id,
          admin_id,
          ticket_code_snapshot,
          checkin_method,
          scanned_value,
          result,
          failure_reason,
          checked_in_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 'failed', ?, NOW(), NOW(), NOW())
        `,
        [
          ticket.id,
          ticket.event_id,
          adminId,
          ticket.ticket_code,
          checkinMethod,
          code,
          reason,
        ]
      );

      await connection.commit();

      return res.status(400).json({
        success: false,
        message: reason,
        data: {
          ticket,
        },
      });
    }

    await connection.query(
      `
      UPDATE tickets
      SET ticket_status = 'used',
          updated_at = NOW()
      WHERE id = ?
      `,
      [ticket.id]
    );

    const [checkinResult] = await connection.query(
      `
      INSERT INTO ticket_checkins (
        ticket_id,
        event_id,
        admin_id,
        ticket_code_snapshot,
        checkin_method,
        scanned_value,
        result,
        failure_reason,
        checked_in_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'success', NULL, NOW(), NOW(), NOW())
      `,
      [
        ticket.id,
        ticket.event_id,
        adminId,
        ticket.ticket_code,
        checkinMethod,
        code,
      ]
    );

    const updatedTicket = {
      ...ticket,
      ticket_status: "used",
    };

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Check-in vé thành công",
      data: {
        ticket: updatedTicket,
        checkin_id: checkinResult.insertId,
      },
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi check-in vé",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// Admin - Get Checkin Logs
// GET /api/admin/checkin/logs
// =========================
const getCheckinLogs = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = normalizeString(req.query.result || "");
    const search = normalizeString(req.query.search || "");

    const whereClauses = [];
    const values = [];

    if (result) {
      whereClauses.push("tc.result = ?");
      values.push(result);
    }

    if (search) {
      whereClauses.push(
        "(tc.ticket_code_snapshot LIKE ? OR e.title LIKE ? OR owner.full_name LIKE ? OR owner.email LIKE ?)"
      );
      values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM ticket_checkins tc
      INNER JOIN tickets t ON t.id = tc.ticket_id
      INNER JOIN events e ON e.id = tc.event_id
      INNER JOIN users admin ON admin.id = tc.admin_id
      LEFT JOIN users owner ON owner.id = t.owner_user_id
      ${whereSql}
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT
        tc.id,
        tc.ticket_id,
        tc.event_id,
        tc.admin_id,
        tc.ticket_code_snapshot,
        tc.checkin_method,
        tc.scanned_value,
        tc.result,
        tc.failure_reason,
        tc.checked_in_at,
        t.ticket_status,
        e.title AS event_title,
        e.event_date,
        owner.full_name AS owner_name,
        owner.email AS owner_email,
        admin.full_name AS admin_name
      FROM ticket_checkins tc
      INNER JOIN tickets t ON t.id = tc.ticket_id
      INNER JOIN events e ON e.id = tc.event_id
      INNER JOIN users admin ON admin.id = tc.admin_id
      LEFT JOIN users owner ON owner.id = t.owner_user_id
      ${whereSql}
      ORDER BY tc.checked_in_at DESC, tc.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy lịch sử check-in thành công",
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
      message: "Lỗi server khi lấy lịch sử check-in",
      error: err.message,
    });
  }
};

module.exports = {
  lookupTicketForCheckin,
  checkinTicket,
  getCheckinLogs,
};