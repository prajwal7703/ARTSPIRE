const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Withdrawal = require("../models/Withdrawal");
const Notification = require("../models/Notification");
const User = require("../models/User");
let Artist = null;
try { Artist = require("../models/Artist"); } catch {}
let Review = null;
try { Review = require("../models/Review"); } catch {}

const ADMIN_EMAIL = "artistsconnect.arts@gmail.com";

function checkAdmin(req, res, next) {
  if (req.headers["x-admin-password"] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// ── LOGIN ─────────────────────────────────────────────────────────────────
// POST /api/admin/login
router.post("/login", (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true, email: ADMIN_EMAIL });
  }
  res.status(401).json({ success: false, message: "Wrong password" });
});

// ── DASHBOARD STATS (the overview numbers) ──────────────────────────────────
// GET /api/admin/stats
router.get("/stats", checkAdmin, async (req, res) => {
  try {
    const [totalBookings, totalUsers, totalArtistUsers, pendingWithdrawals, allBookings] = await Promise.all([
      Booking.countDocuments(),
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "artist" }),
      Withdrawal.countDocuments({ status: "pending" }),
      Booking.find({ paymentStatus: "paid" }),
    ]);

    let artistDocCount = 0;
    if (Artist) {
      try { artistDocCount = await Artist.countDocuments(); } catch {}
    }

    const totalRevenue = allBookings.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalCommission = allBookings.reduce((sum, b) => sum + (b.commissionAmount || 0), 0);
    const totalArtistEarnings = allBookings.reduce((sum, b) => sum + (b.artistAmount || 0), 0);

    res.json({
      totalBookings,
      totalUsers,
      totalArtists: totalArtistUsers + artistDocCount,
      pendingWithdrawals,
      totalRevenue,
      totalCommission,
      totalArtistEarnings,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── BOOKINGS ─────────────────────────────────────────────────────────────────
// GET /api/admin/bookings
router.get("/bookings", checkAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── WITHDRAWAL / PAYMENT REQUESTS SENT BY ARTISTS ───────────────────────────
// GET /api/admin/withdrawals
router.get("/withdrawals", checkAdmin, async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find().sort({ createdAt: -1 });

    const enriched = await Promise.all(withdrawals.map(async (w) => {
      let artist = await User.findById(w.artistId).select("name email").catch(() => null);
      if (!artist && Artist) artist = await Artist.findById(w.artistId).select("name email").catch(() => null);
      return { ...w.toObject(), artistName: artist?.name || "Unknown", artistEmail: artist?.email || "" };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── MARK WITHDRAWAL PAID / REJECTED ─────────────────────────────────────────
// PUT /api/admin/withdrawals/:id/status
router.put("/withdrawals/:id/status", checkAdmin, async (req, res) => {
  try {
    const { status } = req.body; // "paid" | "rejected"
    const w = await Withdrawal.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, withdrawal: w });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── ALL USERS ────────────────────────────────────────────────────────────────
// GET /api/admin/users
router.get("/users", checkAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── ALL ARTISTS (merged from both collections) ──────────────────────────────
// GET /api/admin/artists
router.get("/artists", checkAdmin, async (req, res) => {
  try {
    const usersAsArtists = await User.find({ role: "artist" }).select("-password");
    let artistDocs = [];
    if (Artist) {
      try { artistDocs = await Artist.find().select("-password"); } catch {}
    }
    const artistEmails = new Set(artistDocs.map(a => a.email));
    const merged = [
      ...usersAsArtists.filter(u => !artistEmails.has(u.email)).map(u => u.toObject()),
      ...artistDocs.map(a => ({ ...a.toObject(), role: "artist" })),
    ];
    res.json(merged);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── NOTIFICATIONS (payment received, withdrawal requests, etc) ─────────────
// GET /api/admin/notifications
router.get("/notifications", checkAdmin, async (req, res) => {
  try {
    const notifs = await Notification.find({ toArtist: "admin" }).sort({ createdAt: -1 }).limit(100);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── USER FEEDBACK / REVIEWS (if a Review model exists) ──────────────────────
// GET /api/admin/reviews
router.get("/reviews", checkAdmin, async (req, res) => {
  if (!Review) return res.json([]);
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(200);
    res.json(reviews);
  } catch (err) {
    res.json([]);
  }
});

module.exports = router;