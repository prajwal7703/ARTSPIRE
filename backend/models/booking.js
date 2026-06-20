const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  artistId:    { type: String, required: true },
  artistName:  { type: String, required: true },
  userId:      { type: String, required: true },
  userName:    { type: String, required: true },
  userEmail:   { type: String, required: true },
  date:        { type: String, required: true },
  time:        { type: String, required: true },
  eventType:   { type: String, required: true },
  location:    { type: String, required: true },
  message:     { type: String, default: "" },
  amount:      { type: Number, required: true },        // total amount charged to user
  commissionRate:   { type: Number, default: 0 },        // % taken by platform for this category
  commissionAmount: { type: Number, default: 0 },        // ₹ taken by platform
  artistAmount:      { type: Number, default: 0 },       // ₹ artist actually earns
  payoutStatus: { type: String, default: "held", enum: ["held","released_to_withdrawal"] },
  status:      { type: String, default: "pending", enum: ["pending","confirmed","cancelled","completed"] },
  paymentId:   { type: String, default: null },
  paymentStatus: { type: String, default: "pending", enum: ["pending","paid","failed"] },
}, { timestamps: true });

module.exports = mongoose.model("Booking", bookingSchema);