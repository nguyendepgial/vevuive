const express = require("express");
const router = express.Router();

const {
  getAllTransferRequests,
  getTransferRequestDetail,
  approveTransferRequest,
  rejectTransferRequest,
} = require("../../controllers/admin/transferController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.get("/transfers", verifyToken, requireAdmin, getAllTransferRequests);
router.get("/transfers/:id", verifyToken, requireAdmin, getTransferRequestDetail);
router.put("/transfers/:id/approve", verifyToken, requireAdmin, approveTransferRequest);
router.put("/transfers/:id/reject", verifyToken, requireAdmin, rejectTransferRequest);

module.exports = router;