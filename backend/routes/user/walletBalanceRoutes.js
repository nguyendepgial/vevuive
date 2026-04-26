const express = require("express");
const router = express.Router();

const {
  getMyWalletBalance,
  getMyWalletTransactions,
} = require("../../controllers/user/walletBalanceController");

const { verifyToken } = require("../../middlewares/authMiddleware");

router.get("/wallet-balance", verifyToken, getMyWalletBalance);
router.get("/wallet-transactions", verifyToken, getMyWalletTransactions);

module.exports = router;