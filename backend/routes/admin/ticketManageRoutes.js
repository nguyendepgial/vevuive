const express = require("express");
const router = express.Router();

const {
  getManageTickets,
  getManageTicketDetail,
  updateManageTicketStatus,
} = require("../../controllers/admin/ticketManageController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.get("/manage/tickets", verifyToken, requireAdmin, getManageTickets);
router.get("/manage/tickets/:id", verifyToken, requireAdmin, getManageTicketDetail);
router.put("/manage/tickets/:id/status", verifyToken, requireAdmin, updateManageTicketStatus);

module.exports = router;