const pool = require("../../config/db");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function parsePositiveNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed <= 0 ? null : Number(parsed.toFixed(2));
}

function generateTopupCode() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const i = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TOPUP${y}${m}${d}${h}${i}${s}${rand}`;
}

async function generateUniqueTopupCode(connection) {
  let code;
  let exists = true;

  while (exists) {
    code = generateTopupCode();

    const [rows] = await connection.query(
      `
      SELECT id
      FROM wallet_topup_requests
      WHERE topup_code = ?
      LIMIT 1
      `,
      [code]
    );

    exists = rows.length > 0;
  }

  return code;
}

function buildPaymentInfo(topupCode, amount) {
  const bankName = process.env.TOPUP_BANK_NAME || "Demo Bank";
  const bankAccount = process.env.TOPUP_BANK_ACCOUNT || "0123456789";
  const bankOwner = process.env.TOPUP_BANK_OWNER || "VEVUIVE";
  const qrImageUrl = process.env.TOPUP_QR_IMAGE_URL || null;

  return {
    bank_name: bankName,
    bank_account: bankAccount,
    bank_owner: bankOwner,
    amount,
    currency: "VND",
    transfer_content: topupCode,
    qr_image_url: qrImageUrl,
    note:
      "Vui lòng chuyển khoản đúng số tiền và đúng nội dung chuyển khoản để admin dễ xác nhận.",
  };
}

// =========================
// User - Create Topup Request
// POST /api/users/topup-requests
// body: { amount, payment_method, payment_note }
// =========================
const createTopupRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;

    const amount = parsePositiveNumber(req.body.amount);
    const paymentMethod = normalizeString(req.body.payment_method || "qr_transfer").toLowerCase();
    const paymentNote = normalizeString(req.body.payment_note || "");

    const errors = {};

    if (!amount) {
      errors.amount = "Số tiền nạp không hợp lệ";
    }

    if (!["bank_transfer", "qr_transfer", "cash", "demo"].includes(paymentMethod)) {
      errors.payment_method = "Phương thức nạp tiền không hợp lệ";
    }

    if (amount && amount < 10000) {
      errors.amount = "Số tiền nạp tối thiểu là 10.000 VND";
    }

    if (amount && amount > 100000000) {
      errors.amount = "Số tiền nạp tối đa là 100.000.000 VND";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu yêu cầu nạp tiền không hợp lệ",
        errors,
      });
    }

    await connection.beginTransaction();

    const [userRows] = await connection.query(
      `
      SELECT id, full_name, email, role, status
      FROM users
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [userId]
    );

    if (userRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    const user = userRows[0];

    if (user.status !== "active") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Tài khoản hiện không hoạt động",
      });
    }

    const topupCode = await generateUniqueTopupCode(connection);
    const transferContent = topupCode;

    const [insertResult] = await connection.query(
      `
      INSERT INTO wallet_topup_requests (
        topup_code,
        user_id,
        amount,
        currency,
        payment_method,
        transfer_content,
        payment_note,
        proof_image_url,
        status,
        admin_id,
        admin_note,
        wallet_transaction_id,
        requested_at,
        submitted_at,
        approved_at,
        rejected_at,
        cancelled_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 'VND', ?, ?, ?, NULL, 'pending', NULL, NULL, NULL, NOW(), NULL, NULL, NULL, NULL, NOW(), NOW())
      `,
      [
        topupCode,
        userId,
        amount,
        paymentMethod,
        transferContent,
        paymentNote || null,
      ]
    );

    const [rows] = await connection.query(
      `
      SELECT
        id,
        topup_code,
        user_id,
        amount,
        currency,
        payment_method,
        transfer_content,
        payment_note,
        proof_image_url,
        status,
        requested_at,
        submitted_at,
        approved_at,
        rejected_at,
        cancelled_at,
        created_at,
        updated_at
      FROM wallet_topup_requests
      WHERE id = ?
      LIMIT 1
      `,
      [insertResult.insertId]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Tạo yêu cầu nạp tiền thành công",
      data: {
        request: rows[0],
        payment_info: buildPaymentInfo(topupCode, amount),
      },
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo yêu cầu nạp tiền",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// User - Submit Paid Topup Request
// PUT /api/users/topup-requests/:id/submit
// body: { payment_note, proof_image_url }
// =========================
const submitPaidTopupRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const requestId = parsePositiveInt(req.params.id);

    const paymentNote = normalizeString(req.body.payment_note || "");
    const proofImageUrl = normalizeString(req.body.proof_image_url || "");

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "ID yêu cầu nạp tiền không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT
        id,
        user_id,
        topup_code,
        amount,
        status
      FROM wallet_topup_requests
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [requestId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Yêu cầu nạp tiền không tồn tại",
      });
    }

    const request = rows[0];

    if (request.user_id !== userId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật yêu cầu nạp tiền này",
      });
    }

    if (request.status !== "pending") {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Chỉ yêu cầu đang chờ thanh toán mới có thể xác nhận đã thanh toán",
      });
    }

    await connection.query(
      `
      UPDATE wallet_topup_requests
      SET status = 'paid_submitted',
          payment_note = ?,
          proof_image_url = ?,
          submitted_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [
        paymentNote || null,
        proofImageUrl || null,
        requestId,
      ]
    );

    const [updatedRows] = await connection.query(
      `
      SELECT
        id,
        topup_code,
        user_id,
        amount,
        currency,
        payment_method,
        transfer_content,
        payment_note,
        proof_image_url,
        status,
        requested_at,
        submitted_at,
        approved_at,
        rejected_at,
        cancelled_at,
        created_at,
        updated_at
      FROM wallet_topup_requests
      WHERE id = ?
      LIMIT 1
      `,
      [requestId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Đã gửi xác nhận thanh toán, vui lòng chờ admin duyệt",
      data: updatedRows[0],
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi xác nhận đã thanh toán",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// User - Cancel Topup Request
// PUT /api/users/topup-requests/:id/cancel
// =========================
const cancelTopupRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const userId = req.user.id;
    const requestId = parsePositiveInt(req.params.id);

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: "ID yêu cầu nạp tiền không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT id, user_id, status
      FROM wallet_topup_requests
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [requestId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Yêu cầu nạp tiền không tồn tại",
      });
    }

    const request = rows[0];

    if (request.user_id !== userId) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền hủy yêu cầu nạp tiền này",
      });
    }

    if (!["pending", "paid_submitted"].includes(request.status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "Yêu cầu này không thể hủy",
      });
    }

    await connection.query(
      `
      UPDATE wallet_topup_requests
      SET status = 'cancelled',
          cancelled_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
      `,
      [requestId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Hủy yêu cầu nạp tiền thành công",
    });
  } catch (err) {
    await connection.rollback();

    return res.status(500).json({
      success: false,
      message: "Lỗi server khi hủy yêu cầu nạp tiền",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// User - Get My Topup Requests
// GET /api/users/topup-requests
// =========================
const getMyTopupRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parsePositiveInt(req.query.page) || 1;
    const limit = parsePositiveInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const status = normalizeString(req.query.status || "");

    const whereClauses = ["user_id = ?"];
    const values = [userId];

    if (status) {
      whereClauses.push("status = ?");
      values.push(status);
    }

    const whereSql = whereClauses.join(" AND ");

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM wallet_topup_requests
      WHERE ${whereSql}
      `,
      values
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
        topup_code,
        user_id,
        amount,
        currency,
        payment_method,
        transfer_content,
        payment_note,
        proof_image_url,
        status,
        admin_id,
        admin_note,
        wallet_transaction_id,
        requested_at,
        submitted_at,
        approved_at,
        rejected_at,
        cancelled_at,
        created_at,
        updated_at
      FROM wallet_topup_requests
      WHERE ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ? OFFSET ?
      `,
      [...values, limit, offset]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách yêu cầu nạp tiền thành công",
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
      message: "Lỗi server khi lấy yêu cầu nạp tiền",
      error: err.message,
    });
  }
};

module.exports = {
  createTopupRequest,
  submitPaidTopupRequest,
  cancelTopupRequest,
  getMyTopupRequests,
};