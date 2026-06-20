import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Navbar";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const CAT_THEME = {
  Singer:       { color:"#e8a87c", fire:"#c0392b,#8b1a00", tagline:"The Voice of Souls" },
  Dancer:       { color:"#c39bd3", fire:"#6c3483,#2c0e45", tagline:"Grace in Motion" },
  Musician:     { color:"#7fb3d3", fire:"#1a5276,#0a2040", tagline:"Master of Melody" },
  Painter:      { color:"#f0b27a", fire:"#935116,#4a2800", tagline:"Creator of Worlds" },
  Photographer: { color:"#76d7c4", fire:"#1e8449,#0a3d20", tagline:"Keeper of Moments" },
  Actor:        { color:"#f9e79f", fire:"#9a7d0a,#4d3b00", tagline:"Born of the Stage" },
  Comedian:     { color:"#abebc6", fire:"#1a6b3c,#0a3520", tagline:"The Jester of Joy" },
  default:      { color:"#e59866", fire:"#a04000,#4d1c00", tagline:"Creative Soul" },
};

const ICONS = {
  Singer:"🎤", Dancer:"💃", Musician:"🎵", Painter:"🎨",
  Photographer:"📷", Actor:"🎭", Comedian:"😂", default:"✨",
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
      borderRadius:0, overflow:"hidden",
      background:"#0a0502", animation:"shimmer 1.6s infinite",
      border:"1px solid rgba(180,120,60,0.15)",
    }}>
      <div style={{ width:"100%", aspectRatio:"3/4", background:"#150a04" }}/>
      <div style={{ padding:"14px 12px 18px", display:"flex", flexDirection:"column", gap:8 }}>
        <div style={{ height:18, width:"55%", borderRadius:2, background:"#1f1208" }}/>
        <div style={{ height:10, width:"75%", borderRadius:2, background:"#150d05" }}/>
        <div style={{ height:9,  width:"50%", borderRadius:2, background:"#100a03", marginTop:2 }}/>
      </div>
    </div>
  );
}

function ArtistCard({ artist }) {
  const [hov, setHov] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const theme   = CAT_THEME[artist.category] || CAT_THEME.default;
  const icon    = ICONS[artist.category] || ICONS.default;
  const id      = getId(artist);
  if (!id) return null;
  const initials = artist.name
    ? artist.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "A";

  const [fireA, fireB] = theme.fire.split(",");

  return (
    <Link to={`/artist/${id}`} style={{ textDecoration:"none", display:"block" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          position:"relative", overflow:"hidden",
          border: hov
            ? `1px solid ${theme.color}`
            : "1px solid rgba(180,120,60,0.25)",
          boxShadow: hov
            ? `0 0 32px ${theme.color}55, 0 0 80px ${fireA}33, inset 0 0 24px rgba(0,0,0,0.6)`
            : "0 4px 24px rgba(0,0,0,0.8), inset 0 0 16px rgba(0,0,0,0.5)",
          transform: hov ? "scale(1.025)" : "scale(1)",
          transition:"all 0.3s cubic-bezier(.22,.61,.36,1)",
          cursor:"pointer",
          background:"#080402",
        }}
      >
        {/* ── PORTRAIT ── */}
        <div style={{
          width:"100%", aspectRatio:"3/4",
          position:"relative", overflow:"hidden",
          background: `radial-gradient(ellipse at 50% 20%, ${fireA}cc 0%, ${fireB}ee 50%, #020100 100%)`,
        }}>

          {/* Texture grain overlay */}
          <div style={{
            position:"absolute", inset:0, zIndex:2, pointerEvents:"none", mixBlendMode:"overlay",
            backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
            backgroundSize:"180px", opacity:0.25,
          }}/>

          {/* Photo */}
          {artist.profileImage && !imgErr ? (
            <>
              <img
                src={artist.profileImage}
                alt={artist.name}
                onError={() => setImgErr(true)}
                style={{
                  position:"absolute", inset:0,
                  width:"100%", height:"100%",
                  objectFit:"cover", objectPosition:"top center",
                  display:"block", zIndex:1,
                  transition:"transform 0.5s ease",
                  transform: hov ? "scale(1.07)" : "scale(1)",
                  filter:"contrast(1.12) saturate(0.85) brightness(0.88)",
                }}
              />
              {/* Dark vignette bottom */}
              <div style={{
                position:"absolute", inset:0, zIndex:3, pointerEvents:"none",
                background:"linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 35%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.95) 100%)",
              }}/>
              {/* Side vignettes */}
              <div style={{
                position:"absolute", inset:0, zIndex:3, pointerEvents:"none",
                background:"linear-gradient(to right, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.35) 100%)",
              }}/>
            </>
          ) : (
            /* No-photo illustrated placeholder */
            <div style={{
              position:"absolute", inset:0, zIndex:1,
              display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", gap:10,
            }}>
              {/* Ornate circle */}
              <div style={{
                width:100, height:100, borderRadius:"50%",
                border:`2px solid ${theme.color}88`,
                boxShadow:`0 0 40px ${theme.color}44, inset 0 0 30px rgba(0,0,0,0.6)`,
                background:`radial-gradient(circle, ${fireA}55, ${fireB}99)`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:44,
              }}>
                {icon}
              </div>
              <span style={{
                fontFamily:"'Cinzel',serif",
                fontSize:"clamp(20px,5vw,30px)", fontWeight:700,
                color: theme.color,
                textShadow:`0 0 30px ${theme.color}99`,
                letterSpacing:6,
              }}>
                {initials}
              </span>
              {/* Horizontal ornament */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:4 }}>
                <div style={{ width:24, height:1, background:`linear-gradient(90deg,transparent,${theme.color})` }}/>
                <div style={{ width:5, height:5, borderRadius:"50%", background:theme.color }}/>
                <div style={{ width:24, height:1, background:`linear-gradient(90deg,${theme.color},transparent)` }}/>
              </div>
            </div>
          )}

          {/* Top ornamental border */}
          <div style={{
            position:"absolute", top:0, left:0, right:0, height:3, zIndex:10,
            background:`linear-gradient(90deg, transparent 0%, ${theme.color}cc 30%, ${theme.color} 50%, ${theme.color}cc 70%, transparent 100%)`,
          }}/>

          {/* Category tag — top right */}
          <div style={{
            position:"absolute", top:10, right:10, zIndex:10,
            background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)",
            border:`1px solid ${theme.color}66`,
            color:theme.color, fontSize:9, fontWeight:700,
            padding:"3px 8px", letterSpacing:1.5,
            fontFamily:"'Cinzel',serif", textTransform:"uppercase",
          }}>
            {artist.category || "Artist"}
          </div>

          {/* Price — top left */}
          {artist.price && (
            <div style={{
              position:"absolute", top:10, left:10, zIndex:10,
              background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)",
              border:`1px solid ${theme.color}44`,
              color: theme.color, fontSize:9, fontWeight:700,
              padding:"3px 8px", letterSpacing:1,
              fontFamily:"'Cinzel',serif",
            }}>
              ₹{Number(artist.price).toLocaleString("en-IN")}
            </div>
          )}

          {/* Bottom-of-portrait: name over the fade */}
          <div style={{
            position:"absolute", bottom:0, left:0, right:0, zIndex:10,
            padding:"0 14px 14px",
          }}>
            {/* Rating */}
            <div style={{ display:"flex", gap:2, marginBottom:5 }}>
              {Array.from({ length:5 }).map((_,i) => (
                <span key={i} style={{
                  fontSize:10,
                  color: i < Math.round(artist.rating||5) ? "#ffd600" : "rgba(255,255,255,0.15)",
                }}>★</span>
              ))}
              <span style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginLeft:4, lineHeight:"12px" }}>
                {(artist.rating||5).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* ── NAME + TAGLINE PANEL ── */}
        <div style={{
          padding:"12px 14px 16px",
          background:`linear-gradient(180deg, #0c0603 0%, #060301 100%)`,
          borderTop:`1px solid ${theme.color}33`,
          position:"relative", overflow:"hidden",
        }}>
          {/* Subtle glow behind text */}
          <div style={{
            position:"absolute", bottom:-10, left:"50%", transform:"translateX(-50%)",
            width:"80%", height:40, borderRadius:"50%",
            background:`radial-gradient(ellipse, ${theme.color}18, transparent 70%)`,
            pointerEvents:"none",
          }}/>

          {/* Artist name */}
          <div style={{
            fontFamily:"'Cinzel',serif",
            fontSize:"clamp(12px,2.8vw,16px)",
            fontWeight:700,
            color:"#e8d5b0",
            letterSpacing:1.5,
            textAlign:"center",
            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
            marginBottom:4,
            textShadow:`0 0 20px ${theme.color}66`,
          }}>
            {artist.name}
          </div>

          {/* Ornamental divider */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, justifyContent:"center" }}>
            <div style={{ flex:1, height:"0.5px", background:`linear-gradient(90deg,transparent,${theme.color}88)` }}/>
            <span style={{ color:theme.color, fontSize:8 }}>✦</span>
            <div style={{ flex:1, height:"0.5px", background:`linear-gradient(90deg,${theme.color}88,transparent)` }}/>
          </div>

          {/* City & tagline */}
          <div style={{ textAlign:"center" }}>
            {artist.city && (
              <div style={{
                fontSize:9, color:"rgba(200,170,120,0.6)",
                fontFamily:"'Cinzel',serif", letterSpacing:2,
                textTransform:"uppercase", marginBottom:3,
              }}>
                {artist.city}
              </div>
            )}
            <div style={{
              fontSize:9, color:theme.color,
              fontFamily:"'Cinzel',serif", letterSpacing:1.5,
              fontStyle:"italic", opacity:0.8,
            }}>
              {theme.tagline}
            </div>
          </div>

          {/* Post count badge */}
          {artist.postCount > 0 && (
            <div style={{
              position:"absolute", bottom:10, right:12,
              fontSize:8, color:"rgba(200,160,80,0.4)",
              fontFamily:"'Cinzel',serif", letterSpacing:1,
            }}>
              🎨 {artist.postCount}
            </div>
          )}
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
              postCount: postData.filter(p => p.artistId === id).length,
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
      background:"#060301",
      color:"#e8d5b0",
      fontFamily:"'Nunito',sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes shimmer { 0%{opacity:.3} 50%{opacity:.7} 100%{opacity:.3} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes flicker { 0%,100%{opacity:1} 50%{opacity:0.85} 92%{opacity:0.95} }
        .search-input::placeholder { color: rgba(200,160,80,0.25); }
        .search-input:focus { outline:none; border-color:#c9a84c !important; box-shadow:0 0 0 3px rgba(200,160,80,0.1); }
        .cat-pill { transition: all 0.2s ease; }
        .cat-pill:hover { transform: translateY(-2px); }
        .artist-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 2px;
        }
        @media(min-width:480px)  { .artist-grid { grid-template-columns: repeat(3,1fr) !important; } }
        @media(min-width:720px)  { .artist-grid { grid-template-columns: repeat(4,1fr) !important; } }
        @media(min-width:1024px) { .artist-grid { grid-template-columns: repeat(5,1fr) !important; } }
        @media(min-width:1280px) { .artist-grid { grid-template-columns: repeat(6,1fr) !important; } }
        .cat-strip::-webkit-scrollbar { display:none; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#2a1a08; border-radius:2px; }
      `}</style>

      {/* VIDEO BG */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}>
        <video autoPlay loop muted playsInline
          style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.08 }}>
          <source src="/artbg.mp4" type="video/mp4"/>
        </video>
        <div style={{ position:"absolute", inset:0, background:"rgba(4,2,1,0.88)" }}/>
      </div>

      <div style={{ position:"relative", zIndex:100 }}><Navbar/></div>

      <div style={{ position:"relative", zIndex:10, paddingBottom:110 }}>

        {/* ── HEADER ── */}
        <div style={{ textAlign:"center", padding:"88px 20px 28px", animation:"fadeUp 0.5s ease" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background:"none", border:"none",
              color:"rgba(200,160,80,0.3)", fontSize:10, fontWeight:700,
              cursor:"pointer", fontFamily:"'Cinzel',serif",
              marginBottom:18, letterSpacing:3,
            }}
          >
            ← HOME
          </button>

          {/* Decorative top line */}
          <div style={{ display:"flex", alignItems:"center", gap:12, justifyContent:"center", marginBottom:16 }}>
            <div style={{ height:"0.5px", width:60, background:"linear-gradient(90deg,transparent,#c9a84c)" }}/>
            <span style={{ color:"#c9a84c", fontSize:14 }}>✦</span>
            <div style={{ height:"0.5px", width:60, background:"linear-gradient(90deg,#c9a84c,transparent)" }}/>
          </div>

          <h1 style={{
            fontFamily:"'Cinzel',serif",
            fontWeight:900, fontSize:"clamp(28px,6vw,52px)",
            margin:"0 0 10px", letterSpacing:4, color:"#e8d5b0",
            textShadow:"0 0 40px rgba(200,160,80,0.4)",
            animation:"flicker 4s ease infinite",
          }}>
            DISCOVER <span style={{ color:"#c9a84c" }}>ARTISTS</span>
          </h1>

          <p style={{
            fontFamily:"'Cinzel',serif",
            color:"rgba(200,160,80,0.4)", fontSize:10,
            fontWeight:400, margin:0, letterSpacing:4, textTransform:"uppercase",
          }}>
            {loading ? "Summoning Creatives…"
              : error   ? "The scroll could not be read."
              : `${filtered.length} Creative Soul${filtered.length !== 1 ? "s" : ""} Found`}
          </p>
        </div>

        {/* ── SEARCH + FILTERS ── */}
        <div style={{ maxWidth:720, margin:"0 auto", padding:"0 16px 32px", animation:"fadeUp 0.4s ease 0.1s both" }}>
          <div style={{ position:"relative", marginBottom:14 }}>
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:14, pointerEvents:"none", opacity:0.5 }}>🔍</span>
            <input
              className="search-input"
              placeholder="Search by name or city…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width:"100%", padding:"12px 42px 12px 44px",
                border:"1px solid rgba(200,160,80,0.2)",
                background:"rgba(10,6,2,0.8)", color:"#e8d5b0",
                fontFamily:"'Cinzel',serif", fontSize:12, letterSpacing:1,
                backdropFilter:"blur(8px)",
                transition:"border-color 0.2s, box-shadow 0.2s",
                borderRadius:0,
              }}
            />
            {search && (
              <button onClick={() => setSearch("")}
                style={{
                  position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                  background:"rgba(200,160,80,0.1)", border:"1px solid rgba(200,160,80,0.2)",
                  color:"rgba(200,160,80,0.5)", cursor:"pointer",
                  fontSize:11, width:22, height:22, borderRadius:"50%",
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}
              >✕</button>
            )}
          </div>

          {/* Category pills */}
          <div className="cat-strip" style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4 }}>
            {CATEGORIES.map(cat => {
              const t = CAT_THEME[cat] || CAT_THEME.default;
              const isActive = activeCategory === cat;
              return (
                <button key={cat} className="cat-pill"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding:"5px 14px", flexShrink:0,
                    border: isActive
                      ? `1px solid ${t.color}`
                      : "1px solid rgba(200,160,80,0.15)",
                    background: isActive
                      ? `rgba(200,160,80,0.1)` : "rgba(4,2,0,0.6)",
                    color: isActive ? t.color : "rgba(200,160,80,0.3)",
                    fontFamily:"'Cinzel',serif", fontWeight:600, fontSize:10,
                    cursor:"pointer", whiteSpace:"nowrap",
                    letterSpacing:1.5, textTransform:"uppercase",
                    boxShadow: isActive ? `0 0 16px ${t.color}33` : "none",
                    borderRadius:0,
                  }}
                >
                  {cat !== "All" ? `${ICONS[cat]||"✨"} ${cat}` : "✦ All"}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── GRID ── */}
        <div style={{ maxWidth:1440, margin:"0 auto", padding:"0 2px" }}>
          {error ? (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
              <div style={{ color:"rgba(200,160,80,0.3)", fontSize:12, fontFamily:"'Cinzel',serif", letterSpacing:2, marginBottom:20 }}>
                THE SCROLL COULD NOT BE READ
              </div>
              <button onClick={() => window.location.reload()}
                style={{
                  background:"transparent", border:"1px solid #c9a84c",
                  color:"#c9a84c", padding:"10px 28px",
                  fontFamily:"'Cinzel',serif", fontSize:11, fontWeight:700,
                  letterSpacing:2, cursor:"pointer",
                }}
              >TRY AGAIN</button>
            </div>
          ) : filtered.length === 0 && !loading ? (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🎭</div>
              <div style={{ color:"rgba(200,160,80,0.3)", fontSize:12, fontFamily:"'Cinzel',serif", letterSpacing:2 }}>
                NO SOULS FOUND{search ? ` FOR "${search.toUpperCase()}"` : ""}
              </div>
            </div>
          ) : (
            <div className="artist-grid">
              {loading
                ? Array.from({ length:12 }).map((_,i) => <SkeletonCard key={i}/>)
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
          background:"rgba(4,2,1,0.97)", backdropFilter:"blur(20px)",
          borderTop:"1px solid rgba(200,160,80,0.15)",
          display:"flex", justifyContent:"center",
          gap:"clamp(24px,6vw,80px)", padding:"10px 20px 14px",
        }}>
          {[
            { label:"Souls",       value:artists.length },
            { label:"Crafts",      value:[...new Set(artists.map(a=>a.category).filter(Boolean))].length },
            { label:"Creations",   value:artists.reduce((s,a)=>s+(a.postCount||0),0) },
            { label:"Realms",      value:[...new Set(artists.map(a=>a.city).filter(Boolean))].length },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign:"center" }}>
              <div style={{
                fontFamily:"'Cinzel',serif",
                fontWeight:700, fontSize:"clamp(14px,3vw,22px)",
                color:"#c9a84c",
                textShadow:"0 0 16px rgba(200,160,80,0.5)",
              }}>{value}</div>
              <div style={{
                fontSize:8, color:"rgba(200,160,80,0.3)", fontWeight:700,
                letterSpacing:2, textTransform:"uppercase",
                fontFamily:"'Cinzel',serif",
              }}>✦ {label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}