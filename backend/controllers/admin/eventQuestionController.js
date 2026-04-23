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

function isSupportedQuestionType(type) {
  return ["text", "textarea"].includes(type);
}

// =========================
// Admin - Create Question For Event
// =========================
const createEventQuestion = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const eventId = parsePositiveInt(req.params.eventId);
    let { question_text, question_type, is_required, sort_order } = req.body;

    question_text = normalizeString(question_text);
    question_type = normalizeString(question_type).toLowerCase();

    sort_order =
      sort_order === undefined || sort_order === null || sort_order === ""
        ? 0
        : Number.parseInt(sort_order, 10);

    is_required = Number(is_required) === 1 || is_required === true ? 1 : 0;

    const errors = {};

    if (!eventId) {
      errors.event_id = "ID sự kiện không hợp lệ";
    }

    if (!question_text) {
      errors.question_text = "Nội dung câu hỏi không được để trống";
    } else if (question_text.length > 500) {
      errors.question_text = "Nội dung câu hỏi không được vượt quá 500 ký tự";
    }

    if (!isSupportedQuestionType(question_type)) {
      errors.question_type = "Loại câu hỏi chỉ hỗ trợ text hoặc textarea";
    }

    if (!Number.isInteger(sort_order) || sort_order < 0) {
      errors.sort_order = "sort_order phải là số nguyên không âm";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu câu hỏi không hợp lệ",
        errors,
      });
    }

    await connection.beginTransaction();

    const [eventRows] = await connection.query(
      `
      SELECT id, title, status
      FROM events
      WHERE id = ?
      LIMIT 1
      `,
      [eventId]
    );

    if (eventRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Sự kiện không tồn tại",
      });
    }

    const [insertResult] = await connection.query(
      `
      INSERT INTO event_questions (
        event_id,
        question_text,
        question_type,
        is_required,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [eventId, question_text, question_type, is_required, sort_order]
    );

    const [rows] = await connection.query(
      `
      SELECT
        eq.id,
        eq.event_id,
        e.title AS event_title,
        eq.question_text,
        eq.question_type,
        eq.is_required,
        eq.sort_order,
        eq.created_at,
        eq.updated_at
      FROM event_questions eq
      INNER JOIN events e ON e.id = eq.event_id
      WHERE eq.id = ?
      LIMIT 1
      `,
      [insertResult.insertId]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Tạo câu hỏi cho sự kiện thành công",
      data: rows[0],
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo câu hỏi cho sự kiện",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// Admin - Get Questions Of Event
// =========================
const getQuestionsByEventForAdmin = async (req, res) => {
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
      SELECT id, title, status, event_date
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

    const [questionRows] = await pool.query(
      `
      SELECT
        eq.id,
        eq.event_id,
        eq.question_text,
        eq.question_type,
        eq.is_required,
        eq.sort_order,
        eq.created_at,
        eq.updated_at
      FROM event_questions eq
      WHERE eq.event_id = ?
      ORDER BY eq.sort_order ASC, eq.id ASC
      `,
      [eventId]
    );

    return res.status(200).json({
      success: true,
      message: "Lấy danh sách câu hỏi của sự kiện thành công",
      data: {
        event: eventRows[0],
        questions: questionRows,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách câu hỏi",
      error: err.message,
    });
  }
};

// =========================
// Admin - Get Question Detail
// =========================
const getEventQuestionDetail = async (req, res) => {
  try {
    const questionId = parsePositiveInt(req.params.id);

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: "ID câu hỏi không hợp lệ",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT
        eq.id,
        eq.event_id,
        e.title AS event_title,
        eq.question_text,
        eq.question_type,
        eq.is_required,
        eq.sort_order,
        eq.created_at,
        eq.updated_at
      FROM event_questions eq
      INNER JOIN events e ON e.id = eq.event_id
      WHERE eq.id = ?
      LIMIT 1
      `,
      [questionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Câu hỏi không tồn tại",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy chi tiết câu hỏi thành công",
      data: rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết câu hỏi",
      error: err.message,
    });
  }
};

// =========================
// Admin - Update Question
// =========================
const updateEventQuestion = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const questionId = parsePositiveInt(req.params.id);

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: "ID câu hỏi không hợp lệ",
      });
    }

    const [existingRows] = await connection.query(
      `
      SELECT
        id,
        event_id,
        question_text,
        question_type,
        is_required,
        sort_order
      FROM event_questions
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [questionId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Câu hỏi không tồn tại",
      });
    }

    const existing = existingRows[0];

    let { question_text, question_type, is_required, sort_order } = req.body;

    question_text =
      question_text === undefined
        ? existing.question_text
        : normalizeString(question_text);

    question_type =
      question_type === undefined
        ? existing.question_type
        : normalizeString(question_type).toLowerCase();

    sort_order =
      sort_order === undefined || sort_order === null || sort_order === ""
        ? existing.sort_order
        : Number.parseInt(sort_order, 10);

    is_required =
      is_required === undefined
        ? existing.is_required
        : Number(is_required) === 1 || is_required === true
          ? 1
          : 0;

    const errors = {};

    if (!question_text) {
      errors.question_text = "Nội dung câu hỏi không được để trống";
    } else if (question_text.length > 500) {
      errors.question_text = "Nội dung câu hỏi không được vượt quá 500 ký tự";
    }

    if (!isSupportedQuestionType(question_type)) {
      errors.question_type = "Loại câu hỏi chỉ hỗ trợ text hoặc textarea";
    }

    if (!Number.isInteger(sort_order) || sort_order < 0) {
      errors.sort_order = "sort_order phải là số nguyên không âm";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu cập nhật câu hỏi không hợp lệ",
        errors,
      });
    }

    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE event_questions
      SET question_text = ?,
          question_type = ?,
          is_required = ?,
          sort_order = ?,
          updated_at = NOW()
      WHERE id = ?
      `,
      [question_text, question_type, is_required, sort_order, questionId]
    );

    const [rows] = await connection.query(
      `
      SELECT
        eq.id,
        eq.event_id,
        e.title AS event_title,
        eq.question_text,
        eq.question_type,
        eq.is_required,
        eq.sort_order,
        eq.created_at,
        eq.updated_at
      FROM event_questions eq
      INNER JOIN events e ON e.id = eq.event_id
      WHERE eq.id = ?
      LIMIT 1
      `,
      [questionId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Cập nhật câu hỏi thành công",
      data: rows[0],
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật câu hỏi",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

// =========================
// Admin - Delete Question
// =========================
const deleteEventQuestion = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const questionId = parsePositiveInt(req.params.id);

    if (!questionId) {
      return res.status(400).json({
        success: false,
        message: "ID câu hỏi không hợp lệ",
      });
    }

    await connection.beginTransaction();

    const [rows] = await connection.query(
      `
      SELECT id
      FROM event_questions
      WHERE id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [questionId]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "Câu hỏi không tồn tại",
      });
    }

    await connection.query(
      `
      DELETE FROM event_questions
      WHERE id = ?
      `,
      [questionId]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Xóa câu hỏi thành công",
    });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa câu hỏi",
      error: err.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  createEventQuestion,
  getQuestionsByEventForAdmin,
  getEventQuestionDetail,
  updateEventQuestion,
  deleteEventQuestion,
};