const express = require("express");
const router = express.Router();

const {
  linkWallet,
  getMyWallet,
  updateWallet,
  deleteWallet,
} = require("../../controllers/user/walletController");

const { verifyToken } = require("../../middlewares/authMiddleware");

router.post("/wallet", verifyToken, linkWallet);
router.get("/wallet", verifyToken, getMyWallet);
router.put("/wallet", verifyToken, updateWallet);
router.delete("/wallet", verifyToken, deleteWallet);

module.exports = router;