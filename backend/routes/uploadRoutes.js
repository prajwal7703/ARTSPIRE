const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");

router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Cloudinary gives you the URL directly in req.file.path
    const imageUrl = req.file.path;

    res.json({ imageUrl });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Upload Failed" });
  }
});

module.exports = router;