const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Artist = require("../models/user"); // your mongoose model
const User = require("../models/User");     // your mongoose model

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET environment variable.");
  process.exit(1);
}

// 🎨 ARTIST REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, category, bio, city, role } = req.body;

    // Check if already exists
    const existing = await Artist.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save to MongoDB
    const newArtist = new Artist({
      name, email,
      password: hashedPassword,
      category, bio, city,
      role: "artist"
    });

    await newArtist.save();

    // Generate token
    const token = jwt.sign(
      { id: newArtist._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Send back artist + token
    res.json({
      artist: newArtist,
      token: token
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔑 LOGIN
router.post("/login", async (req, res) => {
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
      { id: account._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    if (role === "artist") {
      res.json({ artist: account, token });
    } else {
      res.json({ user: account, token });
    }

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;