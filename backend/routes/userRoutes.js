const express = require("express");
const router  = express.Router();
const User    = require("../models/User");
const Artist  = require("../models/Artist");

// ── Helper: safely fetch Artist collection (model may be empty) ──────
async function getArtistDocs() {
  try { return await Artist.find().select("-password"); }
  catch { return []; }
}

// ── Get all users (User collection only) ─────────────────────────────
// Used by admin / internal checks
router.get("/only-users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET /  →  merged User + Artist collections ────────────────────────
// Discover page calls this and filters by role === "artist".
// By merging both collections we cover:
//   • artists stored in User collection (role:"artist")  ← vinay right now
//   • artists stored in Artist collection (future)
// Duplicates (same email) are de-duped, Artist record wins.
router.get("/", async (req, res) => {
  try {
    const [users, artists] = await Promise.all([
      User.find().select("-password"),
      getArtistDocs(),
    ]);

    const artistEmails = new Set(artists.map(a => a.email));

    const merged = [
      // Users who are NOT already in the Artist collection
      ...users
        .filter(u => !artistEmails.has(u.email))
        .map(u => ({ ...u.toObject(), role: u.role || "user" })),
      // Everyone in Artist collection
      ...artists.map(a => ({ ...a.toObject(), role: "artist" })),
    ];

    res.json(merged);
  } catch (err) {
    console.error("GET /api/users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET /all-people  →  same merged list (used by Chat, ArtistProfile) ──
// MUST be before /:id
router.get("/all-people", async (req, res) => {
  try {
    const [users, artists] = await Promise.all([
      User.find().select("-password"),
      getArtistDocs(),
    ]);

    const artistEmails = new Set(artists.map(a => a.email));

    const merged = [
      ...users
        .filter(u => !artistEmails.has(u.email))
        .map(u => ({ ...u.toObject(), role: u.role || "user" })),
      ...artists.map(a => ({ ...a.toObject(), role: "artist" })),
    ];

    res.json(merged);
  } catch (err) {
    console.error("GET /api/users/all-people error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Get user by ID ────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    // Check User collection first
    let user = await User.findById(req.params.id).select("-password");
    if (!user) {
      // Fallback: check Artist collection
      try { user = await Artist.findById(req.params.id).select("-password"); } catch {}
    }
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Increment profile view ────────────────────────────────────────────
router.post("/:id/view", async (req, res) => {
  try {
    let updated = await User.findByIdAndUpdate(
      req.params.id,
      { $inc: { profileViews: 1 } },
      { new: true }
    ).select("profileViews");

    if (!updated) {
      // Try Artist collection
      try {
        updated = await Artist.findByIdAndUpdate(
          req.params.id,
          { $inc: { profileViews: 1 } },
          { new: true }
        ).select("profileViews");
      } catch {}
    }

    if (!updated) return res.status(404).json({ message: "User not found" });
    res.json({ profileViews: updated.profileViews });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Update user profile (PATCH) ───────────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    let user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!user) {
      // Try Artist collection
      try {
        user = await Artist.findByIdAndUpdate(
          req.params.id,
          { $set: updateData },
          { new: true }
        ).select("-password");
      } catch {}
    }

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;