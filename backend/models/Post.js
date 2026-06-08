const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Notification = require("../models/Notification");

// ── Safe ID extractor ─────────────────────────────────────────────────────────
function extractId(id) {
  if (!id) return null;
  if (typeof id === "object" && id.$oid) return id.$oid;
  if (typeof id === "string" && id.startsWith("{")) {
    try { const p = JSON.parse(id); if (p.$oid) return p.$oid; } catch {}
  }
  return String(id);
}

// CREATE POST — supports both POST / and POST /create
router.post("/", createPost);
router.post("/create", createPost);

async function createPost(req, res) {
  try {
    let { artistId, media, type, title } = req.body;

    // ── Normalize artistId — handles { $oid: "..." } or plain string ──
    artistId = extractId(artistId);

    if (!artistId || !media) {
      console.log("Missing fields — artistId:", artistId, "media:", media);
      return res.status(400).json({
        success: false,
        message: `Missing: ${!artistId ? "artistId " : ""}${!media ? "media" : ""}`,
      });
    }

    const post = new Post({ artistId, media, type: type || "image", title });
    await post.save();
    res.json({ success: true, post });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
}

// GET ALL POSTS
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// LIKE A POST
router.post("/:id/like", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false });

    await Notification.create({
      toArtist: post.artistId,
      fromName: req.body.likerName || "Someone",
      type: "like",
      message: "liked your post",
    });

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;