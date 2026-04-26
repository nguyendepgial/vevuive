const express = require("express");
const router = express.Router();

const {
  getAdminDashboard,
} = require("../../controllers/admin/dashboardController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.get("/dashboard", verifyToken, requireAdmin, getAdminDashboard);

module.exports = router;