const express = require("express");
const router = express.Router();

const {
  getActiveListings,
  getListingById,
  createListing,
  buyListing,
  getMyListings,
  cancelMyListing,
} = require("../../controllers/user/marketplaceController");

const { verifyToken } = require("../../middlewares/authMiddleware");

router.get("/marketplace/listings", getActiveListings);
router.get("/marketplace/listings/:id", getListingById);

router.get("/marketplace/my-listings", verifyToken, getMyListings);
router.post("/marketplace/listings", verifyToken, createListing);
router.post("/marketplace/listings/:id/buy", verifyToken, buyListing);
router.put("/marketplace/listings/:id/cancel", verifyToken, cancelMyListing);

module.exports = router;