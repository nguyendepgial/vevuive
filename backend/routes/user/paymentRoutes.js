const express = require("express");
const router = express.Router();

const {
  payMyOrder,
  getMyPayments,
  getMyPaymentDetail,
} = require("../../controllers/user/paymentController");

const { verifyToken } = require("../../middlewares/authMiddleware");

router.post("/payments", verifyToken, payMyOrder);
router.get("/payments", verifyToken, getMyPayments);
router.get("/payments/:id", verifyToken, getMyPaymentDetail);

module.exports = router;