const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema(
  {
    artistId: { type: String, required: true },
    amount:   { type: Number, required: true },
    status:   { type: String, enum: ["requested", "processing", "paid", "rejected"], default: "requested" },
    note:     { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Withdrawal", withdrawalSchema);