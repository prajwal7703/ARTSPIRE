const express    = require("express");
const router     = express.Router();
const Withdrawal = require("../models/Withdrawal");
const Booking    = require("../models/Booking");

// ── Earnings summary for an artist ──────────────────────────────────────────
// GET /api/withdrawals/summary/:artistId
router.get("/summary/:artistId", async (req, res) => {
  try {
    const bookings = await Booking.find({
      artistId:      req.params.artistId,
      paymentStatus: "paid",
    });
    // Artist earns their commission-adjusted share, not the full amount paid
    const totalEarned = bookings.reduce((sum, b) => sum + (b.artistAmount ?? b.amount ?? 0), 0);

    const withdrawals = await Withdrawal.find({ artistId: req.params.artistId }).sort({ createdAt: -1 });
    const totalWithdrawn = withdrawals
      .filter(w => w.status !== "rejected")
      .reduce((sum, w) => sum + w.amount, 0);

    res.json({
      totalEarned,
      totalWithdrawn,
      available:   totalEarned - totalWithdrawn,
      withdrawals,
    });
  } catch (err) {
    console.error("Withdrawal summary error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Request a withdrawal ─────────────────────────────────────────────────────
// POST /api/withdrawals/request
router.post("/request", async (req, res) => {
  try {
    const { artistId, amount, bankDetails } = req.body;
    if (!artistId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid withdrawal request" });
    }

    const bookings = await Booking.find({ artistId, paymentStatus: "paid" });
    const totalEarned = bookings.reduce((sum, b) => sum + (b.artistAmount ?? b.amount ?? 0), 0);

    const existing = await Withdrawal.find({ artistId });
    const totalWithdrawn = existing
      .filter(w => w.status !== "rejected")
      .reduce((sum, w) => sum + w.amount, 0);

    const available = totalEarned - totalWithdrawn;
    if (amount > available) {
      return res.status(400).json({ message: "Amount exceeds available balance" });
    }

    const withdrawal = new Withdrawal({ artistId, amount, bankDetails, status: "pending" });
    await withdrawal.save();

    // Notify admin of new withdrawal request
    try {
      const Notification = require("../models/Notification");
      await Notification.create({
        toArtist: "admin",
        fromName: req.body.artistName || "An artist",
        type: "withdrawal_request",
        message: `${req.body.artistName || "An artist"} requested a withdrawal of ₹${amount}.`,
        read: false,
      });
      const io = req.app.get("io");
      if (io) io.emit("admin_withdrawal_request", { artistId, amount });
    } catch {}

    res.json({ success: true, withdrawal });
  } catch (err) {
    console.error("Withdrawal request error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Get all withdrawals for an artist ───────────────────────────────────────
// GET /api/withdrawals/:artistId
router.get("/:artistId", async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ artistId: req.params.artistId }).sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (err) {
    console.error("Get withdrawals error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── ADMIN: mark a withdrawal paid/rejected ───────────────────────────────────
// PUT /api/withdrawals/:id/status   (header: x-admin-password)
router.put("/:id/status", async (req, res) => {
  if (req.headers["x-admin-password"] !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const { status } = req.body; // "paid" | "rejected"
    const w = await Withdrawal.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, withdrawal: w });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;