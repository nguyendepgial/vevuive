const express = require("express");
const router = express.Router();

const {
  getAllPayments,
  getPaymentDetail,
  updatePaymentStatus,
} = require("../../controllers/admin/paymentController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.get("/payments", verifyToken, requireAdmin, getAllPayments);
router.get("/payments/:id", verifyToken, requireAdmin, getPaymentDetail);
router.put("/payments/:id/status", verifyToken, requireAdmin, updatePaymentStatus);

module.exports = router;