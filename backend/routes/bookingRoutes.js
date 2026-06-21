// backend/routes/bookingRoutes.js
// Drop-in replacement — covers all negotiation + payment routes

const express = require("express");
const router  = express.Router();
const Booking = require("../models/Booking");

// ── helper: get io from app ───────────────────────────────────────────────────
function getIO(req) { return req.app.get("io"); }

// ── POST /api/bookings/request ────────────────────────────────────────────────
// User submits a booking request. Artist sees it as "New Request".
router.post("/request", async (req, res) => {
  try {
    const {
      artistId, artistName,
      userId,   userName, userEmail,
      eventType, eventDate, eventTime,
      location,  duration,  message,
      basePrice,
    } = req.body;

    if (!artistId || !userId || !eventType || !eventDate || !location) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const booking = await Booking.create({
      artistId, artistName,
      userId,   userName, userEmail,
      eventType, eventDate, eventTime,
      location,  duration,
      basePrice: basePrice || 0,
      agreedPrice: null,
      status: "pending_approval",
      negotiation: [
        { from: "user", price: basePrice || 0, message: message || "", timestamp: new Date() },
      ],
    });

    // Notify the artist room in real-time
    getIO(req)
      .to(`artist_${artistId}`)
      .emit("new_booking_request", {
        bookingId: booking._id,
        userName,
        eventType,
        eventDate,
      });

    res.json({ bookingId: booking._id });
  } catch (err) {
    console.error("bookings/request error:", err);
    res.status(500).json({ error: "Failed to create booking request." });
  }
});

// ── POST /api/bookings/:id/offer ──────────────────────────────────────────────
// Artist decides their price and sends it to the user.
router.post("/:id/offer", async (req, res) => {
  try {
    const { price, message } = req.body;
    if (!price || price <= 0) return res.status(400).json({ error: "Enter a valid price." });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });

    booking.negotiation.push({ from: "artist", price, message: message || "", timestamp: new Date() });
    booking.status = "negotiating";
    await booking.save();

    // Notify user in real-time
    getIO(req)
      .to(`user_${booking.userId}`)
      .emit("booking_offer", {
        bookingId: booking._id,
        price,
        message,
        status: "negotiating",
      });

    res.json({ ok: true });
  } catch (err) {
    console.error("bookings/offer error:", err);
    res.status(500).json({ error: "Failed to send offer." });
  }
});

// ── POST /api/bookings/:id/counter ────────────────────────────────────────────
// User sends a counter price back to artist.
router.post("/:id/counter", async (req, res) => {
  try {
    const { price, message } = req.body;
    if (!price || price <= 0) return res.status(400).json({ error: "Enter a valid price." });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });

    booking.negotiation.push({ from: "user", price, message: message || "", timestamp: new Date() });
    booking.status = "negotiating";
    await booking.save();

    // Notify artist in real-time
    getIO(req)
      .to(`artist_${booking.artistId}`)
      .emit("user_counter", {
        bookingId: booking._id,
        price,
        message,
      });

    res.json({ ok: true });
  } catch (err) {
    console.error("bookings/counter error:", err);
    res.status(500).json({ error: "Failed to send counter." });
  }
});

// ── POST /api/bookings/:id/accept ─────────────────────────────────────────────
// User accepts artist's price. Status → price_agreed.
router.post("/:id/accept", async (req, res) => {
  try {
    const { price } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });

    booking.agreedPrice = price;
    booking.status = "price_agreed";
    await booking.save();

    getIO(req)
      .to(`artist_${booking.artistId}`)
      .emit("price_accepted", {
        bookingId: booking._id,
        price,
        userName: booking.userName,
      });

    res.json({ ok: true, agreedPrice: price });
  } catch (err) {
    console.error("bookings/accept error:", err);
    res.status(500).json({ error: "Failed to accept price." });
  }
});

// ── POST /api/bookings/:id/artist-accept ─────────────────────────────────────
// Artist accepts user's counter offer. Status → price_agreed.
router.post("/:id/artist-accept", async (req, res) => {
  try {
    const { price, message } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });

    booking.negotiation.push({
      from: "artist",
      price,
      message: message || "Deal! I accept your price.",
      timestamp: new Date(),
    });
    booking.agreedPrice = price;
    booking.status = "price_agreed";
    await booking.save();

    // Notify user
    getIO(req)
      .to(`user_${booking.userId}`)
      .emit("booking_offer", {
        bookingId: booking._id,
        price,
        message: message || "Deal! I accept your price.",
        status: "price_agreed",
      });

    res.json({ ok: true, agreedPrice: price });
  } catch (err) {
    console.error("bookings/artist-accept error:", err);
    res.status(500).json({ error: "Failed to accept counter." });
  }
});

// ── POST /api/bookings/create-order ──────────────────────────────────────────
// Creates Razorpay order (or demo order if keys not set).
router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;

    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      // Demo mode — skip real payment
      return res.json({ orderId: `demo_${Date.now()}`, amount, demo: true });
    }

    const Razorpay = require("razorpay");
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount:   amount * 100,
      currency: "INR",
      receipt:  `receipt_${Date.now()}`,
    });

    res.json({ orderId: order.id, amount: order.amount, demo: false });
  } catch (err) {
    console.error("create-order error:", err);
    res.status(500).json({ error: "Failed to create payment order." });
  }
});

// ── POST /api/bookings/:id/confirm-payment ────────────────────────────────────
// Called after Razorpay payment succeeds. Status → confirmed.
router.post("/:id/confirm-payment", async (req, res) => {
  try {
    const { paymentId, orderId, amount, payMode, agreedPrice } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });

    booking.agreedPrice = agreedPrice;
    booking.paidAmount  = amount;
    booking.payMode     = payMode;
    booking.paymentId   = paymentId || null;
    booking.orderId     = orderId   || null;
    booking.status      = "confirmed";
    booking.confirmedAt = new Date();
    await booking.save();

    // Notify artist
    getIO(req)
      .to(`artist_${booking.artistId}`)
      .emit("booking_confirmed", {
        bookingId:  booking._id,
        userName:   booking.userName,
        eventType:  booking.eventType,
        eventDate:  booking.eventDate,
        paidAmount: amount,
      });

    res.json({ ok: true });
  } catch (err) {
    console.error("confirm-payment error:", err);
    res.status(500).json({ error: "Failed to confirm booking." });
  }
});

// ── GET /api/bookings/artist/:artistId ───────────────────────────────────────
// Artist dashboard — all bookings for this artist.
router.get("/artist/:artistId", async (req, res) => {
  try {
    const query = { artistId: req.params.artistId };
    if (req.query.status) query.status = req.query.status;
    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings." });
  }
});

// ── GET /api/bookings/user/:userId ────────────────────────────────────────────
// User's own booking history.
router.get("/user/:userId", async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bookings." });
  }
});

// ── GET /api/bookings/:id ─────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch booking." });
  }
});

module.exports = router;