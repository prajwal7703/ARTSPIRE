const express = require("express");
const router  = express.Router();
const User    = require("../models/User");

// ── Get all users ─────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Get all artists ───────────────────────────────────────────────────────────
router.get("/artists/all", async (req, res) => {
  try {
    const artists = await User.find({ role: "artist" }).select("-password");
    res.json(artists);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Get user by ID ────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Increment profile view ────────────────────────────────────────────────────
// Called every time someone visits an artist's public profile page
router.post("/:id/view", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $inc: { profileViews: 1 } },  // atomically +1
      { new: true }
    ).select("profileViews");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ profileViews: user.profileViews });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Update user profile (PATCH) ───────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    // Never allow password update through this route
    const { password, ...updateData } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;