const express = require("express");
const router = express.Router();

const {
  createOrder,
  getMyOrders,
  getMyOrderDetail,
  cancelMyOrder,
} = require("../../controllers/user/orderController");

const { verifyToken } = require("../../middlewares/authMiddleware");

router.post("/orders", verifyToken, createOrder);
router.get("/orders", verifyToken, getMyOrders);
router.get("/orders/:id", verifyToken, getMyOrderDetail);
router.put("/orders/:id/cancel", verifyToken, cancelMyOrder);

module.exports = router;