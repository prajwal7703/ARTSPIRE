const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId:   { type: String, required: true },
  receiverId: { type: String, required: true },
  message:    { type: String, default: '' },
  mediaUrl:   { type: String, default: null },
  mediaType:  { type: String, default: null },
  read:       { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
