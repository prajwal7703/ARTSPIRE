const express = require("express");
const router  = express.Router();
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");
const Artist  = require("../models/Artist");
const User    = require("../models/User");
const {
  register,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");

// ── User auth ─────────────────────────────────────────────────────────────────
router.post("/register",        register);
router.post("/login",           login);
router.post("/google",          googleLogin);

// ── Forgot / Reset password ───────────────────────────────────────────────────
router.post("/forgot-password",        forgotPassword);
router.post("/reset-password/:token",  resetPassword);

// ── Artist register ───────────────────────────────────────────────────────────
router.post("/artist/register", async (req, res) => {
  try {
    const { name, email, password, category, bio, city, role } = req.body;

    const existing = await Artist.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newArtist = new Artist({
      name, email,
      password: hashedPassword,
      category, bio, city,
      role: "artist",
    });

    await newArtist.save();

    const token = jwt.sign(
      { id: newArtist._id, role: "artist" },
      process.env.JWT_SECRET,       // ✅ uses .env, not hardcoded
      { expiresIn: "7d" }
    );

    res.json({ artist: newArtist, token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Artist / User login ───────────────────────────────────────────────────────
router.post("/artist/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    let account;
    if (role === "artist") {
      account = await Artist.findOne({ email });
    } else {
      account = await User.findOne({ email });
    }

    if (!account) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: account._id, role: account.role },
      process.env.JWT_SECRET,       // ✅ uses .env, not hardcoded
      { expiresIn: "7d" }
    );

    if (role === "artist") {
      res.json({ artist: account, token });
    } else {
      res.json({ user: account, token });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;