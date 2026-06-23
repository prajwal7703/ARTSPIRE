// ─────────────────────────────────────────────────────────────────
// routes/groups.js  —  Group Chat API
// ─────────────────────────────────────────────────────────────────
const express  = require("express");
const router   = express.Router();
const Group    = require("../models/Group");
const Message  = require("../models/GroupMessage");

// POST /api/groups — Create a group
router.post("/", async (req, res) => {
  try {
    const { name, description, type, color, createdBy, members } = req.body;
    const group = await Group.create({ name, description, type, color, createdBy, members });
    const populated = await group.populate("members", "name profileImage role category");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups/user/:userId — Get all groups for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const groups = await Group.find({ members: req.params.userId })
      .populate("members", "name profileImage role category")
      .sort({ updatedAt: -1 });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups/:groupId — Get single group
router.get("/:groupId", async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("members", "name profileImage role category");
    if (!group) return res.status(404).json({ error: "Group not found" });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/groups/:groupId/messages — Get messages for a group
router.get("/:groupId/messages", async (req, res) => {
  try {
    const msgs = await Message.find({ groupId: req.params.groupId })
      .sort({ createdAt: 1 })
      .limit(200);
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/:groupId/messages — Send a message
router.post("/:groupId/messages", async (req, res) => {
  try {
    const { senderId, senderName, senderImage, message, mediaUrl, mediaType, replyTo } = req.body;
    const msg = await Message.create({
      groupId: req.params.groupId,
      senderId, senderName, senderImage,
      message, mediaUrl, mediaType, replyTo,
    });
    // Update group lastMessage
    await Group.findByIdAndUpdate(req.params.groupId, {
      lastMessage: message || "📷 Media",
      lastMessageAt: new Date(),
    });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/groups/:groupId/members/:userId — Leave group
router.delete("/:groupId/members/:userId", async (req, res) => {
  try {
    const group = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $pull: { members: req.params.userId } },
      { new: true }
    );
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(req.params.groupId);
      return res.json({ deleted: true });
    }
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;



const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  description:   { type: String, default: "" },
  type:          { type: String, default: "general" },
  color:         { type: String, default: "#6366f1" },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  members:       [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  lastMessage:   { type: String, default: "" },
  lastMessageAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model("Group", groupSchema);



// ─────────────────────────────────────────────────────────────────
// models/GroupMessage.js
// ─────────────────────────────────────────────────────────────────
/*
const mongoose = require("mongoose");

const groupMessageSchema = new mongoose.Schema({
  groupId:     { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  senderId:    { type: String, required: true },
  senderName:  { type: String },
  senderImage: { type: String },
  message:     { type: String, default: "" },
  mediaUrl:    { type: String },
  mediaType:   { type: String }, // "image" | "audio"
  replyTo: {
    _id:        String,
    message:    String,
    senderName: String,
  },
  reactions:   [{ userId: String, emoji: String }],
}, { timestamps: true });

module.exports = mongoose.model("GroupMessage", groupMessageSchema);
*/


// ─────────────────────────────────────────────────────────────────
// socket.js — Add these handlers to your existing socket setup
// ─────────────────────────────────────────────────────────────────
/*
// In your server.js / socket setup file, add inside io.on("connection"):

socket.on("join_group", (groupId) => {
  socket.join(`group_${groupId}`);
});

socket.on("send_group_message", (data) => {
  // Broadcast to everyone in the group room EXCEPT sender
  socket.to(`group_${data.groupId}`).emit("receive_group_message", data);
});

socket.on("group_reaction", (data) => {
  // data: { groupId, messageId, userId, emoji }
  socket.to(`group_${data.groupId}`).emit("group_reaction", data);
});
*/