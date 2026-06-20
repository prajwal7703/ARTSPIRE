// backend/routes/bookingRoutes.js
const express  = require("express");
const router   = express.Router();
const Booking  = require("../models/Booking");
const { createRazorpayOrder } = require("../utils/razorpay");

// ── POST /api/bookings/request ────────────────────────────────────────────
// User submits booking request. Status = pending_approval.
router.post("/request", async (req, res) => {
  try {
    const {
      artistId, artistName,
      userId,   userName, userEmail,
      eventType, eventDate, eventTime,
      location,  duration,  message,
      basePrice,
    } = req.body;

    const booking = await Booking.create({
      artistId, artistName,
      userId,   userName, userEmail,
      eventType, eventDate, eventTime,
      location,  duration,
      basePrice,
      agreedPrice: null,
      status: "pending_approval",
      negotiation: [
        { from: "user", price: basePrice, message: message || "", timestamp: new Date() },
      ],
    });

    res.json({ bookingId: booking._id });
  } catch (err) {
    console.error("booking/request error:", err);
    res.status(500).json({ error: "Failed to create booking request." });
  }
});

// ── POST /api/bookings/:id/offer ──────────────────────────────────────────
// Artist sets / adjusts their price. Called from the ARTIST dashboard.
// status → negotiating
router.post("/:id/offer", async (req, res) => {
  try {
    const { price, message } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });

    booking.negotiation.push({ from: "artist", price, message, timestamp: new Date() });
    booking.status = "negotiating";
    await booking.save();

    // Emit to user via socket (done in socket handler or here via io)
    // io.to(booking.userId).emit("booking_offer", { bookingId: booking._id, price, message, status: "negotiating" });

    res.json({ ok: true });
  } catch (err) {
    console.error("booking/offer error:", err);
    res.status(500).json({ error: "Failed to send offer." });
  }
});

// ── POST /api/bookings/:id/counter ───────────────────────────────────────
// User sends a counter price back to artist.
router.post("/:id/counter", async (req, res) => {
  try {
    const { from, price, message } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });

    booking.negotiation.push({ from, price, message, timestamp: new Date() });
    booking.status = "negotiating";
    await booking.save();

    // io.to(booking.artistId).emit("user_counter", { bookingId: booking._id, price, message });

    res.json({ ok: true });
  } catch (err) {
    console.error("booking/counter error:", err);
    res.status(500).json({ error: "Failed to send counter." });
  }
});

// ── POST /api/bookings/:id/accept ─────────────────────────────────────────
// User accepts the artist's price. status → price_agreed.
router.post("/:id/accept", async (req, res) => {
  try {
    const { price } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });

    booking.agreedPrice = price;
    booking.status = "price_agreed";
    await booking.save();

    // io.to(booking.artistId).emit("price_accepted", { bookingId: booking._id, price });

    res.json({ ok: true, agreedPrice: price });
  } catch (err) {
    console.error("booking/accept error:", err);
    res.status(500).json({ error: "Failed to accept price." });
  }
});

// ── POST /api/bookings/create-order ───────────────────────────────────────
// Creates a Razorpay order (or demo order if not configured).
router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      // Demo mode — no real payment
      return res.json({ orderId: `demo_${Date.now()}`, amount, demo: true });
    }

    const order = await createRazorpayOrder(amount);
    res.json({ orderId: order.id, amount: order.amount, demo: false });
  } catch (err) {
    console.error("create-order error:", err);
    res.status(500).json({ error: "Failed to create payment order." });
  }
});

// ── POST /api/bookings/:id/confirm-payment ────────────────────────────────
// Finalises booking after payment. status → confirmed.
router.post("/:id/confirm-payment", async (req, res) => {
  try {
    const { paymentId, orderId, amount, payMode, agreedPrice } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });

    booking.agreedPrice  = agreedPrice;
    booking.paidAmount   = amount;
    booking.payMode      = payMode;           // "advance" | "full"
    booking.paymentId    = paymentId;
    booking.orderId      = orderId;
    booking.status       = "confirmed";
    booking.confirmedAt  = new Date();
    await booking.save();

    res.json({ ok: true });
  } catch (err) {
    console.error("confirm-payment error:", err);
    res.status(500).json({ error: "Failed to confirm booking." });
  }
});

// ── GET /api/bookings/artist/:artistId ───────────────────────────────────
// Artist dashboard — fetch all pending/negotiating bookings.
router.get("/artist/:artistId", async (req, res) => {
  try {
    const { status } = req.query; // optional filter
    const query = { artistId: req.params.artistId };
    if (status) query.status = status;

    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings." });
  }
});

// ── GET /api/bookings/user/:userId ────────────────────────────────────────
// User's booking history.
router.get("/user/:userId", async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings." });
  }
});

module.exports = router;