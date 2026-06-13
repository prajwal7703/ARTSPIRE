const mongoose = require('mongoose');
const notificationSchema = new mongoose.Schema({
  toArtist: { type: String, required: true },
  fromName: { type: String, default: 'Someone' },
  type:     { type: String, default: 'like' },
  message:  { type: String, default: '' },
  read:     { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model('Notification', notificationSchema);
