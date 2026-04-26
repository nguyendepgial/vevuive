const pool = require("../../config/db");
const {
  debitBalance,
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

function parsePositiveNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed <= 0 ? null : Number(parsed.toFixed(2));
}

function isValidWalletAddress(address) {
  return /^0x[a-f0-9]{40}$/.test(address);
}

function normalizePaymentMethodForDb(paymentMethod) {
  const method = normalizeString(paymentMethod || "demo").toLowerCase();

  if (["demo", "app_wallet", "internal_wallet", "metamask"].includes(method)) {
    return "demo";
  }

  return null;
}

function generateListingCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const i = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LST${y}${m}${d}${h}${i}${s}${rand}`;
}

async function generateUniqueListingCode(connection) {
  let code;
  let exists = true;

  while (exists) {
    code = generateListingCode();

    const [rows] = await connection.query(
      `
      SELECT id
      FROM ticket_listings
      WHERE listing_code = ?
      LIMIT 1
      `,
      [code]
    );

    exists = rows.length > 0;
  }

  return code;
}

async function getUserLinkedWallet(connection, userId) {
  const [rows] = await connection.query(
    `
    SELECT
      w.id,
      w.user_id,
      w.wallet_address,
      w.wallet_type,
      w.network_name,
      w.is_verified,
      u.full_name,
      u.email,
      u.status AS user_status
    FROM wallets w
    INNER JOIN users u ON u.id = w.user_id
    WHERE w.user_id = ?
    LIMIT 1
    `,
    [userId]
  );

  return rows.length > 0 ? rows[0] : null;
}

async function getListingDetail(connection, listingId) {
  const [rows] = await connection.query(
    `
    SELECT
      tl.id,
      tl.listing_code,
      tl.ticket_id,
      t.ticket_code,
      t.ticket_status,
      t.mint_status,
      t.metadata_uri,
      t.transferred_count,
      t.owner_user_id,
      t.owner_wallet_address,
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
      e.slug AS event_slug,
      e.location AS event_location,
      e.event_date,
      e.banner_image,
      tt.id AS ticket_type_id,
      tt.name AS ticket_type_name
    FROM ticket_listings tl
    INNER JOIN tickets t ON t.id = tl.ticket_id
    INNER JOIN events e ON e.id = t.event_id
    INNER JOIN ticket_types tt ON tt.id = t.ticket_type_id
    INNER JOIN users seller ON seller.id = tl.seller_user_id
    LEFT JOIN users buyer ON buyer.id = tl.buyer_user_id
    LEFT JOIN users admin ON admin.id = tl.admin_id
    WHERE tl.id = ?
    LIMIT 1
    `,
    [listingId]
  );

  return rows.length > 0 ? rows[0] : null;
}

// =========================
// User - Get Active Marketplace Listings
// GET /api/users/marketplace/listings
// =========================
const getActiveListings = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const eventId = parsePositiveInt(req.query.event_id);
    const search = normalizeString(req.query.search || "");

    const whereClauses = ["tl.status = 'active'", "t.ticket_status = 'transfer_pending'"];
    const values = [];

    if (eventId) {
      whereClauses.push("e.id = ?");
      values.push(eventId);
    }

    if (search) {
      whereClauses.push("(e.title LIKE ? OR tt.name LIKE ? OR seller.full_name LIKE ?)");
      values.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM ticket_listings tl
      INNER JOIN tickets t ON t.id = tl.ticket_id
      INNER JOIN events e ON e.id = t.event_id
      INNER JOIN ticket_types tt ON tt.id = t.ticket_type_id
      INNER JOIN users seller ON seller.id = tl.seller_user_id
      WHERE ${whereSql}
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
        tl.original_price,
        tl.asking_price,
        tl.status,
        tl.listed_at,
        tl.expires_at,
        e.id AS event_id,
        e.title AS event_title,
        e.location AS event_location,
        e.event_date,
        e.banner_image,
        tt.id AS ticket_type_id,
        tt.name AS ticket_type_name
      FROM ticket_listings tl
      INNER JOIN tickets t ON t.id = tl.ticket_id
      INNER JOIN events e ON e.id = t.event_id
      INNER JOIN ticket_types tt ON tt.id = t.ticket_type_id
      INNER JOIN users seller ON seller.id = tl.seller_user_id
      WHERE ${whereSql}
      ORDER BY tl.listed_at DESC, tl.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách vé đang bán trên sàn thành công",
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
      message: "Lỗi server khi lấy danh sách vé trên sàn",
      error: err.message,
    });
  }
};

// =========================
// User - Get Marketplace Listing Detail
// GET /api/users/marketplace/listings/:id
// =========================
const getListingById = async (req, res) => {
  try {
    const listingId = parsePositiveInt(req.params.id);

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: "ID listing không hợp lệ",
      });
    }

    const connection = await pool.getConnection();

    try {
      const listing = await getListingDetail(connection, listingId);

      if (!listing) {
        return res.status(404).json({
          success: false,
          message: "Listing không tồn tại",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Lấy chi tiết listing thành công",
        data: listing,
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết listing",
      error: err.message,
    });
  }
};

// =========================
// User - Create Listing
// POST /api/users/marketplace/listings
// body: { ticket_id, asking_price, expires_in_days }
// =========================
const createListing = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;

    let { ticket_id, asking_price, expires_in_days } = req.body;

    ticket_id = parsePositiveInt(ticket_id);
    asking_price = parsePositiveNumber(asking_price);
    expires_in_days = parsePositiveInt(expires_in_days);

    const errors = {};

    if (!ticket_id) {
      errors.ticket_id = "ticket_id không hợp lệ";
    }

    if (!asking_price) {
      errors.asking_price = "Giá đăng bán không hợp lệ";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu đăng bán không hợp lệ",
        errors,
      });
    }

    await connection.beginTransaction();

    const sellerWallet = await getUserLinkedWallet(connection, userId);

    if (!sellerWallet) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Bạn cần liên kết ví trước khi đăng vé lên sàn",
      });
    }

    const sellerWalletAddress = normalizeAddress(sellerWallet.wallet_address);

    if (!isValidWalletAddress(sellerWalletAddress)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Ví đã liên kết không hợp lệ",
      });
    }

    const [ticketRows] = await connection.query(
      `
      SELECT
        t.id,
        t.ticket_code,
        t.owner_user_id,
        t.owner_wallet_address,
        t.unit_price,
        t.ticket_status,
        t.event_id,
        e.title AS event_title,
        e.event_date
      FROM tickets t
      INNER JOIN events e ON e.id = t.event_id
      WHERE t.id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [ticket_id]
    );

    if (ticketRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Vé không tồn tại",
      });
    }

    const ticket = ticketRows[0];

    if (ticket.owner_user_id !== userId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Bạn không phải chủ sở hữu của vé này",
      });
    }

    if (normalizeAddress(ticket.owner_wallet_address) !== sellerWalletAddress) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Ví hiện tại của bạn không khớp với ví đang sở hữu vé",
      });
    }

    if (ticket.ticket_status !== "active") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ vé đang active mới được đăng bán",
      });
    }

    if (ticket.event_date && new Date(ticket.event_date) <= new Date()) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Sự kiện đã diễn ra nên vé không thể đăng bán",
      });
    }

    if (Number(asking_price) > Number(ticket.unit_price)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Giá đăng bán phải nhỏ hơn hoặc bằng giá gốc của vé",
      });
    }

    const [activeListingRows] = await connection.query(
      `
      SELECT id
      FROM ticket_listings
      WHERE ticket_id = ?
        AND status IN ('active', 'pending_payment', 'waiting_admin')
      LIMIT 1
      `,
      [ticket.id]
    );

    if (activeListingRows.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Vé này đang được đăng bán hoặc đang chờ xử lý giao dịch",
      });
    }

    const listingCode = await generateUniqueListingCode(connection);

    let expiresAt = null;

    if (expires_in_days) {
      const [expireRows] = await connection.query(
        `SELECT DATE_ADD(NOW(), INTERVAL ? DAY) AS expires_at`,
        [expires_in_days]
      );
      expiresAt = expireRows[0].expires_at;
    }

    const [insertResult] = await connection.query(
      `
      INSERT INTO ticket_listings (
        listing_code,
        ticket_id,
        seller_user_id,
        seller_wallet_address,
        buyer_user_id,
        buyer_wallet_address,
        original_price,
        asking_price,
        status,
        transfer_id,
        admin_id,
        admin_note,
        listed_at,
        buyer_selected_at,
        sold_at,
        cancelled_at,
        rejected_at,
        expires_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, 'active', NULL, NULL, NULL, NOW(), NULL, NULL, NULL, NULL, ?, NOW(), NOW())
      `,
      [
        listingCode,
        ticket.id,
        userId,
        sellerWalletAddress,
        ticket.unit_price,
        asking_price,
        expiresAt,
      ]
    );

    await connection.query(
      `
      UPDATE tickets
      SET ticket_status = 'transfer_pending',
          updated_at = NOW()
      WHERE id = ?
      `,
      [ticket.id]
    );

    const listing = await getListingDetail(connection, insertResult.insertId);

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Đăng vé lên sàn thành công",
      data: listing,
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi đăng vé lên sàn",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// User - Buy Listing
// POST /api/users/marketplace/listings/:id/buy
// body: { payment_method }
// =========================
const buyListing = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const buyerUserId = req.user.id;
    const listingId = parsePositiveInt(req.params.id);
    const paymentMethod = normalizePaymentMethodForDb(req.body.payment_method || "demo");

    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: "ID listing không hợp lệ",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Hiện hệ thống chỉ hỗ trợ thanh toán bằng ví nội bộ",
      });
    }

    await connection.beginTransaction();

    const buyerWallet = await getUserLinkedWallet(connection, buyerUserId);

    if (!buyerWallet) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Bạn cần liên kết ví trước khi mua vé trên sàn",
      });
    }

    if (buyerWallet.user_status !== "active") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Tài khoản của bạn hiện không hoạt động",
      });
    }

    const buyerWalletAddress = normalizeAddress(buyerWallet.wallet_address);

    if (!isValidWalletAddress(buyerWalletAddress)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Ví đã liên kết không hợp lệ",
      });
    }

    const [listingRows] = await connection.query(
      `
      SELECT
        tl.id,
        tl.listing_code,
        tl.ticket_id,
        tl.seller_user_id,
        tl.seller_wallet_address,
        tl.original_price,
        tl.asking_price,
        tl.status,
        tl.expires_at,
        t.ticket_code,
        t.owner_user_id,
        t.owner_wallet_address,
        t.ticket_status,
        t.unit_price,
        e.event_date
      FROM ticket_listings tl
      INNER JOIN tickets t ON t.id = tl.ticket_id
      INNER JOIN events e ON e.id = t.event_id
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

    if (listing.status !== "active") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Listing này không còn khả dụng để mua",
      });
    }

    if (listing.seller_user_id === buyerUserId) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Bạn không thể mua vé do chính mình đăng bán",
      });
    }

    if (listing.expires_at && new Date(listing.expires_at) < new Date()) {
      await connection.query(
        `
        UPDATE ticket_listings
        SET status = 'expired',
            updated_at = NOW()
        WHERE id = ?
        `,
        [listing.id]
      );

      await connection.query(
        `
        UPDATE tickets
        SET ticket_status = 'active',
            updated_at = NOW()
        WHERE id = ?
          AND owner_user_id = ?
      `,
        [listing.ticket_id, listing.seller_user_id]
      );

      await connection.commit();

      return res.status(400).json({
        success: false,
        message: "Listing đã hết hạn",
      });
    }

    if (listing.event_date && new Date(listing.event_date) <= new Date()) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Sự kiện đã diễn ra nên vé không thể mua trên sàn",
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
        message: "Trạng thái vé không hợp lệ để mua",
      });
    }

    let buyerWalletTransaction;

    try {
      buyerWalletTransaction = await debitBalance(connection, {
        userId: buyerUserId,
        amount: listing.asking_price,
        transactionType: "transfer_purchase",
        referenceType: "marketplace_listing",
        referenceId: listing.id,
        note: `Mua vé trên sàn ${listing.listing_code}`,
        adminId: null,
      });
    } catch (walletErr) {
      await connection.rollback();

      if (walletErr.code === "INSUFFICIENT_BALANCE") {
        return res.status(400).json({
          success: false,
          message: "Số dư ví nội bộ không đủ để mua vé trên sàn",
          data: {
            current_balance: walletErr.currentBalance,
            required_amount: walletErr.requiredAmount,
          },
        });
      }

      return res.status(400).json({
        success: false,
        message: walletErr.message || "Không thể thanh toán listing",
      });
    }

    const [transferResult] = await connection.query(
      `
      INSERT INTO ticket_transfers (
        ticket_id,
        from_user_id,
        from_wallet_address,
        to_user_id,
        to_wallet_address,
        requested_by_user_id,
        transfer_type,
        asking_price,
        payment_status,
        approved_by_admin_id,
        transfer_tx_hash,
        status,
        admin_note,
        failure_reason,
        requested_at,
        accepted_at,
        expires_at,
        approved_at,
        rejected_at,
        failed_at,
        cancelled_at,
        transferred_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'resale_private', ?, 'paid', NULL, NULL, 'approved', 'Giao dịch marketplace chờ admin xác nhận', NULL, NOW(), NOW(), NULL, NULL, NULL, NULL, NULL, NULL, NOW(), NOW())
      `,
      [
        listing.ticket_id,
        listing.seller_user_id,
        normalizeAddress(listing.seller_wallet_address),
        buyerUserId,
        buyerWalletAddress,
        buyerUserId,
        listing.asking_price,
      ]
    );

    await connection.query(
      `
      INSERT INTO ticket_transfer_payments (
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
      )
      VALUES (?, ?, ?, ?, ?, 'VND', ?, NULL, NULL, ?, 'success', NOW(), NOW(), NOW())
      `,
      [
        transferResult.insertId,
        listing.ticket_id,
        listing.seller_user_id,
        buyerUserId,
        listing.asking_price,
        paymentMethod,
        buyerWalletAddress,
      ]
    );

    await connection.query(
      `
      UPDATE ticket_listings
      SET buyer_user_id = ?,
          buyer_wallet_address = ?,
          status = 'waiting_admin',
          transfer_id = ?,
          buyer_selected_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [
        buyerUserId,
        buyerWalletAddress,
        transferResult.insertId,
        listing.id,
      ]
    );

    const updatedListing = await getListingDetail(connection, listing.id);

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Mua vé thành công, giao dịch đang chờ admin xác nhận chuyển nhượng",
      data: {
        listing: updatedListing,
        buyer_wallet_transaction: buyerWalletTransaction,
      },
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi mua vé trên sàn",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// User - Get My Listings
// GET /api/users/marketplace/my-listings
// =========================
const getMyListings = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const status = normalizeString(req.query.status || "");

    const whereClauses = ["tl.seller_user_id = ?"];
    const values = [userId];

    if (status) {
      whereClauses.push("tl.status = ?");
      values.push(status);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM ticket_listings tl
      WHERE ${whereSql}
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
        tl.original_price,
        tl.asking_price,
        tl.status,
        tl.buyer_user_id,
        buyer.full_name AS buyer_name,
        tl.transfer_id,
        tl.listed_at,
        tl.buyer_selected_at,
        tl.sold_at,
        tl.cancelled_at,
        tl.rejected_at,
        tl.expires_at,
        e.title AS event_title,
        e.event_date,
        tt.name AS ticket_type_name
      FROM ticket_listings tl
      INNER JOIN tickets t ON t.id = tl.ticket_id
      INNER JOIN events e ON e.id = t.event_id
      INNER JOIN ticket_types tt ON tt.id = t.ticket_type_id
      LEFT JOIN users buyer ON buyer.id = tl.buyer_user_id
      WHERE ${whereSql}
      ORDER BY tl.created_at DESC, tl.id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách vé bạn đã đăng bán thành công",
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
      message: "Lỗi server khi lấy listing của bạn",
      error: err.message,
    });
  }
};

// =========================
// User - Cancel My Active Listing
// PUT /api/users/marketplace/listings/:id/cancel
// =========================
const cancelMyListing = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const listingId = parsePositiveInt(req.params.id);

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
        id,
        ticket_id,
        seller_user_id,
        status
      FROM ticket_listings
      WHERE id = ?
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

    if (listing.seller_user_id !== userId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền hủy listing này",
      });
    }

    if (listing.status !== "active") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể hủy listing đang active. Listing đã có người mua thì cần admin xử lý.",
      });
    }

    await connection.query(
      `
      UPDATE ticket_listings
      SET status = 'cancelled',
          cancelled_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [listing.id]
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
      [listing.ticket_id, userId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Hủy đăng bán vé thành công",
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi hủy listing",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  getActiveListings,
  getListingById,
  createListing,
  buyListing,
  getMyListings,
  cancelMyListing,
};