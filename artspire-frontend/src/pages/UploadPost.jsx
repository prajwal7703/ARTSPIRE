import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";

export default function UploadPost() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState(null);

  const artistRaw = localStorage.getItem("artist");
  let artist = null;
  try { artist = artistRaw ? JSON.parse(artistRaw) : null; } catch { artist = null; }
  const artistId = artist?._id || artist?.id;

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!title.trim()) { setNotif({ type: "error", message: "Please enter a title." }); return; }
    if (!file) { setNotif({ type: "error", message: "Please select a file." }); return; }
    if (!artistId) { setNotif({ type: "error", message: "You must be logged in as an artist." }); return; }

    setLoading(true);
    setNotif({ type: "loading", message: "Uploading your artwork..." });

    const formData = new FormData();
    formData.append("artistId", artistId);
    formData.append("title", title);
    formData.append("media", file);
    formData.append("type", file.type.startsWith("video") ? "video" : "image");

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/posts/create`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setNotif({ type: "success", message: "Artwork uploaded successfully! 🎨" });
      setTimeout(() => navigate("/artist-dashboard"), 1500);
    } catch (err) {
      console.log(err);
      setNotif({ type: "error", message: err.response?.data?.message || "Upload failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "white" }}>
      <Navbar />

      {/* Notification */}
      {notif && (
        <div style={{
          position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, minWidth: "300px", maxWidth: "480px",
          background: notif.type === "error" ? "#fee2e2" : notif.type === "success" ? "#dcfce7" : "#dbeafe",
          color: notif.type === "error" ? "#7f1d1d" : notif.type === "success" ? "#14532d" : "#1e3a5f",
          border: `1px solid ${notif.type === "error" ? "#fca5a5" : notif.type === "success" ? "#86efac" : "#93c5fd"}`,
          borderRadius: "14px", padding: "14px 20px",
          display: "flex", alignItems: "center", gap: "10px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          fontFamily: "sans-serif", fontSize: "14px", fontWeight: 600,
        }}>
          <span>{notif.type === "error" ? "❌" : notif.type === "success" ? "✅" : "⏳"}</span>
          <span style={{ flex: 1 }}>{notif.message}</span>
          {notif.type !== "loading" && (
            <button onClick={() => setNotif(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", opacity: 0.6 }}>✕</button>
          )}
        </div>
      )}

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "60px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: "36px" }}>
          <h1 style={{ fontFamily: "sans-serif", fontSize: "32px", fontWeight: 900, margin: 0 }}>
            Upload Artwork
          </h1>
          <p style={{ color: "#64748b", marginTop: "8px", fontSize: "15px" }}>
            Share your latest creation with the world
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "#0f172a", borderRadius: "24px", padding: "32px", border: "1px solid #1e293b" }}>

          {/* Title */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>
              Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Sunrise Over the Hills"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: "12px",
                border: "1.5px solid #1e293b", background: "#020617",
                color: "#fff", fontSize: "15px", fontFamily: "sans-serif",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* File upload */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 800, color: "#64748b", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>
              File (Image or Video) *
            </label>
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              border: "2px dashed #1e293b", borderRadius: "16px", padding: "32px",
              cursor: "pointer", background: "#020617", transition: "border-color 0.2s",
            }}>
              <input type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: "none" }} />
              {preview ? (
                file?.type.startsWith("video") ? (
                  <video src={preview} style={{ maxWidth: "100%", maxHeight: "240px", borderRadius: "10px" }} controls />
                ) : (
                  <img src={preview} alt="preview" style={{ maxWidth: "100%", maxHeight: "240px", borderRadius: "10px", objectFit: "cover" }} />
                )
              ) : (
                <>
                  <div style={{ fontSize: "40px", marginBottom: "10px" }}>🖼</div>
                  <div style={{ color: "#64748b", fontSize: "14px", fontWeight: 600 }}>Click to choose image or video</div>
                </>
              )}
            </label>
            {file && (
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>
                Selected: {file.name}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => navigate("/artist-dashboard")}
              style={{ flex: 1, padding: "14px", borderRadius: "50px", border: "1.5px solid #1e293b", background: "transparent", color: "#94a3b8", fontSize: "14px", fontWeight: 800, cursor: "pointer", fontFamily: "sans-serif" }}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={loading}
              style={{ flex: 2, padding: "14px", borderRadius: "50px", border: "none", background: loading ? "#3730a3" : "linear-gradient(90deg,#4f46e5,#7c3aed)", color: "#fff", fontSize: "15px", fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", fontFamily: "sans-serif" }}
            >
              {loading ? "Uploading..." : "🎨 Upload Artwork"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
