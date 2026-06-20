import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Navbar";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const TCG = {
  Singer:       { glow:"#ff4d6d", border:"#ff4d6d", bg:"#1a0008", accent:"#ff4d6d", type:"FIRE",    typeColor:"#ff4d6d", symbol:"🔥" },
  Dancer:       { glow:"#b44fff", border:"#b44fff", bg:"#120015", accent:"#b44fff", type:"PSYCHIC",  typeColor:"#b44fff", symbol:"🔮" },
  Musician:     { glow:"#00cfff", border:"#00cfff", bg:"#00101a", accent:"#00cfff", type:"WATER",    typeColor:"#00cfff", symbol:"💧" },
  Painter:      { glow:"#ff9f43", border:"#ff9f43", bg:"#1a0d00", accent:"#ff9f43", type:"EARTH",    typeColor:"#ff9f43", symbol:"🌍" },
  Photographer: { glow:"#00e676", border:"#00e676", bg:"#001a09", accent:"#00e676", type:"NATURE",   typeColor:"#00e676", symbol:"🌿" },
  Actor:        { glow:"#ffd600", border:"#ffd600", bg:"#1a1400", accent:"#ffd600", type:"ELECTRIC", typeColor:"#ffd600", symbol:"⚡" },
  Comedian:     { glow:"#00e5ff", border:"#00e5ff", bg:"#001a1a", accent:"#00e5ff", type:"ICE",      typeColor:"#00e5ff", symbol:"❄️" },
  default:      { glow:"#9d4edd", border:"#9d4edd", bg:"#0d0015", accent:"#9d4edd", type:"DARK",     typeColor:"#9d4edd", symbol:"🌑" },
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
    <div style={{ width:"100%", aspectRatio:"2.5/3.5", borderRadius:16, background:"#111", border:"2px solid #1a1a1a", overflow:"hidden", animation:"shimmer 1.4s infinite" }}>
      <div style={{ width:"100%", height:"55%", background:"#181818" }} />
      <div style={{ padding:10, display:"flex", flexDirection:"column", gap:7 }}>
        <div style={{ height:11, width:"65%", borderRadius:4, background:"#1e1e1e" }} />
        <div style={{ height:9,  width:"45%", borderRadius:4, background:"#181818" }} />
        <div style={{ height:3,  width:"80%", borderRadius:2, background:"#1e1e1e", marginTop:4 }} />
        <div style={{ display:"flex", gap:4, marginTop:3 }}>
          {[38,28].map((w,i) => <div key={i} style={{ height:14, width:w, borderRadius:4, background:"#1e1e1e" }} />)}
        </div>
      </div>
    </div>
  );
}

function TCGCard({ artist }) {
  const [tilt,  setTilt]  = useState({ x:0, y:0 });
  const [hov,   setHov]   = useState(false);
  const [shine, setShine] = useState({ x:50, y:50 });

  const t  = TCG[artist.category] || TCG.default;
  const id = getId(artist);
  if (!id) return null;

  const hp    = Math.min(999, 100 + (artist.postCount || 0) * 20 + Math.floor((artist.rating || 5) * 10));
  const stars = Math.round(artist.rating || 5);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x  = ((e.clientX - rect.left) / rect.width  - 0.5) * 20;
    const y  = ((e.clientY - rect.top)  / rect.height - 0.5) * -20;
    const sx = ((e.clientX - rect.left) / rect.width)  * 100;
    const sy = ((e.clientY - rect.top)  / rect.height) * 100;
    setTilt({ x, y });
    setShine({ x: sx, y: sy });
  };

  return (
    <Link to={`/artist/${id}`} style={{ textDecoration:"none", display:"block" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => { setHov(false); setTilt({ x:0, y:0 }); }}
        onMouseMove={onMove}
        style={{
          width:"100%", aspectRatio:"2.5/3.5", borderRadius:16,
          background:`linear-gradient(160deg, ${t.bg} 0%, #080810 55%, ${t.bg}88 100%)`,
          border:`2px solid ${hov ? t.border : t.border+"33"}`,
          boxShadow: hov
            ? `0 0 24px ${t.glow}88, 0 0 50px ${t.glow}33, inset 0 0 24px ${t.glow}11`
            : `0 0 6px ${t.glow}22`,
          transform: hov
            ? `perspective(700px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(1.06) translateZ(10px)`
            : "perspective(700px) rotateX(0) rotateY(0) scale(1)",
          transition: hov ? "box-shadow 0.1s, border-color 0.1s" : "all 0.5s cubic-bezier(0.23,1,0.32,1)",
          cursor:"pointer", position:"relative", overflow:"hidden",
        }}
      >
        {/* Shine layer */}
        {hov && (
          <div style={{
            position:"absolute", inset:0, zIndex:6, pointerEvents:"none", borderRadius:16,
            background:`radial-gradient(circle at ${shine.x}% ${shine.y}%, ${t.glow}30 0%, transparent 55%)`,
          }} />
        )}

        {/* Scanlines */}
        <div style={{
          position:"absolute", inset:0, zIndex:5, pointerEvents:"none",
          backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.07) 3px,rgba(0,0,0,0.07) 4px)",
          borderRadius:16,
        }} />

        {/* TOP BAR */}
        <div style={{
          position:"absolute", top:0, left:0, right:0, zIndex:10,
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"7px 9px",
          background:`linear-gradient(180deg,${t.bg}ff 0%,transparent 100%)`,
        }}>
          <div style={{
            fontFamily:"'Nunito',sans-serif", fontWeight:900,
            fontSize:"clamp(8px,1.7vw,11px)", color:"#fff",
            textShadow:`0 0 10px ${t.glow}`, letterSpacing:0.5,
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"58%",
          }}>
            {(artist.name || "ARTIST").toUpperCase()}
          </div>
          <div style={{
            background:`${t.glow}20`, border:`1px solid ${t.glow}55`,
            borderRadius:5, padding:"2px 6px",
            fontSize:"clamp(6px,1.2vw,8px)", fontWeight:900,
            color:t.typeColor, fontFamily:"'Nunito',sans-serif",
            letterSpacing:0.5, flexShrink:0, display:"flex", alignItems:"center", gap:2,
          }}>
            {t.symbol} {t.type}
          </div>
        </div>

        {/* PHOTO */}
        <div style={{
          position:"absolute", top:24, left:7, right:7,
          height:"50%", borderRadius:9, overflow:"hidden",
          border:`1px solid ${t.border}33`,
          background:`radial-gradient(ellipse at center,${t.bg}88,#080810)`,
        }}>
          {artist.profileImage ? (
            <img src={artist.profileImage} alt={artist.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
          ) : (
            <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"clamp(24px,5vw,42px)", opacity:0.5 }}>
              {ICONS[artist.category] || ICONS.default}
            </div>
          )}
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg,transparent 50%,${t.glow}10)`, pointerEvents:"none" }} />
        </div>

        {/* BOTTOM */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0,
          padding:"7px 9px 9px",
          background:`linear-gradient(0deg,${t.bg}ff 0%,${t.bg}bb 50%,transparent 100%)`,
        }}>
          {artist.city && (
            <div style={{ fontSize:"clamp(6px,1.1vw,8px)", color:`${t.typeColor}99`, fontFamily:"'Nunito',sans-serif", fontWeight:700, marginBottom:3, letterSpacing:0.3 }}>
              📍 {artist.city.toUpperCase()}
            </div>
          )}

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <div style={{ display:"flex", gap:1 }}>
              {Array.from({ length:5 }).map((_,i) => (
                <span key={i} style={{ fontSize:"clamp(6px,1.2vw,9px)", color: i < stars ? "#ffd600" : "rgba(255,255,255,0.12)" }}>★</span>
              ))}
            </div>
            <span style={{ fontSize:"clamp(6px,1.1vw,8px)", color:`${t.typeColor}88`, fontFamily:"'Nunito',sans-serif", fontWeight:700 }}>{hp} HP</span>
          </div>

          {/* HP bar */}
          <div style={{ height:2, borderRadius:1, background:"rgba(255,255,255,0.06)", marginBottom:6, overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:1,
              width:`${Math.min(100,(hp/350)*100)}%`,
              background:`linear-gradient(90deg,${t.glow},${t.accent}66)`,
              boxShadow:`0 0 5px ${t.glow}`,
            }} />
          </div>

          <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
            <span style={{
              background:`${t.glow}15`, border:`1px solid ${t.glow}40`,
              color:t.typeColor, fontSize:"clamp(5px,1.1vw,8px)", fontWeight:800,
              padding:"1px 6px", borderRadius:3, fontFamily:"'Nunito',sans-serif",
            }}>
              {ICONS[artist.category] || "✨"} {artist.category || "Artist"}
            </span>
            {artist.postCount > 0 && (
              <span style={{
                background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                color:"rgba(255,255,255,0.45)", fontSize:"clamp(5px,1.1vw,8px)", fontWeight:700,
                padding:"1px 6px", borderRadius:3, fontFamily:"'Nunito',sans-serif",
              }}>
                {artist.postCount} works
              </span>
            )}
          </div>
        </div>

        {/* Corner foil */}
        <div style={{
          position:"absolute", top:0, right:0, width:36, height:36, pointerEvents:"none", zIndex:4,
          background:`conic-gradient(from 45deg,${t.glow}44,transparent,${t.glow}22)`,
          borderTopRightRadius:16, opacity: hov ? 1 : 0.3, transition:"opacity 0.3s",
        }} />
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
        console.error("Artists fetch error:", err.response?.status, err.response?.data || err.message);
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
    <div style={{ minHeight:"100vh", background:"#080810", color:"#fff", overflowX:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing:border-box; }
        @keyframes shimmer { 0%{opacity:.3} 50%{opacity:.6} 100%{opacity:.3} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .search-input::placeholder { color:rgba(255,255,255,0.22); }
        .search-input:focus { outline:none; border-color:rgba(255,255,255,0.35)!important; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:3px; }
        .cat-btn:hover { opacity:1!important; transform:translateY(-1px); }
        .tcg-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
        @media(min-width:480px)  { .tcg-grid { grid-template-columns:repeat(3,1fr)!important; gap:12px!important; } }
        @media(min-width:720px)  { .tcg-grid { grid-template-columns:repeat(4,1fr)!important; gap:14px!important; } }
        @media(min-width:1024px) { .tcg-grid { grid-template-columns:repeat(5,1fr)!important; gap:16px!important; } }
        @media(min-width:1280px) { .tcg-grid { grid-template-columns:repeat(6,1fr)!important; } }
      `}</style>

      {/* ambient bg */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}>
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 15% 50%,rgba(157,78,221,0.06),transparent 60%)" }} />
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 85% 20%,rgba(0,207,255,0.05),transparent 60%)" }} />
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 55% 85%,rgba(255,77,109,0.05),transparent 60%)" }} />
      </div>

      <div style={{ position:"relative", zIndex:100 }}><Navbar /></div>

      <div style={{ position:"relative", zIndex:10, paddingBottom:80 }}>

        {/* HEADER */}
        <div style={{ textAlign:"center", padding:"88px 20px 20px", animation:"fadeUp 0.5s ease" }}>
          <button onClick={() => navigate("/")} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.25)", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif", marginBottom:14, padding:0, letterSpacing:2 }}>
            ← HOME
          </button>
          <div style={{ fontSize:11, fontWeight:900, color:"rgba(255,255,255,0.2)", letterSpacing:7, textTransform:"uppercase", marginBottom:8, fontFamily:"'Nunito',sans-serif" }}>
            ARTSPIRE TCG
          </div>
          <h1 style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:"clamp(26px,6vw,50px)", margin:"0 0 6px", letterSpacing:-1, background:"linear-gradient(135deg,#fff 30%,rgba(255,255,255,0.35))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            ARTIST CARDS
          </h1>
          <p style={{ color:"rgba(255,255,255,0.25)", fontSize:12, fontWeight:700, margin:0, fontFamily:"'Nunito',sans-serif" }}>
            {loading ? "Shuffling deck..." : error ? "Failed to load." : `${filtered.length} card${filtered.length !== 1 ? "s" : ""} in collection`}
          </p>
        </div>

        {/* SEARCH + FILTER */}
        <div style={{ maxWidth:680, margin:"0 auto", padding:"0 14px 20px", animation:"fadeUp 0.5s ease 0.07s both" }}>
          <div style={{ position:"relative", marginBottom:12 }}>
            <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontSize:13, pointerEvents:"none" }}>🔍</span>
            <input
              className="search-input"
              placeholder="Search cards by name or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width:"100%", padding:"10px 38px 10px 40px",
                borderRadius:10, border:"1.5px solid rgba(255,255,255,0.07)",
                background:"rgba(255,255,255,0.04)", backdropFilter:"blur(12px)",
                color:"#fff", fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight:700,
              }}
            />
            {search && <button onClick={() => setSearch("")} style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:13 }}>✕</button>}
          </div>

          <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2 }}>
            {CATEGORIES.map(cat => {
              const t = TCG[cat] || TCG.default;
              const isActive = activeCategory === cat;
              return (
                <button key={cat} className="cat-btn" onClick={() => setActiveCategory(cat)} style={{
                  padding:"5px 12px", borderRadius:7, border:"1.5px solid",
                  borderColor: isActive ? t.glow : "rgba(255,255,255,0.07)",
                  background:  isActive ? `${t.glow}1a` : "rgba(255,255,255,0.02)",
                  color:       isActive ? t.typeColor : "rgba(255,255,255,0.35)",
                  fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:10,
                  cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, letterSpacing:0.3,
                  boxShadow: isActive ? `0 0 10px ${t.glow}44` : "none",
                  transition:"all 0.18s ease",
                }}>
                  {cat !== "All" ? `${TCG[cat]?.symbol || "✨"} ${cat}` : "◼ All"}
                </button>
              );
            })}
          </div>
        </div>

        {/* GRID */}
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"0 10px" }}>
          {error ? (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:40, marginBottom:10 }}>⚠️</div>
              <div style={{ color:"rgba(255,255,255,0.3)", fontSize:13, fontWeight:700, marginBottom:14 }}>Failed to load cards</div>
              <button onClick={() => window.location.reload()} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", color:"#fff", padding:"9px 22px", borderRadius:8, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Retry</button>
            </div>
          ) : filtered.length === 0 && !loading ? (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🃏</div>
              <div style={{ color:"rgba(255,255,255,0.3)", fontSize:13, fontWeight:700 }}>No cards found{search ? ` for "${search}"` : ""}</div>
            </div>
          ) : (
            <div className="tcg-grid">
              {loading
                ? Array.from({ length:12 }).map((_,i) => <SkeletonCard key={i} />)
                : filtered.map(artist => <TCGCard key={artist._id} artist={artist} />)
              }
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM STATS */}
      {!loading && !error && artists.length > 0 && (
        <div style={{
          position:"fixed", bottom:0, left:0, right:0, zIndex:50,
          background:"rgba(8,8,16,0.96)", backdropFilter:"blur(20px)",
          borderTop:"1px solid rgba(255,255,255,0.05)",
          display:"flex", justifyContent:"center",
          gap:"clamp(18px,5vw,56px)", padding:"9px 20px 11px",
        }}>
          {[
            { label:"Cards",  value:artists.length },
            { label:"Types",  value:[...new Set(artists.map(a=>a.category).filter(Boolean))].length },
            { label:"Works",  value:artists.reduce((s,a)=>s+(a.postCount||0),0) },
            { label:"Cities", value:[...new Set(artists.map(a=>a.city).filter(Boolean))].length },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign:"center" }}>
              <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:"clamp(14px,3vw,20px)", color:"#fff" }}>{value}</div>
              <div style={{ fontSize:8, color:"rgba(255,255,255,0.2)", fontWeight:800, letterSpacing:1, textTransform:"uppercase", fontFamily:"'Nunito',sans-serif" }}>{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}