const express = require("express");
const router  = express.Router();
const User    = require("../models/User");
const Artist  = require("../models/Artist");
const upload  = require("../middleware/upload");

// helper: merge User(role:"artist") + Artist collection
async function getMergedArtists() {
  const usersAsArtists = await User.find({ role: "artist" }).select("-password");
  let artistDocs = [];
  try { artistDocs = await Artist.find().select("-password"); } catch {}
  const artistEmails = new Set(artistDocs.map(a => a.email));
  return [
    ...usersAsArtists.filter(u => !artistEmails.has(u.email)).map(u => u.toObject()),
    ...artistDocs.map(a => ({ ...a.toObject(), role: "artist" })),
  ];
}

// ── GET /api/artists/only-artists  ← MUST be before /:id ─────────────
router.get("/only-artists", async (req, res) => {
  try {
    const merged = await getMergedArtists();
    res.json(merged);
  } catch (err) {
    console.error("GET /api/artists/only-artists error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── GET /api/artists  →  all artists ─────────────────────────────────
router.get("/", async (req, res) => {
  try {
    res.json(await getMergedArtists());
  } catch (err) {
    console.error("GET /api/artists error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── POST /api/artists/upload  ← MUST be before /:id ──────────────────
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ url: req.file.path || req.file.location });
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
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
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── PATCH /api/artists/:id ────────────────────────────────────────────
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
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;