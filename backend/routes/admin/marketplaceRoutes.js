const express = require("express");
const router = express.Router();

const {
  getAllListings,
  getListingDetail,
  approveListingTransfer,
  rejectListingTransfer,
} = require("../../controllers/admin/marketplaceController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.get("/marketplace/listings", verifyToken, requireAdmin, getAllListings);
router.get("/marketplace/listings/:id", verifyToken, requireAdmin, getListingDetail);
router.put("/marketplace/listings/:id/approve", verifyToken, requireAdmin, approveListingTransfer);
router.put("/marketplace/listings/:id/reject", verifyToken, requireAdmin, rejectListingTransfer);

module.exports = router;