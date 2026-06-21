// routes/couponRoutes.js
//
// Mount in server.js:
//   const couponRoutes = require("./routes/couponRoutes");
//   app.use("/api/coupons", couponRoutes);
//
// ASSUMPTION: Since I don't have your exact Coupon schema, this assumes fields:
//   { code, discountType: "flat" | "percent", discountValue, isActive,
//     expiryDate, usageLimit, usedCount, minOrderAmount }
// Rename the fields below to match your actual model — the validation
// logic/shape of the response is what UserPaymentPage.jsx expects.

const express = require("express");
const Coupon = require("../models/Coupon"); // adjust path/name if different

const router = express.Router();

// POST /api/coupons/apply
router.post("/apply", async (req, res) => {
  try {
    const { code, amount } = req.body;
    if (!code || !amount) {
      return res.status(400).json({ valid: false, message: "Missing code or amount." });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.json({ valid: false, message: "Coupon not found." });
    }
    if (coupon.isActive === false) {
      return res.json({ valid: false, message: "This coupon is no longer active." });
    }
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return res.json({ valid: false, message: "This coupon has expired." });
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.json({ valid: false, message: "This coupon has reached its usage limit." });
    }
    if (coupon.minOrderAmount && amount < coupon.minOrderAmount) {
      return res.json({
        valid: false,
        message: `This coupon requires a minimum of ₹${coupon.minOrderAmount.toLocaleString()}.`,
      });
    }

    let discountAmount = 0;
    if (coupon.discountType === "percent") {
      discountAmount = Math.round((amount * coupon.discountValue) / 100);
      if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    } else {
      discountAmount = coupon.discountValue;
    }
    discountAmount = Math.min(discountAmount, amount); // never discount below ₹0

    // Optional: track usage. Comment out if you only want to increment on actual payment confirm.
    coupon.usedCount = (coupon.usedCount || 0) + 1;
    await coupon.save();

    res.json({ valid: true, code: coupon.code, discountAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ valid: false, message: "Server error validating coupon." });
  }
});

module.exports = router;