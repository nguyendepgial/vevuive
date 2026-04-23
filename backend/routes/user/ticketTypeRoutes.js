const express = require("express");
const router = express.Router();

const {
  getPublicTicketTypesByEvent,
} = require("../../controllers/user/ticketTypeController");

router.get("/events/:eventId/ticket-types", getPublicTicketTypesByEvent);

module.exports = router;