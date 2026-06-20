const express = require("express");
const router  = express.Router();
const User    = require("../models/User");
const Artist  = require("../models/Artist");
const upload  = require("../middleware/upload");

// ── GET /api/artists  →  all artists from BOTH collections ───────────
// Primary source: User collection (role:"artist")  ← where vinay lives
// Secondary:      Artist collection (future signups)
router.get("/", async (req, res) => {
  try {
    // Artists in User collection
    const usersAsArtists = await User.find({ role: "artist" }).select("-password");

    // Artists in Artist collection (may be empty, handle gracefully)
    let artistDocs = [];
    try { artistDocs = await Artist.find().select("-password"); } catch {}

    const artistEmails = new Set(artistDocs.map(a => a.email));

    const merged = [
      // User-collection artists not duplicated in Artist collection
      ...usersAsArtists
        .filter(u => !artistEmails.has(u.email))
        .map(u => u.toObject()),
      // Artist collection docs
      ...artistDocs.map(a => ({ ...a.toObject(), role: "artist" })),
    ];

    res.json(merged);
  } catch (err) {
    console.error("GET /api/artists error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── GET /api/artists/:id ──────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    let artist = await User.findOne({ _id: req.params.id, role: "artist" }).select("-password");
    if (!artist) {
      try { artist = await Artist.findById(req.params.id).select("-password"); } catch {}
    }
    if (!artist) return res.status(404).json({ message: "Artist not found" });
    res.json(artist);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── PATCH /api/artists/:id  (profile update) ─────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    let artist = await User.findOneAndUpdate(
      { _id: req.params.id, role: "artist" },
      { $set: updateData },
      { new: true }
    ).select("-password");

    if (!artist) {
      try {
        artist = await Artist.findByIdAndUpdate(
          req.params.id,
          { $set: updateData },
          { new: true }
        ).select("-password");
      } catch {}
    }

    if (!artist) return res.status(404).json({ message: "Artist not found" });
    res.json(artist);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/artists/upload  (profile image) ────────────────────────
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ url: req.file.path || req.file.location });
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
});

module.exports = router;