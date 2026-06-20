const mongoose = require("mongoose");

const artistSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true },
    email:         { type: String, required: true, unique: true },
    password:      { type: String, required: true },
    role:          { type: String, default: "artist" },
    bio:           { type: String, default: "" },
    city:          { type: String, default: "" },
    instagram:     { type: String, default: "" },
    category:      { type: String, default: "" },
    experience:    { type: String, default: "" },
    profileImage:  { type: String, default: "" },
    rating:        { type: Number, default: 5 },
    skills:        { type: [String], default: [] },
    works:         { type: [String], default: [] },
    profileViews:  { type: Number, default: 0 },
    price:         { type: Number, default: 0 },   // ✅ added — artist's base price for booking
    passwordResetToken: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Artist", artistSchema); // → "artists" collection