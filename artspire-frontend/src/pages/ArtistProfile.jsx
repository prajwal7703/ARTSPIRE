import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

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
    <defs><pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="#1e3a8a" /></pattern></defs>
    <rect width="100%" height="100%" fill="url(#dots)" />
  </svg>
);

export default function ArtistProfile() {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [artist, setArtist]   = useState(null);
  const [posts, setPosts]     = useState([]);
  const [lightbox, setLightbox] = useState(null);

  const loggedArtistRaw = localStorage.getItem("artist");
  const loggedUserRaw   = localStorage.getItem("user");
  let loggedArtist = null;
  let loggedUser   = null;
  try { loggedArtist = loggedArtistRaw ? JSON.parse(loggedArtistRaw) : null; } catch {}
  try { loggedUser   = loggedUserRaw   ? JSON.parse(loggedUserRaw)   : null; } catch {}

  const isLoggedIn = !!(loggedArtist || loggedUser);
  const role       = loggedArtist ? "artist" : loggedUser ? "user" : null;
  const isOwner    = role === "artist" && getId(loggedArtist) === id;

  useEffect(() => {
    if (!isLoggedIn) { navigate("/login"); return; }
    fetchArtist();
    fetchPosts();

    // ✅ Increment profile view — but NOT if the owner is viewing their own profile
    if (!isOwner) {
      axios.post(`${API}/api/users/${id}/view`).catch(() => {});
    }
  }, [id]);

  const fetchArtist = async () => {
    try {
      const res = await axios.get(`${API}/api/artists/${id}`);
      setArtist(res.data);
    } catch (err) { console.log(err); }
  };

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API}/api/posts`);
      setPosts(res.data.filter((p) => p.artistId === id));
    } catch (err) { console.log(err); }
  };

  const getInitials = (name) => {
    if (!name) return "A";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    localStorage.removeItem("artist");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (!isLoggedIn) return null;
  if (!artist) return (
    <div style={{ background:"#f0f4ff",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:"36px",color:"#1e3a8a",letterSpacing:"3px" }}>LOADING PROFILE...</div>
    </div>
  );

  const skills = getSkills(artist.category);

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        .post-thumb:hover { transform:scale(1.04); box-shadow:0 8px 30px rgba(30,58,138,0.25); }
        .post-thumb:hover .thumb-icon { opacity:1!important; }
        .skill-pill:hover { background:#1e3a8a!important; color:#fff!important; }
        .action-btn { position:relative; z-index:20; cursor:pointer!important; pointer-events:all!important; }
        .action-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(30,58,138,0.3); }
        @media(max-width:600px){.vertical-sidebar{display:none!important}.blue-section-content{padding:32px 20px!important}.action-row-wrap{flex-direction:column!important}}
      `}</style>

      {/* HERO */}
      <div style={s.heroSection}>
        <DotGrid />
        <div style={s.topNav}>
          <button style={s.navLink} onClick={() => navigate("/artists")}>← Artists</button>
          <div style={s.navLinks}>
            <button style={s.navItemBtn} onClick={() => navigate("/")}>🏠 Home</button>
            <span style={s.navItem}>Profile</span>
            <span style={s.navItem}>Posts</span>
          </div>
          <div style={{ display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap" }}>
            {isOwner
              ? <button style={s.navActionBtn} onClick={() => navigate("/artist-dashboard")}>✏️ Edit</button>
              : <button style={s.navActionBtn} onClick={() => navigate(`/chat/${id}`)}>💬 Chat</button>
            }
            <button style={{ ...s.navActionBtn,background:"#dc2626" }} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div style={s.heroContent}>
          <div style={s.heroLeft}>
            <div style={s.bigTitleWrap}>
              <div style={s.bigTitle}>{(artist.name || "ARTIST").toUpperCase()}</div>
              <div style={s.bigCategory}>{(artist.category || "PORTFOLIO").toUpperCase()}</div>
            </div>
            <div style={s.aboutSection}>
              <div style={s.sectionBadge}>About Me</div>
              <p style={s.bioText}>
                {artist.bio || `${artist.name} is a talented ${artist.category || "artist"} based in ${artist.city || "the world"}.`}
              </p>
              <div style={s.infoPills}>
                {artist.city     && <span style={s.infoPill}>📍 {artist.city}</span>}
                {artist.instagram && (
                  <a href={`https://instagram.com/${artist.instagram}`} target="_blank" rel="noreferrer" style={{ textDecoration:"none" }}>
                    <span style={{ ...s.infoPill,background:"#fff0e6",color:"#e8621a" }}>📸 @{artist.instagram}</span>
                  </a>
                )}
                <span style={{ ...s.infoPill,background:"#e8f0ff",color:"#1e3a8a" }}>🎨 {posts.length} Posts</span>
                {/* ✅ Real profile views from DB */}
                <span style={{ ...s.infoPill,background:"#f0fdf4",color:"#14532d" }}>
                  👁 {artist.profileViews || 0} views
                </span>
                <span style={{ ...s.infoPill,background:isOwner?"#d1fae5":"#fef3c7",color:isOwner?"#065f46":"#92400e" }}>
                  {isOwner ? "👑 Your Profile" : role === "user" ? "👤 Viewing as User" : "🎨 Artist View"}
                </span>
              </div>
            </div>
          </div>

          <div style={s.heroRight}>
            <div style={s.cornerTL} /><div style={s.cornerBR} />
            <div style={s.profilePhotoWrap}>
              {artist.profileImage
                ? <img src={artist.profileImage} alt={artist.name} style={s.profilePhoto} />
                : <div style={s.profileInitials}>{getInitials(artist.name)}</div>
              }
            </div>
            <div style={s.statsCard}>
              <div style={s.statItem}><div style={s.statNum}>{posts.length}</div><div style={s.statLbl}>Posts</div></div>
              <div style={s.statDivider} />
              {/* ✅ Real views in stats card */}
              <div style={s.statItem}><div style={s.statNum}>{artist.profileViews || 0}</div><div style={s.statLbl}>Views</div></div>
              <div style={s.statDivider} />
              <div style={s.statItem}><div style={s.statNum}>{artist.rating || 5}.0</div><div style={s.statLbl}>Rating</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* BLUE SECTION */}
      <div style={s.blueSection}>
        <div className="vertical-sidebar" style={s.verticalLabel}>
          <div style={s.verticalText}>{(artist.category || "ARTIST").toUpperCase()}</div>
          <div style={s.verticalHandle}>aka {artist.instagram ? `@${artist.instagram}` : artist.name}</div>
        </div>

        <div className="blue-section-content" style={s.blueSectionContent}>
          {/* Skills */}
          <div style={{ marginBottom:"36px",animation:"fadeUp 0.5s ease both",animationDelay:"0.1s" }}>
            <div style={s.blueBadge}>✦ Skills & Expertise</div>
            <div style={s.skillsGrid}>
              {skills.map((skill, i) => <span key={i} className="skill-pill" style={s.skillPill}>{skill}</span>)}
            </div>
          </div>

          {/* Portfolio */}
          <div style={{ animation:"fadeUp 0.5s ease both",animationDelay:"0.2s" }}>
            <div style={s.portfolioHeaderRow}>
              <div style={s.blueBadge}>🎨 My Portfolio</div>
              <span style={s.postCount}>{posts.length} works</span>
            </div>
            {posts.length === 0
              ? <div style={s.emptyPortfolio}><div style={{ fontSize:"48px",marginBottom:"12px" }}>🎭</div><div style={{ color:"rgba(255,255,255,0.6)",fontFamily:"'Nunito',sans-serif",fontSize:"15px" }}>No portfolio posts yet</div></div>
              : <div style={s.portfolioGrid}>
                  {posts.map((post, i) => (
                    <div key={post._id} className="post-thumb" onClick={() => setLightbox(post)} style={{ ...s.portfolioThumb,animationDelay:`${0.05*i}s` }}>
                      {post.type === "image"
                        ? <img src={post.media} alt="" style={s.thumbMedia} />
                        : <video src={post.media} style={s.thumbMedia} muted />
                      }
                      <div className="thumb-overlay" style={s.thumbOverlay}>
                        <span className="thumb-icon" style={s.thumbIcon}>{post.type==="video"?"▶":"🖼"}</span>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Action buttons */}
          <div className="action-row-wrap" style={s.actionRow}>
            {role === "user" && (
              <>
                <button className="action-btn" style={s.primaryBtn} onClick={() => navigate(`/chat/${id}`)}>💬 Chat with Artist</button>
                <button className="action-btn" style={s.secondaryBtn} onClick={() => navigate("/artists")}>🔍 More Artists</button>
              </>
            )}
            {role === "artist" && !isOwner && (
              <button className="action-btn" style={s.primaryBtn} onClick={() => navigate(`/chat/${id}`)}>💬 Chat with Artist</button>
            )}
            {isOwner && (
              <>
                <button className="action-btn" style={s.primaryBtn} onClick={() => navigate("/artist-dashboard")}>🛠 Dashboard</button>
                <button className="action-btn" style={s.secondaryBtn} onClick={() => navigate(`/chat/${getId(artist)}`)}>💬 Chat</button>
              </>
            )}
            <button className="action-btn" style={s.secondaryBtn} onClick={() => navigate("/")}>🏠 Home</button>
            <button className="action-btn" style={{ ...s.secondaryBtn,background:"#dc2626",borderColor:"#dc2626" }} onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>

      {/* LIGHTBOX */}
      {lightbox && (
        <div style={s.lightboxOverlay} onClick={() => setLightbox(null)}>
          <div style={s.lightboxBox} onClick={e => e.stopPropagation()}>
            <button style={s.lightboxClose} onClick={() => setLightbox(null)}>✕</button>
            {lightbox.type === "image"
              ? <img src={lightbox.media} alt="" style={s.lightboxMedia} />
              : <video src={lightbox.media} controls style={s.lightboxMedia} />
            }
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:               { fontFamily:"'Nunito',sans-serif",minHeight:"100vh",background:"#f0f4ff",overflowX:"hidden" },
  heroSection:        { position:"relative",background:"#f5f0e8",overflow:"hidden",paddingBottom:"48px" },
  topNav:             { display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 40px",borderBottom:"1px solid rgba(30,58,138,0.1)",position:"relative",zIndex:2,flexWrap:"wrap",gap:"10px" },
  navLink:            { background:"none",border:"none",fontFamily:"'Nunito',sans-serif",fontSize:"14px",color:"#1e3a8a",cursor:"pointer",fontWeight:700 },
  navLinks:           { display:"flex",gap:"24px",alignItems:"center" },
  navItemBtn:         { background:"none",border:"none",fontFamily:"'Nunito',sans-serif",fontSize:"13px",color:"#1e3a8a",fontWeight:700,letterSpacing:"1px",cursor:"pointer",padding:"4px 8px",borderRadius:"8px" },
  navItem:            { fontSize:"13px",color:"#1e3a8a",fontWeight:600,letterSpacing:"1.5px",opacity:0.6 },
  navActionBtn:       { background:"#1e3a8a",color:"#fff",border:"none",padding:"9px 22px",borderRadius:"22px",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:"13px",cursor:"pointer" },
  heroContent:        { display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"40px 40px 0",position:"relative",zIndex:2,gap:"20px",flexWrap:"wrap" },
  heroLeft:           { flex:1,maxWidth:"520px",minWidth:"280px",animation:"slideIn 0.6s ease both" },
  bigTitleWrap:       { marginBottom:"28px" },
  bigTitle:           { fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(52px,8vw,88px)",color:"#1e3a8a",lineHeight:0.95,letterSpacing:"2px" },
  bigCategory:        { fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(40px,6vw,70px)",color:"#1e3a8a",lineHeight:0.95,letterSpacing:"2px",opacity:0.75 },
  aboutSection:       { background:"rgba(255,255,255,0.55)",borderRadius:"16px",padding:"22px 24px",backdropFilter:"blur(6px)",border:"1px solid rgba(30,58,138,0.1)" },
  sectionBadge:       { display:"inline-block",background:"#1e3a8a",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:"14px",padding:"7px 20px",borderRadius:"10px",marginBottom:"14px" },
  bioText:            { fontFamily:"'Nunito',sans-serif",fontSize:"15px",color:"#1a1a2e",lineHeight:1.75,fontWeight:600,margin:"0 0 16px 0" },
  infoPills:          { display:"flex",gap:"8px",flexWrap:"wrap" },
  infoPill:           { background:"#e8f0ff",color:"#1e3a8a",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:"12px",padding:"5px 14px",borderRadius:"20px" },
  heroRight:          { position:"relative",width:"280px",flexShrink:0,animation:"fadeUp 0.7s ease both" },
  cornerTL:           { position:"absolute",top:"-10px",right:"-10px",width:"60px",height:"60px",background:"#1e3a8a",borderRadius:"12px",opacity:0.15,transform:"rotate(15deg)",pointerEvents:"none" },
  cornerBR:           { position:"absolute",bottom:"60px",left:"-15px",width:"40px",height:"40px",background:"#3b82f6",borderRadius:"8px",opacity:0.2,transform:"rotate(-10deg)",pointerEvents:"none" },
  profilePhotoWrap:   { width:"240px",height:"300px",borderRadius:"20px",overflow:"hidden",border:"4px solid #1e3a8a",background:"#dbeafe",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto",boxShadow:"8px 8px 0 #1e3a8a" },
  profilePhoto:       { width:"100%",height:"100%",objectFit:"cover" },
  profileInitials:    { fontFamily:"'Bebas Neue',sans-serif",fontSize:"72px",color:"#1e3a8a",letterSpacing:"4px" },
  statsCard:          { display:"flex",alignItems:"center",justifyContent:"center",background:"#1e3a8a",borderRadius:"14px",padding:"12px 20px",marginTop:"16px",boxShadow:"4px 4px 0 rgba(30,58,138,0.3)" },
  statItem:           { textAlign:"center",flex:1 },
  statNum:            { fontFamily:"'Bebas Neue',sans-serif",fontSize:"22px",color:"#fff",letterSpacing:"1px" },
  statLbl:            { fontFamily:"'Nunito',sans-serif",fontSize:"10px",color:"rgba(255,255,255,0.6)",fontWeight:600,letterSpacing:"1px",textTransform:"uppercase" },
  statDivider:        { width:"1px",height:"32px",background:"rgba(255,255,255,0.2)",margin:"0 12px" },
  blueSection:        { background:"linear-gradient(160deg,#1e40af 0%,#1e3a8a 40%,#1d4ed8 100%)",display:"flex",position:"relative",minHeight:"600px" },
  verticalLabel:      { width:"64px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",padding:"0 0 40px 0",background:"rgba(0,0,0,0.15)",flexShrink:0,gap:"8px",pointerEvents:"none" },
  verticalText:       { fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",color:"#fff",letterSpacing:"4px",writingMode:"vertical-rl",transform:"rotate(180deg)",lineHeight:1 },
  verticalHandle:     { fontFamily:"'Nunito',sans-serif",fontSize:"9px",color:"rgba(255,255,255,0.5)",writingMode:"vertical-rl",transform:"rotate(180deg)",letterSpacing:"1px",fontWeight:700 },
  blueSectionContent: { flex:1,padding:"48px 40px 48px 32px",position:"relative",zIndex:1 },
  blueBadge:          { display:"inline-block",background:"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:"15px",padding:"9px 22px",borderRadius:"12px",marginBottom:"20px",border:"1px solid rgba(255,255,255,0.25)" },
  skillsGrid:         { display:"flex",flexWrap:"wrap",gap:"10px" },
  skillPill:          { background:"rgba(255,255,255,0.12)",color:"#fff",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:"13px",padding:"8px 20px",borderRadius:"24px",border:"1.5px solid rgba(255,255,255,0.25)",cursor:"default",transition:"background 0.2s,color 0.2s" },
  portfolioHeaderRow: { display:"flex",alignItems:"center",gap:"14px",marginBottom:"0" },
  postCount:          { fontFamily:"'Nunito',sans-serif",fontSize:"12px",color:"rgba(255,255,255,0.5)",fontWeight:600 },
  emptyPortfolio:     { textAlign:"center",padding:"60px 0",opacity:0.7 },
  portfolioGrid:      { display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:"12px",marginTop:"4px" },
  portfolioThumb:     { aspectRatio:"3/4",borderRadius:"14px",overflow:"hidden",position:"relative",cursor:"pointer",transition:"transform 0.25s ease,box-shadow 0.25s ease",animation:"fadeUp 0.4s ease both",border:"2px solid rgba(255,255,255,0.15)",background:"rgba(0,0,0,0.3)" },
  thumbMedia:         { width:"100%",height:"100%",objectFit:"cover",display:"block" },
  thumbOverlay:       { position:"absolute",inset:0,background:"rgba(0,0,0,0)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.2s",pointerEvents:"none" },
  thumbIcon:          { fontSize:"22px",opacity:0,transition:"opacity 0.2s" },
  actionRow:          { display:"flex",gap:"12px",flexWrap:"wrap",marginTop:"36px",position:"relative",zIndex:20,paddingBottom:"32px" },
  primaryBtn:         { background:"#fff",color:"#1e3a8a",border:"none",padding:"13px 28px",borderRadius:"28px",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:"14px",cursor:"pointer",transition:"transform 0.2s,box-shadow 0.2s",position:"relative",zIndex:20 },
  secondaryBtn:       { background:"transparent",color:"#fff",border:"2px solid rgba(255,255,255,0.4)",padding:"13px 28px",borderRadius:"28px",fontFamily:"'Nunito',sans-serif",fontWeight:800,fontSize:"14px",cursor:"pointer",transition:"transform 0.2s,box-shadow 0.2s",position:"relative",zIndex:20 },
  lightboxOverlay:    { position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(8px)" },
  lightboxBox:        { position:"relative",maxWidth:"90vw",maxHeight:"90vh",borderRadius:"20px",overflow:"hidden" },
  lightboxClose:      { position:"absolute",top:"12px",right:"12px",background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",width:"36px",height:"36px",borderRadius:"50%",cursor:"pointer",fontSize:"16px",zIndex:10,display:"flex",alignItems:"center",justifyContent:"center" },
  lightboxMedia:      { maxWidth:"80vw",maxHeight:"85vh",objectFit:"contain",display:"block" },
};