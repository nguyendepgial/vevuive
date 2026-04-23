const pool = require("../../config/db");

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

// =========================
// User - Get Questions Of Event
// =========================
const getQuestionsByEventForUser = async (req, res) => {
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
        eq.sort_order
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

module.exports = {
  getQuestionsByEventForUser,
};