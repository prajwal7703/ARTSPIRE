const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  password:     { type: String },
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
  facebook:     { type: String },
  youtube:      { type: String },
  rating:       { type: Number, default: 5 },
  portfolio:    [{ type: String }],
  profileViews: { type: Number, default: 0 },   // ✅ NEW — real profile view counter
}, { timestamps: true });

module.exports = mongoose.model("user", userSchema);