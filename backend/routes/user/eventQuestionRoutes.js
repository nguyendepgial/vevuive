const express = require("express");
const router = express.Router();

const {
  getQuestionsByEventForUser,
} = require("../../controllers/user/eventQuestionController");

router.get("/events/:eventId/questions", getQuestionsByEventForUser);

module.exports = router;