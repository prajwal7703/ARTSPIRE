const mongoose = require('mongoose');
const postSchema = new mongoose.Schema({
  artistId: { type: String, required: true },
  media:    { type: String, required: true },
  type:     { type: String, enum: ['image', 'video'], default: 'image' },
  title:    { type: String, default: '' },
  likes:    { type: Number, default: 0 },
}, { timestamps: true });
module.exports = mongoose.model('Post', postSchema);
