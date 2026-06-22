// backend/models/Booking.js
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
  userId:     { type: String, default: null, index: true }, // ✅ no longer required (guest bookings)
  userName:   { type: String, required: true },
  userEmail:  { type: String, default: "" },

  // Event details
  eventType: { type: String, required: true },
  eventDate: { type: String, required: true },
  eventTime: { type: String, default: "" },
  location:  { type: String, required: true },
  duration:  { type: String, default: "2 hours" },

  // Pricing
  basePrice:   { type: Number, default: 0 },
  agreedPrice: { type: Number, default: null },
  paidAmount:  { type: Number, default: null },
  payMode:     { type: String, enum: ["advance", "full", null], default: null },

  // Coupon
  couponCode:     { type: String, default: null },
  discountAmount: { type: Number, default: 0 },
  finalAmount:    { type: Number, default: null },

  negotiation: { type: [NegotiationEntrySchema], default: [] },

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

  paymentId:   { type: String, default: null },
  orderId:     { type: String, default: null },
  confirmedAt: { type: Date,   default: null },
}, {
  timestamps: true,
});

BookingSchema.index({ artistId: 1, status: 1, createdAt: -1 });
BookingSchema.index({ userId:   1, createdAt: -1 });

module.exports = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);