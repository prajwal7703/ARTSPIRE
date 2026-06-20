// backend/models/Booking.js
const mongoose = require("mongoose");

const NegotiationEntrySchema = new mongoose.Schema({
  from:      { type: String, enum: ["user", "artist"], required: true },
  price:     { type: Number, required: true },
  message:   { type: String, default: "" },
  timestamp: { type: Date,   default: Date.now },
}, { _id: false });

const BookingSchema = new mongoose.Schema({
  // Parties
  artistId:    { type: String, required: true, index: true },
  artistName:  { type: String, required: true },
  userId:      { type: String, required: true, index: true },
  userName:    { type: String, required: true },
  userEmail:   { type: String, default: "" },

  // Event details
  eventType:   { type: String, required: true },
  eventDate:   { type: String, required: true },
  eventTime:   { type: String, default: "" },
  location:    { type: String, required: true },
  duration:    { type: String, default: "2 hours" },

  // Pricing
  basePrice:    { type: Number, required: true },   // artist's profile price
  agreedPrice:  { type: Number, default: null },    // final agreed price
  paidAmount:   { type: Number, default: null },    // amount actually paid now
  payMode:      { type: String, enum: ["advance", "full"], default: null },

  // Negotiation thread
  negotiation: { type: [NegotiationEntrySchema], default: [] },

  // Status flow:
  // pending_approval → negotiating → price_agreed → payment_pending → confirmed → cancelled
  status: {
    type: String,
    enum: ["pending_approval", "negotiating", "price_agreed", "payment_pending", "confirmed", "cancelled"],
    default: "pending_approval",
    index: true,
  },

  // Payment
  paymentId:   { type: String, default: null },
  orderId:     { type: String, default: null },
  confirmedAt: { type: Date,   default: null },
}, {
  timestamps: true,
});

// Compound index for artist dashboard queries
BookingSchema.index({ artistId: 1, status: 1, createdAt: -1 });
BookingSchema.index({ userId:   1, createdAt: -1 });

module.exports = mongoose.model("Booking", BookingSchema);