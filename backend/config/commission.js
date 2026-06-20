// Edit these percentages anytime — no other backend file needs to change.
const COMMISSION_RATES = {
  Singer:       15,
  Dancer:       12,
  Musician:     10,
  Painter:       8,
  Photographer: 10,
  Actor:        15,
  Comedian:     12,
  default:      12,
};

function getCommissionRate(category) {
  return COMMISSION_RATES[category] ?? COMMISSION_RATES.default;
}

function splitAmount(totalAmount, category) {
  const rate = getCommissionRate(category);
  const commissionAmount = Math.round((totalAmount * rate) / 100);
  const artistAmount = totalAmount - commissionAmount;
  return { rate, commissionAmount, artistAmount };
}

module.exports = { COMMISSION_RATES, getCommissionRate, splitAmount };