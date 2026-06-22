const express = require("express");
const router = express.Router();
const Group = require("../models/Group");

// POST /api/groups/create
router.post("/create", async (req, res) => {
  try {
    const { name, createdBy } = req.body;
    if (!name || !createdBy) return res.status(400).json({ message: "name and createdBy required" });
    const group = await Group.create({ name, members: [createdBy] });
    res.status(201).json(group);
  } catch (e) { res.status(500).json({ message: "Failed to create group" }); }
});

// GET /api/groups/:artistId  -> groups this artist is a member of
router.get("/:artistId", async (req, res) => {
  try {
    const groups = await Group.find({ members: req.params.artistId }).sort({ createdAt: -1 });
    res.json(groups);
  } catch (e) { res.status(500).json({ message: "Failed to fetch groups" }); }
});

// GET /api/groups/:groupId/messages
router.get("/:groupId/messages", async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group.messages);
  } catch (e) { res.status(500).json({ message: "Failed to fetch messages" }); }
});

// POST /api/groups/:groupId/message
router.post("/:groupId/message", async (req, res) => {
  try {
    const { senderId, message } = req.body;
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });

    const entry = { senderId, message, timestamp: new Date() };
    group.messages.push(entry);
    await group.save();

    const io = req.app.get("io");
    if (io) io.to(`group_${req.params.groupId}`).emit("group_message", { groupId: req.params.groupId, ...entry });

    res.status(201).json(entry);
  } catch (e) { res.status(500).json({ message: "Failed to send message" }); }
});
// POST /api/groups/:groupId/members  -> add a member
router.post("/:groupId/members", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });
    const group = await Group.findByIdAndUpdate(
      req.params.groupId,
      { $addToSet: { members: userId } },
      { new: true }
    );
    if (!group) return res.status(404).json({ message: "Group not found" });
    res.json(group);
  } catch (e) { res.status(500).json({ message: "Failed to add member" }); }
});
module.exports = router;