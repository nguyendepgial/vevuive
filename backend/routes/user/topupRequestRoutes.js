const express = require("express");
const router = express.Router();

const {
  createTopupRequest,
  submitPaidTopupRequest,
  cancelTopupRequest,
  getMyTopupRequests,
} = require("../../controllers/user/topupRequestController");

const { verifyToken } = require("../../middlewares/authMiddleware");

router.get("/topup-requests", verifyToken, getMyTopupRequests);
router.post("/topup-requests", verifyToken, createTopupRequest);
router.put("/topup-requests/:id/submit", verifyToken, submitPaidTopupRequest);
router.put("/topup-requests/:id/cancel", verifyToken, cancelTopupRequest);

module.exports = router;