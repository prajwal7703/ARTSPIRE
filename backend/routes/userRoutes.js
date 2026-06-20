const express = require("express");
const router  = express.Router();
const User    = require("../models/User");

// Safely try to load Artist model — won't crash if model file is missing
let Artist = null;
try { Artist = require("../models/Artist"); } catch {}

// ── GET /api/users  →  everyone, merged ──────────────────────────────
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password");

    let artistDocs = [];
    if (Artist) {
      try { artistDocs = await Artist.find().select("-password"); } catch {}
    }

    const artistEmails = new Set(artistDocs.map(a => a.email));

    const merged = [
      ...users
        .filter(u => !artistEmails.has(u.email))
        .map(u => u.toObject()),
      ...artistDocs.map(a => ({ ...a.toObject(), role: "artist" })),
    ];

    res.json(merged);
  } catch (err) {
    console.error("GET /api/users error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── GET /api/users/all-people  →  same merged list ───────────────────
// MUST be before /:id
router.get("/all-people", async (req, res) => {
  try {
    const users = await User.find().select("-password");

    let artistDocs = [];
    if (Artist) {
      try { artistDocs = await Artist.find().select("-password"); } catch {}
    }

    const artistEmails = new Set(artistDocs.map(a => a.email));

    const merged = [
      ...users
        .filter(u => !artistEmails.has(u.email))
        .map(u => u.toObject()),
      ...artistDocs.map(a => ({ ...a.toObject(), role: "artist" })),
    ];

    res.json(merged);
  } catch (err) {
    console.error("GET /api/users/all-people error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── GET /api/users/:id ────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    let user = await User.findById(req.params.id).select("-password");
    if (!user && Artist) {
      try { user = await Artist.findById(req.params.id).select("-password"); } catch {}
    }
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── POST /api/users/:id/view ──────────────────────────────────────────
router.post("/:id/view", async (req, res) => {
  try {
    let updated = await User.findByIdAndUpdate(
      req.params.id,
      { $inc: { profileViews: 1 } },
      { new: true }
    ).select("profileViews");

    if (!updated && Artist) {
      try {
        updated = await Artist.findByIdAndUpdate(
          req.params.id,
          { $inc: { profileViews: 1 } },
          { new: true }
        ).select("profileViews");
      } catch {}
    }

    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json({ profileViews: updated.profileViews });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── PATCH /api/users/:id ──────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    let user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!user && Artist) {
      try {
        user = await Artist.findByIdAndUpdate(
          req.params.id,
          { $set: updateData },
          { new: true }
        ).select("-password");
      } catch {}
    }

    if (!user) return res.status(404).json({ message: "Not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;