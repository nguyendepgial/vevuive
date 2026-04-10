const express = require("express");
const router = express.Router();

const {
  issueTicketsByOrder,
  mintTicketById,
  mintTicketsByOrder,
  getAllTickets,
  getTicketDetail,
} = require("../../controllers/admin/ticketController");

const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireAdmin } = require("../../middlewares/adminMiddleware");

router.post("/orders/:orderId/issue-tickets", verifyToken, requireAdmin, issueTicketsByOrder);
router.post("/orders/:orderId/mint-tickets", verifyToken, requireAdmin, mintTicketsByOrder);

router.post("/tickets/:id/mint", verifyToken, requireAdmin, mintTicketById);
router.get("/tickets", verifyToken, requireAdmin, getAllTickets);
router.get("/tickets/:id", verifyToken, requireAdmin, getTicketDetail);

module.exports = router;