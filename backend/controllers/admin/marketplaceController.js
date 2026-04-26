const pool = require("../../config/db");
const {
  creditBalance,
} = require("../../services/internalWalletService");

// =========================
// Helpers
// =========================
function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAddress(address) {
  return typeof address === "string" ? address.trim().toLowerCase() : "";
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

async function getAdminListingDetail(connection, listingId) {
  const [rows] = await connection.query(
    `
    SELECT
      tl.id,
      tl.listing_code,
      tl.ticket_id,
      t.ticket_code,
      t.ticket_status,
      t.owner_user_id,
      t.owner_wallet_address,
      t.unit_price,
      t.transferred_count,
      tl.seller_user_id,
      seller.full_name AS seller_name,
      seller.email AS seller_email,
      tl.seller_wallet_address,
      tl.buyer_user_id,
      buyer.full_name AS buyer_name,
      buyer.email AS buyer_email,
      tl.buyer_wallet_address,
      tl.original_price,
      tl.asking_price,
      tl.status,
      tl.transfer_id,
      tr.status AS transfer_status,
      tr.payment_status AS transfer_payment_status,
      tl.admin_id,
      admin.full_name AS admin_name,
      tl.admin_note,
      tl.listed_at,
      tl.buyer_selected_at,
      tl.sold_at,
      tl.cancelled_at,
      tl.rejected_at,
      tl.expires_at,
      tl.created_at,
      tl.updated_at,
      e.id AS event_id,
      e.title AS event_title,
      e.event_date,
      tt.id AS ticket_type_id,
      tt.name AS ticket_type_name
    FROM ticket_listings tl
    INNER JOIN tickets t ON t.id = tl.ticket_id
    INNER JOIN events e ON e.id = t.event_id
    INNER JOIN ticket_types tt ON tt.id = t.ticket_type_id
    INNER JOIN users seller ON seller.id = tl.seller_user_id
    LEFT JOIN users buyer ON buyer.id = tl.buyer_user_id
    LEFT JOIN ticket_transfers tr ON tr.id = tl.transfer_id
    LEFT JOIN users admin ON admin.id = tl.admin_id
    WHERE tl.id = ?
    LIMIT 1
    `,
    [listingId]
  );

  return rows.length > 0 ? rows[0] : null;
}

// =========================
// Admin - Get All Marketplace Listings
// GET /api/admin/marketplace/listings
// =========================
const getAllListings = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const status = normalizeString(req.query.status || "");
    const search = normalizeString(req.query.search || "");

    const whereClauses = [];
    const values = [];

    if (status) {
      whereClauses.push("tl.status = ?");
      values.push(status);
    }

    if (search) {
      whereClauses.push(
        "(tl.listing_code LIKE ? OR t.ticket_code LIKE ? OR e.title LIKE ? OR seller.full_name LIKE ? OR buyer.full_name LIKE ?)"
      );
      values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM ticket_listings tl
      INNER JOIN tickets t ON t.id = tl.ticket_id
      INNER JOIN events e ON e.id = t.event_id
      INNER JOIN users seller ON seller.id = tl.seller_user_id
      LEFT JOIN users buyer ON buyer.id = tl.buyer_user_id
      ${whereSql}
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT
        tl.id,
        tl.listing_code,
        tl.ticket_id,
        t.ticket_code,
        tl.seller_user_id,
        seller.full_name AS seller_name,
        tl.buyer_user_id,
        buyer.full_name AS buyer_name,
        tl.original_price,
        tl.asking_price,
        tl.status,
        tl.transfer_id,
        tl.admin_id,
        admin.full_name AS admin_name,
        tl.admin_note,
        tl.listed_at,
        tl.buyer_selected_at,
        tl.sold_at,
        tl.cancelled_at,
        tl.rejected_at,
        tl.expires_at,
        e.title AS event_title,
        e.event_date
      FROM ticket_listings tl
      INNER JOIN tickets t ON t.id = tl.ticket_id
      INNER JOIN events e ON e.id = t.event_id
      INNER JOIN users seller ON seller.id = tl.seller_user_id
      LEFT JOIN users buyer ON buyer.id = tl.buyer_user_id
      LEFT JOIN users admin ON admin.id = tl.admin_id
      ${whereSql}
      ORDER BY tl.created_at DESC, tl.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách listing marketplace thành công",
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
      message: "Lỗi server khi lấy danh sách marketplace",
      error: err.message,
    });
  }
};

// =========================
// Admin - Get Marketplace Listing Detail
// GET /api/admin/marketplace/listings/:id
// =========================
const getListingDetail = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const listingId = parsePositiveInt(req.params.id);

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: "ID listing không hợp lệ",
      });
    }

    const listing = await getAdminListingDetail(connection, listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing không tồn tại",
      });
    }

    const [paymentRows] = await connection.query(
      `
      SELECT
        id,
        transfer_id,
        ticket_id,
        seller_user_id,
        buyer_user_id,
        amount,
        currency,
        payment_method,
        gateway_transaction_id,
        blockchain_tx_hash,
        payer_wallet_address,
        status,
        paid_at,
        created_at,
        updated_at
      FROM ticket_transfer_payments
      WHERE transfer_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [listing.transfer_id]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết listing marketplace thành công",
      data: {
        ...listing,
        transfer_payment: paymentRows.length > 0 ? paymentRows[0] : null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết listing",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// Admin - Approve Marketplace Transfer
// PUT /api/admin/marketplace/listings/:id/approve
// =========================
const approveListingTransfer = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const adminId = req.user.id;
    const listingId = parsePositiveInt(req.params.id);
    const adminNote = normalizeString(req.body.admin_note || "Admin xác nhận chuyển nhượng marketplace");

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: "ID listing không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const [listingRows] = await connection.query(
      `
      SELECT
        tl.id,
        tl.listing_code,
        tl.ticket_id,
        tl.seller_user_id,
        tl.seller_wallet_address,
        tl.buyer_user_id,
        tl.buyer_wallet_address,
        tl.asking_price,
        tl.status,
        tl.transfer_id,
        t.ticket_code,
        t.owner_user_id,
        t.owner_wallet_address,
        t.ticket_status
      FROM ticket_listings tl
      INNER JOIN tickets t ON t.id = tl.ticket_id
      WHERE tl.id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [listingId]
    );

    if (listingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Listing không tồn tại",
      });
    }

    const listing = listingRows[0];

    if (listing.status !== "waiting_admin") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ listing đang chờ admin mới được xác nhận",
      });
    }

    if (!listing.buyer_user_id || !listing.buyer_wallet_address || !listing.transfer_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Listing chưa có đủ thông tin người mua hoặc transfer",
      });
    }

    if (listing.owner_user_id !== listing.seller_user_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Vé không còn thuộc về người bán",
      });
    }

    if (normalizeAddress(listing.owner_wallet_address) !== normalizeAddress(listing.seller_wallet_address)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Ví sở hữu vé không còn khớp với người bán",
      });
    }

    if (listing.ticket_status !== "transfer_pending") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Trạng thái vé không hợp lệ để xác nhận chuyển nhượng",
      });
    }

    const [transferRows] = await connection.query(
      `
      SELECT
        id,
        ticket_id,
        from_user_id,
        to_user_id,
        asking_price,
        payment_status,
        status
      FROM ticket_transfers
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [listing.transfer_id]
    );

    if (transferRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Transfer của listing không tồn tại",
      });
    }

    const transfer = transferRows[0];

    if (transfer.status !== "approved" || transfer.payment_status !== "paid") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Transfer chưa ở trạng thái đã thanh toán/chờ admin",
      });
    }

    const sellerWalletTransaction = await creditBalance(connection, {
      userId: listing.seller_user_id,
      amount: listing.asking_price,
      transactionType: "transfer_receive",
      referenceType: "marketplace_listing",
      referenceId: listing.id,
      note: `Nhận tiền bán vé trên sàn ${listing.listing_code}`,
      adminId,
    });

    await connection.query(
      `
      UPDATE tickets
      SET owner_user_id = ?,
          owner_wallet_address = ?,
          ticket_status = 'active',
          transferred_count = transferred_count + 1,
          last_transfer_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [
        listing.buyer_user_id,
        normalizeAddress(listing.buyer_wallet_address),
        listing.ticket_id,
      ]
    );

    await connection.query(
      `
      UPDATE ticket_transfers
      SET status = 'completed',
          approved_by_admin_id = ?,
          approved_at = NOW(),
          transferred_at = NOW(),
          admin_note = ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [adminId, adminNote, listing.transfer_id]
    );

    await connection.query(
      `
      UPDATE ticket_listings
      SET status = 'sold',
          admin_id = ?,
          admin_note = ?,
          sold_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [adminId, adminNote, listing.id]
    );

    const detail = await getAdminListingDetail(connection, listing.id);

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Xác nhận chuyển nhượng marketplace thành công",
      data: {
        listing: detail,
        seller_wallet_transaction: sellerWalletTransaction,
      },
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi xác nhận marketplace",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// Admin - Reject Marketplace Transfer
// PUT /api/admin/marketplace/listings/:id/reject
// =========================
const rejectListingTransfer = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const adminId = req.user.id;
    const listingId = parsePositiveInt(req.params.id);
    const adminNote = normalizeString(req.body.admin_note || "Admin từ chối giao dịch marketplace");

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: "ID listing không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const [listingRows] = await connection.query(
      `
      SELECT
        tl.id,
        tl.listing_code,
        tl.ticket_id,
        tl.seller_user_id,
        tl.buyer_user_id,
        tl.asking_price,
        tl.status,
        tl.transfer_id
      FROM ticket_listings tl
      WHERE tl.id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [listingId]
    );

    if (listingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Listing không tồn tại",
      });
    }

    const listing = listingRows[0];

    if (listing.status !== "waiting_admin") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ listing đang chờ admin mới được từ chối",
      });
    }

    if (!listing.buyer_user_id || !listing.transfer_id) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Listing chưa có người mua hoặc transfer",
      });
    }

    const refundTransaction = await creditBalance(connection, {
      userId: listing.buyer_user_id,
      amount: listing.asking_price,
      transactionType: "refund",
      referenceType: "marketplace_listing",
      referenceId: listing.id,
      note: `Hoàn tiền do admin từ chối listing ${listing.listing_code}`,
      adminId,
    });

    await connection.query(
      `
      UPDATE ticket_transfer_payments
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE transfer_id = ?
      `,
      [listing.transfer_id]
    );

    await connection.query(
      `
      UPDATE ticket_transfers
      SET status = 'rejected',
          payment_status = 'cancelled',
          approved_by_admin_id = ?,
          rejected_at = NOW(),
          admin_note = ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [adminId, adminNote, listing.transfer_id]
    );

    await connection.query(
      `
      UPDATE ticket_listings
      SET status = 'rejected',
          admin_id = ?,
          admin_note = ?,
          rejected_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [adminId, adminNote, listing.id]
    );

    await connection.query(
      `
      UPDATE tickets
      SET ticket_status = 'active',
          updated_at = NOW()
      WHERE id = ?
        AND owner_user_id = ?
        AND ticket_status = 'transfer_pending'
      `,
      [listing.ticket_id, listing.seller_user_id]
    );

    const detail = await getAdminListingDetail(connection, listing.id);

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Từ chối giao dịch marketplace và hoàn tiền cho người mua thành công",
      data: {
        listing: detail,
        refund_transaction: refundTransaction,
      },
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi từ chối marketplace",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllListings,
  getListingDetail,
  approveListingTransfer,
  rejectListingTransfer,
};