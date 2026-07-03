// artspire-frontend/src/pages/Home.jsx
import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { getCurrentAccount, isArtist } from "../utils/auth";
import BottomNav from "../BottomNav";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

// Looping hero video — served from public/artbg.mp4, same as your old homepage.
const HERO_VIDEO_URL = "/artbg.mp4";

const getActor = () => {
  const account = getCurrentAccount();
  if (!account?._id) return null;
  return {
    id: account._id,
    name: account.name,
    avatar: account.avatar || account.image,
    role: isArtist() ? "artist" : "user",
  };
};

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

export default function Home() {
  const navigate = useNavigate();
  const actor = getActor();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState(null);

  const [showPostModal, setShowPostModal] = useState(false);
  const [showNearbyModal, setShowNearbyModal] = useState(false);

  // ── Live notifications: join a personal room so we get pushed events the
  // instant a nearby request appears (artists) or a response comes in
  // (requesters) — no polling needed.
  useEffect(() => {
    if (!actor?.id) return;
    socket.emit("join_room", actor.id);

    const onNewRequest = (request) => {
      setToast(`New request near you: "${request.title}"`);
    };
    const onNewResponse = ({ response }) => {
      setToast(`${response.artistName} responded to your request`);
    };
    socket.on("new_request", onNewRequest);
    socket.on("new_request_response", onNewResponse);
    return () => {
      socket.off("new_request", onNewRequest);
      socket.off("new_request_response", onNewResponse);
    };
  }, [actor?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Artists silently share a fresh location fix so they show up in nearby
  // matching. Browser still shows its own permission prompt; this just
  // triggers it and forwards the result to the backend.
  useEffect(() => {
    if (actor?.role !== "artist") return;
    getLocation()
      .then(({ lat, lng }) => {
        axios.put(`${API}/api/artists/${actor.id}/location`, { lat, lng }).catch(() => {});
      })
      .catch(() => {});
  }, [actor?.id, actor?.role]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/artists?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div style={styles.page}>
      <GlobalStyles />

      {toast && (
        <div style={styles.toast} onClick={() => setToast(null)}>
          🔔 {toast}
        </div>
      )}

      {/* ══ Full-viewport hero: video background, everything overlaid on it ══ */}
      <div style={styles.hero}>
        <video style={styles.heroMedia} src={HERO_VIDEO_URL} autoPlay loop muted playsInline />
        <div style={styles.heroOverlay} />

        {/* Top bar, overlaid transparently on the video */}
        <div style={styles.topBar}>
          <div style={styles.brand}>
            <span style={styles.brandMark}>A</span>
            <span style={styles.brandName}>ArtSpire</span>
          </div>
          <button style={styles.searchIconBtn} onClick={() => setSearchOpen((v) => !v)} aria-label="Search">
            <SearchIcon size={18} stroke="#fff" />
          </button>
        </div>

        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Discover
            <br />
            <span style={{ color: "#f97316" }}>Creative Artists</span>
            <br />
            Near You
          </h1>
          <div style={styles.heroBtnRow}>
            <button style={styles.heroBtn} onClick={() => navigate("/artists")}>Explore Artists</button>
            <button style={styles.heroBtn} onClick={() => navigate("/artist-register")}>Join As Artist</button>
          </div>

          {/* ══ Post & Find panel, overlaid on the same background ══ */}
          <div style={styles.pfPanel}>
            <div style={styles.pfHeader}>Post &amp; Find</div>

            <button style={styles.pfRow} onClick={() => setShowPostModal(true)}>
              <div style={styles.pfIcon}><PostIcon /></div>
              <div style={{ minWidth: 0 }}>
                <div style={styles.pfRowTitle}>Post Request</div>
                <div style={styles.pfRowDesc}>Share your creative vision — post a detailed request and nearby artists respond.</div>
              </div>
            </button>

            <button style={styles.pfRow} onClick={() => setShowNearbyModal(true)}>
              <div style={styles.pfIcon}><CompassIcon /></div>
              <div style={{ minWidth: 0 }}>
                <div style={styles.pfRowTitle}>Find Nearby Artists</div>
                <div style={styles.pfRowDesc}>Locate nearby talent — view profiles of artists active in your area right now.</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ══ Fixed search bar, sits above the bottom nav ══ */}
      <form style={styles.searchDock} onSubmit={handleSearchSubmit}>
        <SearchIcon size={16} stroke="#6b7280" />
        <input
          style={styles.searchDockInput}
          placeholder="Search for artwork, artists, or a request…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" style={styles.searchDockAction} onClick={() => setShowPostModal(true)} aria-label="Post a request">
          <PlusIcon />
        </button>
      </form>

      <div style={{ height: 76 }} />
      <BottomNav />

      {showPostModal && (
        <PostRequestModal actor={actor} onClose={() => setShowPostModal(false)} />
      )}
      {showNearbyModal && (
        <NearbyArtistsModal onClose={() => setShowNearbyModal(false)} />
      )}
    </div>
  );
}

/* ── Post Request modal: "post what I want", notifies nearby artists ────── */
function PostRequestModal({ actor, onClose }) {
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

/* ── Find Nearby Artists modal ───────────────────────────────────────────── */
function NearbyArtistsModal({ onClose }) {
  const [status, setStatus] = useState("locating"); // locating | loading | done | error
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    (async () => {
      let coords = null;
      try {
        coords = await getLocation();
      } catch {
        // Fall through — we'll still try the endpoint with no coords.
      }
      setStatus("loading");
      try {
        const params = coords ? { lat: coords.lat, lng: coords.lng } : {};
        const { data } = await axios.get(`${API}/api/artists/nearby`, { params });
        setArtists(Array.isArray(data) ? data : []);
        setStatus("done");
      } catch (err) {
        console.error("Nearby artists fetch failed:", err);
        setStatus("error");
      }
    })();
  }, []);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <strong>Artists Near You</strong>
          <button style={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div style={styles.modalBody}>
          {status === "locating" && <div style={styles.centerNote}>Getting your location…</div>}
          {status === "loading" && <div style={styles.centerNote}>Finding artists nearby…</div>}
          {status === "error" && <div style={styles.centerNote}>Couldn't load nearby artists.</div>}
          {status === "done" && artists.length === 0 && (
            <div style={styles.centerNote}>No artists found nearby yet.</div>
          )}
          {status === "done" && artists.map((a) => (
            <Link key={a._id} to={`/dashboard/${a._id}`} style={styles.nearbyRow} onClick={onClose}>
              {a.profileImage || a.image ? (
                <img src={a.profileImage || a.image} alt="" style={styles.nearbyAvatar} />
              ) : (
                <div style={styles.nearbyAvatarFallback}>{a.name?.[0]?.toUpperCase() || "?"}</div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{a.city || "Location shared"}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── icons ────────────────────────────────────────────────────────────── */
function SearchIcon({ size = 18, stroke = "#1a1a1a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function PostIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
function CompassIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="m14.5 9.5-2 5-5 2 2-5z" />
    </svg>
  );
}

/* ── global CSS ───────────────────────────────────────────────────────── */
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600&display=swap');
    `}</style>
  );
}

const styles = {
  page: { fontFamily: "'Nunito','Inter',sans-serif", background: "#081120", minHeight: "100vh", color: "#fff" },

  toast: {
    position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 200,
    background: "#111827", color: "#fff", padding: "10px 18px", borderRadius: 999,
    fontSize: 13, fontWeight: 700, boxShadow: "0 6px 20px rgba(0,0,0,0.4)", cursor: "pointer",
    maxWidth: "88vw", textAlign: "center",
  },

  hero: { position: "relative", minHeight: "100vh", overflow: "hidden", display: "flex", flexDirection: "column" },
  heroMedia: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  heroOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.75))" },

  topBar: { position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 0" },
  brand: { display: "flex", alignItems: "center", gap: 8 },
  brandMark: { width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#f97316,#ec4899)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 },
  brandName: { fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontWeight: 700, fontSize: 19, color: "#fff" },
  searchIconBtn: { background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 34, height: 34, cursor: "pointer" },

  heroContent: { position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 18px 100px" },
  heroTitle: { margin: 0, fontSize: 34, fontWeight: 900, lineHeight: 1.15, color: "#fff" },
  heroBtnRow: { display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" },
  heroBtn: { background: "#f97316", color: "#fff", border: "none", borderRadius: 999, padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer" },

  pfPanel: { marginTop: 28, background: "rgba(15,20,35,0.72)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 18, padding: 16, maxWidth: 440 },
  pfHeader: { fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontWeight: 700, fontSize: 18, marginBottom: 10 },
  pfRow: { display: "flex", alignItems: "flex-start", gap: 12, width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, marginBottom: 8, cursor: "pointer", textAlign: "left" },
  pfIcon: { width: 34, height: 34, borderRadius: 10, background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  pfRowTitle: { fontWeight: 800, fontSize: 14, color: "#fff" },
  pfRowDesc: { fontSize: 12, color: "#cbd5e1", marginTop: 2, lineHeight: 1.4 },

  searchDock: {
    position: "fixed", bottom: 64, left: 0, right: 0, zIndex: 40,
    display: "flex", alignItems: "center", gap: 8, background: "#0f1a2e",
    borderTop: "1px solid rgba(255,255,255,0.08)", padding: "10px 14px",
  },
  searchDockInput: { flex: 1, border: "1px solid rgba(255,255,255,0.12)", outline: "none", borderRadius: 999, padding: "9px 14px", fontSize: 13.5, color: "#fff", background: "rgba(255,255,255,0.06)" },
  searchDockAction: { width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#f97316,#ec4899)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modalBox: { background: "#0f1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, width: "100%", maxWidth: 420, maxHeight: "82vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  modalClose: { background: "none", border: "none", color: "#94a3b8", fontSize: 16, cursor: "pointer" },
  modalBody: { overflowY: "auto", padding: "14px 16px 18px", display: "flex", flexDirection: "column" },

  formLabel: { fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginTop: 12, marginBottom: 6 },
  formInput: { border: "1px solid rgba(255,255,255,0.14)", outline: "none", borderRadius: 10, padding: "10px 12px", fontSize: 13.5, color: "#fff", background: "rgba(255,255,255,0.06)" },
  formPreview: { width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 10, marginTop: 8 },

  pfSubmitBtn: { marginTop: 16, background: "#f97316", color: "#fff", border: "none", borderRadius: 999, padding: "11px 0", fontWeight: 800, fontSize: 14, cursor: "pointer" },

  centerNote: { textAlign: "center", color: "#94a3b8", padding: "30px 10px", fontSize: 13.5 },
  nearbyRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 4px", textDecoration: "none", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  nearbyAvatar: { width: 38, height: 38, borderRadius: "50%", objectFit: "cover" },
  nearbyAvatarFallback: { width: 38, height: 38, borderRadius: "50%", background: "#f97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 },
};