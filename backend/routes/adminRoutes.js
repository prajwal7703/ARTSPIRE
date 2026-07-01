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
let Post = null;
try { Post = require("../models/Post"); } catch {}

const ADMIN_EMAIL = "artistsconnect.arts@gmail.com";

function checkAdmin(req, res, next) {
  if (req.headers["x-admin-password"] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// ── LOGIN ─────────────────────────────────────────────────────────────────
// POST /api/admin/login
// Accepts { password } (legacy — standalone /admin login screen)
// or { email, password } (used when logging in via the normal User Login
// page with the designated admin email — see UserLogin.jsx).
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const passwordOk = password === process.env.ADMIN_PASSWORD;
  const emailOk = !email || email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

  if (passwordOk && emailOk) {
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

    let pendingPostsCount = 0;
    if (Post) {
      try { pendingPostsCount = await Post.countDocuments({ status: "pending" }); } catch {}
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
      pendingPosts: pendingPostsCount,
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

// ── PENDING POSTS (awaiting moderation) ─────────────────────────────────────
// GET /api/admin/posts/pending
router.get("/posts/pending", checkAdmin, async (req, res) => {
  if (!Post) return res.json([]);
  try {
    const posts = await Post.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── ALL POSTS, ANY STATUS (optional history view) ───────────────────────────
// GET /api/admin/posts?status=approved|rejected|pending
router.get("/posts", checkAdmin, async (req, res) => {
  if (!Post) return res.json([]);
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── APPROVE / REJECT A POST ─────────────────────────────────────────────────
// PUT /api/admin/posts/:id/status   body: { status: "approved"|"rejected", reason? }
router.put("/posts/:id/status", checkAdmin, async (req, res) => {
  if (!Post) return res.status(500).json({ message: "Post model not available" });
  try {
    const { status, reason } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        status,
        rejectionReason: status === "rejected" ? (reason || "") : "",
        reviewedAt: new Date(),
      },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: "Post not found" });

    // On approval, sync the artwork into the artist's public portfolio
    // (works array) if it isn't already there.
    if (status === "approved" && Artist) {
      try {
        const artist = await Artist.findById(post.artistId);
        if (artist) {
          const works = Array.isArray(artist.works) ? artist.works : [];
          if (!works.includes(post.mediaUrl)) {
            artist.works = [post.mediaUrl, ...works];
            await artist.save();
          }
        }
      } catch (e) {
        console.error("Failed to sync approved post into artist works:", e);
      }
    }

    // Real-time notifications
    const io = req.app.get("io");
    if (io) {
      // Let other open admin sessions remove this from their pending list
      io.to("admin_room").emit("post_reviewed", { postId: post._id, status });
      // Let the artist's dashboard/Feed react immediately
      io.to(`artist_${post.artistId}`).emit("post_status_updated", {
        postId: post._id,
        status,
        mediaUrl: post.mediaUrl,
        rejectionReason: post.rejectionReason,
      });
      // Broadcast newly-approved posts to everyone currently viewing the Feed
      if (status === "approved") {
        io.emit("post_approved", post);
      }
    }

    res.json({ success: true, post });
  } catch (err) {
    console.error("Post status update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;