const express = require("express");
const router = express.Router();

const {
  getAllOrders,
  getOrderDetail,
} = require("../../controllers/admin/orderController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.get("/orders", verifyToken, requireAdmin, getAllOrders);
router.get("/orders/:id", verifyToken, requireAdmin, getOrderDetail);

module.exports = router;