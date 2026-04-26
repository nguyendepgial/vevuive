const express = require("express");
const router = express.Router();

const {
  getManageUsers,
  getManageUserDetail,
  updateManageUserStatus,
} = require("../../controllers/admin/userManageController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.get("/manage/users", verifyToken, requireAdmin, getManageUsers);
router.get("/manage/users/:id", verifyToken, requireAdmin, getManageUserDetail);
router.put("/manage/users/:id/status", verifyToken, requireAdmin, updateManageUserStatus);

module.exports = router;