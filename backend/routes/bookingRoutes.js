// backend/routes/bookingRoutes.js
// Replace your existing bookingRoutes.js with this file.
// server.js already does:  app.use("/api/bookings", bookingRoutes);
// This file exports a plain router (not a factory) so it works with your current server.js.
// It reads `io` from app.get("io") which server.js already sets up.

const express = require("express");
const router  = express.Router();
const Booking = require("../models/Booking");

// Helper to get io from the express app
const getIO = (req) => req.app.get("io");

/* ── CREATE booking request (user → artist) ─────────────────────────────── */
router.post("/", async (req, res) => {
  try {
    const io = getIO(req);
    const {
      artistId, artistName,
      userId,   userName, userEmail,
      eventType, eventDate, eventTime,
      duration,  location,  basePrice, notes,
    } = req.body;

    if (!artistId || !userId || !eventType || !eventDate || !location || !basePrice) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const booking = await Booking.create({
      artistId, artistName: artistName || "",
      userId,   userName,   userEmail: userEmail || "",
      eventType, eventDate, eventTime: eventTime || "",
      duration:  duration || "2 hours",
      location,
      basePrice: Number(basePrice),
      notes:     notes || "",
      status:    "pending_approval",
      negotiation: [],
    });

    // Notify artist's socket room
    io.to(`artist_${artistId}`).emit("new_booking_request", {
      bookingId: booking._id,
      userName,
      eventType,
      eventDate,
    });

    res.status(201).json(booking);
  } catch (err) {
    console.error("POST /bookings:", err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

/* ── GET all bookings for an artist ─────────────────────────────────────── */
router.get("/artist/:artistId", async (req, res) => {
  try {
    const bookings = await Booking.find({ artistId: req.params.artistId })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch artist bookings" });
  }
});

/* ── GET all bookings for a user ─────────────────────────────────────────── */
router.get("/user/:userId", async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user bookings" });
  }
});

/* ── GET single booking ──────────────────────────────────────────────────── */
router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

/* ── ARTIST: send a price offer ──────────────────────────────────────────── */
// POST /api/bookings/:id/offer   body: { price, message }
router.post("/:id/offer", async (req, res) => {
  try {
    const io = getIO(req);
    const { price, message } = req.body;
    if (!price || Number(price) <= 0) return res.status(400).json({ error: "Invalid price" });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status === "cancelled" || booking.status === "confirmed") {
      return res.status(400).json({ error: "Cannot modify this booking" });
    }

    booking.negotiation.push({
      from: "artist", price: Number(price),
      message: message || "", timestamp: new Date(),
    });
    booking.status = "negotiating";
    await booking.save();

    // Push to user's socket room
    io.to(`user_${booking.userId}`).emit("booking_offer", {
      bookingId: booking._id,
      price:     Number(price),
      message:   message || "",
      status:    "negotiating",
    });

    res.json(booking);
  } catch (err) {
    console.error("POST /offer:", err);
    res.status(500).json({ error: "Failed to send offer" });
  }
});

/* ── USER: send counter offer ────────────────────────────────────────────── */
// POST /api/bookings/:id/counter   body: { price, message }
router.post("/:id/counter", async (req, res) => {
  try {
    const io = getIO(req);
    const { price, message } = req.body;
    if (!price || Number(price) <= 0) return res.status(400).json({ error: "Invalid price" });

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    booking.negotiation.push({
      from: "user", price: Number(price),
      message: message || "", timestamp: new Date(),
    });
    booking.status = "negotiating";
    await booking.save();

    // Push to artist's socket room
    io.to(`artist_${booking.artistId}`).emit("user_counter", {
      bookingId: booking._id,
      price:     Number(price),
      message:   message || "",
      userName:  booking.userName,
    });

    res.json(booking);
  } catch (err) {
    console.error("POST /counter:", err);
    res.status(500).json({ error: "Failed to send counter" });
  }
});

/* ── USER: accept artist's offer → price_agreed ──────────────────────────── */
// POST /api/bookings/:id/user-accept   body: { price }
router.post("/:id/user-accept", async (req, res) => {
  try {
    const io = getIO(req);
    const { price } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "price_agreed", agreedPrice: Number(price) },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const payload = { bookingId: booking._id, price: Number(price) };
    io.to(`artist_${booking.artistId}`).emit("price_accepted", payload);
    io.to(`user_${booking.userId}`).emit("price_accepted", payload);

    res.json(booking);
  } catch (err) {
    console.error("POST /user-accept:", err);
    res.status(500).json({ error: "Failed to accept offer" });
  }
});

/* ── ARTIST: accept user's counter offer → price_agreed ─────────────────── */
// POST /api/bookings/:id/artist-accept   body: { price }
router.post("/:id/artist-accept", async (req, res) => {
  try {
    const io = getIO(req);
    const { price } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "price_agreed", agreedPrice: Number(price) },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const payload = { bookingId: booking._id, price: Number(price) };
    io.to(`user_${booking.userId}`).emit("price_accepted", payload);
    io.to(`artist_${booking.artistId}`).emit("price_accepted", payload);

    res.json(booking);
  } catch (err) {
    console.error("POST /artist-accept:", err);
    res.status(500).json({ error: "Failed to accept counter" });
  }
});

/* ── CREATE Razorpay order → payment_pending ─────────────────────────────── */
// POST /api/bookings/create-order   body: { bookingId }
router.post("/create-order", async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status !== "price_agreed") {
      return res.status(400).json({ error: "Price must be agreed before payment" });
    }

    const amountPaise = Math.round(booking.agreedPrice * 100);

    // If Razorpay keys are not set, return a demo order
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      const demoOrderId = `demo_order_${Date.now()}`;
      await Booking.findByIdAndUpdate(bookingId, {
        status:  "payment_pending",
        orderId: demoOrderId,
      });
      return res.json({
        orderId:     demoOrderId,
        amount:      amountPaise,
        finalAmount: booking.agreedPrice,
        keyId:       null,
        demo:        true,
      });
    }

    const Razorpay = require("razorpay");
    const rzp = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await rzp.orders.create({
      amount:   amountPaise,
      currency: "INR",
      receipt:  `bk_${bookingId}`,
    });

    await Booking.findByIdAndUpdate(bookingId, {
      status:  "payment_pending",
      orderId: order.id,
    });

    res.json({
      orderId:     order.id,
      amount:      amountPaise,
      finalAmount: booking.agreedPrice,
      keyId:       process.env.RAZORPAY_KEY_ID,
      demo:        false,
    });
  } catch (err) {
    console.error("POST /create-order:", err);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

/* ── CONFIRM payment → confirmed ─────────────────────────────────────────── */
// POST /api/bookings/:id/confirm-payment   body: { paymentId, orderId, signature }
router.post("/:id/confirm-payment", async (req, res) => {
  try {
    const io = getIO(req);
    const { paymentId, orderId, signature } = req.body;

    // Verify Razorpay signature if real keys exist
    if (process.env.RAZORPAY_KEY_SECRET && signature) {
      const crypto = require("crypto");
      const body   = `${orderId}|${paymentId}`;
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body).digest("hex");
      if (expected !== signature) {
        return res.status(400).json({ error: "Payment signature mismatch" });
      }
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        status:      "confirmed",
        paymentId:   paymentId || "",
        paidAmount:  0, // will be updated below
        confirmedAt: new Date(),
      },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Set paidAmount = agreedPrice
    booking.paidAmount = booking.agreedPrice;
    await booking.save();

    const payload = { bookingId: booking._id, paidAmount: booking.paidAmount };
    io.to(`artist_${booking.artistId}`).emit("booking_confirmed", payload);
    io.to(`user_${booking.userId}`).emit("booking_confirmed", payload);

    res.json({ booking });
  } catch (err) {
    console.error("POST /confirm-payment:", err);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

/* ── CANCEL booking ──────────────────────────────────────────────────────── */
// POST /api/bookings/:id/cancel   body: { reason, cancelledBy }
router.post("/:id/cancel", async (req, res) => {
  try {
    const io = getIO(req);
    const { reason, cancelledBy } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        status:      "cancelled",
        cancelReason: reason || "",
        cancelledBy:  cancelledBy || "user",
      },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const payload = { bookingId: booking._id, cancelledBy };
    io.to(`artist_${booking.artistId}`).emit("booking_cancelled", payload);
    io.to(`user_${booking.userId}`).emit("booking_cancelled",    payload);

    res.json(booking);
  } catch (err) {
    console.error("POST /cancel:", err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
});

module.exports = router;