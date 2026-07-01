// artspire-backend/models/Post.js

const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userRole: { type: String, enum: ["artist", "user"], default: "user" },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

const viewSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, default: "" },
    userRole: { type: String, enum: ["artist", "user"], default: "user" },
    viewedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
    artistName: { type: String, required: true },
    artistAvatar: { type: String, default: "" },

    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true },
    cloudinaryId: { type: String },

    caption: { type: String, default: "", maxlength: 2200 },

    // ── Moderation ─────────────────────────────────────────────────────────
    // pending  → awaiting admin review, NOT visible in the public feed
    // approved → visible in the public feed
    // rejected → never shown publicly; artist sees "Not approved"
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejectionReason: { type: String, default: "" },
    reviewedAt: { type: Date },

    likes: [{ type: String }],
    comments: [commentSchema],
    views: [viewSchema],
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);