const User   = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");

// ── Helper: sign token ────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// ── Helper: safe user object ──────────────────────────────────────────────────
function safeUser(user) {
  return {
    _id:      user._id,
    name:     user.name,
    email:    user.email,
    role:     user.role,
    category: user.category || null,
    city:     user.city     || null,
    instagram:user.instagram|| null,
    bio:      user.bio      || null,
    profileImage: user.profileImage || null,
  };
}

// ── REGISTER ─────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, category, city, instagram, bio } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role:     role || "user",
      category: category || "",
      city:     city     || "",
      instagram:instagram || "",
      bio:      bio      || "",
    });

    await user.save();

    const token = signToken(user);

    res.json({
      success: true,
      message: "Registered Successfully",
      token,
      user: safeUser(user),
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Google-only accounts have no password
    if (!user.password) {
      return res.status(400).json({ message: "Please use Google login for this account" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user: safeUser(user),
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ── GOOGLE LOGIN ──────────────────────────────────────────────────────────────
exports.googleLogin = async (req, res) => {
  try {
    const { name, email, photo, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name,
        email,
        password:     null,
        role:         role || "user",
        profileImage: photo || "",
      });
      await user.save();
    }

    const token = signToken(user);

    res.json({
      success: true,
      token,
      user: safeUser(user),
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};