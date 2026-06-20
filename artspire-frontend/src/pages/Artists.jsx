import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Navbar";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const CATEGORIES = ["All","Singer","Dancer","Musician","Painter","Photographer","Actor","Comedian"];

const ICONS = {
  Singer:"🎤", Dancer:"💃", Musician:"🎵", Painter:"🎨",
  Photographer:"📷", Actor:"🎭", Comedian:"😂", default:"✨",
};

/* Each category gets a different "bounty" flavour text */
const BOUNTY_LABEL = {
  Singer:       "DEAD OR ALIVE",
  Dancer:       "DEAD OR ALIVE",
  Musician:     "DEAD OR ALIVE",
  Painter:      "DEAD OR ALIVE",
  Photographer: "DEAD OR ALIVE",
  Actor:        "DEAD OR ALIVE",
  Comedian:     "DEAD OR ALIVE",
  default:      "DEAD OR ALIVE",
};

function getId(artist) {
  if (!artist) return undefined;
  const raw = artist._id;
  if (!raw) return undefined;
  if (typeof raw === "object" && raw.$oid) return raw.$oid;
  return String(raw);
}

/* Format price as bounty — ₹ price or rating-based "bounty" */
function bounty(artist) {
  if (artist.price) return `₹${Number(artist.price).toLocaleString("en-IN")}`;
  const base = Math.round((artist.rating || 4.5) * 1000000 + (artist.postCount || 0) * 250000);
  return `₹${base.toLocaleString("en-IN")}`;
}

function SkeletonCard() {
  return (
    <div style={{
      background:"#d4a96a",
      border:"3px solid #8b6914",
      boxShadow:"3px 3px 0 #5a4008, 6px 6px 12px rgba(0,0,0,0.5)",
      padding:"6px",
      animation:"shimmer 1.4s infinite",
    }}>
      {/* WANTED header skeleton */}
      <div style={{ height:28, background:"#c49a55", marginBottom:4, borderRadius:1 }}/>
      {/* Photo skeleton */}
      <div style={{ width:"100%", aspectRatio:"1/1", background:"#c49a55", marginBottom:4 }}/>
      {/* Text skeletons */}
      <div style={{ height:10, background:"#c49a55", marginBottom:4, width:"80%", margin:"4px auto" }}/>
      <div style={{ height:22, background:"#c49a55", margin:"4px auto", width:"90%" }}/>
      <div style={{ height:14, background:"#c49a55", margin:"4px auto", width:"70%" }}/>
    </div>
  );
}

function WantedCard({ artist }) {
  const [hov, setHov]     = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const id = getId(artist);
  if (!id) return null;
  const icon = ICONS[artist.category] || ICONS.default;

  return (
    <Link to={`/artist/${id}`} style={{ textDecoration:"none", display:"block" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          /* Aged parchment paper */
          background: hov
            ? "linear-gradient(145deg,#e8c87a,#d4a84a,#c49030,#d4a84a)"
            : "linear-gradient(145deg,#e2c070,#ccaa50,#b89028,#ccaa50)",
          border: hov ? "3px solid #6b4c0a" : "3px solid #8b6914",
          boxShadow: hov
            ? "4px 4px 0 #3d2800, 8px 8px 20px rgba(0,0,0,0.7), inset 0 0 20px rgba(0,0,0,0.08)"
            : "3px 3px 0 #5a4008, 6px 6px 14px rgba(0,0,0,0.55), inset 0 0 16px rgba(0,0,0,0.06)",
          transform: hov ? "translateY(-4px) rotate(-0.3deg)" : "translateY(0) rotate(0deg)",
          transition:"all 0.22s ease",
          cursor:"pointer",
          padding:"5px 5px 8px",
          position:"relative",
          overflow:"hidden",
        }}
      >
        {/* Paper texture noise overlay */}
        <div style={{
          position:"absolute", inset:0, zIndex:1, pointerEvents:"none",
          backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
          mixBlendMode:"multiply",
          opacity:0.6,
        }}/>

        {/* Inner content — above texture */}
        <div style={{ position:"relative", zIndex:2 }}>

          {/* ── WANTED HEADER ── */}
          <div style={{
            textAlign:"center",
            fontFamily:"'Rye',serif",
            fontSize:"clamp(18px,4.5vw,26px)",
            fontWeight:900,
            color:"#1a0800",
            letterSpacing:4,
            lineHeight:1,
            marginBottom:3,
            textShadow:"1px 1px 0 rgba(255,255,255,0.15)",
            /* Stamp-like feel */
            borderBottom:"2px solid #8b6914",
            paddingBottom:4,
          }}>
            WANTED
          </div>

          {/* ── PHOTO BOX ── */}
          <div style={{
            width:"100%", aspectRatio:"1/1",
            overflow:"hidden",
            border:"2px solid #8b6914",
            background:"linear-gradient(135deg,#c8a050,#a07828)",
            position:"relative",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            {artist.profileImage && !imgErr ? (
              <img
                src={artist.profileImage}
                alt={artist.name}
                onError={() => setImgErr(true)}
                style={{
                  width:"100%", height:"100%",
                  objectFit:"cover", objectPosition:"top center",
                  display:"block",
                  filter: "sepia(0.35) contrast(1.1) brightness(0.92)",
                  transition:"transform 0.35s ease",
                  transform: hov ? "scale(1.07)" : "scale(1)",
                }}
              />
            ) : (
              /* Placeholder — icon + initials on parchment */
              <div style={{
                display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center", gap:6,
                width:"100%", height:"100%",
                background:"linear-gradient(160deg,#d4aa60,#b8883a)",
              }}>
                <span style={{ fontSize:"clamp(28px,7vw,44px)" }}>{icon}</span>
                <span style={{
                  fontFamily:"'Rye',serif",
                  fontSize:"clamp(16px,4vw,24px)",
                  color:"#3d1f00", letterSpacing:3, fontWeight:700,
                }}>
                  {artist.name?.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}
                </span>
              </div>
            )}

            {/* Sepia vignette overlay */}
            <div style={{
              position:"absolute", inset:0, pointerEvents:"none",
              background:"radial-gradient(ellipse at center, transparent 50%, rgba(80,45,5,0.45) 100%)",
            }}/>
          </div>

          {/* ── DEAD OR ALIVE ── */}
          <div style={{
            textAlign:"center",
            fontFamily:"'Rye',serif",
            fontSize:"clamp(6px,1.8vw,9px)",
            color:"#3d1f00",
            letterSpacing:2,
            marginTop:5,
            opacity:0.75,
            borderTop:"1px solid #8b6914",
            borderBottom:"1px solid #8b6914",
            padding:"2px 0",
          }}>
            ✦ {BOUNTY_LABEL[artist.category] || "DEAD OR ALIVE"} ✦
          </div>

          {/* ── ARTIST NAME ── */}
          <div style={{
            textAlign:"center",
            fontFamily:"'Rye',serif",
            fontSize:"clamp(10px,2.6vw,14px)",
            fontWeight:700,
            color:"#1a0800",
            letterSpacing:1.5,
            marginTop:4,
            lineHeight:1.2,
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
            padding:"0 4px",
          }}>
            {artist.name?.toUpperCase()}
          </div>

          {/* Category */}
          <div style={{
            textAlign:"center",
            fontFamily:"'Rye',serif",
            fontSize:"clamp(6px,1.5vw,8px)",
            color:"#5a3a0a",
            letterSpacing:2,
            marginTop:2,
            opacity:0.7,
          }}>
            — {(artist.category || "Artist").toUpperCase()} —
          </div>

          {/* City */}
          {artist.city && (
            <div style={{
              textAlign:"center",
              fontFamily:"'Rye',serif",
              fontSize:"clamp(5px,1.3vw,7px)",
              color:"#5a3a0a",
              letterSpacing:1.5,
              marginTop:1,
              opacity:0.55,
            }}>
              📍 {artist.city.toUpperCase()}
            </div>
          )}

          {/* ── BOUNTY AMOUNT ── */}
          <div style={{
            textAlign:"center",
            fontFamily:"'Rye',serif",
            fontSize:"clamp(9px,2.2vw,12px)",
            fontWeight:700,
            color:"#1a0800",
            letterSpacing:1,
            marginTop:5,
            borderTop:"1.5px solid #8b6914",
            paddingTop:4,
            textShadow:"0.5px 0.5px 0 rgba(255,255,255,0.2)",
          }}>
            {bounty(artist)}
          </div>

          {/* MARINE stamp */}
          <div style={{
            textAlign:"center",
            fontFamily:"'Rye',serif",
            fontSize:"clamp(5px,1.2vw,7px)",
            color:"#3d1f00",
            letterSpacing:3,
            marginTop:2,
            opacity:0.5,
          }}>
            — ARTSPIRE —
          </div>
        </div>

        {/* Corner age spots */}
        {[
          { top:2,    left:2  },
          { top:2,    right:2 },
          { bottom:2, left:2  },
          { bottom:2, right:2 },
        ].map((pos,i) => (
          <div key={i} style={{
            position:"absolute", ...pos, zIndex:3,
            width:8, height:8, borderRadius:"50%",
            background:"rgba(80,40,0,0.35)",
          }}/>
        ))}
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
              postCount: postData.filter(p => p.artistId === id).length,
              profileImage: a.profileImage
                || postData.find(p => p.artistId === id && p.type === "image")?.media
                || null,
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
      <link href="https://fonts.googleapis.com/css2?family=Rye&family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes shimmer { 0%{opacity:.4} 50%{opacity:.8} 100%{opacity:.4} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .search-input::placeholder { color:rgba(255,255,255,0.2); }
        .search-input:focus { outline:none; border-color:#c9a84c !important; box-shadow:0 0 0 3px rgba(200,160,80,0.1); }
        .cat-pill { transition:all 0.18s ease; }
        .cat-pill:hover { transform:translateY(-2px); }
        .wanted-grid {
          display:grid;
          grid-template-columns: repeat(3,1fr);
          gap:10px;
          padding: 0 10px;
        }
        @media(min-width:480px)  { .wanted-grid { grid-template-columns:repeat(3,1fr) !important; gap:12px !important; } }
        @media(min-width:680px)  { .wanted-grid { grid-template-columns:repeat(4,1fr) !important; gap:14px !important; } }
        @media(min-width:900px)  { .wanted-grid { grid-template-columns:repeat(5,1fr) !important; gap:14px !important; } }
        @media(min-width:1100px) { .wanted-grid { grid-template-columns:repeat(6,1fr) !important; } }
        @media(min-width:1400px) { .wanted-grid { grid-template-columns:repeat(7,1fr) !important; } }
        .cat-strip::-webkit-scrollbar { display:none; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#1f2937; border-radius:2px; }
      `}</style>

      {/* VIDEO BG */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}>
        <video autoPlay loop muted playsInline
          style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.15 }}>
          <source src="/artbg.mp4" type="video/mp4"/>
        </video>
        <div style={{ position:"absolute", inset:0, background:"rgba(8,17,32,0.88)" }}/>
      </div>

      <div style={{ position:"relative", zIndex:100 }}><Navbar/></div>

      <div style={{ position:"relative", zIndex:10, paddingBottom:110 }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign:"center", padding:"88px 20px 28px", animation:"fadeUp 0.4s ease" }}>
          <button onClick={() => navigate("/")} style={{
            background:"none", border:"none",
            color:"rgba(200,160,80,0.35)", fontSize:10, fontWeight:700,
            cursor:"pointer", fontFamily:"'Rye',serif",
            marginBottom:16, letterSpacing:3,
          }}>← HOME</button>

          <div style={{ display:"flex", alignItems:"center", gap:12, justifyContent:"center", marginBottom:12 }}>
            <div style={{ height:"0.5px", width:50, background:"linear-gradient(90deg,transparent,#c9a84c)" }}/>
            <span style={{ color:"#c9a84c", fontSize:12 }}>✦</span>
            <div style={{ height:"0.5px", width:50, background:"linear-gradient(90deg,#c9a84c,transparent)" }}/>
          </div>

          <h1 style={{
            fontFamily:"'Rye',serif",
            fontWeight:900, fontSize:"clamp(28px,6vw,52px)",
            margin:"0 0 10px", letterSpacing:6, color:"#e8c870",
            textShadow:"0 0 30px rgba(200,160,40,0.5), 2px 2px 0 rgba(0,0,0,0.5)",
          }}>
            MOST WANTED
          </h1>
          <p style={{
            fontFamily:"'Rye',serif",
            color:"rgba(200,160,80,0.4)", fontSize:10,
            letterSpacing:4, textTransform:"uppercase", margin:0,
          }}>
            {loading ? "Searching the realm…"
              : error   ? "Scroll unreadable."
              : `${filtered.length} Artist${filtered.length !== 1 ? "s" : ""} Found`}
          </p>
        </div>

        {/* ── SEARCH + FILTERS ── */}
        <div style={{ maxWidth:720, margin:"0 auto", padding:"0 16px 28px", animation:"fadeUp 0.4s ease 0.08s both" }}>
          <div style={{ position:"relative", marginBottom:12 }}>
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:14, pointerEvents:"none", opacity:0.4 }}>🔍</span>
            <input
              className="search-input"
              placeholder="Search by name or city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width:"100%", padding:"11px 40px 11px 42px",
                borderRadius:6, border:"1px solid rgba(200,160,80,0.2)",
                background:"rgba(10,6,2,0.7)", color:"#e8d5b0",
                fontFamily:"'Rye',serif", fontSize:11, letterSpacing:1,
                backdropFilter:"blur(8px)",
                transition:"border-color 0.2s, box-shadow 0.2s",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{
                position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                background:"rgba(200,160,80,0.1)", border:"1px solid rgba(200,160,80,0.2)",
                color:"rgba(200,160,80,0.5)", cursor:"pointer",
                fontSize:11, width:22, height:22, borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>✕</button>
            )}
          </div>

          <div className="cat-strip" style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat;
              return (
                <button key={cat} className="cat-pill"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding:"5px 14px", flexShrink:0, borderRadius:4,
                    border: isActive ? "1px solid #c9a84c" : "1px solid rgba(200,160,80,0.15)",
                    background: isActive ? "rgba(200,160,80,0.12)" : "rgba(4,2,0,0.5)",
                    color: isActive ? "#e8c870" : "rgba(200,160,80,0.3)",
                    fontFamily:"'Rye',serif", fontSize:9,
                    cursor:"pointer", whiteSpace:"nowrap",
                    letterSpacing:1.5, textTransform:"uppercase",
                    boxShadow: isActive ? "0 0 12px rgba(200,160,80,0.25)" : "none",
                  }}
                >
                  {cat !== "All" ? `${ICONS[cat]||"✨"} ${cat}` : "✦ All"}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── WANTED GRID ── */}
        <div style={{ maxWidth:1440, margin:"0 auto" }}>
          {error ? (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
              <div style={{ color:"rgba(200,160,80,0.3)", fontSize:12, fontFamily:"'Rye',serif", letterSpacing:2, marginBottom:20 }}>
                SCROLL UNREADABLE
              </div>
              <button onClick={() => window.location.reload()} style={{
                background:"transparent", border:"1px solid #c9a84c",
                color:"#c9a84c", padding:"10px 28px", borderRadius:4,
                fontFamily:"'Rye',serif", fontSize:10, fontWeight:700,
                letterSpacing:2, cursor:"pointer",
              }}>RETRY</button>
            </div>
          ) : filtered.length === 0 && !loading ? (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🎭</div>
              <div style={{ color:"rgba(200,160,80,0.3)", fontSize:12, fontFamily:"'Rye',serif", letterSpacing:2 }}>
                NO SOULS FOUND{search ? ` FOR "${search.toUpperCase()}"` : ""}
              </div>
            </div>
          ) : (
            <div className="wanted-grid">
              {loading
                ? Array.from({ length:15 }).map((_,i) => <SkeletonCard key={i}/>)
                : filtered.map(artist => <WantedCard key={artist._id} artist={artist}/>)
              }
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM STATS BAR ── */}
      {!loading && !error && artists.length > 0 && (
        <div style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:50,
          background:"rgba(4,2,1,0.97)", backdropFilter:"blur(20px)",
          borderTop:"1px solid rgba(200,160,80,0.15)",
          display:"flex", justifyContent:"center",
          gap:"clamp(24px,6vw,80px)", padding:"10px 20px 14px",
        }}>
          {[
            { label:"Artists",  value:artists.length },
            { label:"Crafts",   value:[...new Set(artists.map(a=>a.category).filter(Boolean))].length },
            { label:"Works",    value:artists.reduce((s,a)=>s+(a.postCount||0),0) },
            { label:"Cities",   value:[...new Set(artists.map(a=>a.city).filter(Boolean))].length },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign:"center" }}>
              <div style={{
                fontFamily:"'Rye',serif", fontWeight:700,
                fontSize:"clamp(14px,3vw,22px)", color:"#c9a84c",
                textShadow:"0 0 12px rgba(200,160,40,0.5)",
              }}>{value}</div>
              <div style={{
                fontSize:8, color:"rgba(200,160,80,0.3)", fontWeight:700,
                letterSpacing:2, textTransform:"uppercase",
                fontFamily:"'Rye',serif",
              }}>✦ {label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}