const express = require("express");
const router = express.Router();

const {
  getUserBalances,
  getUserBalanceDetail,
  topupUserBalance,
} = require("../../controllers/admin/walletBalanceController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.get("/wallet-balances", verifyToken, requireAdmin, getUserBalances);
router.get("/wallet-balances/:userId", verifyToken, requireAdmin, getUserBalanceDetail);
router.post("/wallet-balances/topup", verifyToken, requireAdmin, topupUserBalance);

module.exports = router;