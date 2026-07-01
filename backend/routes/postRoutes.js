// artspire-backend/routes/posts.js
//
// Add to server.js:
//   app.use("/api/posts", require("./routes/posts"));
//
// Install first:
//   npm install multer multer-storage-cloudinary cloudinary
//
// This assumes you already have a Cloudinary config somewhere (you said you use
// Cloudinary already). If you don't have a shared config file yet, create
// artspire-backend/config/cloudinary.js with:
//
//   const cloudinary = require("cloudinary").v2;
//   cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET,
//   });
//   module.exports = cloudinary;
//
// and add CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET to your .env

const express = require("express");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary"); // <-- adjust path if your config lives elsewhere
const Post = require("../models/Post");

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "artspire/posts",
    resource_type: file.mimetype.startsWith("video") ? "video" : "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4", "mov", "webm"],
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB, raise if reels need to be longer
});

/* ── CREATE post (artist uploads a photo or reel) ──────────────────────── */
router.post("/", upload.single("media"), async (req, res) => {
  try {
    const { artistId, artistName, artistAvatar, caption } = req.body;

    if (!artistId || !artistName) {
      return res.status(400).json({ error: "artistId and artistName are required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No media file received" });
    }

    const mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";

    const post = await Post.create({
      artistId,
      artistName,
      artistAvatar,
      mediaUrl: req.file.path,       // Cloudinary secure_url
      cloudinaryId: req.file.filename, // Cloudinary public_id
      mediaType,
      caption: caption || "",
    });

    req.app.get("io")?.emit("new_post", post); // optional, only if you use socket.io globally
    res.status(201).json(post);
  } catch (err) {
    console.error("Create post failed:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

/* ── CREATE post from an already-uploaded URL (used by profile work-samples uploader) ── */
router.post("/from-url", async (req, res) => {
  try {
    const { artistId, artistName, artistAvatar, mediaUrl, mediaType, caption } = req.body;

    if (!artistId || !artistName || !mediaUrl) {
      return res.status(400).json({ error: "artistId, artistName and mediaUrl are required" });
    }

    const post = await Post.create({
      artistId,
      artistName,
      artistAvatar,
      mediaUrl,
      mediaType: mediaType === "video" ? "video" : "image",
      caption: caption || "",
    });

    req.app.get("io")?.emit("new_post", post);
    res.status(201).json(post);
  } catch (err) {
    console.error("Create post from URL failed:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

/* ── ALL POSTS, plain array — used by Home.jsx stats counter ─────────────── */
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).lean();
    res.json(posts); // plain array, keeps Home.jsx's Array.isArray(postRes.data) working
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load posts" });
  }
});

/* ── PAGINATED FEED — used by the scrolling Feed page ─────────────────────── */
router.get("/feed", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const hasMore = posts.length === limit;
    res.json({ posts, page, hasMore });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load feed" });
  }
});

/* ── One artist's posts (for their public portfolio) ───────────────────── */
router.get("/artist/:artistId", async (req, res) => {
  try {
    const posts = await Post.find({ artistId: req.params.artistId }).sort({ createdAt: -1 }).lean();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to load artist posts" });
  }
});

/* ── LIKE / unlike (toggle) ─────────────────────────────────────────────── */
router.post("/:id/like", async (req, res) => {
  try {
    const { actorId } = req.body; // logged-in user's or artist's _id
    if (!actorId) return res.status(400).json({ error: "actorId is required" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const idx = post.likes.indexOf(actorId);
    if (idx === -1) post.likes.push(actorId);
    else post.likes.splice(idx, 1);

    await post.save();
    req.app.get("io")?.emit("post_liked", { postId: post._id, likes: post.likes });

    res.json({ likes: post.likes, likeCount: post.likes.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to like post" });
  }
});

/* ── COMMENT ─────────────────────────────────────────────────────────────── */
router.post("/:id/comment", async (req, res) => {
  try {
    const { userId, userName, userRole, text } = req.body;
    if (!userId || !userName || !text?.trim()) {
      return res.status(400).json({ error: "userId, userName and text are required" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.comments.push({ userId, userName, userRole, text: text.trim() });
    await post.save();

    const saved = post.comments[post.comments.length - 1];
    req.app.get("io")?.emit("post_commented", { postId: post._id, comment: saved });

    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: "Failed to add comment" });
  }
});

/* ── RECORD A VIEW (dedupe per user) ──────────────────────────────────────── */
router.post("/:id/view", async (req, res) => {
  try {
    const { userId, userName, userRole } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const alreadyViewed = post.views.some((v) => String(v.userId) === String(userId));
    if (!alreadyViewed) {
      post.views.push({ userId, userName, userRole });
      await post.save();
    }

    res.json({ viewCount: post.views.length });
  } catch (err) {
    console.error("Record view failed:", err);
    res.status(500).json({ error: "Failed to record view" });
  }
});

/* ── VIEWER LIST (artist-only, for their own posts) ───────────────────────── */
router.get("/:id/views", async (req, res) => {
  try {
    const { artistId } = req.query;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    if (String(post.artistId) !== String(artistId)) {
      return res.status(403).json({ error: "Not authorized to view this list" });
    }

    res.json({ views: post.views, viewCount: post.views.length });
  } catch (err) {
    console.error("Load views failed:", err);
    res.status(500).json({ error: "Failed to load views" });
  }
});

/* ── DELETE (owning artist only) ────────────────────────────────────────── */
router.delete("/:id", async (req, res) => {
  try {
    const { artistId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    if (String(post.artistId) !== String(artistId)) {
      return res.status(403).json({ error: "Not authorized to delete this post" });
    }

    if (post.cloudinaryId) {
      await cloudinary.uploader.destroy(post.cloudinaryId, {
        resource_type: post.mediaType === "video" ? "video" : "image",
      }).catch(() => {}); // don't fail the request if Cloudinary cleanup fails
    }

    await post.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post" });
  }
});

module.exports = router;