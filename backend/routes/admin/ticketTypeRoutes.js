const express = require("express");
const router = express.Router();

const {
  getTicketTypesByEvent,
  getTicketTypeDetail,
  createTicketType,
  updateTicketType,
  deleteTicketType,
} = require("../../controllers/admin/ticketTypeController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.get("/events/:eventId/ticket-types", verifyToken, requireAdmin, getTicketTypesByEvent);
router.get("/ticket-types/:id", verifyToken, requireAdmin, getTicketTypeDetail);
router.post("/events/:eventId/ticket-types", verifyToken, requireAdmin, createTicketType);
router.put("/ticket-types/:id", verifyToken, requireAdmin, updateTicketType);
router.delete("/ticket-types/:id", verifyToken, requireAdmin, deleteTicketType);

module.exports = router;