const express = require("express");
const router = express.Router();
const User = require("../models/User");
const upload = require("../middleware/upload");

router.get("/", async (req, res) => {
  try {
    const artists = await User.find();
    res.json(artists);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/only-artists", async (req, res) => {
  try {
    const artists = await User.find({ role: "artist" });
    res.json(artists);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const artist = await User.findById(req.params.id);
    if (!artist) return res.status(404).json({ message: "Artist not found" });
    res.json(artist);
  } catch (err) {
    res.status(500).json(err);
  }
});

// ── Update profile ──────────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const { name, bio, city, instagram, category, skills } = req.body;
    const updated = await User.findByIdAndUpdate(   // ← User, not Artist
      req.params.id,
      { name, bio, city, instagram, category, skills },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Artist not found" });
    res.json(updated);
  } catch (err) {
    console.log("UPDATE ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── Update photo ────────────────────────────────────────────────────────────
router.put("/:id/photo", upload.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const imageUrl = req.file.path;
    const artist = await User.findByIdAndUpdate(
      req.params.id,
      { profileImage: imageUrl },
      { new: true }
    );
    res.json(artist);
  } catch (err) {
    console.log("PHOTO ERROR:", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;