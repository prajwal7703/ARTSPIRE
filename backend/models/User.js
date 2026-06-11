const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
passwordResetToken: { type: String, default: null },
  role: { type: String, enum: ["user", "artist"], default: "user" },
  category: { type: String },
  bio: { type: String },
  city: { type: String },
  instagram: { type: String },
  experience: { type: String },
  profileImage: { type: String },
  coverImage: { type: String },
  phone: { type: String },
  skills: [{ type: String }],
  facebook: { type: String },
  youtube: { type: String },
  password: { type: String, select: false },
  rating: { type: Number, default: 5 },
  portfolio: [{ type: String }],
}, { timestamps: true });

// ✅ "user" collection name — keeps existing data
module.exports = mongoose.model("user", userSchema);