const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  // ✅ select: false so password never leaks in .find() — use .select("+password") when needed
  password:     { type: String, select: false },
  role:         { type: String, enum: ["user", "artist"], default: "user" },
  category:     { type: String },
  bio:          { type: String },
  city:         { type: String },
  instagram:    { type: String },
  experience:   { type: String },
  profileImage: { type: String },
  coverImage:   { type: String },
  phone:        { type: String },
  skills:       [{ type: String }],
  interests:    [{ type: String }],   // ✅ added — used by Register.jsx
  facebook:     { type: String },
  youtube:      { type: String },
  rating:       { type: Number, default: 5 },
  portfolio:    [{ type: String }],
  profileViews: { type: Number, default: 0 },
  price:        { type: Number, default: 0 },   // ✅ added — artist's base price for booking
}, { timestamps: true });

module.exports = mongoose.model("user", userSchema);