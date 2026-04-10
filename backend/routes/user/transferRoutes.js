const express = require("express");
const router = express.Router();

const {
  createTransferRequest,
  getMyTransferRequests,
  getMyTransferRequestDetail,
  cancelMyTransferRequest,
} = require("../../controllers/user/transferController");

const { verifyToken } = require("../../middlewares/authMiddleware");

router.post("/transfers", verifyToken, createTransferRequest);
router.get("/transfers", verifyToken, getMyTransferRequests);
router.get("/transfers/:id", verifyToken, getMyTransferRequestDetail);
router.put("/transfers/:id/cancel", verifyToken, cancelMyTransferRequest);

module.exports = router;