const express = require("express");
const router = express.Router();

const {
  getAllEvents,
  getEventDetail,
  createEvent,
  updateEvent,
  deleteEvent,
} = require("../../controllers/admin/eventController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.get("/events", verifyToken, requireAdmin, getAllEvents);
router.get("/events/:id", verifyToken, requireAdmin, getEventDetail);
router.post("/events", verifyToken, requireAdmin, createEvent);
router.put("/events/:id", verifyToken, requireAdmin, updateEvent);
router.delete("/events/:id", verifyToken, requireAdmin, deleteEvent);

module.exports = router;