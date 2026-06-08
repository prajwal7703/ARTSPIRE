const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  toArtist:  { type: String, required: true },
  fromName:  { type: String, default: "Someone" },
  type:      { type: String, enum: ["like", "follow", "comment", "booking"], default: "like" },
  message:   { type: String, default: "" },
  read:      { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Notification", notificationSchema);