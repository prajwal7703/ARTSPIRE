const mongoose = require("mongoose");

const artistSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: { type: String, select: false },
  category: String,
  bio: String,
  city: String,
  role: String,
  location: String,
  profileImage: String,
  instagram: String,
  skills: {
    type: [String],
    default: []
  },
  rating: { type: Number, default: 5 },
  works: [String],
  passwordResetToken: { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model("Artist", artistSchema);
