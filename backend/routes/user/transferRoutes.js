const express = require("express");
const router = express.Router();

const {
  createTransferRequest,
  getMyTransferRequests,
  getIncomingTransferRequests,
  getMyTransferRequestDetail,
  respondToTransferRequest,
  cancelMyTransferRequest,
} = require("../../controllers/user/transferController");

const { verifyToken } = require("../../middlewares/authMiddleware");

router.post("/transfers", verifyToken, createTransferRequest);
router.get("/transfers", verifyToken, getMyTransferRequests);
router.get("/transfers/incoming", verifyToken, getIncomingTransferRequests);
router.get("/transfers/:id", verifyToken, getMyTransferRequestDetail);
router.put("/transfers/:id/respond", verifyToken, respondToTransferRequest);
router.put("/transfers/:id/cancel", verifyToken, cancelMyTransferRequest);

module.exports = router;