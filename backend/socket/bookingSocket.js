// backend/socket/bookingSocket.js
// Mount this in your main socket.js / server.js:
//   const registerBookingSocket = require("./socket/bookingSocket");
//   registerBookingSocket(io);

const Booking = require("../models/Booking");

module.exports = function registerBookingSocket(io) {

  io.on("connection", (socket) => {

    // ── Rooms ──────────────────────────────────────────────────────────────
    // Users join their own userId room so we can push updates to them.
    socket.on("join_user_room", (userId) => {
      socket.join(`user_${userId}`);
    });

    // Artists join their artistId room.
    socket.on("join_artist_room", (artistId) => {
      socket.join(`artist_${artistId}`);
    });

    // ── User sends booking request ─────────────────────────────────────────
    socket.on("booking_request", ({ artistId, bookingId }) => {
      // Notify artist's room of a new pending request
      io.to(`artist_${artistId}`).emit("new_booking_request", { bookingId });
    });

    // ── Artist sends offer / sets price ───────────────────────────────────
    // This is fired from the ARTIST DASHBOARD after they call POST /offer
    socket.on("artist_offer", async ({ bookingId, price, message, artistId }) => {
      try {
        const booking = await Booking.findById(bookingId);
        if (!booking) return;

        // Notify user
        io.to(`user_${booking.userId}`).emit("booking_offer", {
          bookingId,
          price,
          message,
          status: "negotiating",
        });
      } catch (err) {
        console.error("artist_offer socket error:", err);
      }
    });

    // ── User sends counter offer ───────────────────────────────────────────
    socket.on("user_counter", async ({ artistId, bookingId, price, message }) => {
      // Notify artist
      io.to(`artist_${artistId}`).emit("user_counter", { bookingId, price, message });
    });

    // ── Artist agrees to user counter ────────────────────────────────────
    // Artist can also call this to agree on user's counter price from dashboard.
    socket.on("artist_accepts_counter", async ({ bookingId, price }) => {
      try {
        const booking = await Booking.findByIdAndUpdate(
          bookingId,
          {
            agreedPrice: price,
            status: "price_agreed",
            $push: { negotiation: { from: "artist", price, message: "Deal! Price agreed.", timestamp: new Date() } },
          },
          { new: true }
        );
        if (!booking) return;

        // Notify user
        io.to(`user_${booking.userId}`).emit("booking_offer", {
          bookingId,
          price,
          message: "Deal! Price agreed.",
          status:  "price_agreed",
        });
      } catch (err) {
        console.error("artist_accepts_counter error:", err);
      }
    });

    // ── User accepts artist's price ────────────────────────────────────────
    socket.on("price_accepted", ({ artistId, bookingId, price }) => {
      io.to(`artist_${artistId}`).emit("price_accepted", { bookingId, price });
    });

    // ── Booking fully confirmed (payment done) ─────────────────────────────
    socket.on("booking_confirmed", ({ artistId, bookingId, userName, eventType, eventDate }) => {
      io.to(`artist_${artistId}`).emit("booking_confirmed", {
        bookingId, userName, eventType, eventDate,
      });
    });

  });
};