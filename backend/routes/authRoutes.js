const express  = require("express");
const router   = express.Router();
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Artist   = require("../models/user");   // artist model
const User     = require("../models/User");   // user model

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET environment variable.");
  process.exit(1);
}

// ── EMAIL TRANSPORTER ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,   // smtp.gmail.com
  port:   Number(process.env.EMAIL_PORT), // 587
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 🎨 ARTIST REGISTER
router.post("/register", async (req, res) => {
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

    const token = jwt.sign({ id: newArtist._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ artist: newArtist, token });
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

    if (!account) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) return res.status(401).json({ message: "Wrong password" });

    const token = jwt.sign({ id: account._id }, JWT_SECRET, { expiresIn: "7d" });

    if (role === "artist") {
      res.json({ artist: account, token });
    } else {
      res.json({ user: account, token });
    }
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── FORGOT PASSWORD ──────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Body: { email, role }   role = "artist" | "user"  (optional, defaults to checking both)
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    // Find account in either collection
    let account = null;
    let accountType = "";

    if (role === "artist") {
      account = await Artist.findOne({ email });
      accountType = "artist";
    } else if (role === "user") {
      account = await User.findOne({ email });
      accountType = "user";
    } else {
      // check both
      account = await Artist.findOne({ email });
      if (account) {
        accountType = "artist";
      } else {
        account = await User.findOne({ email });
        accountType = "user";
      }
    }

    // ✅ Always return success even if email not found (security best practice)
    if (!account) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    // Generate a short-lived reset token (15 minutes)
    const resetToken = jwt.sign(
      { id: account._id, type: accountType },
      JWT_SECRET,
      { expiresIn: "15m" }
    );

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    // Send email
    await transporter.sendMail({
      from:    `"ArtSpire" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: "ArtSpire — Reset Your Password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f0f4ff;border-radius:16px;">
          <h2 style="color:#1e3a8a;margin-bottom:8px;">Reset your password</h2>
          <p style="color:#475569;margin-bottom:24px;">
            Hi <strong>${account.name || "there"}</strong>,<br/>
            We received a request to reset your ArtSpire password.
            Click the button below — this link expires in <strong>15 minutes</strong>.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#1e3a8a;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
            Reset Password
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
            If you didn't request this, you can safely ignore this email.
            <br/>Link: <a href="${resetUrl}" style="color:#94a3b8;">${resetUrl}</a>
          </p>
        </div>
      `,
    });

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Failed to send reset email. Try again." });
  }
});

// ── RESET PASSWORD ───────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// Body: { token, newPassword }
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Reset link is invalid or has expired." });
    }

    const { id, type } = decoded;

    // Find the account
    const Model = type === "artist" ? Artist : User;
    const account = await Model.findById(id);
    if (!account) {
      return res.status(404).json({ message: "Account not found." });
    }

    // Hash and save new password
    account.password = await bcrypt.hash(newPassword, 10);
    await account.save();

    res.json({ message: "Password reset successfully! You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;