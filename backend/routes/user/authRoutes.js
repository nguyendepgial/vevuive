const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMyProfile,
  updateProfile,
  changePassword,
} = require("../../controllers/user/authController");

const { verifyToken } = require("../../middlewares/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getMyProfile);
router.put("/profile", verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);

module.exports = router;