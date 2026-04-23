const pool = require("../../config/db");
const blockchainService = require("../../services/blockchainService");

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

function generateTicketCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const i = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TCK${y}${m}${d}${h}${i}${s}${rand}`;
}

async function generateUniqueTicketCode(connection) {
  let code;
  let exists = true;

  while (exists) {
    code = generateTicketCode();
    const [rows] = await connection.query(
      "SELECT id FROM tickets WHERE ticket_code = ? LIMIT 1",
      [code]
    );
    exists = rows.length > 0;
  }

  return code;
}

function buildDefaultMetadataUri(ticketId) {
  const baseUrl = (process.env.BASE_URL || "http://localhost:5001").replace(/\/+$/, "");
  return `${baseUrl}/api/users/tickets/${ticketId}`;
}

async function getTicketDetailRow(ticketId) {
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
      u.full_name,
      u.email,
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
    INNER JOIN users u ON u.id = t.owner_user_id
    WHERE t.id = ?
    LIMIT 1
    `,
    [ticketId]
  );

  return rows.length > 0 ? rows[0] : null;
}

async function mintSingleTicketInternal(ticketId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [ticketRows] = await connection.query(
      `
      SELECT
        t.id,
        t.ticket_code,
        t.order_id,
        t.order_item_id,
        t.event_id,
        t.ticket_type_id,
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
        o.payment_status,
        o.order_status,
        w.wallet_address AS linked_wallet_address
      FROM tickets t
      INNER JOIN orders o ON o.id = t.order_id
      LEFT JOIN wallets w ON w.user_id = t.owner_user_id
      WHERE t.id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [ticketId]
    );

    if (ticketRows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        code: 404,
        message: "Vé không tồn tại",
      };
    }

    const ticket = ticketRows[0];

    if (ticket.mint_status === "minted") {
      await connection.commit();
      const detail = await getTicketDetailRow(ticketId);
      return {
        success: true,
        already_minted: true,
        message: "Vé đã được mint trước đó",
        ticket: detail,
      };
    }

    if (ticket.payment_status !== "paid") {
      await connection.rollback();
      return {
        success: false,
        code: 400,
        message: "Chỉ được mint vé của đơn hàng đã thanh toán",
      };
    }

    if (!["pending_mint", "active"].includes(ticket.ticket_status)) {
      await connection.rollback();
      return {
        success: false,
        code: 400,
        message: "Trạng thái vé hiện không thể mint",
      };
    }

    const walletAddress = normalizeAddress(
      ticket.owner_wallet_address || ticket.linked_wallet_address
    );

    if (!walletAddress) {
      await connection.rollback();
      return {
        success: false,
        code: 400,
        message: "Vé chưa có địa chỉ ví sở hữu",
      };
    }

    const metadataUri = ticket.metadata_uri || buildDefaultMetadataUri(ticket.id);

    let mintResult;
    try {
      mintResult = await blockchainService.mintTicket({
        to: walletAddress,
        tokenURI: metadataUri,
      });
    } catch (err) {
      await connection.query(
        `
        UPDATE tickets
        SET mint_status = 'failed',
            updated_at = NOW()
        WHERE id = ?
        `,
        [ticketId]
      );

      await connection.commit();

      return {
        success: false,
        code: 500,
        message: "Mint NFT thất bại",
        error: err.message,
      };
    }

    await connection.query(
      `
      UPDATE tickets
      SET owner_wallet_address = ?,
          blockchain_ticket_id = ?,
          contract_address = ?,
          mint_tx_hash = ?,
          metadata_uri = ?,
          ticket_status = 'active',
          mint_status = 'minted',
          minted_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [
        walletAddress,
        mintResult.tokenId,
        mintResult.contractAddress,
        mintResult.txHash,
        metadataUri,
        ticketId,
      ]
    );

    await connection.commit();

    const updatedTicket = await getTicketDetailRow(ticketId);

    return {
      success: true,
      already_minted: false,
      message: "Mint NFT thành công",
      ticket: updatedTicket,
      blockchain: mintResult,
    };
  } catch (err) {
    await connection.rollback();
    return {
      success: false,
      code: 500,
      message: "Lỗi server khi mint vé",
      error: err.message,
    };
  } finally {
    connection.release();
  }
}

// =========================
// Admin - Issue Tickets For Paid Order
// =========================
const issueTicketsByOrder = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const orderId = parsePositiveInt(req.params.orderId);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "ID đơn hàng không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const [orderRows] = await connection.query(
      `
      SELECT
        o.id,
        o.order_code,
        o.user_id,
        o.total_amount,
        o.payment_status,
        o.order_status,
        o.payment_method,
        o.created_at,
        o.updated_at,
        w.wallet_address
      FROM orders o
      LEFT JOIN wallets w ON w.user_id = o.user_id
      WHERE o.id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [orderId]
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    const order = orderRows[0];

    if (order.payment_status !== "paid") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ được phát hành vé cho đơn hàng đã thanh toán",
      });
    }

    if (!order.wallet_address) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Người dùng chưa liên kết ví, không thể phát hành vé",
      });
    }

    const [orderItemRows] = await connection.query(
      `
      SELECT
        oi.id,
        oi.order_id,
        oi.ticket_type_id,
        oi.ticket_type_name_snapshot,
        oi.unit_price,
        oi.quantity,
        oi.subtotal,
        tt.event_id,
        tt.name AS ticket_type_name,
        tt.status AS ticket_type_status,
        e.title AS event_title,
        e.status AS event_status,
        e.event_date
      FROM order_items oi
      INNER JOIN ticket_types tt ON tt.id = oi.ticket_type_id
      INNER JOIN events e ON e.id = tt.event_id
      WHERE oi.order_id = ?
      FOR UPDATE
      `,
      [orderId]
    );

    if (orderItemRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Đơn hàng không có chi tiết vé",
      });
    }

    const createdTicketIds = [];

    for (const item of orderItemRows) {
      const [issuedCountRows] = await connection.query(
        `
        SELECT COUNT(*) AS issued_count
        FROM tickets
        WHERE order_item_id = ?
        `,
        [item.id]
      );

      const issuedCount = Number(issuedCountRows[0].issued_count || 0);

      if (issuedCount > item.quantity) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Dữ liệu vé của order item ${item.id} không hợp lệ`,
        });
      }

      const remainingToIssue = item.quantity - issuedCount;

      for (let index = 0; index < remainingToIssue; index++) {
        const ticketCode = await generateUniqueTicketCode(connection);

        const [insertResult] = await connection.query(
          `
          INSERT INTO tickets (
            ticket_code,
            order_id,
            order_item_id,
            event_id,
            ticket_type_id,
            owner_user_id,
            owner_wallet_address,
            unit_price,
            ticket_status,
            blockchain_ticket_id,
            contract_address,
            mint_tx_hash,
            metadata_uri,
            mint_status,
            minted_at,
            transferred_count,
            last_transfer_at,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_mint', NULL, NULL, NULL, NULL, 'pending', NULL, 0, NULL, NOW(), NOW())
          `,
          [
            ticketCode,
            order.id,
            item.id,
            item.event_id,
            item.ticket_type_id,
            order.user_id,
            normalizeAddress(String(order.wallet_address)),
            item.unit_price,
          ]
        );

        createdTicketIds.push(insertResult.insertId);
      }
    }

    const [sumRows] = await connection.query(
      `
      SELECT COALESCE(SUM(quantity), 0) AS total_quantity
      FROM order_items
      WHERE order_id = ?
      `,
      [orderId]
    );

    const [ticketCountRows] = await connection.query(
      `
      SELECT COUNT(*) AS total_issued
      FROM tickets
      WHERE order_id = ?
      `,
      [orderId]
    );

    const totalIssued = Number(ticketCountRows[0].total_issued || 0);
    const totalQuantity = Number(sumRows[0].total_quantity || 0);

    if (totalIssued >= totalQuantity) {
      await connection.query(
        `
        UPDATE orders
        SET order_status = 'completed',
            updated_at = NOW()
        WHERE id = ?
        `,
        [orderId]
      );
    }

    await connection.commit();

    const [ticketRows] = await pool.query(
      `
      SELECT
        t.id,
        t.ticket_code,
        t.order_id,
        t.order_item_id,
        t.event_id,
        e.title AS event_title,
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
      INNER JOIN events e ON e.id = t.event_id
      INNER JOIN ticket_types tt ON tt.id = t.ticket_type_id
      WHERE t.id IN (?)
      ORDER BY t.id ASC
      `,
      [createdTicketIds.length > 0 ? createdTicketIds : [0]]
    );

    return res.status(201).json({
      success: true,
      message:
        createdTicketIds.length > 0
          ? "Phát hành vé thành công"
          : "Đơn hàng đã được phát hành đủ vé trước đó",
      data: {
        order_id: orderId,
        created_count: createdTicketIds.length,
        tickets: ticketRows,
      },
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi phát hành vé",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// Admin - Mint Single Ticket
// =========================
const mintTicketById = async (req, res) => {
  const ticketId = parsePositiveInt(req.params.id);

  if (!ticketId) {
    return res.status(400).json({
      success: false,
      message: "ID vé không hợp lệ",
    });
  }

  const result = await mintSingleTicketInternal(ticketId);

  if (!result.success) {
    return res.status(result.code || 500).json({
      success: false,
      message: result.message,
      error: result.error,
    });
  }

  return res.status(200).json({
    success: true,
    message: result.message,
    data: {
      ticket: result.ticket,
      blockchain: result.blockchain || null,
      already_minted: result.already_minted || false,
    },
  });
};

// =========================
// Admin - Mint All Pending Tickets By Order
// =========================
const mintTicketsByOrder = async (req, res) => {
  try {
    const orderId = parsePositiveInt(req.params.orderId);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "ID đơn hàng không hợp lệ",
      });
    }

    const [ticketRows] = await pool.query(
      `
      SELECT id
      FROM tickets
      WHERE order_id = ?
        AND mint_status IN ('pending', 'failed')
      ORDER BY id ASC
      `,
      [orderId]
    );

    if (ticketRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không có vé nào cần mint cho đơn hàng này",
      });
    }

    const results = [];
    let successCount = 0;
    let failedCount = 0;

    for (const row of ticketRows) {
      const result = await mintSingleTicketInternal(row.id);

      if (result.success) {
        successCount += 1;
        results.push({
          ticket_id: row.id,
          success: true,
          message: result.message,
          ticket: result.ticket,
          blockchain: result.blockchain || null,
          already_minted: result.already_minted || false,
        });
      } else {
        failedCount += 1;
        results.push({
          ticket_id: row.id,
          success: false,
          message: result.message,
          error: result.error || null,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Xử lý mint vé theo đơn hàng hoàn tất",
      data: {
        order_id: orderId,
        total: ticketRows.length,
        success_count: successCount,
        failed_count: failedCount,
        results,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi mint vé theo đơn hàng",
      error: err.message,
    });
  }
};

// =========================
// Admin - Get All Tickets
// =========================
const getAllTickets = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const ticketStatus = normalizeString(req.query.ticket_status || "");
    const mintStatus = normalizeString(req.query.mint_status || "");
    const orderId = parsePositiveInt(req.query.order_id);
    const userId = parsePositiveInt(req.query.user_id);
    const ticketCode = normalizeString(req.query.ticket_code || "");

    const whereClauses = ["1 = 1"];
    const values = [];

    if (ticketStatus) {
      whereClauses.push("t.ticket_status = ?");
      values.push(ticketStatus);
    }

    if (mintStatus) {
      whereClauses.push("t.mint_status = ?");
      values.push(mintStatus);
    }

    if (orderId) {
      whereClauses.push("t.order_id = ?");
      values.push(orderId);
    }

    if (userId) {
      whereClauses.push("t.owner_user_id = ?");
      values.push(userId);
    }

    if (ticketCode) {
      whereClauses.push("t.ticket_code LIKE ?");
      values.push(`%${ticketCode}%`);
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
        t.ticket_type_id,
        tt.name AS ticket_type_name,
        t.owner_user_id,
        u.full_name,
        u.email,
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
      INNER JOIN users u ON u.id = t.owner_user_id
      WHERE ${whereSql}
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
// =========================
const getTicketDetail = async (req, res) => {
  try {
    const ticketId = parsePositiveInt(req.params.id);

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: "ID vé không hợp lệ",
      });
    }

    const row = await getTicketDetailRow(ticketId);

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Vé không tồn tại",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết vé thành công",
      data: row,
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
  issueTicketsByOrder,
  mintTicketById,
  mintTicketsByOrder,
  getAllTickets,
  getTicketDetail,
};