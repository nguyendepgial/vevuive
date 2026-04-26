const express = require("express");
const router = express.Router();

const {
  payMyOrder,
  getMyPayments,
  getMyPaymentDetail,
} = require("../../controllers/user/paymentController");

const { verifyToken } = require("../../middlewares/authMiddleware");

// Route chính hiện tại
router.post("/payments", verifyToken, payMyOrder);

// Route phụ để tránh frontend gọi /payments/pay bị lỗi
router.post("/payments/pay", verifyToken, payMyOrder);

router.get("/payments", verifyToken, getMyPayments);
router.get("/payments/:id", verifyToken, getMyPaymentDetail);

module.exports = router;