const express = require("express");
const router = express.Router();

const {
  getTopupRequests,
  approveTopupRequest,
  rejectTopupRequest,
} = require("../../controllers/admin/topupRequestController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.get("/topup-requests", verifyToken, requireAdmin, getTopupRequests);
router.put("/topup-requests/:id/approve", verifyToken, requireAdmin, approveTopupRequest);
router.put("/topup-requests/:id/reject", verifyToken, requireAdmin, rejectTopupRequest);

module.exports = router;