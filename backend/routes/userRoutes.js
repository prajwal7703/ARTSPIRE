const User   = require("../models/User");
const Artist = require("../models/Artist");

// existing User-only routes stay as-is...

// ── New: everyone, for chat / live users / messages tabs ──
router.get("/all-people", async (req, res) => {
  try {
    const [users, artists] = await Promise.all([
      User.find().select("-password"),
      Artist.find().select("-password"),
    ]);
    const merged = [
      ...users.map(u => ({ ...u.toObject(), role: u.role || "client" })),
      ...artists.map(a => ({ ...a.toObject(), role: "artist" })),
    ];
    res.json(merged);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;