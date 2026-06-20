const express    = require("express");
const router     = express.Router();
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const { Resend } = require("resend");
const User       = require("../models/User");
const Artist     = require("../models/Artist");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) { console.error("Missing JWT_SECRET"); process.exit(1); }

const resend = new Resend(process.env.RESEND_API_KEY);

// ── REGISTER ──────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, category, bio, city, instagram, experience, role, interests } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const Model = role === "artist" ? Artist : User;

    const existing = await Model.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAccount = new Model({
      name, email,
      password:   hashedPassword,
      category:   category   || "",
      bio:        bio        || "",
      city:       city       || "",
      instagram:  instagram  || "",
      experience: experience || "",
      ...(role !== "artist" && { role: role || "user", interests: interests || [] }),
    });

    await newAccount.save();
    const token = jwt.sign({ id: newAccount._id, role: role || "user" }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ success: true, token, user: safeUser(newAccount, role) });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check both collections — email could be in either
    let account = await User.findOne({ email }).select("+password");
    let role = "user";
    if (!account) {
      account = await Artist.findOne({ email }).select("+password");
      role = "artist";
    }
    if (!account) return res.status(400).json({ message: "Invalid email or password" });

    if (!account.password) {
      return res.status(400).json({ message: "Please use Google login for this account" });
    }

    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: account._id, role }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ success: true, token, user: safeUser(account, role) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── GOOGLE LOGIN ────────────────────────────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    const { name, email, photo, role } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const Model = role === "artist" ? Artist : User;
    let account = await Model.findOne({ email });

    if (!account) {
      account = new Model({
        name,
        email,
        password:     null,
        profileImage: photo || "",
        ...(role !== "artist" && { role: role || "user" }),
      });
      await account.save();
    }

    const finalRole = role === "artist" ? "artist" : "user";
    const token = jwt.sign({ id: account._id, role: finalRole }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ success: true, token, user: safeUser(account, finalRole) });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── FORGOT PASSWORD ──────────────────────────────────────────────────────
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    let account = await User.findOne({ email });
    if (!account) account = await Artist.findOne({ email });

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

// ── RESET PASSWORD ───────────────────────────────────────────────────────
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
    try { decoded = jwt.verify(token, JWT_SECRET); }
    catch { return res.status(400).json({ message: "Reset link is invalid or has expired." }); }

    let account = await User.findById(decoded.id);
    if (!account) account = await Artist.findById(decoded.id);
    if (!account) return res.status(404).json({ message: "Account not found." });

    account.password = await bcrypt.hash(newPassword, 10);
    await account.save();

    res.json({ success: true, message: "Password reset successfully! You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── HELPER ──────────────────────────────────────────────────────────────
function safeUser(account, role) {
  return {
    _id:          account._id,
    name:         account.name,
    email:        account.email,
    role:         role,
    category:     account.category     || null,
    city:         account.city         || null,
    instagram:    account.instagram    || null,
    bio:          account.bio          || null,
    profileImage: account.profileImage || null,
    experience:   account.experience   || null,
    rating:       account.rating       || 5,
  };
}

module.exports = router;