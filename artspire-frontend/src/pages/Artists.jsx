import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Navbar";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const CAT_ACCENT = {
  Singer:       "#ff4d6d",
  Dancer:       "#b44fff",
  Musician:     "#00cfff",
  Painter:      "#ff9f43",
  Photographer: "#00e676",
  Actor:        "#ffd600",
  Comedian:     "#00e5ff",
  default:      "#ff8c00",
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
    <div style={{ background: "#111827", borderRadius: 20, overflow: "hidden", border: "1px solid #1f2937", animation: "shimmer 1.4s infinite" }}>
      <div style={{ width: "100%", aspectRatio: "1/1", background: "#1f2937" }} />
      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ height: 13, width: "65%", borderRadius: 6, background: "#1f2937" }} />
        <div style={{ height: 10, width: "45%", borderRadius: 6, background: "#374151" }} />
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <div style={{ height: 22, width: 55, borderRadius: 10, background: "#1f2937" }} />
          <div style={{ height: 22, width: 40, borderRadius: 10, background: "#374151" }} />
        </div>
      </div>
    </div>
  );
}

function ArtistCard({ artist }) {
  const [hov, setHov] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const accent  = CAT_ACCENT[artist.category] || CAT_ACCENT.default;
  const id      = getId(artist);
  if (!id) return null;
  const stars   = Math.round(artist.rating || 5);
  const initials = artist.name ? artist.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "A";

  return (
    <Link to={`/artist/${id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          background: "#111827",
          borderRadius: 20,
          overflow: "hidden",
          border: hov ? `1.5px solid ${accent}` : "1.5px solid #1f2937",
          boxShadow: hov ? `0 8px 32px ${accent}33, 0 2px 8px rgba(0,0,0,0.4)` : "0 2px 8px rgba(0,0,0,0.3)",
          transform: hov ? "translateY(-5px)" : "translateY(0)",
          transition: "all 0.22s ease",
          cursor: "pointer",
        }}
      >
        {/* Photo area */}
        <div style={{ width: "100%", aspectRatio: "1/1", overflow: "hidden", background: "#1a1a2e", position: "relative" }}>
          {artist.profileImage && !imgErr ? (
            <img
              src={artist.profileImage}
              alt={artist.name}
              onError={() => setImgErr(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.3s", transform: hov ? "scale(1.06)" : "scale(1)" }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: "clamp(32px,7vw,52px)" }}>{ICONS[artist.category] || ICONS.default}</span>
              <span style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 900, color: "#fff", fontFamily: "'Nunito',sans-serif", letterSpacing: 1 }}>{initials}</span>
            </div>
          )}
          {/* Orange gradient overlay at bottom */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "45%", background: "linear-gradient(transparent, rgba(0,0,0,0.85))", pointerEvents: "none" }} />
          {/* Category badge top-left */}
          <div style={{
            position: "absolute", top: 10, left: 10,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            border: `1px solid ${accent}55`,
            color: accent, fontSize: 11, fontWeight: 800,
            padding: "4px 10px", borderRadius: 20,
            fontFamily: "'Nunito',sans-serif",
          }}>
            {ICONS[artist.category] || "✨"} {artist.category || "Artist"}
          </div>
          {/* Rating badge top-right */}
          <div style={{
            position: "absolute", top: 10, right: 10,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            color: "#ffd600", fontSize: 11, fontWeight: 800,
            padding: "4px 10px", borderRadius: 20,
            fontFamily: "'Nunito',sans-serif",
            display: "flex", alignItems: "center", gap: 3,
          }}>
            ★ {(artist.rating || 5).toFixed(1)}
          </div>
          {/* Name over image bottom */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "10px 12px" }}>
            <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: "clamp(13px,2.8vw,16px)", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
              {artist.name}
            </div>
            {artist.city && (
              <div style={{ fontFamily: "'Nunito',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 700, marginTop: 2 }}>
                📍 {artist.city}
              </div>
            )}
          </div>
        </div>

        {/* Info strip */}
        <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${hov ? accent + "33" : "#1f2937"}` }}>
          {/* Stars */}
          <div style={{ display: "flex", gap: 1 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ fontSize: 11, color: i < stars ? "#ffd600" : "#374151" }}>★</span>
            ))}
          </div>
          {/* Badges */}
          <div style={{ display: "flex", gap: 5 }}>
            {artist.postCount > 0 && (
              <span style={{ background: "#1f2937", color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 8, fontFamily: "'Nunito',sans-serif" }}>
                🎨 {artist.postCount}
              </span>
            )}
            {artist.price && (
              <span style={{ background: `${accent}22`, color: accent, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 8, fontFamily: "'Nunito',sans-serif", border: `1px solid ${accent}44` }}>
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
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#fff", fontFamily: "'Nunito',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes shimmer { 0%{opacity:.4} 50%{opacity:.8} 100%{opacity:.4} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .search-input::placeholder { color: rgba(255,255,255,0.25); }
        .search-input:focus { outline: none; border-color: #ff8c00 !important; box-shadow: 0 0 0 3px rgba(255,140,0,0.12); }
        .cat-pill { transition: all 0.18s ease; }
        .cat-pill:hover { transform: translateY(-1px); }
        .artist-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }
        @media(min-width:480px)  { .artist-grid { grid-template-columns: repeat(3,1fr) !important; gap: 14px !important; } }
        @media(min-width:720px)  { .artist-grid { grid-template-columns: repeat(4,1fr) !important; gap: 16px !important; } }
        @media(min-width:1024px) { .artist-grid { grid-template-columns: repeat(5,1fr) !important; } }
        @media(min-width:1280px) { .artist-grid { grid-template-columns: repeat(6,1fr) !important; } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
      `}</style>

      <div style={{ position: "relative", zIndex: 100 }}><Navbar /></div>

      <div style={{ paddingBottom: 100 }}>
        {/* HEADER */}
        <div style={{ textAlign: "center", padding: "80px 20px 28px", animation: "fadeUp 0.4s ease" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito',sans-serif", marginBottom: 14, letterSpacing: 2 }}>
            ← HOME
          </button>
          <h1 style={{ fontWeight: 900, fontSize: "clamp(28px,6vw,50px)", margin: "0 0 8px", letterSpacing: -1, color: "#fff" }}>
            Find <span style={{ color: "#ff8c00" }}>Artists</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 700, margin: 0 }}>
            {loading ? "Loading artists..." : error ? "Failed to load." : `${filtered.length} artist${filtered.length !== 1 ? "s" : ""} found`}
          </p>
        </div>

        {/* SEARCH + FILTERS */}
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 16px 28px", animation: "fadeUp 0.4s ease 0.06s both" }}>
          {/* Search */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}>🔍</span>
            <input
              className="search-input"
              placeholder="Search by name or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "13px 40px 13px 44px",
                borderRadius: 14, border: "1.5px solid #1f2937",
                background: "#111827", color: "#fff",
                fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700,
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "#1f2937", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            )}
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {CATEGORIES.map(cat => {
              const accent = CAT_ACCENT[cat] || CAT_ACCENT.default;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  className="cat-pill"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: "6px 14px", borderRadius: 20,
                    border: isActive ? `1.5px solid ${accent}` : "1.5px solid #1f2937",
                    background: isActive ? `${accent}22` : "#111827",
                    color: isActive ? accent : "rgba(255,255,255,0.35)",
                    fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 11,
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                    boxShadow: isActive ? `0 0 12px ${accent}33` : "none",
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
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#111827", borderRadius: 20, border: "1px solid #1f2937" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Failed to load artists</div>
              <button onClick={() => window.location.reload()} style={{ background: "#ff8c00", border: "none", color: "#fff", padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito',sans-serif" }}>Retry</button>
            </div>
          ) : filtered.length === 0 && !loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#111827", borderRadius: 20, border: "1px solid #1f2937" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎭</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 700 }}>No artists found{search ? ` for "${search}"` : ""}</div>
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
          background: "rgba(13,17,23,0.96)", backdropFilter: "blur(20px)",
          borderTop: "1px solid #1f2937",
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
              <div style={{ fontWeight: 900, fontSize: "clamp(14px,3vw,20px)", color: "#ff8c00" }}>{value}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>{emoji} {label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}