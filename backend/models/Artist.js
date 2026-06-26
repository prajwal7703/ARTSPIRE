// models/Artist.js

const mongoose = require("mongoose");

const artistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+\@.+\..+/, "Please provide a valid email"],
    },
    password: {
      type: String,
      minlength: 6,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "artist"],
      default: "artist",
    },
    categories: {
      type: [String],
      default: [],
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    instagram: {
      type: String,
      trim: true,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    profileImage: {
      type: String,
      default: null,
    },
    experience: {
      type: Number,
      default: 0,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    rating: {
      type: Number,
      default: 5,
      min: 0,
      max: 5,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Artist", artistSchema);