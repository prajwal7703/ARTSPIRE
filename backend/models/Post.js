// artspire-backend/models/Post.js
// Add to server.js: const Post = require("./models/Post");  (usually not needed directly,
// routes/posts.js requires it itself)

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

const postSchema = new mongoose.Schema(
  {
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: "Artist", required: true, index: true },
    artistName: { type: String, required: true },
    artistAvatar: { type: String, default: "" },

    mediaUrl: { type: String, required: true },      // Cloudinary secure_url
    mediaType: { type: String, enum: ["image", "video"], required: true },
    cloudinaryId: { type: String },                  // public_id, needed to delete from Cloudinary later

    caption: { type: String, default: "", maxlength: 2200 },

    likes: [{ type: String }],                       // actorIds (artistId or userId) who liked
    comments: [commentSchema],
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);