// models/Request.js

const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: undefined }, // [lng, lat]
  },
  { _id: false }
);

const responseSchema = new mongoose.Schema(
  {
    artistId: { type: String, required: true },
    artistName: { type: String, required: true },
    artistAvatar: { type: String, default: "" },
    message: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

const requestSchema = new mongoose.Schema(
  {
    // Whoever posted the request — can be a User or an Artist account
    // (artists can request work from other artists too), so this is a
    // plain id string rather than a ref to a single collection.
    requesterId: { type: String, required: true, index: true },
    requesterName: { type: String, required: true },
    requesterAvatar: { type: String, default: "" },

    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    referenceImage: { type: String, default: "" }, // optional "I want this painted" reference
    categories: { type: [String], default: [] },

    city: { type: String, trim: true, default: "" },
    location: {
      type: pointSchema,
      default: undefined,
    },

    status: {
      type: String,
      enum: ["open", "fulfilled", "closed"],
      default: "open",
      index: true,
    },

    responses: [responseSchema],
  },
  { timestamps: true }
);

requestSchema.index({ location: "2dsphere" });
requestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Request", requestSchema);