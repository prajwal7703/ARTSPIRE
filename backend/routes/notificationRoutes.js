const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");

// Get all notifications for an artist
router.get("/:artistId", async (req, res) => {
  try {
    const notifs = await Notification.find({ toArtist: req.params.artistId })
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all as read
router.put("/:artistId/read-all", async (req, res) => {
  try {
    await Notification.updateMany({ toArtist: req.params.artistId }, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark one as read
router.put("/:id/read", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;