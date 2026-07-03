// artspire-frontend/src/components/PostRequestModal.jsx
// Extracted from Home.jsx so it can be reused by SearchLanding.jsx too.
import { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

// Wraps the browser geolocation callback API in a promise so we can await it.
function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 8000 }
    );
  });
}

export default function PostRequestModal({ actor, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("idle"); // idle | locating | posting | done | error
  const [notifiedCount, setNotifiedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setPreview(f ? URL.createObjectURL(f) : "");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!actor) { setErrorMsg("Log in to post a request."); return; }
    if (!title.trim() || !description.trim()) { setErrorMsg("Title and description are required."); return; }
    setErrorMsg("");
    setStatus("locating");

    let coords = null;
    try {
      coords = await getLocation();
    } catch {
      // Location is optional — the backend falls back to city matching.
    }

    setStatus("posting");
    try {
      const form = new FormData();
      form.append("requesterId", actor.id);
      form.append("requesterName", actor.name || "Someone");
      form.append("requesterAvatar", actor.avatar || "");
      form.append("title", title.trim());
      form.append("description", description.trim());
      if (categories.trim()) form.append("categories", categories.trim());
      if (coords) { form.append("lat", coords.lat); form.append("lng", coords.lng); }
      if (file) form.append("media", file);

      const { data } = await axios.post(`${API}/api/requests`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setNotifiedCount(data?.notifiedArtists || 0);
      setStatus("done");
    } catch (err) {
      console.error("Post request failed:", err);
      setErrorMsg("Couldn't post your request, try again.");
      setStatus("error");
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <strong>Post Request</strong>
          <button style={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {status === "done" ? (
          <div style={styles.modalBody}>
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: 34 }}>✅</div>
              <div style={{ fontWeight: 800, marginTop: 8 }}>Request posted!</div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>
                {notifiedCount > 0
                  ? `${notifiedCount} nearby artist${notifiedCount === 1 ? "" : "s"} notified instantly.`
                  : "No artists matched nearby yet — your request stays open and visible."}
              </div>
              <button style={styles.pfSubmitBtn} onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form style={styles.modalBody} onSubmit={submit}>
            <label style={styles.formLabel}>What do you want made?</label>
            <input
              style={styles.formInput}
              placeholder="e.g. Custom watercolor portrait"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label style={styles.formLabel}>Describe it</label>
            <textarea
              style={{ ...styles.formInput, minHeight: 80, resize: "vertical" }}
              placeholder="Style, size, deadline, budget — anything artists should know"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <label style={styles.formLabel}>Categories (optional)</label>
            <input
              style={styles.formInput}
              placeholder="e.g. painting, portrait, watercolor"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
            />

            <label style={styles.formLabel}>Reference image (optional)</label>
            <input type="file" accept="image/*" onChange={handleFile} style={{ fontSize: 13 }} />
            {preview && <img src={preview} alt="preview" style={styles.formPreview} />}

            {errorMsg && <div style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{errorMsg}</div>}

            <button type="submit" style={styles.pfSubmitBtn} disabled={status === "locating" || status === "posting"}>
              {status === "locating" ? "Getting your location…" : status === "posting" ? "Posting…" : "Post Request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modalBox: { background: "#0f1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, width: "100%", maxWidth: 420, maxHeight: "82vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  modalClose: { background: "none", border: "none", color: "#94a3b8", fontSize: 16, cursor: "pointer" },
  modalBody: { overflowY: "auto", padding: "14px 16px 18px", display: "flex", flexDirection: "column" },

  formLabel: { fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginTop: 12, marginBottom: 6 },
  formInput: { border: "1px solid rgba(255,255,255,0.14)", outline: "none", borderRadius: 10, padding: "10px 12px", fontSize: 13.5, color: "#fff", background: "rgba(255,255,255,0.06)" },
  formPreview: { width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10, marginTop: 8 },

  pfSubmitBtn: { marginTop: 16, background: "#f97316", color: "#fff", border: "none", borderRadius: 999, padding: "11px 0", fontWeight: 800, fontSize: 14, cursor: "pointer" },
};