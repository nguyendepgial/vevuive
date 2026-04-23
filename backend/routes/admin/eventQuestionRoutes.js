const express = require("express");
const router = express.Router();

const {
  createEventQuestion,
  getQuestionsByEventForAdmin,
  getEventQuestionDetail,
  updateEventQuestion,
  deleteEventQuestion,
} = require("../../controllers/admin/eventQuestionController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.post("/events/:eventId/questions", verifyToken, requireAdmin, createEventQuestion);
router.get("/events/:eventId/questions", verifyToken, requireAdmin, getQuestionsByEventForAdmin);

router.get("/questions/:id", verifyToken, requireAdmin, getEventQuestionDetail);
router.put("/questions/:id", verifyToken, requireAdmin, updateEventQuestion);
router.delete("/questions/:id", verifyToken, requireAdmin, deleteEventQuestion);

module.exports = router;