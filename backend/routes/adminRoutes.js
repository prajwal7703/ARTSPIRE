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
      try {
        pendingPostsCount = await Post.countDocuments({ status: "pending" });
      } catch (postErr) {
        console.error("Stats: Post.countDocuments failed:", postErr);
      }
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
router.get("/bookings", checkAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error("Admin bookings error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── WITHDRAWAL / PAYMENT REQUESTS SENT BY ARTISTS ───────────────────────────
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
    console.error("Admin withdrawals error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── MARK WITHDRAWAL PAID / REJECTED ─────────────────────────────────────────
router.put("/withdrawals/:id/status", checkAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const w = await Withdrawal.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, withdrawal: w });
  } catch (err) {
    console.error("Admin withdrawal status update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── ALL USERS ────────────────────────────────────────────────────────────────
router.get("/users", checkAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("Admin users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── ALL ARTISTS (merged from both collections) ──────────────────────────────
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
    console.error("Admin artists error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── NOTIFICATIONS (payment received, withdrawal requests, etc) ─────────────
router.get("/notifications", checkAdmin, async (req, res) => {
  try {
    const notifs = await Notification.find({ toArtist: "admin" }).sort({ createdAt: -1 }).limit(100);
    res.json(notifs);
  } catch (err) {
    console.error("Admin notifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── USER FEEDBACK / REVIEWS (if a Review model exists) ──────────────────────
router.get("/reviews", checkAdmin, async (req, res) => {
  if (!Review) return res.json([]);
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(200);
    res.json(reviews);
  } catch (err) {
    console.error("Admin reviews error:", err);
    res.json([]);
  }
});

// ── PENDING POSTS (awaiting moderation) ─────────────────────────────────────
router.get("/posts/pending", checkAdmin, async (req, res) => {
  if (!Post) return res.json([]);
  try {
    const posts = await Post.find({ status: "pending" }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error("Pending posts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── BACKFILL: import artists' existing "works" images into the Feed ────────
// POST /api/admin/posts/backfill-works
// One-time (but safe to re-run) migration for artists who already had work
// samples on their profile before the Feed/Post moderation system existed.
// For every artist, for every image URL in their `works` array, create an
// approved Post if one doesn't already exist for that artist+mediaUrl pair.
router.post("/posts/backfill-works", checkAdmin, async (req, res) => {
  if (!Post) return res.status(500).json({ message: "Post model not available" });

  try {
    // Artists live in two places: the User collection (role: "artist") and
    // a separate Artist collection — same pattern as getMergedArtists() in
    // artistRoutes.js. Check both so we don't silently skip half of them.
    const usersAsArtists = await User.find({ role: "artist" }).select("_id name image profileImage works");

    let artistDocs = [];
    if (Artist) {
      try {
        artistDocs = await Artist.find().select("_id name image profileImage works");
      } catch (e) {
        console.error("Backfill: Artist.find failed:", e.message);
      }
    }

    // De-dupe by _id in case the same artist somehow exists in both places
    const seenIds = new Set();
    const artists = [...usersAsArtists, ...artistDocs].filter((a) => {
      const id = String(a._id);
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    console.log(`Backfill: found ${usersAsArtists.length} User-artists, ${artistDocs.length} Artist-docs, ${artists.length} total after dedupe`);
    console.log("Backfill: works counts per artist:", artists.map(a => ({ id: String(a._id), name: a.name, worksCount: Array.isArray(a.works) ? a.works.length : "not-array", worksType: typeof a.works })));

    let created = 0;
    let skipped = 0;

    for (const artist of artists) {
      const works = Array.isArray(artist.works) ? artist.works : [];
      if (!works.length) continue;

      for (const mediaUrl of works) {
        if (!mediaUrl) continue;

        const exists = await Post.findOne({ artistId: artist._id, mediaUrl });
        if (exists) {
          skipped++;
          continue;
        }

        try {
          await Post.create({
            artistId: artist._id,
            artistName: artist.name || "Unknown artist",
            artistAvatar: artist.image || artist.profileImage || "",
            mediaUrl,
            mediaType: "image",
            caption: "",
            status: "approved",
            reviewedAt: new Date(),
          });
          created++;
        } catch (createErr) {
          console.error(`Backfill: Post.create failed for artist ${artist._id}, url ${mediaUrl}:`, createErr.message);
        }
      }
    }

    console.log(`Backfill: done. created=${created}, skipped=${skipped}`);
    res.json({ success: true, created, skipped });
  } catch (err) {
    console.error("Backfill works error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── ALL POSTS, ANY STATUS (optional history view) ───────────────────────────
router.get("/posts", checkAdmin, async (req, res) => {
  if (!Post) return res.json([]);
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const posts = await Post.find(filter).sort({ createdAt: -1 }).limit(300);
    res.json(posts);
  } catch (err) {
    console.error("Admin posts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── APPROVE / REJECT A POST ─────────────────────────────────────────────────
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

    const io = req.app.get("io");
    if (io) {
      io.to("admin_room").emit("post_reviewed", { postId: post._id, status });
      io.to(`artist_${post.artistId}`).emit("post_status_updated", {
        postId: post._id,
        status,
        mediaUrl: post.mediaUrl,
        rejectionReason: post.rejectionReason,
      });
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