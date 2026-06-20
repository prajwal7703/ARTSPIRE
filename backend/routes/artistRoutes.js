const express = require("express");
const router = express.Router();
const Artist = require("../models/Artist"); // ← changed

router.get("/", async (req, res) => {
  try {
    const artists = await Artist.find().select("-password");
    res.json(artists);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/only-artists", async (req, res) => {
  try {
    const artists = await Artist.find();
    res.json(artists);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id).select("-password");
    if (!artist) return res.status(404).json({ message: "Artist not found" });
    res.json(artist);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, bio, city, instagram, category, skills } = req.body;
    const updated = await Artist.findByIdAndUpdate(
      req.params.id,
      { name, bio, city, instagram, category, skills },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Artist not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Update via PATCH (used by the dashboard) ──
router.patch("/:id", async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    const updated = await Artist.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select("-password");
    if (!updated) return res.status(404).json({ message: "Artist not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/photo", upload.single("profileImage"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const artist = await Artist.findByIdAndUpdate(
      req.params.id,
      { profileImage: req.file.path },
      { new: true }
    );
    res.json(artist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Profile view counter ──
router.post("/:id/view", async (req, res) => {
  try {
    const artist = await Artist.findByIdAndUpdate(
      req.params.id,
      { $inc: { profileViews: 1 } },
      { new: true }
    ).select("profileViews");
    if (!artist) return res.status(404).json({ message: "Artist not found" });
    res.json({ profileViews: artist.profileViews });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;