const express  = require("express");
const router   = express.Router();
const Booking  = require("../models/Booking");
const Notification = require("../models/Notification");
const Razorpay = require("razorpay");
const crypto   = require("crypto");

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── CREATE RAZORPAY ORDER ────────────────────────────────────────────────────
// POST /api/bookings/create-order
router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body; // amount in rupees
    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100), // convert to paise
      currency: "INR",
      receipt:  `receipt_${Date.now()}`,
    });
    res.json({ success: true, order });
  } catch (err) {
    console.error("Razorpay order error:", err);
    res.status(500).json({ success: false, message: "Payment initiation failed" });
  }
});

// ── VERIFY PAYMENT & CONFIRM BOOKING ────────────────────────────────────────
// POST /api/bookings/verify-payment
router.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingData,
    } = req.body;

    // Verify signature
    const body      = razorpay_order_id + "|" + razorpay_payment_id;
    const expected  = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // Save booking
    const booking = new Booking({
      ...bookingData,
      paymentId:     razorpay_payment_id,
      paymentStatus: "paid",
      status:        "confirmed",
    });
    await booking.save();

    // Send notification to artist
    await Notification.create({
      toArtist: bookingData.artistId,
      fromName: bookingData.userName,
      type:     "booking",
      message:  `${bookingData.userName} booked you for ${bookingData.eventType} on ${bookingData.date}`,
      read:     false,
    });

    // Emit real-time notification via socket if available
    const io = req.app.get("io");
    if (io) {
      io.to(bookingData.artistId).emit("new_notification", {
        type:    "booking",
        message: `New booking from ${bookingData.userName}!`,
      });
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error("Payment verify error:", err);
    res.status(500).json({ success: false, message: "Booking failed" });
  }
});

// ── CREATE BOOKING WITHOUT PAYMENT (free/offline) ───────────────────────────
// POST /api/bookings/create
router.post("/create", async (req, res) => {
  try {
    const booking = new Booking(req.body);
    await booking.save();

    // Notify artist
    await Notification.create({
      toArtist: req.body.artistId,
      fromName: req.body.userName,
      type:     "booking",
      message:  `${req.body.userName} sent a booking request for ${req.body.eventType} on ${req.body.date}`,
      read:     false,
    });

    const io = req.app.get("io");
    if (io) {
      io.to(req.body.artistId).emit("new_notification", {
        type:    "booking",
        message: `New booking request from ${req.body.userName}!`,
      });
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ success: false });
  }
});

// ── GET BOOKINGS BY ARTIST ───────────────────────────────────────────────────
router.get("/artist/:id", async (req, res) => {
  try {
    const bookings = await Booking.find({ artistId: req.params.id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ── GET BOOKINGS BY USER ─────────────────────────────────────────────────────
router.get("/user/:id", async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.id }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ── UPDATE BOOKING STATUS ────────────────────────────────────────────────────
router.put("/status/:id", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    // Notify user when artist confirms/cancels
    const io = req.app.get("io");
    if (io && booking) {
      io.to(booking.userId).emit("new_notification", {
        type:    "booking_update",
        message: `Your booking with ${booking.artistName} is ${req.body.status}!`,
      });
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ── GET ALL BOOKINGS (admin) ─────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;