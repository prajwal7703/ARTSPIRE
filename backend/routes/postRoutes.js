const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Notification = require("../models/Notification");

// CREATE POST — supports both POST / and POST /create
router.post("/", createPost);
router.post("/create", createPost);

async function createPost(req, res) {
  try {
    const { artistId, media, type, title } = req.body;
    if (!artistId || !media) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }
    const post = new Post({ artistId, media, type, title });
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