// backend/routes/bookingRoutes.js
// Drop-in replacement for your existing file.
//
// What changed from your version:
//   1. /create-order now takes { bookingId, couponCode } instead of a raw
//      `amount` from the client. The amount is computed server-side from
//      booking.agreedPrice and a server-validated coupon. Previously a user
//      could send any amount they wanted and pay ₹1 for any booking.
//   2. /:id/confirm-payment now verifies the Razorpay signature (HMAC with
//      your key secret) before marking a booking confirmed. Previously it
//      trusted the client's word that payment succeeded — anyone could call
//      that route directly and mark their booking "confirmed" for free.
//   3. booking_confirmed and booking_offer events are now also emitted to
//      `user_${userId}` (not just `artist_${artistId}`), so the user's own
//      booking page updates in real time too.

const express  = require("express");
const router   = express.Router();
const crypto   = require("crypto");
const Booking  = require("../models/Booking");
const Coupon   = require("../models/Coupon");
const { evaluateCoupon } = require("../utils/couponUtils");

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

// ── POST /api/bookings/:id/cancel ─────────────────────────────────────────────
// Either side can cancel before payment is confirmed.
router.post("/:id/cancel", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });
    if (booking.status === "confirmed") {
      return res.status(400).json({ error: "Cannot cancel a confirmed booking." });
    }

    booking.status = "cancelled";
    await booking.save();

    getIO(req).to(`artist_${booking.artistId}`).emit("booking_cancelled", { bookingId: booking._id });
    getIO(req).to(`user_${booking.userId}`).emit("booking_cancelled", { bookingId: booking._id });

    res.json({ ok: true });
  } catch (err) {
    console.error("bookings/cancel error:", err);
    res.status(500).json({ error: "Failed to cancel booking." });
  }
});

// ── POST /api/bookings/create-order ──────────────────────────────────────────
// Creates a Razorpay order for a booking (or a demo order if keys not set).
// The amount is ALWAYS computed server-side from booking.agreedPrice and a
// server-validated coupon — never trust a client-sent amount for money.
//
// body: { bookingId, couponCode? }
router.post("/create-order", async (req, res) => {
  try {
    const { bookingId, couponCode } = req.body;
    if (!bookingId) return res.status(400).json({ error: "bookingId is required." });

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found." });

    if (!["price_agreed", "payment_pending"].includes(booking.status)) {
      return res.status(400).json({ error: "Price has not been agreed on yet." });
    }

    const baseAmount = booking.agreedPrice ?? booking.basePrice ?? 0;
    if (baseAmount <= 0) {
      return res.status(400).json({ error: "Invalid booking amount." });
    }

    let discountAmount = 0;
    let appliedCode    = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: String(couponCode).trim().toUpperCase() });
      const result  = evaluateCoupon(coupon, baseAmount);
      if (!result.valid) {
        return res.status(400).json({ error: result.message });
      }
      discountAmount = result.discountAmount;
      appliedCode    = coupon.code;
    }

    const finalAmount = Math.max(1, Math.round(baseAmount - discountAmount));

    booking.couponCode     = appliedCode;
    booking.discountAmount = discountAmount;
    booking.finalAmount    = finalAmount;
    booking.status         = "payment_pending";

    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      // Demo mode — no real Razorpay account configured.
      const demoOrderId = `demo_${Date.now()}`;
      booking.orderId = demoOrderId;
      await booking.save();
      return res.json({
        orderId: demoOrderId,
        amount: finalAmount * 100,
        keyId: null,
        discountAmount,
        finalAmount,
        demo: true,
      });
    }

    const Razorpay = require("razorpay");
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await rzp.orders.create({
      amount:   finalAmount * 100, // paise
      currency: "INR",
      receipt:  `booking_${booking._id}`,
    });

    booking.orderId = order.id;
    await booking.save();

    res.json({
      orderId: order.id,
      amount: order.amount,
      keyId, // public key id — safe to send to the frontend, never the secret
      discountAmount,
      finalAmount,
      demo: false,
    });
  } catch (err) {
    console.error("create-order error:", err);
    res.status(500).json({ error: "Failed to create payment order." });
  }
});

// ── POST /api/bookings/:id/confirm-payment ────────────────────────────────────
// Called after Razorpay checkout succeeds on the frontend. Verifies the
// payment signature before trusting it, then sets status → confirmed.
//
// body: { paymentId, orderId, signature }
router.post("/:id/confirm-payment", async (req, res) => {
  try {
    const { paymentId, orderId, signature } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found." });

    if (!booking.orderId || booking.orderId !== orderId) {
      return res.status(400).json({ error: "Order does not match this booking." });
    }
    if (booking.status === "confirmed") {
      return res.json({ ok: true, booking }); // already confirmed, idempotent
    }

    const isDemo = orderId.startsWith("demo_");

    if (!isDemo) {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) return res.status(500).json({ error: "Payment is not configured on the server." });
      if (!paymentId || !signature) {
        return res.status(400).json({ error: "Missing payment verification details." });
      }

      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: "Payment verification failed." });
      }
    }

    booking.paidAmount  = booking.finalAmount ?? booking.agreedPrice;
    booking.payMode     = "full";
    booking.paymentId   = paymentId || `demo_pay_${Date.now()}`;
    booking.status      = "confirmed";
    booking.confirmedAt = new Date();
    await booking.save();

    // Mark the coupon as used (only once payment is actually confirmed)
    if (booking.couponCode) {
      try {
        await Coupon.findOneAndUpdate({ code: booking.couponCode }, { $inc: { usedCount: 1 } });
      } catch (e) {
        console.error("coupon usedCount increment failed:", e);
      }
    }

    const io = getIO(req);
    io.to(`artist_${booking.artistId}`).emit("booking_confirmed", {
      bookingId:  booking._id,
      userName:   booking.userName,
      eventType:  booking.eventType,
      eventDate:  booking.eventDate,
      paidAmount: booking.paidAmount,
    });
    io.to(`user_${booking.userId}`).emit("booking_confirmed", {
      bookingId:  booking._id,
      paidAmount: booking.paidAmount,
    });

    res.json({ ok: true, booking });
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