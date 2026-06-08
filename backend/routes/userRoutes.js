const express = require("express");
const router = express.Router();
const User = require("../models/User");

// GET ALL ARTISTS (for chat sidebar)
router.get("/artists/all", async (req, res) => {
  try {
    const artists = await User.find({ role: "artist" });
    res.json(artists);
  } catch (err) {
    res.status(500).json(err);
  }
});

// GET ALL USERS
router.get("/", async (req, res) => {
  try {
    const users = await User.find({ role: "user" });
    res.json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

// GET ONE USER
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    res.json(user);
  } catch (err) {
    res.status(500).json(err);
  }
});

// UPDATE USER
router.put("/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;