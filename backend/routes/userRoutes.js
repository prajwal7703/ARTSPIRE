const express = require("express");
const router  = express.Router();
const User    = require("../models/User");
const Artist  = require("../models/Artist");

// ── Get all users ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Everyone: clients + artists (for chat / live users / messages) ──
// IMPORTANT: this must come BEFORE "/:id", or Express will treat
// "all-people" as an :id value and never reach this route.
router.get("/all-people", async (req, res) => {
  try {
    const [users, artists] = await Promise.all([
      User.find().select("-password"),
      Artist.find().select("-password"),
    ]);
    const merged = [
      ...users.map(u => ({ ...u.toObject(), role: u.role || "user" })),
      ...artists.map(a => ({ ...a.toObject(), role: "artist" })),
    ];
    res.json(merged);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Get user by ID ────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Increment profile view ────────────────────────────────────────────
router.post("/:id/view", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $inc: { profileViews: 1 } },
      { new: true }
    ).select("profileViews");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ profileViews: user.profileViews });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Update user profile (PATCH) ───────────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
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