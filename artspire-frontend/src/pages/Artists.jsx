import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Navbar";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const PALETTES = {
  Singer:       { a: "#ff4d6d", b: "#c9184a" },
  Dancer:       { a: "#7209b7", b: "#f72585" },
  Musician:     { a: "#0096c7", b: "#48cae4" },
  Painter:      { a: "#f4a261", b: "#e76f51" },
  Photographer: { a: "#2d6a4f", b: "#74c69d" },
  Actor:        { a: "#ffd60a", b: "#f48c06" },
  Comedian:     { a: "#06d6a0", b: "#118ab2" },
  default:      { a: "#9d4edd", b: "#c77dff" },
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
    <div style={{
      aspectRatio:"1/1", borderRadius:0, overflow:"hidden",
      background:"#1a1a2e", position:"relative",
    }}>
      <div style={{ width:"100%", height:"100%", background:"rgba(255,255,255,0.06)", animation:"shimmer 1.4s infinite" }} />
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"8px", background:"linear-gradient(transparent,rgba(0,0,0,0.8))" }}>
        <div style={{ height:10, width:"60%", borderRadius:4, background:"rgba(255,255,255,0.15)", marginBottom:4 }} />
        <div style={{ height:8, width:"40%", borderRadius:4, background:"rgba(255,255,255,0.08)" }} />
      </div>
    </div>
  );
}

function ArtistCard({ artist }) {
  const [hov, setHov] = useState(false);
  const p    = PALETTES[artist.category] || PALETTES.default;
  const icon = ICONS[artist.category] || ICONS.default;
  const artistId = getId(artist);
  if (!artistId) return null;

  const stars = Math.round(artist.rating || 5);

  return (
    <Link to={`/artist/${artistId}`} style={{ textDecoration:"none", display:"block" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          position:"relative", aspectRatio:"1/1", overflow:"hidden",
          cursor:"pointer",
          transform: hov ? "scale(0.97)" : "scale(1)",
          transition: "transform 0.2s ease",
        }}
      >
        {/* Photo or gradient fallback */}
        {artist.profileImage ? (
          <img
            src={artist.profileImage}
            alt={artist.name}
            style={{
              width:"100%", height:"100%", objectFit:"cover", display:"block",
              transform: hov ? "scale(1.06)" : "scale(1)",
              transition: "transform 0.4s ease",
            }}
          />
        ) : (
          <div style={{
            width:"100%", height:"100%",
            background:`linear-gradient(135deg, ${p.a} 0%, ${p.b} 100%)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"clamp(28px,6vw,44px)",
          }}>
            {icon}
          </div>
        )}

        {/* Always-visible gradient overlay */}
        <div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)",
        }} />

        {/* Category badge top-left */}
        <div style={{
          position:"absolute", top:6, left:6,
          background:`linear-gradient(135deg,${p.a},${p.b})`,
          color:"#fff", fontSize:9, fontWeight:800,
          padding:"3px 7px", borderRadius:4,
          fontFamily:"'Nunito',sans-serif", letterSpacing:0.5,
          textTransform:"uppercase",
        }}>
          {artist.category || "Artist"}
        </div>

        {/* Online dot / post count top-right */}
        {artist.postCount > 0 && (
          <div style={{
            position:"absolute", top:6, right:6,
            background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)",
            color:"#fff", fontSize:9, fontWeight:700,
            padding:"3px 7px", borderRadius:4,
            fontFamily:"'Nunito',sans-serif",
          }}>
            {artist.postCount} works
          </div>
        )}

        {/* Bottom info */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"8px 10px 10px" }}>
          <div style={{
            fontFamily:"'Nunito',sans-serif", fontWeight:900,
            fontSize:"clamp(11px,2.5vw,14px)", color:"#fff",
            lineHeight:1.1, marginBottom:2,
            textShadow:"0 1px 6px rgba(0,0,0,0.8)",
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
          }}>
            {artist.name}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ display:"flex", gap:1 }}>
              {Array.from({ length:5 }).map((_,i) => (
                <span key={i} style={{ fontSize:8, color: i < stars ? "#ffd60a" : "rgba(255,255,255,0.25)" }}>★</span>
              ))}
            </div>
            {artist.city && (
              <span style={{ fontSize:9, color:"rgba(255,255,255,0.65)", fontFamily:"'Nunito',sans-serif", fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                · {artist.city}
              </span>
            )}
          </div>
        </div>

        {/* Hover overlay */}
        {hov && (
          <div style={{
            position:"absolute", inset:0,
            background:"rgba(0,0,0,0.35)",
            display:"flex", alignItems:"center", justifyContent:"center",
            backdropFilter:"blur(1px)",
          }}>
            <div style={{
              background:"rgba(255,255,255,0.2)",
              backdropFilter:"blur(12px)",
              border:"1px solid rgba(255,255,255,0.4)",
              color:"#fff",
              fontFamily:"'Nunito',sans-serif", fontWeight:800,
              fontSize:11, padding:"7px 16px", borderRadius:20,
              letterSpacing:0.5,
            }}>
              VIEW PROFILE
            </div>
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
              ...a,
              _id:          id,
              postCount:    postData.filter(p => p.artistId === id).length,
              profileImage: a.profileImage
                || postData.find(p => p.artistId === id && p.type === "image")?.media
                || null,
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
    <div style={{ minHeight:"100vh", background:"#0d0d14", color:"#fff", overflowX:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing:border-box; }
        @keyframes shimmer { 0%{opacity:.4} 50%{opacity:.9} 100%{opacity:.4} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .search-input::placeholder { color:rgba(255,255,255,0.35); }
        .search-input:focus { outline:none; border-color:rgba(255,255,255,0.5)!important; }
        .cat-pill { transition:all 0.18s ease; }
        .cat-pill:hover { opacity:1!important; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); border-radius:4px; }
      `}</style>

      {/* Video BG */}
      <video autoPlay loop muted playsInline style={{ position:"fixed", inset:0, width:"100%", height:"100%", objectFit:"cover", zIndex:0, opacity:0.3 }}>
        <source src="/artbg.mp4" type="video/mp4" />
      </video>
      <div style={{ position:"fixed", inset:0, background:"rgba(13,13,20,0.7)", zIndex:1, pointerEvents:"none" }} />

      <div style={{ position:"relative", zIndex:100 }}><Navbar /></div>

      <div style={{ position:"relative", zIndex:10 }}>

        {/* ── HEADER ── */}
        <div style={{ padding:"100px 16px 20px", maxWidth:680, margin:"0 auto", animation:"fadeUp 0.4s ease" }}>
          <button
            onClick={() => navigate("/")}
            style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif", marginBottom:10, padding:0 }}
          >
            ← Home
          </button>
          <h1 style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:"clamp(24px,6vw,38px)", margin:"0 0 4px", letterSpacing:-0.5 }}>
            Discover Artists
          </h1>
          <p style={{ margin:0, color:"rgba(255,255,255,0.4)", fontSize:13, fontWeight:600, fontFamily:"'Nunito',sans-serif" }}>
            {loading ? "Finding artists..." : error ? "Failed to load." : `${filtered.length} artist${filtered.length !== 1 ? "s" : ""} found`}
          </p>
        </div>

        {/* ── SEARCH + FILTERS ── */}
        <div style={{ padding:"0 16px 16px", maxWidth:680, margin:"0 auto", animation:"fadeUp 0.4s ease 0.05s both" }}>
          {/* Search */}
          <div style={{ position:"relative", marginBottom:12 }}>
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:15, pointerEvents:"none" }}>🔍</span>
            <input
              className="search-input"
              placeholder="Search by name or city..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width:"100%", padding:"11px 40px 11px 42px",
                borderRadius:12, border:"1.5px solid rgba(255,255,255,0.12)",
                background:"rgba(255,255,255,0.07)", backdropFilter:"blur(12px)",
                color:"#fff", fontFamily:"'Nunito',sans-serif", fontSize:14, fontWeight:600,
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"rgba(255,255,255,0.4)", cursor:"pointer", fontSize:15 }}>✕</button>
            )}
          </div>

          {/* Category pills — scrollable on mobile */}
          <div style={{ display:"flex", gap:7, overflowX:"auto", paddingBottom:4 }}>
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat;
              const p = PALETTES[cat] || PALETTES.default;
              return (
                <button
                  key={cat}
                  className="cat-pill"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding:"7px 14px", borderRadius:8, border:"1.5px solid",
                    borderColor: isActive ? p.a : "rgba(255,255,255,0.12)",
                    background: isActive ? `linear-gradient(135deg,${p.a}44,${p.b}22)` : "rgba(255,255,255,0.05)",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
                    fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12,
                    cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
                    opacity: isActive ? 1 : 0.8,
                  }}
                >
                  {cat !== "All" && (ICONS[cat] || "✨") + " "}{cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── GRID ── */}
        <div style={{ padding:"0 0 80px" }}>
          {error ? (
            <div style={{ textAlign:"center", padding:"60px 20px", fontFamily:"'Nunito',sans-serif" }}>
              <div style={{ fontSize:44, marginBottom:12 }}>⚠️</div>
              <div style={{ color:"rgba(255,255,255,0.4)", fontSize:15, fontWeight:700, marginBottom:16 }}>Failed to load artists</div>
              <button
                onClick={() => window.location.reload()}
                style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", padding:"10px 24px", borderRadius:10, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}
              >
                Try Again
              </button>
            </div>
          ) : filtered.length === 0 && !loading ? (
            <div style={{ textAlign:"center", padding:"60px 20px", fontFamily:"'Nunito',sans-serif" }}>
              <div style={{ fontSize:44, marginBottom:12 }}>🎭</div>
              <div style={{ color:"rgba(255,255,255,0.4)", fontSize:15, fontWeight:700 }}>
                No artists found{search ? ` for "${search}"` : activeCategory !== "All" ? ` in ${activeCategory}` : ""}
              </div>
            </div>
          ) : (
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(3, 1fr)",
              gap:2,
            }}>
              <style>{`
                @media(min-width:600px)  { .ag { grid-template-columns:repeat(4,1fr)!important; } }
                @media(min-width:900px)  { .ag { grid-template-columns:repeat(5,1fr)!important; } }
                @media(min-width:1200px) { .ag { grid-template-columns:repeat(6,1fr)!important; } }
              `}</style>
              {loading
                ? Array.from({ length:12 }).map((_, i) => <SkeletonCard key={i} />)
                : filtered.map(artist => <ArtistCard key={artist._id} artist={artist} />)
              }
            </div>
          )}
        </div>

        {/* ── STATS BAR ── */}
        {!loading && !error && artists.length > 0 && (
          <div style={{
            position:"fixed", bottom:0, left:0, right:0, zIndex:50,
            background:"rgba(13,13,20,0.92)", backdropFilter:"blur(20px)",
            borderTop:"1px solid rgba(255,255,255,0.08)",
            display:"flex", justifyContent:"center", gap:"clamp(16px,5vw,48px)",
            padding:"10px 20px 12px",
            animation:"fadeUp 0.4s ease",
          }}>
            {[
              { label:"Artists",    value:artists.length },
              { label:"Categories", value:[...new Set(artists.map(a=>a.category).filter(Boolean))].length },
              { label:"Works",      value:artists.reduce((s,a) => s+(a.postCount||0), 0) },
              { label:"Cities",     value:[...new Set(artists.map(a=>a.city).filter(Boolean))].length },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:"clamp(15px,3vw,20px)", color:"#fff" }}>{value}</div>
                <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:9, color:"rgba(255,255,255,0.35)", fontWeight:700, letterSpacing:1, textTransform:"uppercase" }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}