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
  try { artistDocs = await Artist.find().select("-password"); } catch (e) { console.error("getMergedArtists Artist.find error:", e.message); }
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

// ── PUT /api/artists/:id/location  ← MUST be before /:id ────────────────────
// Called whenever the artist's app has a fresh GPS fix, so "Find Nearby
// Artists" and Post Request matching can use real coordinates instead of
// just a city string.
// body: { lat, lng }
router.put("/:id/location", async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ message: "lat and lng are required numbers" });
    }

    const update = {
      location: { type: "Point", coordinates: [lngNum, latNum] }, // GeoJSON order: [lng, lat]
      locationUpdatedAt: new Date(),
    };

    // Try User collection first (artists stored there), fall back to Artist
    let artist = await User.findOneAndUpdate(
      { _id: req.params.id, role: "artist" },
      { $set: update },
      { new: true }
    ).select("-password");

    if (!artist) {
      try {
        artist = await Artist.findByIdAndUpdate(
          req.params.id,
          { $set: update },
          { new: true }
        ).select("-password");
      } catch (innerErr) {
        console.error("Artist.findByIdAndUpdate (location) error:", innerErr.message);
      }
    }

    if (!artist) return res.status(404).json({ message: "Artist not found" });

    res.json(artist);
  } catch (err) {
    console.error("PUT /:id/location error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ── GET /api/artists/nearby  ← MUST be before /:id ───────────────────────────
// Powers the "Find Nearby Artists" map. Falls back to city matching for
// artists who haven't shared live location yet.
// query: lat, lng, radius (meters, default 25000), city, category, onlineOnly
//
// FIX: previously only queried the `Artist` collection. Every other route
// in this file (GET/PUT/PATCH /:id, /:id/reviews, /:id/location) checks
// `User` (role: "artist") FIRST and falls back to `Artist` — and
// getMergedArtists() explicitly merges both. /nearby was the odd one out,
// so if artists live in the User collection (the common case here), this
// route always returned an empty array — the map/list showed nothing even
// though PUT /:id/location was saving fine.
//
// REQUIRES: User schema also needs a 2dsphere index, same as Artist:
//   UserSchema.index({ location: "2dsphere" });
// If that index is missing on User, this $near query will throw an error
// (not just return empty) — check server logs for
// "unable to find index for $geoNear query" if artists still don't show.
router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng, city, category, onlineOnly } = req.query;
    const radius = Math.min(Number(req.query.radius) || 25000, 100000);
    const latNum = lat !== undefined ? Number(lat) : undefined;
    const lngNum = lng !== undefined ? Number(lng) : undefined;
    const hasCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);

    const ONLINE_WINDOW_MS = 20 * 60 * 1000; // "online" = location updated in last 20 min
    const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS);

    const baseFilter = {};
    if (category && category !== "All") baseFilter.categories = category;
    if (onlineOnly === "true") baseFilter.locationUpdatedAt = { $gte: onlineCutoff };

    async function nearQuery(Model, extraFilter = {}) {
      try {
        return await Model.find({
          ...baseFilter,
          ...extraFilter,
          location: {
            $near: {
              $geometry: { type: "Point", coordinates: [lngNum, latNum] },
              $maxDistance: radius,
            },
          },
        }).select("-password").limit(60).lean();
      } catch (e) {
        // Most common cause: missing 2dsphere index on this collection.
        console.error(`nearQuery failed on ${Model.modelName}:`, e.message);
        return [];
      }
    }

    let artists = [];
    if (hasCoords) {
      const [usersAsArtists, artistDocs] = await Promise.all([
        nearQuery(User, { role: "artist" }),
        nearQuery(Artist),
      ]);
      // dedupe by email, same rule getMergedArtists() uses, Artist collection wins
      const artistEmails = new Set(artistDocs.map((a) => a.email));
      artists = [
        ...usersAsArtists.filter((u) => !artistEmails.has(u.email)),
        ...artistDocs,
      ];
    }

    if (artists.length === 0 && city) {
      const cityRegex = new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
      const [usersAsArtists, artistDocs] = await Promise.all([
        User.find({ ...baseFilter, role: "artist", city: cityRegex }).select("-password").limit(60).lean(),
        Artist.find({ ...baseFilter, city: cityRegex }).select("-password").limit(60).lean(),
      ]);
      const artistEmails = new Set(artistDocs.map((a) => a.email));
      artists = [
        ...usersAsArtists.filter((u) => !artistEmails.has(u.email)),
        ...artistDocs,
      ];
    }

    artists = artists.map((a) => ({
      ...a,
      isOnline: a.locationUpdatedAt ? new Date(a.locationUpdatedAt) >= onlineCutoff : false,
    }));

    res.json(artists);
  } catch (err) {
    console.error("Nearby artists error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
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

// ── POST /api/artists/:id/reviews ─────────────────────────────────────────────
// body: { userName, rating, comment/review, eventType }
// Pushes review into the artist's reviews array, recalculates avg rating,
// saves, and returns { artist, reviews } so the frontend can update reactively.
router.post("/:id/reviews", async (req, res) => {
  try {
    const { userName, rating, comment, review, eventType } = req.body;
    const numericRating = Number(rating);

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "A rating between 1 and 5 is required" });
    }

    const newReview = {
      userName:  userName || "Anonymous",
      rating:    numericRating,
      comment:   comment || review || "",
      review:    review || comment || "",
      eventType: eventType || "",
      createdAt: new Date(),
    };

    // Try User collection first
    let artist = await User.findOne({ _id: req.params.id, role: "artist" });
    let isUserDoc = true;

    if (!artist) {
      try { artist = await Artist.findById(req.params.id); isUserDoc = false; } catch {}
    }

    if (!artist) return res.status(404).json({ message: "Artist not found" });

    // Use direct DB update to avoid schema-cache issues on live servers
    const Model = isUserDoc ? User : Artist;

    await Model.findByIdAndUpdate(artist._id, {
      $push: { reviews: newReview },
    });

    // Recalculate avg from fresh DB data
    const fresh = await Model.findById(artist._id);
    const total = fresh.reviews.reduce((s, r) => s + (r.rating || 0), 0);
    const newAvg = Number((total / fresh.reviews.length).toFixed(1));

    await Model.findByIdAndUpdate(artist._id, { $set: { rating: newAvg } });

    const updatedArtist = await Model.findById(artist._id).select("-password");
    res.status(201).json({ artist: updatedArtist, reviews: updatedArtist.reviews });
  } catch (err) {
    console.error("POST /:id/reviews error:", err);
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

    // Arrays (like `works`) arrive as JSON strings when sent via FormData —
    // parse them back into real arrays before saving.
    if (typeof updateData.works === "string") {
      try {
        updateData.works = JSON.parse(updateData.works);
      } catch (parseErr) {
        console.error("Failed to parse works JSON string:", parseErr.message, "raw value:", updateData.works);
      }
    }

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
      } catch (innerErr) {
        console.error("Artist.findByIdAndUpdate THREW an error:", innerErr.message);
      }
    }

    if (!artist) return res.status(404).json({ message: "Artist not found" });

    res.json(artist);
  } catch (err) {
    console.error("PUT /api/artists/:id OUTER error:", err);
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
    if (typeof updateData.works === "string") {
      try { updateData.works = JSON.parse(updateData.works); } catch {}
    }

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