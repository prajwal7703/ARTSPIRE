const mongoose = require("mongoose");

const artistSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  category: String,
  bio: String,
  city: String,
  role: String,
  location: String,
  profileImage: String,
  instagram: String,   // ← add this
  skills: {            // ← add this
    type: [String],
    default: []
  },
  rating: { type: Number, default: 5 },
  works: [String],
}, { timestamps: true });

module.exports = mongoose.model("Artist", artistSchema);