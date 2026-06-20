import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import BookingModal from "../components/BookingModal";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

function getId(obj) {
  if (!obj) return undefined;
  const raw = obj._id;
  if (!raw) return undefined;
  if (typeof raw === "object" && raw.$oid) return raw.$oid;
  return String(raw);
}

const CATEGORY_SKILLS = {
  Singer:       ["Vocals", "Songwriting", "Live Performance", "Recording"],
  Dancer:       ["Choreography", "Contemporary", "Hip-Hop", "Stage Performance"],
  Musician:     ["Composition", "Music Theory", "Live Gigs", "Studio Work"],
  Painter:      ["Acrylics", "Oils", "Digital Art", "Illustration"],
  Photographer: ["Portrait", "Landscape", "Editing", "Lightroom"],
  Actor:        ["Stage Acting", "Screen Acting", "Improv", "Voice Acting"],
  Comedian:     ["Stand-Up", "Improv", "Sketch", "Storytelling"],
  default:      ["Creative Work", "Collaboration", "Live Events", "Content"],
};
function getSkills(cat) { return CATEGORY_SKILLS[cat] || CATEGORY_SKILLS.default; }

const DotGrid = () => (
  <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.18,pointerEvents:"none" }} xmlns="http://www.w3.org/2000/svg">
    <defs><pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="#1e3a8a"/></pattern></defs>
    <rect width="100%" height="100%" fill="url(#dots)"/>
  </svg>
);

export default function ArtistProfile() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [artist,      setArtist]      = useState(null);
  const [posts,       setPosts]       = useState([]);
  const [lightbox,    setLightbox]    = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [mobileMenu,  setMobileMenu]  = useState(false);
  const [activeTab,   setActiveTab]   = useState("portfolio");

  let loggedArtist = null, loggedUser = null;
  try { loggedArtist = JSON.parse(localStorage.getItem("artist") || "null"); } catch {}
  try { loggedUser   = JSON.parse(localStorage.getItem("user")   || "null"); } catch {}

  const currentUser = loggedUser || loggedArtist;
  const isLoggedIn  = !!(loggedArtist || loggedUser);
  const role        = loggedArtist ? "artist" : loggedUser ? "user" : null;
  const isOwner     = role === "artist" && getId(loggedArtist) === id;

  useEffect(() => {
    fetchArtist();
    fetchPosts();
    if (!isOwner) axios.post(`${API}/api/users/${id}/view`).catch(() => {});
  }, [id]);

  const fetchArtist = async () => {
    try {
      const res = await axios.get(`${API}/api/users/all-people`);
      const all = Array.isArray(res.data) ? res.data : [];
      const found = all.find(u => u._id === id || getId(u) === id);
      if (found) setArtist(found);
    } catch (err) {
      // fallback to /api/users if /api/users/all-people not available yet
      try {
        const res = await axios.get(`${API}/api/users`);
        const all = Array.isArray(res.data) ? res.data : [];
        const found = all.find(u => u._id === id || getId(u) === id);
        if (found) setArtist(found);
      } catch (e) { console.log("fetchArtist error:", e); }
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API}/api/posts`);
      setPosts(res.data.filter(p => p.artistId === id));
    } catch(err) { console.log("fetchPosts error:", err); }
  };

  const getInitials = (name) => name ? name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2) : "A";

  const handleLogout = () => {
    localStorage.removeItem("artist");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/artist-login");
  };

  if (!artist) return (
    <div style={{ background:"#f0f4ff", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@700;800&display=swap" rel="stylesheet"/>
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"#1e3a8a", letterSpacing:3 }}>LOADING...</div>
    </div>
  );

  const skills = getSkills(artist.category);

  return (
    <div style={{ fontFamily:"'Nunito',sans-serif", minHeight:"100vh", background:"#f0f4ff", overflowX:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        * { box-sizing:border-box; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        .post-thumb:hover { transform:scale(1.04); box-shadow:0 8px 30px rgba(30,58,138,0.3)!important; }
        .post-thumb:hover .thumb-icon { opacity:1!important; }
        .skill-pill:hover { background:#fff!important; color:#1e3a8a!important; }
        .action-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.2); }
        @media (max-width:768px) {
          .hero-content { flex-direction:column!important; padding:20px!important; }
          .hero-left { max-width:100%!important; }
          .hero-right { width:100%!important; display:flex!important; flex-direction:column!important; align-items:center!important; }
          .profile-photo-wrap { width:180px!important; height:220px!important; }
          .big-title { font-size:clamp(36px,10vw,64px)!important; }
          .big-category { font-size:clamp(28px,8vw,50px)!important; }
          .stats-card { width:100%!important; max-width:300px!important; }
          .book-card { width:100%!important; max-width:340px!important; }
          .blue-section { flex-direction:column!important; }
          .vertical-sidebar { display:none!important; }
          .blue-content { padding:28px 20px!important; }
          .portfolio-grid { grid-template-columns:repeat(2,1fr)!important; gap:8px!important; }
          .action-row { gap:8px!important; }
          .action-row button { flex:1!important; min-width:120px!important; padding:11px 16px!important; font-size:13px!important; }
          .nav-desktop { display:none!important; }
          .nav-mobile-btn { display:flex!important; }
          .top-nav { padding:12px 16px!important; }
        }
        @media (min-width:769px) {
          .nav-mobile-btn { display:none!important; }
          .mobile-menu-panel { display:none!important; }
        }
      `}</style>

      {/* LIGHTBOX */}
      {lightbox && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)" }} onClick={()=>setLightbox(null)}>
          <button style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.1)", border:"none", color:"#fff", width:40, height:40, borderRadius:"50%", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          <div onClick={e=>e.stopPropagation()} style={{ borderRadius:16, overflow:"hidden", maxWidth:"90vw", maxHeight:"90vh" }}>
            {lightbox.type === "video"
              ? <video src={lightbox.media} controls style={{ maxWidth:"85vw", maxHeight:"85vh", display:"block" }} />
              : <img src={lightbox.media} alt="" style={{ maxWidth:"85vw", maxHeight:"85vh", objectFit:"contain", display:"block" }} />
            }
            {lightbox.title && <div style={{ background:"rgba(0,0,0,0.8)", color:"#fff", padding:"10px 16px", fontSize:13, fontWeight:700 }}>{lightbox.title}</div>}
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {showBooking && (
        <BookingModal
          artist={artist}
          currentUser={currentUser}
          onClose={()=>setShowBooking(false)}
          onSuccess={()=>{ setShowBooking(false); setBookingDone(true); }}
        />
      )}

      {/* ══ HERO ══ */}
      <div style={{ position:"relative", background:"#f5f0e8", overflow:"hidden", paddingBottom:48 }}>
        <DotGrid />

        {/* TOP NAV */}
        <div className="top-nav" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 32px", borderBottom:"1px solid rgba(30,58,138,0.1)", position:"relative", zIndex:10, flexWrap:"wrap", gap:10 }}>
          <button style={{ background:"none", border:"none", fontFamily:"'Nunito',sans-serif", fontSize:14, color:"#1e3a8a", cursor:"pointer", fontWeight:800 }} onClick={()=>navigate("/discover")}>← Discover</button>
          <div className="nav-desktop" style={{ display:"flex", gap:20, alignItems:"center" }}>
            <button style={{ background:"none", border:"none", fontFamily:"'Nunito',sans-serif", fontSize:13, color:"#1e3a8a", fontWeight:700, cursor:"pointer" }} onClick={()=>navigate("/")}>🏠 Home</button>
            <span style={{ fontSize:13, color:"#1e3a8a", fontWeight:600, opacity:0.5 }}>Profile</span>
          </div>
          <div className="nav-desktop" style={{ display:"flex", gap:8, alignItems:"center" }}>
            {isOwner ? (
              <button style={s.navBtn} onClick={()=>navigate("/artist-dashboard")}>✏️ Edit Dashboard</button>
            ) : (
              <>
                <button style={s.navBtn} onClick={()=>navigate(`/chat/${id}`)}>💬 Chat</button>
                <button style={{ ...s.navBtn, background:"#16a34a" }} onClick={()=>setShowBooking(true)}>📅 Book Now</button>
              </>
            )}
            <button style={{ ...s.navBtn, background:"#dc2626" }} onClick={handleLogout}>Logout</button>
          </div>
          <button className="nav-mobile-btn" style={{ background:"#1e3a8a", border:"none", color:"#fff", width:38, height:38, borderRadius:10, fontSize:18, cursor:"pointer", alignItems:"center", justifyContent:"center" }} onClick={()=>setMobileMenu(m=>!m)}>
            {mobileMenu ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="mobile-menu-panel" style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"16px 20px", display:"flex", flexDirection:"column", gap:10, animation:"slideDown 0.2s ease", position:"relative", zIndex:9 }}>
            <button style={{ ...s.navBtn, width:"100%", justifyContent:"center" }} onClick={()=>{ navigate("/"); setMobileMenu(false); }}>🏠 Home</button>
            {isOwner ? (
              <button style={{ ...s.navBtn, width:"100%", justifyContent:"center" }} onClick={()=>navigate("/artist-dashboard")}>✏️ Edit Dashboard</button>
            ) : (
              <>
                <button style={{ ...s.navBtn, width:"100%", justifyContent:"center" }} onClick={()=>{ navigate(`/chat/${id}`); setMobileMenu(false); }}>💬 Chat</button>
                <button style={{ ...s.navBtn, background:"#16a34a", width:"100%", justifyContent:"center" }} onClick={()=>{ setShowBooking(true); setMobileMenu(false); }}>📅 Book Now</button>
              </>
            )}
            <button style={{ ...s.navBtn, background:"#dc2626", width:"100%", justifyContent:"center" }} onClick={handleLogout}>Logout</button>
          </div>
        )}

        {/* HERO CONTENT */}
        <div className="hero-content" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"36px 32px 0", position:"relative", zIndex:2, gap:24, flexWrap:"wrap" }}>
          {/* LEFT */}
          <div className="hero-left" style={{ flex:1, maxWidth:520, minWidth:280, animation:"slideIn 0.5s ease both" }}>
            <div style={{ marginBottom:24 }}>
              <div className="big-title" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(48px,8vw,88px)", color:"#1e3a8a", lineHeight:0.95, letterSpacing:2 }}>
                {(artist.name||"ARTIST").toUpperCase()}
              </div>
              <div className="big-category" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(36px,6vw,68px)", color:"#1e3a8a", lineHeight:0.95, letterSpacing:2, opacity:0.65 }}>
                {(artist.category||"PORTFOLIO").toUpperCase()}
              </div>
            </div>
            <div style={{ background:"rgba(255,255,255,0.6)", borderRadius:16, padding:"20px 22px", backdropFilter:"blur(8px)", border:"1px solid rgba(30,58,138,0.1)" }}>
              <div style={{ display:"inline-block", background:"#1e3a8a", color:"#fff", fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:13, padding:"6px 18px", borderRadius:10, marginBottom:12 }}>About Me</div>
              <p style={{ fontFamily:"'Nunito',sans-serif", fontSize:14, color:"#1a1a2e", lineHeight:1.75, fontWeight:600, margin:"0 0 14px 0" }}>
                {artist.bio || `${artist.name} is a talented ${artist.category||"artist"} based in ${artist.city||"India"}.`}
              </p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {artist.city       && <span style={s.pill}>📍 {artist.city}</span>}
                {artist.experience && <span style={{ ...s.pill, background:"#fef3c7", color:"#92400e" }}>⏱ {artist.experience}</span>}
                {artist.instagram  && (
                  <a href={`https://instagram.com/${artist.instagram}`} target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}>
                    <span style={{ ...s.pill, background:"#fff0e6", color:"#e8621a" }}>📸 @{artist.instagram}</span>
                  </a>
                )}
                <span style={{ ...s.pill, background:"#e0e7ff", color:"#3730a3" }}>🎨 {posts.length} Posts</span>
                <span style={{ ...s.pill, background:"#f0fdf4", color:"#14532d" }}>⭐ {artist.rating||5}.0</span>
                {bookingDone && <span style={{ ...s.pill, background:"#dcfce7", color:"#14532d" }}>✅ Booked!</span>}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="hero-right" style={{ width:280, flexShrink:0, animation:"fadeUp 0.6s ease both", display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
            <div className="profile-photo-wrap" style={{ width:240, height:300, borderRadius:20, overflow:"hidden", border:"4px solid #1e3a8a", background:"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"6px 6px 0 #1e3a8a" }}>
              {artist.profileImage
                ? <img src={artist.profileImage} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:72, color:"#1e3a8a", letterSpacing:4 }}>{getInitials(artist.name)}</div>
              }
            </div>
            <div className="stats-card" style={{ display:"flex", alignItems:"center", justifyContent:"center", background:"#1e3a8a", borderRadius:14, padding:"12px 20px", width:"100%", boxShadow:"4px 4px 0 rgba(30,58,138,0.3)" }}>
              {[{ num:posts.length, lbl:"Posts" },{ num:artist.profileViews||0, lbl:"Views" },{ num:`${artist.rating||5}.0`, lbl:"Rating" }].map((st,i) => (
                <div key={i} style={{ display:"contents" }}>
                  {i>0 && <div style={{ width:1, height:32, background:"rgba(255,255,255,0.2)", margin:"0 10px" }} />}
                  <div style={{ textAlign:"center", flex:1 }}>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#fff", letterSpacing:1 }}>{st.num}</div>
                    <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:10, color:"rgba(255,255,255,0.6)", fontWeight:600, letterSpacing:1, textTransform:"uppercase" }}>{st.lbl}</div>
                  </div>
                </div>
              ))}
            </div>
            {!isOwner && (
              <div className="book-card" style={{ background:"#fff", borderRadius:16, padding:"18px 16px", width:"100%", boxShadow:"4px 4px 0 rgba(30,58,138,0.12)", border:"1px solid rgba(30,58,138,0.12)" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:"#1e3a8a", letterSpacing:0.5, marginBottom:4 }}>
                  {artist.price ? `From ₹${Number(artist.price).toLocaleString("en-IN")}` : "Available for Booking"}
                </div>
                <div style={{ fontSize:12, color:"#64748b", fontFamily:"'Nunito',sans-serif", marginBottom:14 }}>{artist.category} · {artist.city||"India"}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <button onClick={()=>setShowBooking(true)} style={{ padding:"12px", background:"#1e3a8a", color:"#fff", border:"none", borderRadius:22, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:"pointer" }}>📅 Book Now</button>
                  <button onClick={()=>navigate(`/chat/${id}`)} style={{ padding:"10px", background:"transparent", color:"#1e3a8a", border:"2px solid #1e3a8a", borderRadius:22, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:"pointer" }}>💬 Chat First</button>
                </div>
              </div>
            )}
            {isOwner && (
              <div style={{ display:"flex", flexDirection:"column", gap:8, width:"100%" }}>
                <button onClick={()=>navigate("/artist-dashboard")} style={{ padding:"12px", background:"#1e3a8a", color:"#fff", border:"none", borderRadius:22, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:"pointer" }}>🛠 Go to Dashboard</button>
                <button onClick={()=>navigate(`/chat/${getId(loggedArtist)}`)} style={{ padding:"10px", background:"transparent", color:"#1e3a8a", border:"2px solid #1e3a8a", borderRadius:22, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:"pointer" }}>💬 Messages</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ BLUE SECTION ══ */}
      <div className="blue-section" style={{ background:"linear-gradient(160deg,#1e40af,#1e3a8a 40%,#1d4ed8)", display:"flex", minHeight:500, position:"relative" }}>
        <div className="vertical-sidebar" style={{ width:64, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", padding:"0 0 40px", background:"rgba(0,0,0,0.15)", flexShrink:0, gap:8, pointerEvents:"none" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#fff", letterSpacing:4, writingMode:"vertical-rl", transform:"rotate(180deg)", lineHeight:1 }}>{(artist.category||"ARTIST").toUpperCase()}</div>
          <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:9, color:"rgba(255,255,255,0.5)", writingMode:"vertical-rl", transform:"rotate(180deg)", letterSpacing:1, fontWeight:700 }}>{artist.instagram ? `@${artist.instagram}` : artist.name}</div>
        </div>

        <div className="blue-content" style={{ flex:1, padding:"40px 36px 40px 28px", position:"relative", zIndex:1 }}>
          {/* Tabs */}
          <div style={{ display:"flex", gap:8, marginBottom:28, flexWrap:"wrap" }}>
            {["portfolio","skills","about"].map(t => (
              <button key={t} onClick={()=>setActiveTab(t)} style={{ padding:"8px 20px", borderRadius:20, border:`1.5px solid ${activeTab===t?"#fff":"rgba(255,255,255,0.3)"}`, background:activeTab===t?"#fff":"rgba(255,255,255,0.1)", color:activeTab===t?"#1e3a8a":"#fff", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif", transition:"all 0.2s", textTransform:"capitalize" }}>
                {t==="portfolio" ? `🎨 Portfolio (${posts.length})` : t==="skills" ? "✦ Skills" : "👤 About"}
              </button>
            ))}
          </div>

          {/* Portfolio */}
          {activeTab === "portfolio" && (
            <div style={{ animation:"fadeUp 0.3s ease" }}>
              {posts.length === 0 ? (
                <div style={{ textAlign:"center", padding:"60px 0", opacity:0.7 }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>🎭</div>
                  <div style={{ color:"rgba(255,255,255,0.6)", fontFamily:"'Nunito',sans-serif", fontSize:15 }}>No portfolio works yet</div>
                  {isOwner && <button onClick={()=>navigate("/artist-dashboard")} style={{ marginTop:16, padding:"10px 24px", background:"#fff", color:"#1e3a8a", border:"none", borderRadius:22, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>Upload Your First Work</button>}
                </div>
              ) : (
                <div className="portfolio-grid" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12 }}>
                  {posts.map((post,i) => (
                    <div key={post._id} className="post-thumb" onClick={()=>setLightbox(post)} style={{ aspectRatio:"3/4", borderRadius:14, overflow:"hidden", position:"relative", cursor:"pointer", transition:"transform 0.2s, box-shadow 0.2s", animation:`fadeUp 0.4s ease ${0.05*i}s both`, border:"2px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.3)" }}>
                      {post.type==="video"
                        ? <video src={post.media} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} muted />
                        : <img src={post.media} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                      }
                      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <span className="thumb-icon" style={{ fontSize:22, opacity:0, transition:"opacity 0.2s" }}>{post.type==="video"?"▶":"🔍"}</span>
                      </div>
                      {post.title && <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,rgba(0,0,0,0.75))", padding:"16px 8px 6px", color:"#fff", fontSize:10, fontWeight:800, fontFamily:"'Nunito',sans-serif" }}>{post.title}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Skills */}
          {activeTab === "skills" && (
            <div style={{ animation:"fadeUp 0.3s ease", display:"flex", flexWrap:"wrap", gap:12 }}>
              {skills.map((skill,i) => (
                <span key={i} className="skill-pill" style={{ background:"rgba(255,255,255,0.12)", color:"#fff", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:14, padding:"10px 22px", borderRadius:24, border:"1.5px solid rgba(255,255,255,0.25)", cursor:"default", transition:"all 0.2s" }}>{skill}</span>
              ))}
            </div>
          )}

          {/* About */}
          {activeTab === "about" && (
            <div style={{ animation:"fadeUp 0.3s ease", display:"flex", flexDirection:"column", gap:14 }}>
              {[
                { icon:"🎨", label:"Category",  value:artist.category },
                { icon:"📍", label:"City",       value:artist.city },
                { icon:"⏱",  label:"Experience", value:artist.experience },
                { icon:"⭐", label:"Rating",     value:`${artist.rating||5}.0 / 5.0` },
                { icon:"🎭", label:"Works",      value:`${posts.length} uploads` },
              ].filter(r=>r.value).map((row,i) => (
                <div key={i} style={{ display:"flex", gap:14, alignItems:"center", background:"rgba(255,255,255,0.08)", borderRadius:14, padding:"14px 18px", border:"1px solid rgba(255,255,255,0.12)" }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:"rgba(255,255,255,0.12)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{row.icon}</div>
                  <div>
                    <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.5)", letterSpacing:1, textTransform:"uppercase" }}>{row.label}</div>
                    <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginTop:2, fontFamily:"'Nunito',sans-serif" }}>{row.value}</div>
                  </div>
                </div>
              ))}
              {artist.bio && (
                <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:14, padding:"16px 18px", border:"1px solid rgba(255,255,255,0.12)" }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.5)", letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Bio</div>
                  <div style={{ fontSize:14, color:"rgba(255,255,255,0.85)", lineHeight:1.8, fontFamily:"'Nunito',sans-serif", fontWeight:500 }}>{artist.bio}</div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="action-row" style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:36, paddingBottom:36 }}>
            {!isOwner && (
              <>
                <button className="action-btn" style={s.primaryBtn} onClick={()=>setShowBooking(true)}>📅 Book {artist.name?.split(" ")[0]}</button>
                <button className="action-btn" style={s.primaryBtn} onClick={()=>navigate(`/chat/${id}`)}>💬 Chat</button>
                <button className="action-btn" style={s.secondaryBtn} onClick={()=>navigate("/discover")}>🔍 More Artists</button>
              </>
            )}
            {isOwner && (
              <>
                <button className="action-btn" style={s.primaryBtn} onClick={()=>navigate("/artist-dashboard")}>🛠 Dashboard</button>
                <button className="action-btn" style={s.secondaryBtn} onClick={()=>navigate(`/chat/${getId(loggedArtist)}`)}>💬 Messages</button>
                <button className="action-btn" style={s.secondaryBtn} onClick={()=>navigate("/discover")}>🔍 Browse Artists</button>
              </>
            )}
            <button className="action-btn" style={{ ...s.secondaryBtn, background:"#dc2626", borderColor:"#dc2626" }} onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  navBtn:      { background:"#1e3a8a", color:"#fff", border:"none", padding:"9px 20px", borderRadius:22, fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer", transition:"opacity 0.2s", display:"flex", alignItems:"center", gap:6 },
  pill:        { background:"#e8f0ff", color:"#1e3a8a", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:12, padding:"5px 13px", borderRadius:20 },
  primaryBtn:  { background:"#fff", color:"#1e3a8a", border:"none", padding:"13px 26px", borderRadius:28, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:"pointer", transition:"transform 0.2s, box-shadow 0.2s", flexShrink:0 },
  secondaryBtn:{ background:"transparent", color:"#fff", border:"2px solid rgba(255,255,255,0.4)", padding:"13px 26px", borderRadius:28, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:"pointer", transition:"transform 0.2s, box-shadow 0.2s", flexShrink:0 },
};