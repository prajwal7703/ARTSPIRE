// artspire-frontend/src/pages/Home.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FeedGrid } from "./Feed";
import BottomNav from "../BottomNav";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [strip, setStrip] = useState([]);

  // Small inspiration strip up top — first few live posts, tap one to jump into the feed.
  useEffect(() => {
    axios
      .get(`${API}/api/posts/feed`, { params: { page: 1, limit: 3 } })
      .then(({ data }) => setStrip(Array.isArray(data?.posts) ? data.posts : []))
      .catch(() => {});
  }, []);

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600&display=swap');
        .insp-title { font-family: 'Playfair Display', Georgia, serif; }
        .insp-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .insp-search:focus { outline: 2px solid #f97316; }
      `}</style>

      {/* ══ Cream header card ══ */}
      <div style={styles.headerCard}>
        <h1 className="insp-title" style={styles.headline}>Creative Inspiration</h1>

        <div style={styles.searchWrap}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            className="insp-search"
            style={styles.searchInput}
            placeholder="Search artistic works…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {strip.length > 0 && (
          <div className="insp-strip" style={{ marginTop: 16 }}>
            {strip.map((p) => (
              <button key={p._id} style={styles.stripTile} onClick={() => navigate("/feed")}>
                {p.mediaType === "video" ? (
                  <video src={p.mediaUrl} style={styles.stripMedia} muted />
                ) : (
                  <img src={p.mediaUrl} alt={p.caption || "inspiration"} style={styles.stripMedia} />
                )}
              </button>
            ))}
          </div>
        )}

        <button style={styles.matchBtn} onClick={() => navigate("/artists")}>
          Find Matches
        </button>
      </div>

      {/* ══ Live feed grid ══ */}
      <div style={styles.feedCol}>
        <FeedGrid searchQuery={query} emptyHint="New work from artists will show up here as soon as it's approved." />
      </div>

      <div style={{ height: 96 }} />
      <BottomNav />
    </div>
  );
}

const styles = {
  page: { fontFamily: "'Nunito','Inter',sans-serif", background: "#081120", minHeight: "100vh", color: "#fff" },
  headerCard: {
    background: "#F5F1E8",
    color: "#1a1a1a",
    padding: "28px 20px 22px",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headline: { margin: 0, fontSize: 30, fontStyle: "italic", fontWeight: 600, letterSpacing: 0.5, textAlign: "center" },
  searchWrap: {
    marginTop: 18,
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 999,
    padding: "12px 16px",
  },
  searchInput: { flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 15, color: "#1a1a1a" },
  stripTile: { border: "none", padding: 0, borderRadius: 14, overflow: "hidden", cursor: "pointer", aspectRatio: "1", background: "#e5e0d5" },
  stripMedia: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  matchBtn: {
    display: "block",
    margin: "18px auto 0",
    padding: "10px 26px",
    borderRadius: 999,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "transparent",
    color: "#1a1a1a",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    cursor: "pointer",
  },
  feedCol: { maxWidth: 1400, margin: "0 auto", padding: "20px 12px 0" },
};