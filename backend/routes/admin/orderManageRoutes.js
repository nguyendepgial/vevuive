const express = require("express");
const router = express.Router();

const {
  getManageOrders,
  getManageOrderDetail,
  updateManageOrderStatus,
} = require("../../controllers/admin/orderManageController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.get("/manage/orders", verifyToken, requireAdmin, getManageOrders);
router.get("/manage/orders/:id", verifyToken, requireAdmin, getManageOrderDetail);
router.put("/manage/orders/:id/status", verifyToken, requireAdmin, updateManageOrderStatus);

module.exports = router;