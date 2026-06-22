const express = require("express");
const router  = express.Router();
const {
  sendMessage,
  getMessages,
  getConversations,
} = require("../controllers/chatController");

// IMPORTANT: specific routes BEFORE parameterised ones
// GET /api/chat/conversations/:userId
router.get("/conversations/:userId", getConversations);

// POST /api/chat/send
router.post("/send", sendMessage);

// GET /api/chat/:senderId/:receiverId
router.get("/:senderId/:receiverId", getMessages);

module.exports = router;