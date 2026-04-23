const express = require("express");
const router = express.Router();

const {
  getMyTickets,
  getMyTicketDetail,
} = require("../../controllers/user/ticketController");

const { verifyToken } = require("../../middlewares/authMiddleware");

router.get("/tickets", verifyToken, getMyTickets);
router.get("/tickets/:id", verifyToken, getMyTicketDetail);

module.exports = router;