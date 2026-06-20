import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Navbar";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const CAT_ACCENT = {
  Singer:       { color:"#ff4d6d", glow:"#ff4d6d", bg:"linear-gradient(160deg,#1a0008,#2d0010)" },
  Dancer:       { color:"#b44fff", glow:"#b44fff", bg:"linear-gradient(160deg,#120015,#200022)" },
  Musician:     { color:"#00cfff", glow:"#00cfff", bg:"linear-gradient(160deg,#00101a,#001825)" },
  Painter:      { color:"#ff9f43", glow:"#ff9f43", bg:"linear-gradient(160deg,#1a0d00,#251500)" },
  Photographer: { color:"#00e676", glow:"#00e676", bg:"linear-gradient(160deg,#001a09,#002510)" },
  Actor:        { color:"#ffd600", glow:"#ffd600", bg:"linear-gradient(160deg,#1a1400,#252000)" },
  Comedian:     { color:"#00e5ff", glow:"#00e5ff", bg:"linear-gradient(160deg,#001a1a,#002525)" },
  default:      { color:"#f97316", glow:"#f97316", bg:"linear-gradient(160deg,#1a0a00,#251200)" },
};

const ICONS = {
  Singer:"🎤", Dancer:"💃", Musician:"🎵", Painter:"🎨",
  Photographer:"📸", Actor:"🎭", Comedian:"😂", default:"✨",
};

const CATEGORIES = ["All","Singer","Dancer","Musician","Painter","Photographer","Actor","Comedian"];

function getId(a) {
  if (!a) return undefined;
  const raw = a._id;
  if (!raw) return undefined;
  if (typeof raw === "object" && raw.$oid) return raw.$oid;
  return String(raw);
}

function SkeletonCard() {
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", background: "#0d1117", border: "1px solid #1f2937", aspectRatio: "2/3", animation: "shimmer 1.4s infinite" }}>
      <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg,#111827,#0d1117)" }} />
    </div>
  );
}

function ArtistCard({ artist }) {
  const [hov, setHov] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const t       = CAT_ACCENT[artist.category] || CAT_ACCENT.default;
  const id      = getId(artist);
  if (!id) return null;
  const stars   = Math.round(artist.rating || 5);
  const initials = artist.name ? artist.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) : "A";

  return (
    <Link to={`/artist/${id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          position: "relative",
          borderRadius: 16,
          overflow: "hidden",
          aspectRatio: "2/3",
          border: hov ? `1.5px solid ${t.color}` : "1.5px solid rgba(255,255,255,0.06)",
          boxShadow: hov ? `0 0 30px ${t.glow}44, 0 8px 32px rgba(0,0,0,0.6)` : "0 4px 16px rgba(0,0,0,0.5)",
          transform: hov ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
          transition: "all 0.28s cubic-bezier(0.23,1,0.32,1)",
          cursor: "pointer",
          background: t.bg,
        }}
      >
        {/* BG photo */}
        {artist.profileImage && !imgErr ? (
          <img
            src={artist.profileImage}
            alt={artist.name}
            onError={() => setImgErr(true)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s", transform: hov ? "scale(1.07)" : "scale(1)" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ fontSize: "clamp(40px,8vw,64px)", filter: `drop-shadow(0 0 20px ${t.color})` }}>{ICONS[artist.category] || ICONS.default}</span>
            <span style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, color: "#fff", fontFamily: "'Nunito',sans-serif", letterSpacing: 2, textShadow: `0 0 20px ${t.color}` }}>{initials}</span>
          </div>
        )}

        {/* Dark overlay — heavier at top & bottom like the posters */}
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 35%, transparent 50%, rgba(0,0,0,0.92) 100%)`, pointerEvents: "none" }} />

        {/* Colored side accent line */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, transparent, ${t.color}, transparent)`, opacity: hov ? 1 : 0.4, transition: "opacity 0.3s" }} />

        {/* TOP — category badge */}
        <div style={{ position: "absolute", top: 12, left: 12, right: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
            border: `1px solid ${t.color}55`,
            color: t.color, fontSize: 10, fontWeight: 900,
            padding: "4px 10px", borderRadius: 20,
            fontFamily: "'Nunito',sans-serif", letterSpacing: 0.5,
          }}>
            {ICONS[artist.category] || "✨"} {artist.category || "Artist"}
          </span>
          {artist.price && (
            <span style={{
              background: `${t.color}22`, backdropFilter: "blur(8px)",
              border: `1px solid ${t.color}55`,
              color: t.color, fontSize: 10, fontWeight: 900,
              padding: "4px 10px", borderRadius: 20,
              fontFamily: "'Nunito',sans-serif",
            }}>
              ₹{Number(artist.price).toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* BOTTOM INFO — poster style */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 14px 14px" }}>
          {/* Name */}
          <div style={{
            fontFamily: "'Nunito',sans-serif", fontWeight: 900,
            fontSize: "clamp(14px,3vw,18px)", color: "#fff",
            letterSpacing: 0.5, marginBottom: 4,
            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{artist.name}</div>

          {/* City */}
          {artist.city && (
            <div style={{ fontFamily: "'Nunito',sans-serif", fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 700, marginBottom: 8 }}>
              📍 {artist.city}
            </div>
          )}

          {/* Stars + works row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ fontSize: 11, color: i < stars ? "#ffd600" : "rgba(255,255,255,0.15)" }}>★</span>
              ))}
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'Nunito',sans-serif", fontWeight: 700, marginLeft: 4 }}>
                {(artist.rating || 5).toFixed(1)}
              </span>
            </div>
            {artist.postCount > 0 && (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'Nunito',sans-serif", fontWeight: 700 }}>
                🎨 {artist.postCount} works
              </span>
            )}
          </div>

          {/* Orange accent line at very bottom */}
          <div style={{ height: 2, borderRadius: 2, background: `linear-gradient(90deg, ${t.color}, transparent)`, marginTop: 10, opacity: hov ? 1 : 0.5, transition: "opacity 0.3s" }} />
        </div>

        {/* Hover shine */}
        {hov && (
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, ${t.color}18 0%, transparent 65%)`, pointerEvents: "none" }} />
        )}
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
            return { ...a, _id: id, postCount: postData.filter(p => p.artistId === id).length, profileImage: a.profileImage || postData.find(p => p.artistId === id && p.type === "image")?.media || null };
          })
          .filter(a => a._id)
          .sort((a, b) => b.postCount - a.postCount);
        setArtists(enriched);
      } catch { setError(true); }
      finally  { setLoading(false); }
    })();
  }, []);

  const filtered = artists.filter(a => {
    const matchCat    = activeCategory === "All" || a.category === activeCategory;
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.city?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#081120", color: "#fff", fontFamily: "'Nunito',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes shimmer { 0%{opacity:.3} 50%{opacity:.6} 100%{opacity:.3} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .srch::placeholder { color: rgba(255,255,255,0.22); }
        .srch:focus { outline:none; border-color:#f97316 !important; box-shadow:0 0 0 3px rgba(249,115,22,0.15); }
        .cpill { transition:all 0.18s ease; }
        .cpill:hover { transform:translateY(-1px); }
        .ag { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; }
        @media(min-width:480px)  { .ag { grid-template-columns:repeat(3,1fr)!important; gap:14px!important; } }
        @media(min-width:700px)  { .ag { grid-template-columns:repeat(4,1fr)!important; gap:16px!important; } }
        @media(min-width:1024px) { .ag { grid-template-columns:repeat(5,1fr)!important; } }
        @media(min-width:1300px) { .ag { grid-template-columns:repeat(6,1fr)!important; } }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:#1f2937; border-radius:4px; }
      `}</style>

      {/* NAV */}
      <div style={{ position: "relative", zIndex: 100 }}><Navbar /></div>

      <div style={{ paddingBottom: 90 }}>

        {/* HEADER */}
        <div style={{ textAlign: "center", padding: "72px 20px 28px", animation: "fadeUp 0.45s ease" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.22)", fontSize: 11, fontWeight: 800, cursor: "pointer", letterSpacing: 2, marginBottom: 16 }}>
            ← HOME
          </button>
          <h1 style={{ fontWeight: 900, fontSize: "clamp(30px,7vw,56px)", margin: "0 0 8px", letterSpacing: -1 }}>
            Find <span style={{ color: "#f97316" }}>Artists</span>
          </h1>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 700, margin: 0 }}>
            {loading ? "Loading..." : error ? "Failed to load." : `${filtered.length} artist${filtered.length !== 1 ? "s" : ""} found`}
          </p>
        </div>

        {/* SEARCH + FILTER */}
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px 28px", animation: "fadeUp 0.45s ease 0.07s both" }}>
          <div style={{ position: "relative", marginBottom: 14 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}>🔍</span>
            <input
              className="srch"
              placeholder="Search by name or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "13px 40px 13px 44px", borderRadius: 50, border: "1.5px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.05)", color: "#fff", fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 700, transition: "border-color 0.2s,box-shadow 0.2s" }}
            />
            {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>}
          </div>

          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {CATEGORIES.map(cat => {
              const accent = CAT_ACCENT[cat]?.color || "#f97316";
              const isActive = activeCategory === cat;
              return (
                <button key={cat} className="cpill" onClick={() => setActiveCategory(cat)} style={{ padding: "6px 14px", borderRadius: 50, border: isActive ? `1.5px solid ${accent}` : "1.5px solid rgba(255,255,255,0.08)", background: isActive ? `${accent}22` : "rgba(255,255,255,0.03)", color: isActive ? accent : "rgba(255,255,255,0.35)", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, boxShadow: isActive ? `0 0 14px ${accent}33` : "none" }}>
                  {cat !== "All" ? `${ICONS[cat] || "✨"} ${cat}` : "◼ All"}
                </button>
              );
            })}
          </div>
        </div>

        {/* GRID */}
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 14px" }}>
          {error ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(255,255,255,0.03)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Failed to load artists</div>
              <button onClick={() => window.location.reload()} style={{ background: "#f97316", border: "none", color: "#fff", padding: "10px 28px", borderRadius: 50, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Retry</button>
            </div>
          ) : filtered.length === 0 && !loading ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎭</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 700 }}>No artists found{search ? ` for "${search}"` : ""}</div>
            </div>
          ) : (
            <div className="ag">
              {loading ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />) : filtered.map(a => <ArtistCard key={a._id} artist={a} />)}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM STATS */}
      {!loading && !error && artists.length > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: "rgba(8,17,32,0.97)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "center", gap: "clamp(24px,6vw,64px)", padding: "10px 20px 12px" }}>
          {[
            { label:"Artists", value:artists.length },
            { label:"Types",   value:[...new Set(artists.map(a=>a.category).filter(Boolean))].length },
            { label:"Works",   value:artists.reduce((s,a)=>s+(a.postCount||0),0) },
            { label:"Cities",  value:[...new Set(artists.map(a=>a.city).filter(Boolean))].length },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 900, fontSize: "clamp(15px,3vw,22px)", color: "#f97316" }}>{value}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.22)", fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}