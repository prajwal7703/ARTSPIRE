const User             = require("../models/User");
const bcrypt           = require("bcryptjs");
const jwt              = require("jsonwebtoken");
const { sendResetEmail } = require("../utils/email");

function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function signResetToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_RESET_EXPIRES || "15m" }
  );
}

function safeUser(user) {
  return {
    _id:          user._id,
    name:         user.name,
    email:        user.email,
    role:         user.role,
    category:     user.category     || null,
    city:         user.city         || null,
    instagram:    user.instagram    || null,
    bio:          user.bio          || null,
    profileImage: user.profileImage || null,
    experience:   user.experience   || null,
    phone:        user.phone        || null,
    rating:       user.rating       || 5,
  };
}

// ── REGISTER ──────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, category, city, instagram, bio } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name, email,
      password: hashedPassword,
      role:      role      || "user",
      category:  category  || "",
      city:      city      || "",
      instagram: instagram || "",
      bio:       bio       || "",
    });

    await user.save();
    const token = signToken(user);

    res.json({ success: true, message: "Registered successfully", token, user: safeUser(user) });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── LOGIN (works for BOTH user and artist — both stored in User collection) ───
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "Please use Google login for this account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = signToken(user);
    const safe  = safeUser(user);

    // ✅ Return both user AND artist keys so frontend works regardless of role
    if (user.role === "artist") {
      return res.json({ success: true, token, user: safe, artist: safe });
    }

    res.json({ success: true, token, user: safe });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GOOGLE LOGIN ──────────────────────────────────────────────────────────────
exports.googleLogin = async (req, res) => {
  try {
    const { name, email, photo, role } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name, email,
        password:     null,
        role:         role || "user",
        profileImage: photo || "",
      });
      await user.save();
    }

    const token = signToken(user);
    res.json({ success: true, token, user: safeUser(user) });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
    }

    const resetToken = signResetToken(user);
    const resetUrl   = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    await sendResetEmail(user.email, resetUrl);

    res.json({ success: true, message: "If that email is registered, a reset link has been sent." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── RESET PASSWORD ────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { token }       = req.params;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ message: "Reset link is invalid or has expired. Please request a new one." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(decoded.id, { password: hashed });

    res.json({ success: true, message: "Password reset successful. You can now log in." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};