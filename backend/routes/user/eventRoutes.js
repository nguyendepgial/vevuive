const express = require("express");
const router = express.Router();

const {
  getPublicEvents,
  getPublicEventDetail,
} = require("../../controllers/user/eventController");

router.get("/events", getPublicEvents);
router.get("/events/:id", getPublicEventDetail);

module.exports = router;