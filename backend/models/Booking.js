// backend/models/Booking.js
// Same as your existing model, with coupon fields added (couponCode,
// discountAmount, finalAmount). Drop-in replacement.

const mongoose = require("mongoose");

const NegotiationEntrySchema = new mongoose.Schema({
  from:      { type: String, enum: ["user", "artist"], required: true },
  price:     { type: Number, required: true },
  message:   { type: String, default: "" },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const BookingSchema = new mongoose.Schema({
  // Parties
  artistId:   { type: String, required: true, index: true },
  artistName: { type: String, required: true },
  userId:     { type: String, required: true, index: true },
  userName:   { type: String, required: true },
  userEmail:  { type: String, default: "" },

  // Event details
  eventType: { type: String, required: true },
  eventDate: { type: String, required: true },
  eventTime: { type: String, default: "" },
  location:  { type: String, required: true },
  duration:  { type: String, default: "2 hours" },

  // Pricing
  basePrice:   { type: Number, default: 0 },    // from artist profile
  agreedPrice: { type: Number, default: null },  // final negotiated price (before coupon)
  paidAmount:  { type: Number, default: null },  // how much was actually paid
  payMode:     { type: String, enum: ["advance", "full", null], default: null },

  // Coupon (set when the user applies a coupon at checkout)
  couponCode:     { type: String, default: null },
  discountAmount: { type: Number, default: 0 },
  finalAmount:    { type: Number, default: null }, // agreedPrice - discountAmount, what Razorpay actually charges

  // Full negotiation thread
  negotiation: { type: [NegotiationEntrySchema], default: [] },

  // Status flow:
  // pending_approval → negotiating → price_agreed → payment_pending → confirmed
  // or: pending_approval / negotiating → cancelled
  status: {
    type: String,
    enum: [
      "pending_approval",
      "negotiating",
      "price_agreed",
      "payment_pending",
      "confirmed",
      "cancelled",
    ],
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

BookingSchema.index({ artistId: 1, status: 1, createdAt: -1 });
BookingSchema.index({ userId:   1, createdAt: -1 });

module.exports = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);