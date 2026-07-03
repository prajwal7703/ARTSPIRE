// artspire-frontend/src/pages/SearchLanding.jsx
// The page the search icon on Home now opens. Matches the "hero + Post & Find"
// mockup: big video hero, Explore/Join buttons, two info cards (Post Request /
// Find Nearby Artists), a search dock, and the bottom nav.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentAccount, isArtist } from "../utils/auth";
import BottomNav from "../BottomNav";
import PostRequestModal from "../components/PostRequestModal";

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

export default function SearchLanding() {
  const navigate = useNavigate();
  const actor = getActor();

  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    // Reuses Home's live feed filter — search results land back on the feed.
    navigate(q ? `/?q=${encodeURIComponent(q)}` : "/");
  };

  const handleFindNearby = () => {
    if (!navigator.geolocation) {
      navigate("/artists");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        navigate(`/artists?lat=${latitude}&lng=${longitude}&near=true`);
      },
      () => {
        setLocating(false);
        navigate("/artists");
      },
      { timeout: 6000 }
    );
  };

  return (
    <div style={styles.page}>
      <GlobalStyles />

      {/* ══ Hero banner with search icon top-right ══ */}
      <div style={styles.hero}>
        <video style={styles.heroMedia} src={HERO_VIDEO_URL} autoPlay loop muted playsInline />
        <div style={styles.heroOverlay} />

        <div style={styles.topBar}>
          <div style={styles.brand}>
            <span style={styles.brandMark}>A</span>
            <span style={styles.brandName}>ArtSpire</span>
          </div>
          <button style={styles.searchIconBtn} onClick={() => navigate(-1)} aria-label="Back">
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
            <button style={styles.heroBtn} onClick={() => navigate("/artists")}>
              Explore Artists
            </button>
            <button style={{ ...styles.heroBtn, ...styles.heroBtnGhost }} onClick={() => navigate("/artist-register")}>
              Join As Artist
            </button>
          </div>

          {/* ══ Post & Find ══ */}
          <div style={styles.pfCard}>
            <div style={styles.pfTitle}>Post &amp; Find</div>

            <button style={styles.pfRow} onClick={() => setShowPostModal(true)}>
              <span style={styles.pfIcon}>✏️</span>
              <span style={styles.pfRowText}>
                <span style={styles.pfRowTitle}>Post Request</span>
                <span style={styles.pfRowDesc}>
                  Share your creative vision — post a detailed request and nearby artists respond.
                </span>
              </span>
            </button>

            <button style={styles.pfRow} onClick={handleFindNearby} disabled={locating}>
              <span style={styles.pfIcon}>🧭</span>
              <span style={styles.pfRowText}>
                <span style={styles.pfRowTitle}>{locating ? "Locating…" : "Find Nearby Artists"}</span>
                <span style={styles.pfRowDesc}>
                  Locate nearby talent — view profiles of artists active in your area right now.
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ══ Fixed search-and-post bar, sits above the bottom nav ══ */}
      <form style={styles.searchDock} onSubmit={submitSearch}>
        <SearchIcon size={16} stroke="#6b7280" />
        <input
          autoFocus
          style={styles.searchDockInput}
          placeholder="Search for artwork, artists, or a request…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" style={styles.searchDockAction} onClick={() => setShowPostModal(true)} aria-label="Post a request">
          <PlusIcon />
        </button>
      </form>

      <div style={{ height: 96 }} />
      <BottomNav />

      {showPostModal && (
        <PostRequestModal actor={actor} onClose={() => setShowPostModal(false)} />
      )}
    </div>
  );
}

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

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600&display=swap');
    `}</style>
  );
}

const styles = {
  page: { fontFamily: "'Nunito','Inter',sans-serif", background: "#081120", minHeight: "100vh", color: "#fff" },

  hero: {
    position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column",
  },
  heroMedia: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  heroOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(8,17,32,0.35), rgba(8,17,32,0.55) 45%, rgba(8,17,32,0.92))" },

  topBar: {
    position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 18px 0",
  },
  brand: { display: "flex", alignItems: "center", gap: 8 },
  brandMark: {
    width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#f97316,#ec4899)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14,
  },
  brandName: { fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontWeight: 700, fontSize: 19, color: "#fff" },
  searchIconBtn: { background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },

  heroContent: { position: "relative", padding: "40px 18px 24px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" },
  heroTitle: { margin: 0, fontSize: 30, fontWeight: 900, lineHeight: 1.15, color: "#fff" },
  heroBtnRow: { display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" },
  heroBtn: { background: "#f97316", color: "#fff", border: "none", borderRadius: 999, padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer" },
  heroBtnGhost: { background: "#1a2233", color: "#fff" },

  pfCard: {
    marginTop: 28, background: "rgba(15,26,46,0.7)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 18, padding: "16px 16px 8px", backdropFilter: "blur(6px)",
  },
  pfTitle: { fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontSize: 17, fontWeight: 700, marginBottom: 10 },
  pfRow: {
    display: "flex", alignItems: "flex-start", gap: 12, width: "100%", textAlign: "left",
    background: "rgba(255,255,255,0.04)", border: "none", borderRadius: 12, padding: "12px 10px",
    marginBottom: 8, cursor: "pointer",
  },
  pfIcon: {
    width: 34, height: 34, borderRadius: 10, background: "rgba(249,115,22,0.15)",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
  },
  pfRowText: { display: "flex", flexDirection: "column", gap: 3 },
  pfRowTitle: { fontWeight: 800, fontSize: 14, color: "#fff" },
  pfRowDesc: { fontSize: 12, color: "#94a3b8", lineHeight: 1.4 },

  searchDock: {
    position: "fixed", bottom: 64, left: 0, right: 0, zIndex: 40,
    display: "flex", alignItems: "center", gap: 8, background: "#0f1a2e",
    borderTop: "1px solid rgba(255,255,255,0.08)", padding: "10px 14px",
  },
  searchDockInput: { flex: 1, border: "1px solid rgba(255,255,255,0.12)", outline: "none", borderRadius: 999, padding: "9px 14px", fontSize: 13.5, color: "#fff", background: "rgba(255,255,255,0.06)" },
  searchDockAction: { width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#f97316,#ec4899)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
};