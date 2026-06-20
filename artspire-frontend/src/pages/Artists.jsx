import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Navbar";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const CATEGORY_COLORS = {
  Singer:       { pill:"#fce4ec", text:"#c2185b", border:"#f48fb1", bg:"#fff5f7" },
  Dancer:       { pill:"#ede7f6", text:"#6a1b9a", border:"#ce93d8", bg:"#faf5ff" },
  Musician:     { pill:"#e3f2fd", text:"#0d47a1", border:"#90caf9", bg:"#f5f9ff" },
  Painter:      { pill:"#fff3e0", text:"#e65100", border:"#ffcc80", bg:"#fffaf5" },
  Photographer: { pill:"#e8f5e9", text:"#1b5e20", border:"#a5d6a7", bg:"#f5fff7" },
  Actor:        { pill:"#fffde7", text:"#f57f17", border:"#fff176", bg:"#fffff5" },
  Comedian:     { pill:"#e0f7fa", text:"#006064", border:"#80deea", bg:"#f5feff" },
  default:      { pill:"#ede7f6", text:"#4a148c", border:"#ce93d8", bg:"#faf5ff" },
};

const ICONS = {
  Singer:"🎤", Dancer:"💃", Musician:"🎵", Painter:"🎨",
  Photographer:"📸", Actor:"🎭", Comedian:"😂", default:"✨",
};

const CATEGORIES = ["All","Singer","Dancer","Musician","Painter","Photographer","Actor","Comedian"];

function getId(artist) {
  if (!artist) return undefined;
  const raw = artist._id;
  if (!raw) return undefined;
  if (typeof raw === "object" && raw.$oid) return raw.$oid;
  return String(raw);
}

function SkeletonCard() {
  return (
    <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #e8eaf6", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", animation: "shimmer 1.4s infinite" }}>
      <div style={{ width: "100%", aspectRatio: "1/1", background: "#f0f2ff" }} />
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ height: 12, width: "65%", borderRadius: 6, background: "#e8eaf6" }} />
        <div style={{ height: 10, width: "45%", borderRadius: 6, background: "#f0f2ff" }} />
        <div style={{ height: 8, width: "80%", borderRadius: 6, background: "#e8eaf6", marginTop: 4 }} />
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <div style={{ height: 20, width: 50, borderRadius: 10, background: "#f0f2ff" }} />
          <div style={{ height: 20, width: 40, borderRadius: 10, background: "#e8eaf6" }} />
        </div>
      </div>
    </div>
  );
}

function ArtistCard({ artist }) {
  const [hov, setHov] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const t  = CATEGORY_COLORS[artist.category] || CATEGORY_COLORS.default;
  const id = getId(artist);
  if (!id) return null;
  const stars = Math.round(artist.rating || 5);
  const initials = artist.name ? artist.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "A";

  return (
    <Link to={`/artist/${id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: "#fff",
          borderRadius: 16,
          overflow: "hidden",
          border: hov ? `1.5px solid ${t.border}` : "1.5px solid #e8eaf6",
          boxShadow: hov ? `0 8px 32px rgba(0,0,0,0.12)` : "0 2px 8px rgba(0,0,0,0.05)",
          transform: hov ? "translateY(-4px)" : "translateY(0)",
          transition: "all 0.22s ease",
          cursor: "pointer",
        }}
      >
        {/* Photo */}
        <div style={{ width: "100%", aspectRatio: "1/1", overflow: "hidden", background: t.bg, position: "relative" }}>
          {artist.profileImage && !imgErr ? (
            <img
              src={artist.profileImage}
              alt={artist.name}
              onError={() => setImgErr(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s", transform: hov ? "scale(1.05)" : "scale(1)" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(28px,6vw,44px)", color: t.text }}>
              {ICONS[artist.category] || ICONS.default}
            </div>
          )}
          {/* Category badge */}
          <div style={{
            position: "absolute", top: 8, left: 8,
            background: t.pill, color: t.text,
            fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20,
            fontFamily: "'Nunito',sans-serif",
          }}>
            {ICONS[artist.category] || "✨"} {artist.category || "Artist"}
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: "12px 14px 14px" }}>
          <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: "clamp(13px,2.5vw,15px)", color: "#1a1a2e", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {artist.name}
          </div>

          {artist.city && (
            <div style={{ fontFamily: "'Nunito',sans-serif", fontSize: 11, color: "#9e9e9e", fontWeight: 700, marginBottom: 8 }}>
              📍 {artist.city}
            </div>
          )}

          {/* Stars */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 1 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ fontSize: 11, color: i < stars ? "#f59e0b" : "#e0e0e0" }}>★</span>
              ))}
            </div>
            <span style={{ fontSize: 10, color: "#bdbdbd", fontFamily: "'Nunito',sans-serif", fontWeight: 700 }}>
              {(artist.rating || 5).toFixed(1)}
            </span>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {artist.postCount > 0 && (
              <span style={{ background: "#e8f5e9", color: "#2e7d32", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 8, fontFamily: "'Nunito',sans-serif" }}>
                🎨 {artist.postCount} works
              </span>
            )}
            {artist.price && (
              <span style={{ background: "#fce4ec", color: "#c2185b", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 8, fontFamily: "'Nunito',sans-serif" }}>
                ₹{Number(artist.price).toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Artists() {
  const navigate = useNavigate();
  const [artists,        setArtists]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(false);
  const [search,         setSearch]         = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const [artRes, postRes] = await Promise.all([
          axios.get(`${API}/api/artists/only-artists`),
          axios.get(`${API}/api/posts`),
        ]);
        const artData  = Array.isArray(artRes.data)  ? artRes.data  : [];
        const postData = Array.isArray(postRes.data) ? postRes.data : [];
        const enriched = artData
          .map(a => {
            const id = getId(a);
            return {
              ...a, _id: id,
              postCount:    postData.filter(p => p.artistId === id).length,
              profileImage: a.profileImage || postData.find(p => p.artistId === id && p.type === "image")?.media || null,
            };
          })
          .filter(a => a._id)
          .sort((a, b) => b.postCount - a.postCount);
        setArtists(enriched);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = artists.filter(a => {
    const matchCat    = activeCategory === "All" || a.category === activeCategory;
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.city?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2ff", color: "#1a1a2e", fontFamily: "'Nunito',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes shimmer { 0%{opacity:.5} 50%{opacity:.9} 100%{opacity:.5} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .search-input::placeholder { color: #bdbdbd; }
        .search-input:focus { outline: none; border-color: #9fa8da !important; box-shadow: 0 0 0 3px rgba(61,90,254,0.08); }
        .cat-pill:hover { transform: translateY(-1px); box-shadow: 0 3px 12px rgba(0,0,0,0.1); }
        .artist-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }
        @media(min-width:480px)  { .artist-grid { grid-template-columns: repeat(3,1fr) !important; gap: 14px !important; } }
        @media(min-width:720px)  { .artist-grid { grid-template-columns: repeat(4,1fr) !important; gap: 16px !important; } }
        @media(min-width:1024px) { .artist-grid { grid-template-columns: repeat(5,1fr) !important; } }
        @media(min-width:1280px) { .artist-grid { grid-template-columns: repeat(6,1fr) !important; } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #c5cae9; border-radius: 4px; }
      `}</style>

      <div style={{ position: "relative", zIndex: 100 }}><Navbar /></div>

      <div style={{ paddingBottom: 100 }}>
        {/* HEADER */}
        <div style={{ textAlign: "center", padding: "80px 20px 24px", animation: "fadeUp 0.4s ease" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#bdbdbd", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito',sans-serif", marginBottom: 14, letterSpacing: 2 }}>
            ← HOME
          </button>
          <div style={{ fontSize: 11, fontWeight: 900, color: "#bdbdbd", letterSpacing: 6, textTransform: "uppercase", marginBottom: 8 }}>
            DISCOVER TALENT
          </div>
          <h1 style={{ fontWeight: 900, fontSize: "clamp(26px,6vw,46px)", margin: "0 0 8px", letterSpacing: -1, color: "#1a1a2e" }}>
            Find Artists
          </h1>
          <p style={{ color: "#9e9e9e", fontSize: 13, fontWeight: 700, margin: 0 }}>
            {loading ? "Loading artists..." : error ? "Failed to load." : `${filtered.length} artist${filtered.length !== 1 ? "s" : ""} found`}
          </p>
        </div>

        {/* SEARCH + FILTERS */}
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 16px 24px", animation: "fadeUp 0.4s ease 0.06s both" }}>
          {/* Search */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}>🔍</span>
            <input
              className="search-input"
              placeholder="Search by name or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "12px 40px 12px 42px",
                borderRadius: 12, border: "1.5px solid #e8eaf6",
                background: "#fff", color: "#1a1a2e",
                fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700,
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "#f0f2ff", border: "none", color: "#9e9e9e", cursor: "pointer", fontSize: 13, width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            )}
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {CATEGORIES.map(cat => {
              const t = CATEGORY_COLORS[cat] || CATEGORY_COLORS.default;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  className="cat-pill"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: "6px 14px", borderRadius: 20,
                    border: isActive ? `1.5px solid ${t.border || "#c5cae9"}` : "1.5px solid #e8eaf6",
                    background: isActive ? t.pill : "#fff",
                    color: isActive ? t.text : "#9e9e9e",
                    fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 11,
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                    transition: "all 0.18s ease",
                    boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {cat !== "All" ? `${ICONS[cat] || "✨"} ${cat}` : "◼ All"}
                </button>
              );
            })}
          </div>
        </div>

        {/* GRID */}
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 14px" }}>
          {error ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 20, border: "1px solid #e8eaf6" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
              <div style={{ color: "#9e9e9e", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Failed to load artists</div>
              <button onClick={() => window.location.reload()} style={{ background: "linear-gradient(135deg,#3d5afe,#7c4dff)", border: "none", color: "#fff", padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>Retry</button>
            </div>
          ) : filtered.length === 0 && !loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 20, border: "1px solid #e8eaf6" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎭</div>
              <div style={{ color: "#9e9e9e", fontSize: 13, fontWeight: 700 }}>No artists found{search ? ` for "${search}"` : ""}</div>
            </div>
          ) : (
            <div className="artist-grid">
              {loading
                ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
                : filtered.map(artist => <ArtistCard key={artist._id} artist={artist} />)
              }
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM STATS BAR */}
      {!loading && !error && artists.length > 0 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
          background: "#fff",
          borderTop: "1px solid #e8eaf6",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
          display: "flex", justifyContent: "center",
          gap: "clamp(20px,6vw,60px)", padding: "10px 20px 12px",
        }}>
          {[
            { label: "Artists", value: artists.length,          emoji: "🎭" },
            { label: "Types",   value: [...new Set(artists.map(a => a.category).filter(Boolean))].length, emoji: "🏷" },
            { label: "Works",   value: artists.reduce((s, a) => s + (a.postCount || 0), 0), emoji: "🎨" },
            { label: "Cities",  value: [...new Set(artists.map(a => a.city).filter(Boolean))].length, emoji: "📍" },
          ].map(({ label, value, emoji }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 900, fontSize: "clamp(14px,3vw,20px)", color: "#1a1a2e" }}>{value}</div>
              <div style={{ fontSize: 9, color: "#bdbdbd", fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", fontFamily: "'Nunito',sans-serif" }}>{emoji} {label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}