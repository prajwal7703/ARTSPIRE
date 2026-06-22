const express  = require("express");
const router   = express.Router();
const User     = require("../models/User");
const Artist   = require("../models/Artist");
const Booking  = require("../models/Booking");
const upload   = require("../middleware/upload");

// ── helper: merge User(role:"artist") + Artist collection ────────────────────
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

// ── GET /api/artists/only-artists  ← MUST be before /:id ─────────────────────
router.get("/only-artists", async (req, res) => {
  try {
    res.json(await getMergedArtists());
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── GET /api/artists ──────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    res.json(await getMergedArtists());
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── POST /api/artists/upload  ← MUST be before /:id ─────────────────────────
router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.json({ url: req.file.path || req.file.location });
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
});

// ── GET /api/artists/:id ──────────────────────────────────────────────────────
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

// ── GET /api/artists/:id/reviews ─────────────────────────────────────────────
router.get("/:id/reviews", async (req, res) => {
  try {
    let artist = await User.findOne({ _id: req.params.id, role: "artist" }).select("reviews");
    if (!artist) {
      try { artist = await Artist.findById(req.params.id).select("reviews"); } catch {}
    }
    if (!artist) return res.status(404).json({ message: "Artist not found" });
    res.json(artist.reviews || []);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── GET /api/artists/:id/earnings ────────────────────────────────────────────
// Returns all confirmed bookings for this artist so the Earnings tab works
router.get("/:id/earnings", async (req, res) => {
  try {
    const bookings = await Booking.find({
      artistId: req.params.id,
      status:   "confirmed",
    }).sort({ updatedAt: -1 });

    const totalEarned  = bookings.reduce((s, b) => s + (b.paidAmount || 0), 0);
    const totalBookings = bookings.length;

    const now = new Date();
    const thisMonth = bookings
      .filter(b => {
        const d = new Date(b.updatedAt || b.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, b) => s + (b.paidAmount || 0), 0);

    res.json({ bookings, totalEarned, totalBookings, thisMonth, pendingPayout: 0 });
  } catch (err) {
    console.error("earnings error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── PUT /api/artists/:id  (with optional image upload) ───────────────────────
// Accepts both JSON and multipart/form-data (when a new photo is uploaded)
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    // If a new image was uploaded, Cloudinary gives us the URL in req.file.path
    if (req.file) {
      updateData.image = req.file.path || req.file.location;
      updateData.profileImage = updateData.image; // keep both fields in sync
    }

    // Convert numeric fields that come as strings via FormData
    if (updateData.basePrice) updateData.basePrice = Number(updateData.basePrice);

    // Try User collection first
    let artist = await User.findOneAndUpdate(
      { _id: req.params.id, role: "artist" },
      { $set: updateData },
      { new: true }
    ).select("-password");

    // Fall back to Artist collection
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
    console.error("PUT /api/artists/:id error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── PATCH /api/artists/:id (keep for backwards compat) ───────────────────────
router.patch("/:id", upload.single("image"), async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    if (req.file) {
      updateData.image = req.file.path || req.file.location;
      updateData.profileImage = updateData.image;
    }
    if (updateData.basePrice) updateData.basePrice = Number(updateData.basePrice);

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