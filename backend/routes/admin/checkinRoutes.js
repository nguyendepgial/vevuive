const express = require("express");
const router = express.Router();

const {
  lookupTicketForCheckin,
  checkinTicket,
  getCheckinLogs,
} = require("../../controllers/admin/checkinController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.get("/checkin/lookup", verifyToken, requireAdmin, lookupTicketForCheckin);
router.post("/checkin", verifyToken, requireAdmin, checkinTicket);
router.get("/checkin/logs", verifyToken, requireAdmin, getCheckinLogs);

module.exports = router;