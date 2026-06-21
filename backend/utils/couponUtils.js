// backend/utils/couponUtils.js
// Shared logic so the "preview" validation (coupon validate route) and the
// "real" application (when an order is actually created) always agree.

function evaluateCoupon(coupon, amount) {
  if (!coupon) {
    return { valid: false, message: "Invalid coupon code." };
  }
  if (!coupon.active) {
    return { valid: false, message: "This coupon is no longer active." };
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, message: "This coupon has expired." };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: "This coupon has reached its usage limit." };
  }
  if (amount < (coupon.minAmount || 0)) {
    return {
      valid: false,
      message: `This coupon needs a minimum booking amount of ₹${coupon.minAmount.toLocaleString()}.`,
    };
  }

  let discountAmount = 0;
  if (coupon.type === "flat") {
    discountAmount = coupon.value;
  } else if (coupon.type === "percent") {
    discountAmount = (amount * coupon.value) / 100;
    if (coupon.maxDiscount != null) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  }

  // Never let the discount wipe out the entire amount or go negative.
  discountAmount = Math.max(0, Math.min(discountAmount, amount - 1));
  discountAmount = Math.round(discountAmount);

  return {
    valid: true,
    discountAmount,
    finalAmount: amount - discountAmount,
    message: `Coupon applied — ₹${discountAmount.toLocaleString()} off.`,
  };
}

module.exports = { evaluateCoupon };