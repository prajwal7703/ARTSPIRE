// routes/bookingPaymentRoutes.js
//
// Mount this in your server.js / app.js, e.g.:
//   const bookingPaymentRoutes = require("./routes/bookingPaymentRoutes");
//   app.use("/api/bookings", bookingPaymentRoutes(io));   // pass your socket.io instance in
//
// ASSUMPTIONS — adjust these two lines if your setup differs:
//   1. Artist room naming: your client does `socket.emit("join_artist_room", artistId)`.
//      On your socket server that should map to `socket.join(artistId.toString())`.
//      If you used a different room name (e.g. `artist_${id}`), change ARTIST_ROOM below.
//   2. User room: you'll need an equivalent `join_user_room` on the client's payment page
//      (or wherever the user is "listening"), joining `socket.join(userId.toString())`.
//      If you don't have that yet, add a `socket.on("join_user_room", id => socket.join(id))`
//      to your socket server (same file where "join_artist_room" is handled).

const express = require("express");
const Booking = require("../models/Booking"); // adjust path if different

const ARTIST_ROOM = (artistId) => `artist_${artistId}`;
const USER_ROOM   = (userId) => `user_${userId}`;

module.exports = function (io) {
  const router = express.Router();

  // GET /api/bookings/:id — single booking, used by the client payment page
  router.get("/:id", async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ error: "Booking not found" });
      res.json(booking);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch booking" });
    }
  });

  // POST /api/bookings/:id/payment-submitted
  // Called by the CLIENT after they scan the QR and hit "I've Paid".
  // Does NOT mark the booking confirmed — that's the artist's call. It just
  // records the claim and notifies the artist in real time.
  router.post("/:id/payment-submitted", async (req, res) => {
    try {
      const { amount, couponCode, discountAmount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const booking = await Booking.findByIdAndUpdate(
        req.params.id,
        {
          status: "payment_pending",
          claimedAmount: amount,
          couponCode: couponCode || undefined,
          discountAmount: discountAmount || undefined,
        },
        { new: true }
      );
      if (!booking) return res.status(404).json({ error: "Booking not found" });

      // Real-time push to the artist dashboard
      io.to(ARTIST_ROOM(booking.artistId)).emit("payment_submitted", {
        bookingId: booking._id,
        amount,
        couponCode: couponCode || null,
        discountAmount: discountAmount || 0,
      });

      res.json({ success: true, booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to submit payment" });
    }
  });

  // POST /api/bookings/:id/confirm-payment
  // Called by the ARTIST after they manually verify the money landed in their UPI app.
  // This is the single source of truth that finalizes the booking.
  router.post("/:id/confirm-payment", async (req, res) => {
    try {
      const { paidAmount } = req.body;
      if (!paidAmount || paidAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const booking = await Booking.findByIdAndUpdate(
        req.params.id,
        { status: "confirmed", paidAmount },
        { new: true }
      );
      if (!booking) return res.status(404).json({ error: "Booking not found" });

      // Real-time push to the client's payment page
      io.to(USER_ROOM(booking.userId)).emit("booking_confirmed", {
        bookingId: booking._id,
        paidAmount,
      });

      res.json({ success: true, paidAmount, booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to confirm payment" });
    }
  });

  return router;
};