import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const CATEGORIES = ["All", "Singer", "Dancer", "Musician", "Painter", "Photographer", "Actor", "Comedian", "Other"];
const CITIES = ["All", "Bangalore", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune", "Kolkata", "Mangaluru"];

const SkeletonCard = () => (
  <div style={{ background:"#fff", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 16px rgba(0,0,0,0.06)" }}>
    <div style={{ height:140, background:"linear-gradient(90deg,#f0f4ff 25%,#e0e7ff 50%,#f0f4ff 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }} />
    <div style={{ padding:"16px" }}>
      <div style={{ height:16, borderRadius:8, background:"#e2e8f0", marginBottom:10, width:"60%" }} />
      <div style={{ height:12, borderRadius:8, background:"#f1f5f9", marginBottom:8, width:"40%" }} />
      <div style={{ height:12, borderRadius:8, background:"#f1f5f9", width:"50%" }} />
    </div>
  </div>
);

const Stars = ({ rating = 5 }) => (
  <span style={{ color:"#f59e0b", fontSize:12, letterSpacing:1 }}>
    {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
  </span>
);

const ArtistCard = ({ artist, onClick }) => {
  const [imgErr, setImgErr] = useState(false);
  const initials = artist.name ? artist.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2) : "A";
  const COLORS = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444"];
  const color = COLORS[artist.name?.charCodeAt(0) % COLORS.length] || "#6366f1";

  return (
    <div onClick={onClick} style={{ background:"#fff", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 16px rgba(0,0,0,0.06)", cursor:"pointer", transition:"transform 0.18s, box-shadow 0.18s", position:"relative" }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-4px)"; e.currentTarget.style.boxShadow="0 12px 32px rgba(30,58,138,0.13)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 2px 16px rgba(0,0,0,0.06)"; }}
    >
      <div style={{ height:90, background: artist.coverImage ? `url(${artist.coverImage}) center/cover` : `linear-gradient(135deg,${color}33,${color}11)`, position:"relative" }}>
        <div style={{ position:"absolute", bottom:-28, left:16 }}>
          {artist.profileImage && !imgErr
            ? <img src={artist.profileImage} alt="" onError={()=>setImgErr(true)} style={{ width:56, height:56, borderRadius:"50%", border:"3px solid #fff", objectFit:"cover", display:"block", boxShadow:"0 2px 10px rgba(0,0,0,0.12)" }} />
            : <div style={{ width:56, height:56, borderRadius:"50%", border:"3px solid #fff", background:color, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:20, color:"#fff", boxShadow:"0 2px 10px rgba(0,0,0,0.12)", fontFamily:"'Bebas Neue',sans-serif" }}>{initials}</div>
          }
        </div>
        {artist.category && (
          <div style={{ position:"absolute", top:10, right:10, background:"rgba(255,255,255,0.92)", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:800, color, fontFamily:"'Nunito',sans-serif" }}>
            {artist.category}
          </div>
        )}
      </div>
      <div style={{ padding:"36px 16px 16px" }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#1e293b", letterSpacing:0.5, marginBottom:2 }}>{artist.name}</div>
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
          <Stars rating={artist.rating || 5} />
          <span style={{ fontSize:11, color:"#94a3b8", fontWeight:600, fontFamily:"'Nunito',sans-serif" }}>{artist.rating || 5}.0</span>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
          {artist.city && (
            <span style={{ fontSize:11, fontWeight:700, color:"#64748b", fontFamily:"'Nunito',sans-serif", display:"flex", alignItems:"center", gap:3 }}>
              📍 {artist.city.trim()}
            </span>
          )}
          {artist.experience && (
            <span style={{ fontSize:11, fontWeight:700, color:"#64748b", fontFamily:"'Nunito',sans-serif" }}>
              · {artist.experience} exp
            </span>
          )}
        </div>
        {artist.bio && (
          <div style={{ fontSize:12, color:"#94a3b8", fontFamily:"'Nunito',sans-serif", lineHeight:1.5, marginBottom:12, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
            {artist.bio}
          </div>
        )}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={e=>{e.stopPropagation(); onClick();}} style={{ flex:1, padding:"9px", background:"#1e3a8a", color:"#fff", border:"none", borderRadius:12, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif", transition:"opacity 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}
          >View Profile</button>
        </div>
      </div>
    </div>
  );
};

export default function DiscoverPage() {
  const navigate  = useNavigate();
  const [artists,      setArtists]      = useState([]);
  const [filtered,     setFiltered]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [category,     setCategory]     = useState("All");
  const [city,         setCity]         = useState("All");
  const [sortBy,       setSortBy]       = useState("newest");
  const [mobileFilter, setMobileFilter] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => { fetchArtists(); }, []);
  useEffect(() => { applyFilters(); }, [artists, search, category, city, sortBy]);

  const fetchArtists = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API}/api/users`);
      // Defensive: ensure we always have an array
      const data = Array.isArray(res.data) ? res.data : [];
      if (data.length === 0) console.warn("API returned empty array from /api/users");
      // Filter to artists only
      const onlyArtists = data.filter(u => u.role === "artist");
      console.log(`Fetched ${data.length} users, ${onlyArtists.length} artists`);
      setArtists(onlyArtists);
    } catch (e) {
      console.error("fetchArtists failed:", e.response?.status, e.response?.data || e.message);
      setError(`Failed to load artists. ${e.response?.data?.message || e.message}`);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let list = [...artists];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.city?.toLowerCase().includes(q) ||
        a.bio?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q)
      );
    }
    // Trim city values when comparing to handle trailing spaces in DB
    if (category !== "All") list = list.filter(a => a.category === category);
    if (city !== "All") list = list.filter(a => a.city?.trim() === city.trim());
    if (sortBy === "rating") list.sort((a,b) => (b.rating||5) - (a.rating||5));
    else if (sortBy === "name") list.sort((a,b) => (a.name||"").localeCompare(b.name||""));
    else list.sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0));
    setFiltered(list);
  };

  const clearFilters = () => { setSearch(""); setCategory("All"); setCity("All"); setSortBy("newest"); };
  const hasFilters = search || category !== "All" || city !== "All";

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("artist") || localStorage.getItem("user") || "{}"); }
    catch { return {}; }
  })();

  return (
    <div style={{ minHeight:"100vh", background:"#f0f4ff", fontFamily:"'Nunito',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        input:focus, select:focus { outline:none; border-color:#1e3a8a !important; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#c7d2fe; border-radius:4px; }
        @media (max-width: 768px) {
          .discover-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .discover-hero-title { font-size: 36px !important; }
          .discover-hero-sub { font-size: 14px !important; }
          .desktop-filters { display: none !important; }
          .mobile-filter-btn { display: flex !important; }
          .discover-content { padding: 16px !important; }
          .hero-section { padding: 24px 16px 28px !important; }
          .stats-row { gap: 16px !important; }
          .stat-num { font-size: 24px !important; }
        }
        @media (max-width: 480px) {
          .discover-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) {
          .mobile-filter-btn { display: none !important; }
          .mobile-filter-panel { display: none !important; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 24px", height:60, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:100, boxShadow:"0 1px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#1e3a8a", letterSpacing:2, cursor:"pointer" }} onClick={() => navigate("/")}>
          ARTSPIRE
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {currentUser._id ? (
            <>
              <button onClick={() => navigate(currentUser.role === "artist" ? "/artist-dashboard" : "/")} style={{ background:"#f0f4ff", color:"#1e3a8a", border:"none", padding:"8px 16px", borderRadius:20, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                Dashboard
              </button>
              <button onClick={() => navigate(`/chat/${currentUser._id}`)} style={{ background:"#1e3a8a", color:"#fff", border:"none", padding:"8px 16px", borderRadius:20, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                💬 Messages
              </button>
            </>
          ) : (
            <>
              <button onClick={() => navigate("/login")} style={{ background:"transparent", color:"#1e3a8a", border:"2px solid #1e3a8a", padding:"7px 18px", borderRadius:20, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Login</button>
              <button onClick={() => navigate("/register")} style={{ background:"#1e3a8a", color:"#fff", border:"none", padding:"8px 18px", borderRadius:20, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Sign Up</button>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <div className="hero-section" style={{ background:"linear-gradient(135deg,#1e3a8a 0%,#3b82f6 60%,#6366f1 100%)", padding:"40px 24px 48px", position:"relative", overflow:"hidden" }}>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.08, pointerEvents:"none" }} xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="#fff"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#dots)"/>
        </svg>
        <div style={{ position:"relative", zIndex:2, maxWidth:700, margin:"0 auto", textAlign:"center" }}>
          <div style={{ display:"inline-block", background:"rgba(255,255,255,0.15)", borderRadius:20, padding:"4px 16px", fontSize:12, fontWeight:800, color:"#fff", marginBottom:16, letterSpacing:1 }}>
            ✨ DISCOVER LOCAL TALENT
          </div>
          <div className="discover-hero-title" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:52, color:"#fff", letterSpacing:2, lineHeight:1.1, marginBottom:12 }}>
            Find The Perfect<br/>Artist For You
          </div>
          <div className="discover-hero-sub" style={{ fontSize:16, color:"rgba(255,255,255,0.8)", fontWeight:600, marginBottom:28, lineHeight:1.6 }}>
            Browse singers, dancers, photographers, painters and more — all from your city
          </div>
          <div style={{ position:"relative", maxWidth:520, margin:"0 auto" }}>
            <svg style={{ position:"absolute", left:18, top:"50%", transform:"translateY(-50%)", opacity:0.5 }} width="16" height="16" fill="none" stroke="#1e3a8a" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              ref={searchRef}
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="Search artists by name, city or category..."
              style={{ width:"100%", padding:"16px 20px 16px 48px", borderRadius:50, border:"none", fontSize:15, fontWeight:600, color:"#1e293b", fontFamily:"'Nunito',sans-serif", boxShadow:"0 8px 32px rgba(0,0,0,0.15)", outline:"none" }}
            />
            {search && (
              <button onClick={()=>setSearch("")} style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#94a3b8", lineHeight:1 }}>✕</button>
            )}
          </div>
          <div className="stats-row" style={{ display:"flex", justifyContent:"center", gap:32, marginTop:28 }}>
            {[
              { num: artists.length || "–", label:"Artists" },
              { num: CITIES.length - 1,     label:"Cities" },
              { num: CATEGORIES.length - 1, label:"Categories" },
            ].map((s,i) => (
              <div key={i} style={{ textAlign:"center" }}>
                <div className="stat-num" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:"#fff", letterSpacing:1 }}>{s.num}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontWeight:700, letterSpacing:1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DESKTOP FILTERS */}
      <div className="desktop-filters" style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"14px 24px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", position:"sticky", top:60, zIndex:99, boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
        <div style={{ fontSize:13, fontWeight:800, color:"#64748b", marginRight:4 }}>Filter:</div>
        <select value={category} onChange={e=>setCategory(e.target.value)} style={{ padding:"8px 14px", borderRadius:20, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:13, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:"pointer" }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={city} onChange={e=>setCity(e.target.value)} style={{ padding:"8px 14px", borderRadius:20, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:13, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:"pointer" }}>
          {CITIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:"8px 14px", borderRadius:20, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:13, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:"pointer" }}>
          <option value="newest">Newest First</option>
          <option value="rating">Top Rated</option>
          <option value="name">A → Z</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters} style={{ padding:"8px 16px", borderRadius:20, border:"1.5px solid #ef4444", background:"#fee2e2", color:"#dc2626", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
            ✕ Clear
          </button>
        )}
        <div style={{ marginLeft:"auto", fontSize:13, color:"#94a3b8", fontWeight:700 }}>
          {loading ? "Loading..." : `${filtered.length} artist${filtered.length !== 1 ? "s" : ""} found`}
        </div>
      </div>

      {/* MOBILE FILTER BUTTON */}
      <div className="mobile-filter-btn" style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"12px 16px", alignItems:"center", justifyContent:"space-between", position:"sticky", top:60, zIndex:99 }}>
        <div style={{ fontSize:13, color:"#94a3b8", fontWeight:700 }}>{loading ? "Loading..." : `${filtered.length} artists`}</div>
        <button onClick={()=>setMobileFilter(f=>!f)} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 18px", borderRadius:20, border:"1.5px solid #1e3a8a", background: mobileFilter ? "#1e3a8a" : "#f0f4ff", color: mobileFilter ? "#fff" : "#1e3a8a", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
          Filters {hasFilters ? "●" : ""}
        </button>
      </div>

      {/* MOBILE FILTER PANEL */}
      {mobileFilter && (
        <div className="mobile-filter-panel" style={{ background:"#fff", padding:"16px", borderBottom:"1px solid #e2e8f0", display:"flex", flexDirection:"column", gap:12, animation:"slideDown 0.2s ease" }}>
          <select value={category} onChange={e=>setCategory(e.target.value)} style={{ padding:"10px 14px", borderRadius:12, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:14, fontWeight:700, fontFamily:"'Nunito',sans-serif", width:"100%" }}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={city} onChange={e=>setCity(e.target.value)} style={{ padding:"10px 14px", borderRadius:12, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:14, fontWeight:700, fontFamily:"'Nunito',sans-serif", width:"100%" }}>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:"10px 14px", borderRadius:12, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:14, fontWeight:700, fontFamily:"'Nunito',sans-serif", width:"100%" }}>
            <option value="newest">Newest First</option>
            <option value="rating">Top Rated</option>
            <option value="name">A → Z</option>
          </select>
          <div style={{ display:"flex", gap:10 }}>
            {hasFilters && <button onClick={clearFilters} style={{ flex:1, padding:"10px", borderRadius:12, border:"1.5px solid #ef4444", background:"#fee2e2", color:"#dc2626", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>✕ Clear</button>}
            <button onClick={()=>setMobileFilter(false)} style={{ flex:1, padding:"10px", borderRadius:12, border:"none", background:"#1e3a8a", color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Apply</button>
          </div>
        </div>
      )}

      {/* CATEGORY PILLS */}
      <div style={{ overflowX:"auto", padding:"14px 16px", display:"flex", gap:8, scrollbarWidth:"none", WebkitOverflowScrolling:"touch" }}>
        <style>{`::-webkit-scrollbar{display:none}`}</style>
        {CATEGORIES.map(c => (
          <button key={c} onClick={()=>setCategory(c)} style={{ flexShrink:0, padding:"7px 16px", borderRadius:20, border:`1.5px solid ${category===c ? "#1e3a8a" : "#e2e8f0"}`, background: category===c ? "#1e3a8a" : "#fff", color: category===c ? "#fff" : "#64748b", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif", transition:"all 0.15s", whiteSpace:"nowrap" }}>
            {c}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="discover-content" style={{ maxWidth:1200, margin:"0 auto", padding:"8px 24px 48px" }}>

        {/* Error state */}
        {error && !loading && (
          <div style={{ textAlign:"center", padding:"40px 20px", animation:"fadeUp 0.4s ease" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>⚠️</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:"#dc2626", marginBottom:8 }}>
              Could Not Load Artists
            </div>
            <div style={{ color:"#94a3b8", fontSize:13, marginBottom:20, maxWidth:360, margin:"0 auto 20px" }}>{error}</div>
            <button onClick={fetchArtists} style={{ background:"#1e3a8a", color:"#fff", border:"none", padding:"12px 28px", borderRadius:24, fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
              Try Again
            </button>
          </div>
        )}

        {/* Empty state (no error, just no results) */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", animation:"fadeUp 0.4s ease" }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🎭</div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#1e3a8a", marginBottom:8 }}>
              {artists.length === 0 ? "No Artists Yet" : "No Matches Found"}
            </div>
            <div style={{ color:"#94a3b8", fontSize:14, marginBottom:20 }}>
              {artists.length === 0 ? "Be the first to join as an artist!" : "Try different filters or search terms"}
            </div>
            {artists.length === 0
              ? <button onClick={() => navigate("/artist-register")} style={{ background:"#1e3a8a", color:"#fff", border:"none", padding:"12px 28px", borderRadius:24, fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Join as Artist</button>
              : <button onClick={clearFilters} style={{ background:"#1e3a8a", color:"#fff", border:"none", padding:"12px 28px", borderRadius:24, fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Clear Filters</button>
            }
          </div>
        )}

        {/* Grid */}
        {(!error) && (
          <div className="discover-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))", gap:20, animation:"fadeUp 0.4s ease" }}>
            {loading
              ? Array(6).fill(0).map((_,i) => <SkeletonCard key={i} />)
              : filtered.map(artist => (
                  <ArtistCard
                    key={artist._id}
                    artist={artist}
                    onClick={() => navigate(`/artist-profile/${artist._id}`)}
                  />
                ))
            }
          </div>
        )}
      </div>

      {/* FLOATING CHAT BUTTON (mobile) */}
      {currentUser._id && (
        <button
          onClick={() => navigate(`/chat/${currentUser._id}`)}
          style={{ position:"fixed", bottom:24, right:24, width:56, height:56, borderRadius:"50%", background:"#1e3a8a", color:"#fff", border:"none", fontSize:22, cursor:"pointer", boxShadow:"0 8px 24px rgba(30,58,138,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, transition:"transform 0.2s" }}
          onMouseEnter={e=>e.currentTarget.style.transform="scale(1.1)"}
          onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
        >
          💬
        </button>
      )}
    </div>
  );
}
