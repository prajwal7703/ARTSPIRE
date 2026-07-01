// artspire-frontend/src/components/CreatePostModal.jsx
// Used from Feed.jsx, and can also be triggered from ArtistDashboard.jsx
// ("Post your work" button) — just import and render the same way.

import { useState } from "react";
import axios from "axios";

export default function CreatePostModal({ actor, onClose, onCreated, apiBase }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const isVideo = file?.type?.startsWith("video");

  const submit = async () => {
    if (!file) { setErr("Choose a photo or video first."); return; }
    setUploading(true);
    setErr("");
    try {
      const form = new FormData();
      form.append("media", file);
      form.append("artistId", actor.id);
      form.append("artistName", actor.name);
      form.append("artistAvatar", actor.avatar || "");
      form.append("caption", caption);

      const { data } = await axios.post(`${apiBase}/api/post`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onCreated(data);
    } catch (e) {
      console.error(e);
      setErr("Upload failed. Try a smaller file or check your connection.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.head}>
          <strong>New post</strong>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={styles.body}>
          <label style={styles.dropZone}>
            {previewUrl ? (
              isVideo
                ? <video src={previewUrl} style={styles.preview} muted autoPlay loop />
                : <img src={previewUrl} style={styles.preview} alt="preview" />
            ) : (
              <span style={{ color: "#94a3b8", fontSize: 13 }}>Click to choose a photo or video</span>
            )}
            <input type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: "none" }} />
          </label>

          <textarea
            style={styles.textarea}
            rows={3}
            placeholder="Write a caption…"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          {err && <div style={styles.error}>{err}</div>}

          <button style={styles.shareBtn} onClick={submit} disabled={uploading}>
            {uploading ? "Uploading…" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(15,23,42,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100 },
  modal:    { background: "#fff", borderRadius: 14, width: "100%", maxWidth: 420, fontFamily: "'Nunito','Inter',sans-serif" },
  head:     { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #e2e8f0" },
  closeBtn: { border: "none", background: "none", fontSize: 16, cursor: "pointer", color: "#64748b" },
  body:     { padding: 16, display: "flex", flexDirection: "column", gap: 12 },
  dropZone: { display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "4/5", background: "#f1f5f9", borderRadius: 10, cursor: "pointer", overflow: "hidden" },
  preview:  { width: "100%", height: "100%", objectFit: "cover" },
  textarea: { border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 13.5, fontFamily: "inherit", resize: "vertical", outline: "none" },
  error:    { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 10px", fontSize: 13 },
  shareBtn: { padding: "10px 0", borderRadius: 10, border: "none", background: "#1e3a8a", color: "#fff", fontWeight: 700, cursor: "pointer" },
};
