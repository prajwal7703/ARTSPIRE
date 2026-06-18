const express    = require("express");
const router     = express.Router();
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const { Resend } = require("resend");
const User       = require("../models/Artist"); // single collection for both roles

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) { console.error("Missing JWT_SECRET"); process.exit(1); }

const resend = new Resend(process.env.RESEND_API_KEY);

// ── REGISTER ──────────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, category, bio, city, instagram, experience, role } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name, email,
      password: hashedPassword,
      category: category || "",
      bio:      bio      || "",
      city:     city     || "",
      instagram:  instagram  || "",
      experience: experience || "",
      role: role || "user",
    });

    await newUser.save();
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: "7d" });

    // return both user and artist keys so frontend works regardless of role
    res.json({ success: true, token, user: safeUser(newUser), artist: safeUser(newUser) });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const account = await User.findOne({ email });
    if (!account) return res.status(400).json({ message: "Invalid email or password" });

    if (!account.password) {
      return res.status(400).json({ message: "Please use Google login for this account" });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: account._id, role: account.role }, JWT_SECRET, { expiresIn: "7d" });
    const safe  = safeUser(account);

    // return both keys so frontend works for both roles
    res.json({ success: true, token, user: safe, artist: safe });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── GOOGLE LOGIN ──────────────────────────────────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    const { name, email, photo, role } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    let user = await User.findOne({ email });

    if (!user) {
      // first time — create account
      user = new User({
        name,
        email,
        password:     null,
        profileImage: photo || "",
        role:         role  || "user",
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    const safe  = safeUser(user);

    res.json({ success: true, token, user: safe, artist: safe });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const account = await User.findOne({ email });

    // always return success for security (don't reveal if email exists)
    if (!account || !account.password) {
      return res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
    }

    const resetToken = jwt.sign({ id: account._id }, JWT_SECRET, { expiresIn: "15m" });
    const resetUrl   = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    await resend.emails.send({
      from:    "ArtSpire <onboarding@resend.dev>",
      to:      email,
      subject: "Reset your ArtSpire password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f0f4ff;border-radius:16px;">
          <h2 style="color:#1e3a8a;">Reset your password</h2>
          <p style="color:#475569;">Hi <strong>${account.name || "there"}</strong>,<br/>Click the button below — this link expires in <strong>15 minutes</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#1e3a8a;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Reset Password</a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    res.json({ success: true, message: "If that email is registered, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to send reset email. Try again." });
  }
});

// ── RESET PASSWORD ────────────────────────────────────────────────────────────
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(400).json({ message: "Reset link is invalid or has expired." });
    }

    const account = await User.findById(decoded.id);
    if (!account) return res.status(404).json({ message: "Account not found." });

    account.password = await bcrypt.hash(newPassword, 10);
    await account.save();

    res.json({ success: true, message: "Password reset successfully! You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── HELPER ────────────────────────────────────────────────────────────────────
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
    rating:       user.rating       || 5,
  };
}

module.exports = router;