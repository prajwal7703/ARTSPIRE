// artspire-backend/routes/postRoutes.js

const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const upload = require("../middleware/upload");
let Artist = null;
try { Artist = require("../models/Artist"); } catch {}

const getIo = (req) => req.app.get("io");

// ── CREATE POST (bare root — called by EditProfileTab.jsx when an artist
// submits a new work sample, and by CreatePostModal.jsx for Feed posts) ─────
// POST /api/posts
// multipart/form-data: artistId, artistName, artistAvatar, caption, media (file)
router.post("/", upload.single("media"), async (req, res) => {
  try {
    const { artistId, artistName, artistAvatar, caption } = req.body;
    if (!artistId) return res.status(400).json({ message: "artistId is required" });
    if (!req.file) return res.status(400).json({ message: "No media file uploaded" });

    const mediaType = req.file.mimetype?.startsWith("video") ? "video" : "image";

    const post = await Post.create({
      artistId,
      artistName: artistName || "Unknown artist",
      artistAvatar: artistAvatar || "",
      mediaUrl: req.file.path,
      mediaType,
      caption: caption || "",
      status: "pending",
    });

    getIo(req)?.to("admin_room").emit("new_pending_post", post);

    res.status(201).json(post);
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ message: "Failed to create post" });
  }
});

// ── CREATE POST (direct file upload — used by UploadPost.jsx) ──────────────
// POST /api/posts/create
// multipart/form-data: artistId, title (caption), media (file), type ("image"|"video")
router.post("/create", upload.single("media"), async (req, res) => {
  try {
    const { artistId, title, type } = req.body;
    if (!artistId) return res.status(400).json({ message: "artistId is required" });
    if (!req.file) return res.status(400).json({ message: "No media file uploaded" });

    let artistName = "Unknown artist";
    let artistAvatar = "";
    if (Artist) {
      const artist = await Artist.findById(artistId).select("name image profileImage");
      if (artist) {
        artistName = artist.name || artistName;
        artistAvatar = artist.image || artist.profileImage || "";
      }
    }

    const post = await Post.create({
      artistId,
      artistName,
      artistAvatar,
      mediaUrl: req.file.path,
      mediaType: type === "video" ? "video" : "image",
      caption: title || "",
      status: "pending",
    });

    getIo(req)?.to("admin_room").emit("new_pending_post", post);

    res.status(201).json(post);
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ message: "Failed to create post" });
  }
});

// ── CREATE POST FROM AN EXISTING URL (used when a work sample is uploaded) ──
// POST /api/posts/from-url
router.post("/from-url", async (req, res) => {
  try {
    const { artistId, artistName, artistAvatar, mediaUrl, mediaType, caption } = req.body;
    if (!artistId || !mediaUrl) {
      return res.status(400).json({ message: "artistId and mediaUrl are required" });
    }

    const post = await Post.create({
      artistId,
      artistName: artistName || "Unknown artist",
      artistAvatar: artistAvatar || "",
      mediaUrl,
      mediaType: mediaType === "video" ? "video" : "image",
      caption: caption || "",
      status: "pending",
    });

    getIo(req)?.to("admin_room").emit("new_pending_post", post);

    res.status(201).json(post);
  } catch (err) {
    console.error("Create post from URL error:", err);
    res.status(500).json({ message: "Failed to create post" });
  }
});

// ── DELETE A POST (artist deleting their own — any status) ─────────────────
// DELETE /api/posts/:id
// body: { artistId }  — required for an ownership check so one artist can't
// delete another artist's post by guessing an ID.
// If the post was approved, also strips its mediaUrl out of Artist.works so
// it disappears from the public profile immediately, not just the Feed.
router.delete("/:id", async (req, res) => {
  try {
    const { artistId } = req.body;
    if (!artistId) return res.status(400).json({ message: "artistId is required" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (String(post.artistId) !== String(artistId)) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    const wasApproved = post.status === "approved";

    if (wasApproved && Artist) {
      try {
        const artist = await Artist.findById(post.artistId);
        if (artist && Array.isArray(artist.works)) {
          artist.works = artist.works.filter((u) => u !== post.mediaUrl);
          await artist.save();
        }
      } catch (e) {
        console.error("Failed to remove deleted post's mediaUrl from artist works:", e);
      }
    }

    await Post.findByIdAndDelete(req.params.id);

    const io = getIo(req);
    if (io) {
      // Tell admin sessions to drop it from their pending queue, if it was there
      io.to("admin_room").emit("post_reviewed", { postId: post._id, status: "deleted" });
      // Tell everyone on the Feed to remove it live, if it was public
      if (wasApproved) {
        io.emit("post_deleted", { postId: post._id });
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ message: "Failed to delete post" });
  }
});

// ── PUBLIC FEED — approved posts only ───────────────────────────────────────
// GET /api/posts/feed?page=1&limit=10
router.get("/feed", async (req, res) => {
  try {
    const page  = Math.max(parseInt(req.query.page)  || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const skip  = (page - 1) * limit;

    const filter = { status: "approved" };
    const [posts, total] = await Promise.all([
      Post.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Post.countDocuments(filter),
    ]);

    res.json({ posts, hasMore: skip + posts.length < total, total });
  } catch (err) {
    console.error("Feed fetch error:", err);
    res.status(500).json({ message: "Failed to load feed" });
  }
});

// ── ARTIST'S OWN POSTS (any status — pending / approved / rejected) ────────
// GET /api/posts/mine/:artistId
// Lets the artist's dashboard show "Pending review" / "Not approved" states.
router.get("/mine/:artistId", async (req, res) => {
  try {
    const posts = await Post.find({ artistId: req.params.artistId }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Failed to load your posts" });
  }
});

// ── LIKE / UNLIKE ────────────────────────────────────────────────────────────
// POST /api/posts/:id/like
router.post("/:id/like", async (req, res) => {
  try {
    const { actorId } = req.body;
    if (!actorId) return res.status(400).json({ message: "actorId is required" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const idx = post.likes.indexOf(actorId);
    if (idx >= 0) post.likes.splice(idx, 1);
    else post.likes.push(actorId);
    await post.save();

    res.json({ likes: post.likes });
  } catch (err) {
    res.status(500).json({ message: "Failed to update like" });
  }
});

// ── COMMENT ──────────────────────────────────────────────────────────────────
// POST /api/posts/:id/comment
router.post("/:id/comment", async (req, res) => {
  try {
    const { userId, userName, userRole, text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comment text is required" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.comments.push({ userId, userName, userRole, text: text.trim() });
    await post.save();

    res.status(201).json(post.comments[post.comments.length - 1]);
  } catch (err) {
    res.status(500).json({ message: "Failed to post comment" });
  }
});

// ── VIEW (fires once per viewer, from the IntersectionObserver in Feed.jsx) ─
// POST /api/posts/:id/view
router.post("/:id/view", async (req, res) => {
  try {
    const { userId, userName, userRole } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const alreadyViewed = post.views.some(v => v.userId === userId);
    if (!alreadyViewed) {
      post.views.push({ userId, userName, userRole });
      await post.save();
    }

    res.json({ viewCount: post.views.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to record view" });
  }
});

// ── VIEWERS LIST (artist-only, owner check) ─────────────────────────────────
// GET /api/posts/:id/views?artistId=...
router.get("/:id/views", async (req, res) => {
  try {
    const { artistId } = req.query;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (artistId && String(post.artistId) !== String(artistId)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    res.json({ views: post.views });
  } catch (err) {
    res.status(500).json({ message: "Failed to load viewers" });
  }
});

module.exports = router;