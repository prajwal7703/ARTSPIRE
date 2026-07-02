const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "artspire",
    // FIX: previously only allowed jpg/png/jpeg/webp. CreatePostModal.jsx
    // explicitly supports video posts (isVideo detection, <video> preview,
    // accept="image/*,video/*") and phone photos are very often heic/heif,
    // so any of those uploads were failing silently at Cloudinary with a
    // generic 500 that the frontend shows as "Upload failed."
    allowed_formats: [
      "jpg", "jpeg", "png", "webp", "gif", "heic", "heif",
      "mp4", "mov", "webm", "avi",
    ],
    resource_type: "auto", // required so Cloudinary handles video vs image correctly
  },
});

// FIX: previously no size limit was set, so a large file would fail with
// an opaque Cloudinary-side error instead of a clear, expected message.
// 50MB accommodates short video clips; tighten if you want images-only
// posts to have a stricter cap.
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

module.exports = upload;