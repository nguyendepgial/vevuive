const pool = require("../../config/db");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

const allowedTicketStatus = [
  "active",
  "used",
  "cancelled",
  "transfer_pending",
];

const allowedMintStatus = [
  "pending",
  "minted",
  "failed",
];

// =========================
// Admin - Get Tickets
// GET /api/admin/manage/tickets
// =========================
const getManageTickets = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const search = normalizeString(req.query.search || "");
    const ticketStatus = normalizeString(req.query.ticket_status || "");
    const mintStatus = normalizeString(req.query.mint_status || "");
    const eventId = parsePositiveInt(req.query.event_id);

    const whereClauses = [];
    const values = [];

    if (search) {
      whereClauses.push(`
        (
          t.ticket_code LIKE ?
          OR e.title LIKE ?
          OR tt.name LIKE ?
          OR owner.full_name LIKE ?
          OR owner.email LIKE ?
          OR t.owner_wallet_address LIKE ?
          OR o.order_code LIKE ?
        )
      `);

      values.push(
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
      );
    }

    if (ticketStatus) {
      whereClauses.push("t.ticket_status = ?");
      values.push(ticketStatus);
    }

    if (mintStatus) {
      whereClauses.push("t.mint_status = ?");
      values.push(mintStatus);
    }

    if (eventId) {
      whereClauses.push("t.event_id = ?");
      values.push(eventId);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM tickets t
      LEFT JOIN events e ON e.id = t.event_id
      LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
      LEFT JOIN users owner ON owner.id = t.owner_user_id
      LEFT JOIN orders o ON o.id = t.order_id
      ${whereSql}
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
        e.location AS event_location,
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
      LEFT JOIN events e ON e.id = t.event_id
      LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
      LEFT JOIN users owner ON owner.id = t.owner_user_id
      LEFT JOIN orders o ON o.id = t.order_id
      ${whereSql}
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách vé thành công",
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
// Admin - Get Ticket Detail
// GET /api/admin/manage/tickets/:id
// =========================
const getManageTicketDetail = async (req, res) => {
  try {
    const ticketId = parsePositiveInt(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: "ID vé không hợp lệ",
      });
    }

    const [ticketRows] = await pool.query(
      `
      SELECT
        t.id,
        t.ticket_code,
        t.order_id,
        o.order_code,
        o.total_amount AS order_total_amount,
        o.payment_status AS order_payment_status,
        o.order_status,
        t.order_item_id,
        t.event_id,
        e.title AS event_title,
        e.slug AS event_slug,
        e.event_date,
        e.location AS event_location,
        e.banner_image,
        e.status AS event_status,
        t.ticket_type_id,
        tt.name AS ticket_type_name,
        tt.price AS ticket_type_price,
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
      LEFT JOIN events e ON e.id = t.event_id
      LEFT JOIN ticket_types tt ON tt.id = t.ticket_type_id
      LEFT JOIN users owner ON owner.id = t.owner_user_id
      LEFT JOIN orders o ON o.id = t.order_id
      WHERE t.id = ?
      LIMIT 1
      `,
      [ticketId]
    );

    if (ticketRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Vé không tồn tại",
      });
    }

    const [paymentRows] = await pool.query(
      `
      SELECT
        p.id,
        p.payment_code,
        p.payment_method,
        p.amount,
        p.currency,
        p.payer_wallet_address,
        p.status,
        p.paid_at,
        p.created_at
      FROM payments p
      INNER JOIN tickets t ON t.order_id = p.order_id
      WHERE t.id = ?
      ORDER BY p.created_at DESC, p.id DESC
      `,
      [ticketId]
    );

    const [transferRows] = await pool.query(
      `
      SELECT
        tr.id,
        tr.ticket_id,
        tr.from_user_id,
        from_user.full_name AS from_user_name,
        from_user.email AS from_user_email,
        tr.from_wallet_address,
        tr.to_user_id,
        to_user.full_name AS to_user_name,
        to_user.email AS to_user_email,
        tr.to_wallet_address,
        tr.transfer_type,
        tr.asking_price,
        tr.payment_status,
        tr.status,
        tr.admin_note,
        tr.failure_reason,
        tr.requested_at,
        tr.accepted_at,
        tr.approved_at,
        tr.rejected_at,
        tr.cancelled_at,
        tr.transferred_at,
        tr.created_at,
        tr.updated_at
      FROM ticket_transfers tr
      LEFT JOIN users from_user ON from_user.id = tr.from_user_id
      LEFT JOIN users to_user ON to_user.id = tr.to_user_id
      WHERE tr.ticket_id = ?
      ORDER BY tr.created_at DESC, tr.id DESC
      `,
      [ticketId]
    );

    const [listingRows] = await pool.query(
      `
      SELECT
        tl.id,
        tl.listing_code,
        tl.ticket_id,
        tl.seller_user_id,
        seller.full_name AS seller_name,
        tl.seller_wallet_address,
        tl.buyer_user_id,
        buyer.full_name AS buyer_name,
        tl.buyer_wallet_address,
        tl.original_price,
        tl.asking_price,
        tl.status,
        tl.transfer_id,
        tl.admin_note,
        tl.listed_at,
        tl.buyer_selected_at,
        tl.sold_at,
        tl.cancelled_at,
        tl.rejected_at,
        tl.expires_at,
        tl.created_at,
        tl.updated_at
      FROM ticket_listings tl
      LEFT JOIN users seller ON seller.id = tl.seller_user_id
      LEFT JOIN users buyer ON buyer.id = tl.buyer_user_id
      WHERE tl.ticket_id = ?
      ORDER BY tl.created_at DESC, tl.id DESC
      `,
      [ticketId]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết vé thành công",
      data: {
        ticket: ticketRows[0],
        payments: paymentRows,
        transfers: transferRows,
        listings: listingRows,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết vé",
      error: err.message,
    });
  }
};

// =========================
// Admin - Update Ticket Status
// PUT /api/admin/manage/tickets/:id/status
// =========================
const updateManageTicketStatus = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const ticketId = parsePositiveInt(req.params.id);
    const ticketStatus = normalizeString(req.body.ticket_status || "");
    const mintStatus = normalizeString(req.body.mint_status || "");

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: "ID vé không hợp lệ",
      });
    }

    const errors = {};

    if (ticketStatus && !allowedTicketStatus.includes(ticketStatus)) {
      errors.ticket_status = "Trạng thái vé không hợp lệ";
    }

    if (mintStatus && !allowedMintStatus.includes(mintStatus)) {
      errors.mint_status = "Trạng thái mint không hợp lệ";
    }

    if (!ticketStatus && !mintStatus) {
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

    const [ticketRows] = await connection.query(
      `
      SELECT id, ticket_code, ticket_status, mint_status
      FROM tickets
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [ticketId]
    );

    if (ticketRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Vé không tồn tại",
      });
    }

    const updates = [];
    const values = [];

    if (ticketStatus) {
      updates.push("ticket_status = ?");
      values.push(ticketStatus);
    }

    if (mintStatus) {
      updates.push("mint_status = ?");
      values.push(mintStatus);
    }

    updates.push("updated_at = NOW()");
    values.push(ticketId);

    await connection.query(
      `
      UPDATE tickets
      SET ${updates.join(", ")}
      WHERE id = ?
      `,
      values
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái vé thành công",
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật trạng thái vé",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getManageTickets,
  getManageTicketDetail,
  updateManageTicketStatus,
};