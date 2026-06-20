import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Navbar";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const CATEGORIES = ["All","Singer","Dancer","Musician","Painter","Photographer","Actor","Comedian"];

/* Bold vibrant bg colors per category — cycling like the reference */
const CAT_COLORS = {
  Singer:       { bg:"#F5C518", text:"#1a1a2e", badge:"#7B2FBE", badgeText:"#fff" },
  Dancer:       { bg:"#7B2FBE", text:"#fff",    badge:"#F5C518", badgeText:"#1a1a2e" },
  Musician:     { bg:"#00B4D8", text:"#fff",    badge:"#F5C518", badgeText:"#1a1a2e" },
  Painter:      { bg:"#F5C518", text:"#1a1a2e", badge:"#00B4D8", badgeText:"#fff" },
  Photographer: { bg:"#7B2FBE", text:"#fff",    badge:"#F5C518", badgeText:"#1a1a2e" },
  Actor:        { bg:"#00B4D8", text:"#fff",    badge:"#7B2FBE", badgeText:"#fff" },
  Comedian:     { bg:"#F5C518", text:"#1a1a2e", badge:"#7B2FBE", badgeText:"#fff" },
  default:      { bg:"#00B4D8", text:"#fff",    badge:"#F5C518", badgeText:"#1a1a2e" },
};

/* Doodle icons floating around each card */
const DOODLES = {
  Singer:       ["🎵","✨","🎶","⚡","🌟","🎤","💫"],
  Dancer:       ["💃","✨","⭐","🌀","💥","🕺","🌟"],
  Musician:     ["🎸","⚡","🎵","🎶","✨","🥁","💫"],
  Painter:      ["🎨","✨","🖌️","⭐","💥","🌈","🌟"],
  Photographer: ["📷","✨","⚡","🌟","💡","🖼️","💫"],
  Actor:        ["🎭","✨","⭐","🌟","💥","🎬","⚡"],
  Comedian:     ["😂","✨","💥","⭐","🌟","🎉","⚡"],
  default:      ["✨","⭐","💫","⚡","🌟","💥","🎯"],
};

const CATEGORY_ICONS = {
  Singer:"🎤", Dancer:"💃", Musician:"🎵", Painter:"🎨",
  Photographer:"📷", Actor:"🎭", Comedian:"😂", default:"✨",
};

/* Fixed doodle positions so they don't jump on re-render */
const DOODLE_POSITIONS = [
  { top:"8%",  left:"6%",  size:14, rotate:-15 },
  { top:"12%", right:"8%", size:12, rotate:20  },
  { top:"30%", left:"4%",  size:16, rotate:-5  },
  { top:"35%", right:"5%", size:13, rotate:10  },
  { top:"55%", left:"7%",  size:12, rotate:-20 },
  { top:"60%", right:"6%", size:14, rotate:15  },
  { top:"78%", left:"5%",  size:11, rotate:5   },
];

function getId(artist) {
  if (!artist) return undefined;
  const raw = artist._id;
  if (!raw) return undefined;
  if (typeof raw === "object" && raw.$oid) return raw.$oid;
  return String(raw);
}

function SkeletonCard() {
  return (
    <div style={{
      borderRadius:16, overflow:"hidden", aspectRatio:"3/4",
      background:"#1e2a3a", animation:"shimmer 1.4s infinite",
      border:"2px solid rgba(255,255,255,0.06)",
    }}/>
  );
}

function ArtistCard({ artist, colorIndex }) {
  const [hov,    setHov]    = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const id      = getId(artist);
  if (!id) return null;

  /* Cycle through colors based on index so grid looks like reference */
  const colorKeys = ["Singer","Dancer","Musician","Painter","Photographer","Actor","Comedian"];
  const theme  = CAT_COLORS[artist.category] || CAT_COLORS[colorKeys[colorIndex % colorKeys.length]] || CAT_COLORS.default;
  const doodles = DOODLES[artist.category] || DOODLES.default;
  const catIcon = CATEGORY_ICONS[artist.category] || CATEGORY_ICONS.default;

  const initials = artist.name
    ? artist.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2)
    : "A";

  return (
    <Link to={`/artist/${id}`} style={{ textDecoration:"none", display:"block" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          borderRadius:16,
          overflow:"hidden",
          aspectRatio:"3/4",
          background: theme.bg,
          border: hov ? "3px solid rgba(255,255,255,0.9)" : "3px solid rgba(255,255,255,0.15)",
          boxShadow: hov
            ? "0 16px 48px rgba(0,0,0,0.55), 0 0 0 2px rgba(255,255,255,0.3)"
            : "0 6px 24px rgba(0,0,0,0.4)",
          transform: hov ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
          transition:"all 0.25s cubic-bezier(.22,.61,.36,1)",
          cursor:"pointer",
          position:"relative",
          display:"flex",
          flexDirection:"column",
        }}
      >
        {/* ── FLOATING DOODLES ── */}
        {DOODLE_POSITIONS.map((pos, i) => (
          <div key={i} style={{
            position:"absolute", zIndex:1,
            ...pos,
            fontSize: pos.size,
            transform:`rotate(${pos.rotate}deg)`,
            opacity: 0.55,
            pointerEvents:"none",
            userSelect:"none",
            transition:"opacity 0.25s",
            filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
          }}>
            {doodles[i % doodles.length]}
          </div>
        ))}

        {/* ── "DISCOVER ARTIST" HEADER ── */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, zIndex:3,
          padding:"10px 10px 0",
          pointerEvents:"none",
        }}>
          <div style={{
            fontFamily:"'Nunito',sans-serif",
            fontWeight:900,
            fontSize:"clamp(13px,3.5vw,20px)",
            color: theme.text === "#fff" ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.85)",
            lineHeight:1.0,
            textTransform:"uppercase",
            letterSpacing:-0.5,
            textShadow: theme.text === "#fff"
              ? "2px 2px 0 rgba(0,0,0,0.2)"
              : "1px 1px 0 rgba(255,255,255,0.3)",
          }}>
            DISCOVER<br/>
            <span style={{ fontSize:"clamp(10px,2.8vw,16px)", letterSpacing:1 }}>ARTIST</span>
          </div>
        </div>

        {/* ── PROFILE PHOTO or INITIALS ── */}
        <div style={{
          position:"absolute", inset:0, zIndex:2,
          display:"flex", alignItems:"flex-end", justifyContent:"center",
        }}>
          {artist.profileImage && !imgErr ? (
            /* Real photo — rendered as a cutout (no bg, just the person) */
            <img
              src={artist.profileImage}
              alt={artist.name}
              onError={() => setImgErr(true)}
              style={{
                width:"90%",
                height:"80%",
                objectFit:"cover",
                objectPosition:"top center",
                display:"block",
                transition:"transform 0.35s ease",
                transform: hov ? "scale(1.05) translateY(-4px)" : "scale(1) translateY(0)",
                /* No bg-removal API available — show photo in bottom 80% */
                borderRadius:"12px 12px 0 0",
                boxShadow:"0 -8px 24px rgba(0,0,0,0.2)",
                filter:"contrast(1.05) saturate(1.1)",
              }}
            />
          ) : (
            /* No photo — show big initial circle */
            <div style={{
              width:"65%", aspectRatio:"1/1",
              borderRadius:"50%",
              background:"rgba(0,0,0,0.15)",
              border:`3px solid ${theme.text === "#fff" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.2)"}`,
              display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center",
              gap:4, marginBottom:24,
              boxShadow:"0 8px 32px rgba(0,0,0,0.2)",
            }}>
              <span style={{ fontSize:"clamp(22px,6vw,38px)" }}>{catIcon}</span>
              <span style={{
                fontFamily:"'Nunito',sans-serif",
                fontWeight:900,
                fontSize:"clamp(16px,4vw,26px)",
                color: theme.text === "#fff" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.75)",
                letterSpacing:3,
              }}>
                {initials}
              </span>
            </div>
          )}
        </div>

        {/* ── BOTTOM STRIP: Name badge + details ── */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, zIndex:10,
          padding:"8px 10px 10px",
          background: theme.text === "#fff"
            ? "linear-gradient(transparent, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.75))"
            : "linear-gradient(transparent, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.35))",
        }}>
          {/* Name pill badge — exactly like reference */}
          <div style={{
            display:"inline-block",
            background: theme.badge,
            color: theme.badgeText,
            fontFamily:"'Nunito',sans-serif",
            fontWeight:900,
            fontSize:"clamp(10px,2.5vw,14px)",
            letterSpacing:1.5,
            textTransform:"uppercase",
            padding:"4px 12px",
            borderRadius:6,
            border:`2px solid ${theme.text === "#fff" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.2)"}`,
            boxShadow:"0 2px 8px rgba(0,0,0,0.3)",
            maxWidth:"calc(100% - 8px)",
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
            marginBottom:4,
          }}>
            {artist.name?.toUpperCase()}
          </div>

          {/* Category + city row */}
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between",
            gap:4,
          }}>
            <span style={{
              fontFamily:"'Nunito',sans-serif",
              fontWeight:800, fontSize:"clamp(8px,1.8vw,10px)",
              color:"rgba(255,255,255,0.85)",
              letterSpacing:1, textTransform:"uppercase",
              background:"rgba(0,0,0,0.35)", padding:"2px 7px", borderRadius:4,
            }}>
              {catIcon} {artist.category || "Artist"}
            </span>

            {artist.price && (
              <span style={{
                fontFamily:"'Nunito',sans-serif",
                fontWeight:800, fontSize:"clamp(7px,1.6vw,9px)",
                color:"rgba(255,255,255,0.8)",
                background:"rgba(0,0,0,0.3)", padding:"2px 6px", borderRadius:4,
              }}>
                ₹{Number(artist.price).toLocaleString("en-IN")}
              </span>
            )}
          </div>

          {/* City */}
          {artist.city && (
            <div style={{
              fontFamily:"'Nunito',sans-serif",
              fontWeight:700, fontSize:"clamp(7px,1.5vw,9px)",
              color:"rgba(255,255,255,0.6)",
              letterSpacing:1, textTransform:"uppercase",
              marginTop:2,
            }}>
              📍 {artist.city}
            </div>
          )}
        </div>

        {/* ── Rating stars top-right ── */}
        <div style={{
          position:"absolute", top:8, right:8, zIndex:10,
          background:"rgba(0,0,0,0.4)", backdropFilter:"blur(4px)",
          borderRadius:6, padding:"2px 6px",
          display:"flex", alignItems:"center", gap:2,
        }}>
          <span style={{ fontSize:9, color:"#ffd600" }}>★</span>
          <span style={{
            fontFamily:"'Nunito',sans-serif",
            fontWeight:800, fontSize:9, color:"#fff",
          }}>
            {(artist.rating||5).toFixed(1)}
          </span>
        </div>

        {/* ── Post count badge bottom-right corner ── */}
        {artist.postCount > 0 && (
          <div style={{
            position:"absolute", top:8, left:8, zIndex:10,
            background:"rgba(0,0,0,0.4)", backdropFilter:"blur(4px)",
            borderRadius:6, padding:"2px 6px",
            fontFamily:"'Nunito',sans-serif",
            fontWeight:800, fontSize:9, color:"rgba(255,255,255,0.7)",
          }}>
            🎨 {artist.postCount}
          </div>
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
            return {
              ...a, _id: id,
              postCount: postData.filter(p => p.artistId === id).length,
              profileImage:
                a.profileImage ||
                postData.find(p => p.artistId === id && p.type === "image")?.media ||
                null,
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
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes shimmer { 0%{opacity:.35} 50%{opacity:.7} 100%{opacity:.35} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .search-input::placeholder { color:rgba(255,255,255,0.2); }
        .search-input:focus { outline:none; border-color:#00B4D8 !important; box-shadow:0 0 0 3px rgba(0,180,216,0.15); }
        .cat-pill { transition:all 0.18s ease; cursor:pointer; }
        .cat-pill:hover { transform:translateY(-2px); }
        .artist-grid {
          display:grid;
          grid-template-columns: repeat(2,1fr);
          gap:10px;
          padding:0 10px;
        }
        @media(min-width:500px)  { .artist-grid { grid-template-columns:repeat(3,1fr) !important; gap:12px !important; } }
        @media(min-width:700px)  { .artist-grid { grid-template-columns:repeat(4,1fr) !important; gap:14px !important; } }
        @media(min-width:950px)  { .artist-grid { grid-template-columns:repeat(5,1fr) !important; } }
        @media(min-width:1200px) { .artist-grid { grid-template-columns:repeat(6,1fr) !important; } }
        @media(min-width:1450px) { .artist-grid { grid-template-columns:repeat(7,1fr) !important; } }
        .cat-strip { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; }
        .cat-strip::-webkit-scrollbar { display:none; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#1f2937; border-radius:2px; }
      `}</style>

      {/* VIDEO BG */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}>
        <video autoPlay loop muted playsInline
          style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.12 }}>
          <source src="/artbg.mp4" type="video/mp4"/>
        </video>
        <div style={{ position:"absolute", inset:0, background:"rgba(8,17,32,0.9)" }}/>
      </div>

      <div style={{ position:"relative", zIndex:100 }}><Navbar/></div>

      <div style={{ position:"relative", zIndex:10, paddingBottom:110 }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign:"center", padding:"88px 20px 28px", animation:"fadeUp 0.4s ease" }}>
          <button onClick={() => navigate("/")} style={{
            background:"none", border:"none",
            color:"rgba(255,255,255,0.2)", fontSize:10, fontWeight:800,
            cursor:"pointer", fontFamily:"'Nunito',sans-serif",
            marginBottom:14, letterSpacing:3,
          }}>← HOME</button>

          <h1 style={{
            fontFamily:"'Nunito',sans-serif",
            fontWeight:900, fontSize:"clamp(30px,7vw,60px)",
            margin:"0 0 4px", letterSpacing:-1,
            color:"#fff",
            textShadow:"0 0 40px rgba(0,180,216,0.3)",
          }}>
            DISCOVER<br/>
            <span style={{ color:"#00B4D8" }}>ARTISTS</span>
          </h1>

          <p style={{
            color:"rgba(255,255,255,0.3)", fontSize:11,
            fontWeight:800, margin:"8px 0 0", letterSpacing:2, textTransform:"uppercase",
          }}>
            {loading ? "Loading artists…"
              : error ? "Failed to load."
              : `${filtered.length} Creative${filtered.length !== 1 ? "s" : ""} Found`}
          </p>
        </div>

        {/* ── SEARCH + CATEGORY FILTER ── */}
        <div style={{ maxWidth:720, margin:"0 auto", padding:"0 16px 28px", animation:"fadeUp 0.4s ease 0.1s both" }}>
          {/* Search */}
          <div style={{ position:"relative", marginBottom:12 }}>
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:15, pointerEvents:"none", opacity:0.4 }}>🔍</span>
            <input
              className="search-input"
              placeholder="Search by name or city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width:"100%", padding:"12px 42px 12px 44px",
                borderRadius:12, border:"1.5px solid rgba(255,255,255,0.08)",
                background:"rgba(255,255,255,0.05)", color:"#fff",
                fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight:700,
                backdropFilter:"blur(8px)",
                transition:"border-color 0.2s, box-shadow 0.2s",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{
                position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                background:"rgba(255,255,255,0.08)", border:"none",
                color:"rgba(255,255,255,0.4)", cursor:"pointer",
                fontSize:12, width:24, height:24, borderRadius:"50%",
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>✕</button>
            )}
          </div>

          {/* Category pills */}
          <div className="cat-strip">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat;
              const theme = CAT_COLORS[cat] || CAT_COLORS.default;
              return (
                <button key={cat} className="cat-pill"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding:"7px 16px", borderRadius:20, flexShrink:0,
                    border:"none",
                    background: isActive ? theme.bg : "rgba(255,255,255,0.06)",
                    color: isActive ? theme.text : "rgba(255,255,255,0.4)",
                    fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:11,
                    letterSpacing:1, textTransform:"uppercase",
                    boxShadow: isActive ? `0 4px 16px ${theme.bg}55` : "none",
                    transform: isActive ? "translateY(-2px)" : "translateY(0)",
                    transition:"all 0.18s ease",
                  }}
                >
                  {cat !== "All" ? `${CATEGORY_ICONS[cat]||"✨"} ${cat}` : "✦ All"}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── GRID ── */}
        <div style={{ maxWidth:1440, margin:"0 auto" }}>
          {error ? (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
              <div style={{ color:"rgba(255,255,255,0.3)", fontSize:13, fontWeight:700, marginBottom:20 }}>
                Failed to load artists
              </div>
              <button onClick={() => window.location.reload()} style={{
                background:"#00B4D8", border:"none",
                color:"#fff", padding:"10px 28px", borderRadius:10,
                fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight:900,
                cursor:"pointer",
              }}>RETRY</button>
            </div>
          ) : filtered.length === 0 && !loading ? (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🎭</div>
              <div style={{ color:"rgba(255,255,255,0.3)", fontSize:13, fontWeight:700 }}>
                No artists found{search ? ` for "${search}"` : ""}
              </div>
            </div>
          ) : (
            <div className="artist-grid">
              {loading
                ? Array.from({ length:12 }).map((_,i) => <SkeletonCard key={i}/>)
                : filtered.map((artist, i) => (
                    <ArtistCard key={artist._id} artist={artist} colorIndex={i}/>
                  ))
              }
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM STATS BAR ── */}
      {!loading && !error && artists.length > 0 && (
        <div style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:50,
          background:"rgba(8,17,32,0.97)", backdropFilter:"blur(20px)",
          borderTop:"1px solid rgba(255,255,255,0.06)",
          display:"flex", justifyContent:"center",
          gap:"clamp(20px,6vw,64px)", padding:"10px 20px 14px",
        }}>
          {[
            { label:"Artists",     value:artists.length,            color:"#F5C518" },
            { label:"Categories",  value:[...new Set(artists.map(a=>a.category).filter(Boolean))].length, color:"#7B2FBE" },
            { label:"Works",       value:artists.reduce((s,a)=>s+(a.postCount||0),0), color:"#00B4D8" },
            { label:"Cities",      value:[...new Set(artists.map(a=>a.city).filter(Boolean))].length,    color:"#F5C518" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign:"center" }}>
              <div style={{
                fontFamily:"'Nunito',sans-serif",
                fontWeight:900, fontSize:"clamp(14px,3vw,22px)", color,
              }}>{value}</div>
              <div style={{
                fontSize:9, color:"rgba(255,255,255,0.25)",
                fontWeight:800, letterSpacing:1.5, textTransform:"uppercase",
                fontFamily:"'Nunito',sans-serif",
              }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}