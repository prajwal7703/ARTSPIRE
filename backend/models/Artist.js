// models/Artist.js

const mongoose = require("mongoose");

// Separate sub-schema (not just an inline object) with an explicit
// `default: undefined` on the parent field below — this is deliberate.
// If we let Mongoose auto-populate `location: { type: "Point" }` with no
// coordinates for every artist who hasn't shared their location yet, the
// 2dsphere index below would choke on invalid/incomplete geometry. Keeping
// `location` entirely absent until it's explicitly set avoids that.
const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: undefined }, // [lng, lat]
  },
  { _id: false }
);

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
    // ── Live geolocation, for the "Find Nearby Artists" map + matching
    // artists to nearby Post Requests. Updated via
    // PUT /api/artists/:id/location whenever the artist's app has a fresh
    // GPS fix. Stays undefined until an artist opts in / shares location.
    location: {
      type: pointSchema,
      default: undefined,
    },
    locationUpdatedAt: {
      type: Date,
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
    // ── FIX: previously undeclared. Without this, Mongoose's strict mode
    // silently dropped `artist.works = [...]` on .save() in the admin
    // approve route (adminRoutes.js -> PUT /posts/:id/status), so approved
    // work samples never actually persisted into the artist's portfolio,
    // even though the same post correctly reached the public Feed.
    works: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

artistSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Artist", artistSchema);