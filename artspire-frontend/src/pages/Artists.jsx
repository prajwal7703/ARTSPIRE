import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Navbar";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const CAT_ACCENT = {
  Singer:       { color: "#ff4d6d", bg: "rgba(255,77,109,0.12)", glow: "#ff4d6d44" },
  Dancer:       { color: "#b44fff", bg: "rgba(180,79,255,0.12)", glow: "#b44fff44" },
  Musician:     { color: "#00cfff", bg: "rgba(0,207,255,0.12)", glow: "#00cfff44" },
  Painter:      { color: "#ff9f43", bg: "rgba(255,159,67,0.12)", glow: "#ff9f4344" },
  Photographer: { color: "#00e676", bg: "rgba(0,230,118,0.12)", glow: "#00e67644" },
  Actor:        { color: "#ffd600", bg: "rgba(255,214,0,0.12)",  glow: "#ffd60044" },
  Comedian:     { color: "#00e5ff", bg: "rgba(0,229,255,0.12)", glow: "#00e5ff44" },
  default:      { color: "#ff8c00", bg: "rgba(255,140,0,0.12)",  glow: "#ff8c0044" },
};

const ICONS = {
  Singer:"🎤", Dancer:"💃", Musician:"🎵", Painter:"🎨",
  Photographer:"📷", Actor:"🎭", Comedian:"😂", default:"✨",
};

const CATEGORIES = ["All","Singer","Dancer","Musician","Painter","Photographer","Actor","Comedian"];

/* Pastel panel bg colors per category — mimics zodiac card pastels */
const PANEL_BG = {
  Singer:       "linear-gradient(160deg,#2a0d12 0%,#1a0810 100%)",
  Dancer:       "linear-gradient(160deg,#1a0d2a 0%,#100815 100%)",
  Musician:     "linear-gradient(160deg,#051a22 0%,#030d14 100%)",
  Painter:      "linear-gradient(160deg,#221205 0%,#140a03 100%)",
  Photographer: "linear-gradient(160deg,#062214 0%,#03140a 100%)",
  Actor:        "linear-gradient(160deg,#1f1900 0%,#121000 100%)",
  Comedian:     "linear-gradient(160deg,#031520 0%,#020c14 100%)",
  default:      "linear-gradient(160deg,#1a0f00 0%,#0f0800 100%)",
};

function getId(artist) {
  if (!artist) return undefined;
  const raw = artist._id;
  if (!raw) return undefined;
  if (typeof raw === "object" && raw.$oid) return raw.$oid;
  return String(raw);
}

/* Decorative corner flourish SVG */
function Flourish({ color, flip }) {
  return (
    <svg
      width="36" height="36" viewBox="0 0 36 36" fill="none"
      style={{ position:"absolute", top: flip ? "auto" : 6, bottom: flip ? 6 : "auto",
               right: flip ? "auto" : 6, left: flip ? 6 : "auto",
               opacity: 0.55, pointerEvents:"none" }}
    >
      <path d="M6 6 Q18 6 18 18 Q18 30 30 30" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <circle cx="6" cy="6" r="2" fill={color}/>
      <circle cx="30" cy="30" r="2" fill={color}/>
    </svg>
  );
}

/* Star row */
function Stars({ count }) {
  return (
    <div style={{ display:"flex", gap:2 }}>
      {Array.from({ length: 5 }).map((_,i) => (
        <span key={i} style={{ fontSize:11, color: i < count ? "#ffd600" : "rgba(255,255,255,0.12)" }}>★</span>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background:"#0f1520", borderRadius:20, overflow:"hidden",
      border:"1px solid rgba(255,255,255,0.06)", animation:"shimmer 1.4s infinite"
    }}>
      <div style={{ width:"100%", aspectRatio:"3/4", background:"#161e2e" }}/>
      <div style={{ padding:"14px 14px 12px", display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ height:13, width:"60%", borderRadius:6, background:"#1f2937" }}/>
        <div style={{ height:10, width:"40%", borderRadius:6, background:"#1a2235" }}/>
      </div>
    </div>
  );
}

function ArtistCard({ artist }) {
  const [hov, setHov] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const accent  = CAT_ACCENT[artist.category] || CAT_ACCENT.default;
  const panel   = PANEL_BG[artist.category]   || PANEL_BG.default;
  const icon    = ICONS[artist.category] || ICONS.default;
  const id      = getId(artist);
  if (!id) return null;
  const stars   = Math.round(Math.min(5, Math.max(1, artist.rating || 5)));
  const initials = artist.name
    ? artist.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  return (
    <Link to={`/artist/${id}`} style={{ textDecoration:"none", display:"block" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          borderRadius: 20,
          overflow: "hidden",
          border: hov ? `1.5px solid ${accent.color}` : "1.5px solid rgba(255,255,255,0.07)",
          boxShadow: hov ? `0 12px 40px ${accent.glow}` : "0 4px 16px rgba(0,0,0,0.5)",
          transform: hov ? "translateY(-6px) scale(1.01)" : "translateY(0) scale(1)",
          transition: "all 0.24s cubic-bezier(.22,.61,.36,1)",
          cursor: "pointer",
          position: "relative",
          background: "#0c1118",
        }}
      >
        {/* ── PORTRAIT PANEL ── */}
        <div style={{
          width:"100%", aspectRatio:"3/4", overflow:"hidden",
          background: panel, position:"relative",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          {/* Subtle grid texture */}
          <div style={{
            position:"absolute", inset:0, pointerEvents:"none",
            backgroundImage: `radial-gradient(circle, ${accent.color}18 1px, transparent 1px)`,
            backgroundSize:"22px 22px",
          }}/>

          {/* Decorative flourishes */}
          <Flourish color={accent.color} flip={false}/>
          <Flourish color={accent.color} flip={true}/>

          {/* Category badge — top left */}
          <div style={{
            position:"absolute", top:10, left:10, zIndex:10,
            background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)",
            border:`1px solid ${accent.color}55`,
            color: accent.color, fontSize:10, fontWeight:800,
            padding:"4px 10px", borderRadius:20,
            fontFamily:"'Nunito',sans-serif", letterSpacing:0.5,
          }}>
            {icon} {artist.category || "Artist"}
          </div>

          {/* Rating badge — top right */}
          <div style={{
            position:"absolute", top:10, right:10, zIndex:10,
            background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)",
            color:"#ffd600", fontSize:10, fontWeight:800,
            padding:"4px 10px", borderRadius:20,
            fontFamily:"'Nunito',sans-serif",
            display:"flex", alignItems:"center", gap:3,
          }}>
            ★ {(artist.rating || 5).toFixed(1)}
          </div>

          {/* Photo or illustrated initials */}
          {artist.profileImage && !imgErr ? (
            <>
              <img
                src={artist.profileImage}
                alt={artist.name}
                onError={() => setImgErr(true)}
                style={{
                  width:"100%", height:"100%", objectFit:"cover", display:"block",
                  transition:"transform 0.4s ease",
                  transform: hov ? "scale(1.08)" : "scale(1)",
                  filter: "saturate(1.1) contrast(1.05)",
                }}
              />
              {/* Vignette overlay */}
              <div style={{
                position:"absolute", inset:0, pointerEvents:"none",
                background:`radial-gradient(ellipse at 50% 110%, ${accent.color}22 0%, transparent 65%), linear-gradient(transparent 50%, rgba(0,0,0,0.92) 100%)`,
              }}/>
            </>
          ) : (
            /* Illustrated placeholder */
            <div style={{
              width:"100%", height:"100%", display:"flex",
              flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10,
              position:"relative",
            }}>
              {/* Large glowing circle */}
              <div style={{
                width:90, height:90, borderRadius:"50%",
                background: accent.bg,
                border:`2px solid ${accent.color}66`,
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:`0 0 32px ${accent.color}33`,
              }}>
                <span style={{ fontSize:38 }}>{icon}</span>
              </div>
              <span style={{
                fontSize:"clamp(18px,4vw,26px)", fontWeight:900, color:"#fff",
                fontFamily:"'Nunito',sans-serif", letterSpacing:2,
                textShadow:`0 0 20px ${accent.color}88`,
              }}>
                {initials}
              </span>
              {/* Decorative horizontal line */}
              <div style={{ width:40, height:1.5, background:`linear-gradient(90deg, transparent, ${accent.color}, transparent)` }}/>
            </div>
          )}
        </div>

        {/* ── INFO STRIP ── */}
        <div style={{
          padding:"13px 14px 13px",
          background: hov ? `linear-gradient(135deg, rgba(15,20,32,1), ${accent.bg})` : "#0c1118",
          borderTop:`1px solid ${hov ? accent.color+"33" : "rgba(255,255,255,0.05)"}`,
          transition:"background 0.24s ease",
        }}>
          {/* Name */}
          <div style={{
            fontFamily:"'Nunito',sans-serif", fontWeight:900,
            fontSize:"clamp(12px,2.5vw,15px)", color:"#fff",
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
            marginBottom:3,
          }}>
            {artist.name}
          </div>

          {/* City */}
          {artist.city && (
            <div style={{
              fontFamily:"'Nunito',sans-serif", fontSize:10, fontWeight:700,
              color:"rgba(255,255,255,0.38)", marginBottom:8, letterSpacing:0.3,
            }}>
              📍 {artist.city}
            </div>
          )}

          {/* Stars + price row */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <Stars count={stars}/>
            <div style={{ display:"flex", gap:5 }}>
              {artist.postCount > 0 && (
                <span style={{
                  background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.35)",
                  fontSize:9, fontWeight:800, padding:"3px 7px", borderRadius:6,
                  fontFamily:"'Nunito',sans-serif",
                }}>
                  🎨 {artist.postCount}
                </span>
              )}
              {artist.price && (
                <span style={{
                  background: accent.bg, color: accent.color,
                  fontSize:9, fontWeight:800, padding:"3px 7px", borderRadius:6,
                  fontFamily:"'Nunito',sans-serif",
                  border:`1px solid ${accent.color}44`,
                }}>
                  ₹{Number(artist.price).toLocaleString("en-IN")}
                </span>
              )}
            </div>
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
    const matchSearch = !search
      || a.name?.toLowerCase().includes(search.toLowerCase())
      || a.city?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{
      minHeight:"100vh",
      background:"#081120",
      color:"#fff",
      fontFamily:"'Nunito',sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes shimmer { 0%{opacity:.4} 50%{opacity:.85} 100%{opacity:.4} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatIn { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .search-input::placeholder { color: rgba(255,255,255,0.2); }
        .search-input:focus { outline:none; border-color:#ff8c00 !important; box-shadow:0 0 0 3px rgba(255,140,0,0.1); }
        .cat-pill { transition: all 0.18s ease; }
        .cat-pill:hover { transform: translateY(-2px); }
        .artist-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          animation: floatIn 0.4s ease;
        }
        @media(min-width:480px)  { .artist-grid { grid-template-columns: repeat(3,1fr) !important; gap:14px !important; } }
        @media(min-width:720px)  { .artist-grid { grid-template-columns: repeat(4,1fr) !important; gap:16px !important; } }
        @media(min-width:1024px) { .artist-grid { grid-template-columns: repeat(5,1fr) !important; } }
        @media(min-width:1280px) { .artist-grid { grid-template-columns: repeat(6,1fr) !important; } }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:#1f2937; border-radius:4px; }
        .cat-strip { display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; }
        .cat-strip::-webkit-scrollbar { display:none; }
      `}</style>

      {/* VIDEO BG — same as Home */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}>
        <video autoPlay loop muted playsInline style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.18 }}>
          <source src="/artbg.mp4" type="video/mp4"/>
        </video>
        <div style={{ position:"absolute", inset:0, background:"rgba(8,17,32,0.82)" }}/>
      </div>

      {/* NAVBAR */}
      <div style={{ position:"relative", zIndex:100 }}><Navbar/></div>

      <div style={{ position:"relative", zIndex:10, paddingBottom:110 }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign:"center", padding:"88px 20px 32px", animation:"fadeUp 0.4s ease" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background:"none", border:"none", color:"rgba(255,255,255,0.22)",
              fontSize:10, fontWeight:800, cursor:"pointer",
              fontFamily:"'Nunito',sans-serif", marginBottom:16, letterSpacing:2,
            }}
          >
            ← HOME
          </button>

          <h1 style={{
            fontWeight:900, fontSize:"clamp(30px,6vw,54px)",
            margin:"0 0 10px", letterSpacing:-1.5, color:"#fff",
          }}>
            Discover <span style={{ color:"#ff8c00" }}>Artists</span>
          </h1>

          <p style={{ color:"rgba(255,255,255,0.3)", fontSize:12, fontWeight:700, margin:0, letterSpacing:1 }}>
            {loading
              ? "Loading artists..."
              : error
              ? "Failed to load."
              : `${filtered.length} creative${filtered.length !== 1 ? "s" : ""} found`}
          </p>
        </div>

        {/* ── SEARCH + FILTER ── */}
        <div style={{ maxWidth:700, margin:"0 auto", padding:"0 16px 32px", animation:"fadeUp 0.35s ease 0.08s both" }}>
          <div style={{ position:"relative", marginBottom:14 }}>
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:15, pointerEvents:"none" }}>🔍</span>
            <input
              className="search-input"
              placeholder="Search by name or city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width:"100%", padding:"13px 42px 13px 44px",
                borderRadius:14, border:"1.5px solid rgba(255,255,255,0.08)",
                background:"rgba(255,255,255,0.04)", color:"#fff",
                fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight:700,
                backdropFilter:"blur(8px)",
                transition:"border-color 0.2s, box-shadow 0.2s",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                  background:"rgba(255,255,255,0.08)", border:"none", color:"rgba(255,255,255,0.4)",
                  cursor:"pointer", fontSize:12, width:24, height:24, borderRadius:"50%",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}
              >✕</button>
            )}
          </div>

          {/* Category pills */}
          <div className="cat-strip">
            {CATEGORIES.map(cat => {
              const a = CAT_ACCENT[cat] || CAT_ACCENT.default;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  className="cat-pill"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding:"6px 14px", borderRadius:20, flexShrink:0,
                    border: isActive ? `1.5px solid ${a.color}` : "1.5px solid rgba(255,255,255,0.08)",
                    background: isActive ? a.bg : "rgba(255,255,255,0.03)",
                    color: isActive ? a.color : "rgba(255,255,255,0.3)",
                    fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:11,
                    cursor:"pointer", whiteSpace:"nowrap",
                    boxShadow: isActive ? `0 0 14px ${a.glow}` : "none",
                  }}
                >
                  {cat !== "All" ? `${ICONS[cat] || "✨"} ${cat}` : "◼ All"}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── GRID ── */}
        <div style={{ maxWidth:1420, margin:"0 auto", padding:"0 14px" }}>
          {error ? (
            <div style={{ textAlign:"center", padding:"60px 20px", background:"rgba(255,255,255,0.03)", borderRadius:20, border:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize:40, marginBottom:10 }}>⚠️</div>
              <div style={{ color:"rgba(255,255,255,0.25)", fontSize:13, fontWeight:700, marginBottom:16 }}>Failed to load artists</div>
              <button
                onClick={() => window.location.reload()}
                style={{ background:"#ff8c00", border:"none", color:"#fff", padding:"10px 24px", borderRadius:10, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}
              >Retry</button>
            </div>
          ) : filtered.length === 0 && !loading ? (
            <div style={{ textAlign:"center", padding:"60px 20px", background:"rgba(255,255,255,0.03)", borderRadius:20, border:"1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🎭</div>
              <div style={{ color:"rgba(255,255,255,0.25)", fontSize:13, fontWeight:700 }}>
                No artists found{search ? ` for "${search}"` : ""}
              </div>
            </div>
          ) : (
            <div className="artist-grid">
              {loading
                ? Array.from({ length: 12 }).map((_,i) => <SkeletonCard key={i}/>)
                : filtered.map(artist => <ArtistCard key={artist._id} artist={artist}/>)
              }
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM STATS BAR ── */}
      {!loading && !error && artists.length > 0 && (
        <div style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:50,
          background:"rgba(8,17,32,0.96)", backdropFilter:"blur(20px)",
          borderTop:"1px solid rgba(255,255,255,0.06)",
          display:"flex", justifyContent:"center",
          gap:"clamp(20px,6vw,64px)", padding:"10px 20px 14px",
        }}>
          {[
            { label:"Artists", value:artists.length,          emoji:"🎭" },
            { label:"Types",   value:[...new Set(artists.map(a=>a.category).filter(Boolean))].length, emoji:"🏷" },
            { label:"Works",   value:artists.reduce((s,a)=>s+(a.postCount||0),0), emoji:"🎨" },
            { label:"Cities",  value:[...new Set(artists.map(a=>a.city).filter(Boolean))].length, emoji:"📍" },
          ].map(({ label, value, emoji }) => (
            <div key={label} style={{ textAlign:"center" }}>
              <div style={{ fontWeight:900, fontSize:"clamp(14px,3vw,20px)", color:"#ff8c00", fontFamily:"'Nunito',sans-serif" }}>{value}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.22)", fontWeight:800, letterSpacing:0.5, textTransform:"uppercase", fontFamily:"'Nunito',sans-serif" }}>
                {emoji} {label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}