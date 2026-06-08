const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Artist = require("../models/Artist");

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

// ── REGISTER ──────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, category, bio, city, instagram, experience } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required" });
    }

    // ── Check BOTH collections for existing email ──
    const existingUser   = await User.findOne({ email });
    const existingArtist = await Artist.findOne({ email });
    if (existingUser || existingArtist) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let savedUser;

    if (role === "artist") {
      // ── Save artists to Artist collection ──
      const artist = new Artist({
        name, email,
        password: hashedPassword,
        role: "artist",
        category, bio, city, instagram,
      });
      savedUser = await artist.save();
    } else {
      // ── Save regular users to User collection ──
      const user = new User({
        name, email,
        password: hashedPassword,
        role: "user",
        category, bio, city, instagram, experience,
      });
      savedUser = await user.save();
    }

    const token = jwt.sign(
      { id: savedUser._id, role: savedUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, user: savedUser });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    // ── Check Artist collection first, then User ──
    let user = await Artist.findOne({ email });
    let role = "artist";

    if (!user) {
      user = await User.findOne({ email });
      role = "user";
    }

    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    // ── Handle Google-auth accounts (no password) ──
    if (!user.password) {
      return res.status(400).json({ success: false, message: "Please use Google login for this account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role || role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ── Ensure role is set on the returned user object ──
    const userObj = user.toObject();
    userObj.role = user.role || role;

    res.json({ success: true, token, user: userObj });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ── GOOGLE LOGIN ──────────────────────────────────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    const { name, email, photo, role } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // ── Check both collections ──
    let user = await User.findOne({ email }) || await Artist.findOne({ email });

    if (!user) {
      // ── New Google user — always save as regular user ──
      user = new User({
        name, email,
        profileImage: photo,
        role: "user",
        password: "",
      });
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, user });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;