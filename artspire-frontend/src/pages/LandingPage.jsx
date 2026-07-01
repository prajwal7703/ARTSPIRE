import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const CATEGORIES = [
  { icon:"🎤", label:"Singers" },
  { icon:"💃", label:"Dancers" },
  { icon:"📸", label:"Photographers" },
  { icon:"🎨", label:"Painters" },
  { icon:"🎸", label:"Musicians" },
  { icon:"🎭", label:"Actors" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [artistCount, setArtistCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/users`).then(res => {
      const artists = res.data.filter(u => u.role === "artist");
      setArtistCount(artists.length);
    }).catch(()=>{});

    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("artist") || localStorage.getItem("user") || "{}"); } catch { return {}; } })();

  return (
    <div style={{ minHeight:"100vh", fontFamily:"'Nunito',sans-serif", background:"#fff", overflowX:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .hero-btn:hover { opacity:0.88; transform:translateY(-2px); }
        .cat-card:hover { transform:translateY(-6px); box-shadow:0 16px 40px rgba(30,58,138,0.15) !important; }
        .step-card:hover { transform:translateY(-4px); }
        @media (max-width:768px) {
          .hero-title  { font-size:44px !important; }
          .hero-sub    { font-size:15px !important; }
          .hero-btns   { flex-direction:column !important; }
          .hero-btns button { width:100% !important; }
          .cats-grid   { grid-template-columns:repeat(2,1fr) !important; }
          .steps-grid  { grid-template-columns:1fr !important; }
          .cta-title   { font-size:32px !important; }
          .section-pad { padding:48px 20px !important; }
          .nav-links   { display:none !important; }
        }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, background: scrolled ? "rgba(255,255,255,0.97)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? "1px solid #e2e8f0" : "none", transition:"all 0.3s ease", padding:"0 24px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, color: scrolled ? "#1e3a8a" : "#fff", letterSpacing:2 }}>ARTSPIRE</div>
        <div className="nav-links" style={{ display:"flex", gap:28, alignItems:"center" }}>
          {["Discover","How it Works","For Artists"].map(l => (
            <span key={l} style={{ color: scrolled ? "#64748b" : "rgba(255,255,255,0.85)", fontSize:14, fontWeight:700, cursor:"pointer" }}
              onClick={()=>{ if(l==="Discover") navigate("/discover"); }}
            >{l}</span>
          ))}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {currentUser._id ? (
            <button onClick={()=>navigate(currentUser.role==="artist"?"/artist-dashboard":"/discover")} style={{ background:"#1e3a8a", color:"#fff", border:"none", padding:"9px 20px", borderRadius:22, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
              Dashboard →
            </button>
          ) : (
            <>
              <button onClick={()=>navigate("/artist-login")} style={{ background: scrolled ? "#f0f4ff" : "rgba(255,255,255,0.15)", color: scrolled ? "#1e3a8a" : "#fff", border:"none", padding:"9px 18px", borderRadius:22, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif", backdropFilter:"blur(8px)" }}>
                Login
              </button>
              <button onClick={()=>navigate("/discover")} style={{ background:"#1e3a8a", color:"#fff", border:"none", padding:"9px 20px", borderRadius:22, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a 0%,#1e3a8a 40%,#3b82f6 70%,#6366f1 100%)", backgroundSize:"300% 300%", animation:"gradShift 8s ease infinite", display:"flex", alignItems:"center", justifyContent:"center", padding:"100px 24px 60px", position:"relative", overflow:"hidden" }}>
        {/* Dot grid */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.07, pointerEvents:"none" }} xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="2" fill="#fff"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#dots)"/>
        </svg>
        {/* Floating blobs */}
        <div style={{ position:"absolute", top:"15%", right:"8%", width:300, height:300, borderRadius:"50%", background:"rgba(99,102,241,0.2)", filter:"blur(60px)", animation:"float 6s ease-in-out infinite" }} />
        <div style={{ position:"absolute", bottom:"20%", left:"5%", width:200, height:200, borderRadius:"50%", background:"rgba(59,130,246,0.2)", filter:"blur(40px)", animation:"float 8s ease-in-out infinite reverse" }} />

        <div style={{ position:"relative", zIndex:2, textAlign:"center", maxWidth:720, animation:"fadeUp 0.6s ease" }}>
          <div style={{ display:"inline-block", background:"rgba(255,255,255,0.12)", backdropFilter:"blur(8px)", borderRadius:24, padding:"6px 20px", fontSize:12, fontWeight:800, color:"rgba(255,255,255,0.9)", marginBottom:24, letterSpacing:2, border:"1px solid rgba(255,255,255,0.15)" }}>
            ✨ INDIA'S LOCAL ARTIST PLATFORM
          </div>
          <h1 className="hero-title" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:72, color:"#fff", letterSpacing:3, lineHeight:0.95, marginBottom:20 }}>
            BOOK LOCAL<br/>ARTISTS FOR<br/>ANY OCCASION
          </h1>
          <p className="hero-sub" style={{ fontSize:18, color:"rgba(255,255,255,0.75)", fontWeight:600, marginBottom:36, lineHeight:1.7, maxWidth:500, margin:"0 auto 36px" }}>
            Connect with singers, dancers, photographers and more from your city. Real talent, real connections.
          </p>
          <div className="hero-btns" style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <button className="hero-btn" onClick={()=>navigate("/discover")} style={{ padding:"16px 36px", background:"#fff", color:"#1e3a8a", border:"none", borderRadius:50, fontSize:16, fontWeight:900, cursor:"pointer", fontFamily:"'Nunito',sans-serif", transition:"all 0.2s", boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
              🔍 Find Artists
            </button>
            <button className="hero-btn" onClick={()=>navigate("/artist-login")} style={{ padding:"16px 36px", background:"rgba(255,255,255,0.12)", color:"#fff", border:"2px solid rgba(255,255,255,0.3)", borderRadius:50, fontSize:16, fontWeight:900, cursor:"pointer", fontFamily:"'Nunito',sans-serif", transition:"all 0.2s", backdropFilter:"blur(8px)" }}>
              🎨 I'm an Artist
            </button>
          </div>
          {/* Stats */}
          <div style={{ display:"flex", justifyContent:"center", gap:40, marginTop:52, flexWrap:"wrap" }}>
            {[
              { num:`${artistCount || 50}+`, label:"Artists" },
              { num:"8+", label:"Cities" },
              { num:"6+", label:"Categories" },
            ].map((s,i) => (
              <div key={i}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:40, color:"#fff", letterSpacing:2 }}>{s.num}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)", fontWeight:700, letterSpacing:1 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CATEGORIES ── */}
      <div className="section-pad" style={{ padding:"72px 24px", background:"#f8fafc" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:40 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:42, color:"#1e293b", letterSpacing:2, marginBottom:8 }}>BROWSE BY CATEGORY</div>
            <div style={{ color:"#94a3b8", fontSize:15, fontWeight:600 }}>Find the right talent for your event</div>
          </div>
          <div className="cats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {CATEGORIES.map((c,i) => (
              <div key={i} className="cat-card" onClick={()=>navigate(`/discover?category=${c.label.slice(0,-1)}`)} style={{ background:"#fff", borderRadius:20, padding:"28px 20px", textAlign:"center", cursor:"pointer", boxShadow:"0 2px 16px rgba(0,0,0,0.06)", transition:"all 0.2s" }}>
                <div style={{ fontSize:40, marginBottom:10 }}>{c.icon}</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#1e293b", letterSpacing:1 }}>{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="section-pad" style={{ padding:"72px 24px", background:"#fff" }}>
        <div style={{ maxWidth:1000, margin:"0 auto" }}>
          <div style={{ textAlign:"center", marginBottom:48 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:42, color:"#1e293b", letterSpacing:2, marginBottom:8 }}>HOW IT WORKS</div>
            <div style={{ color:"#94a3b8", fontSize:15, fontWeight:600 }}>Book an artist in 3 simple steps</div>
          </div>
          <div className="steps-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24 }}>
            {[
              { step:"01", icon:"🔍", title:"Browse Artists", desc:"Search by category, city, or name. Filter to find exactly who you need." },
              { step:"02", icon:"💬", title:"Message & Book", desc:"Chat directly with the artist. Discuss details and book with one click." },
              { step:"03", icon:"🎉", title:"Enjoy the Show", desc:"Your artist shows up, performs, and you leave a review. Simple." },
            ].map((s,i) => (
              <div key={i} className="step-card" style={{ background:"#f8fafc", borderRadius:20, padding:"28px 24px", transition:"transform 0.2s", position:"relative", overflow:"hidden" }}>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:56, color:"#e0e7ff", position:"absolute", top:12, right:16, lineHeight:1 }}>{s.step}</div>
                <div style={{ fontSize:40, marginBottom:16 }}>{s.icon}</div>
                <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#1e293b", letterSpacing:1, marginBottom:8 }}>{s.title}</div>
                <div style={{ fontSize:14, color:"#64748b", lineHeight:1.7, fontWeight:500 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOR ARTISTS ── */}
      <div className="section-pad" style={{ padding:"72px 24px", background:"linear-gradient(135deg,#1e3a8a,#3b82f6)" }}>
        <div style={{ maxWidth:700, margin:"0 auto", textAlign:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:"rgba(255,255,255,0.7)", letterSpacing:3, marginBottom:12 }}>FOR ARTISTS</div>
          <div className="cta-title" style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, color:"#fff", letterSpacing:2, marginBottom:16, lineHeight:1.1 }}>
            GROW YOUR<br/>CAREER WITH US
          </div>
          <div style={{ fontSize:16, color:"rgba(255,255,255,0.75)", fontWeight:600, marginBottom:36, lineHeight:1.7 }}>
            Create your profile, showcase your portfolio, and get booked by clients in your city. Free to join.
          </div>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={()=>navigate("/artist-login")} style={{ padding:"14px 32px", background:"#fff", color:"#1e3a8a", border:"none", borderRadius:50, fontSize:15, fontWeight:900, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
              Join as Artist →
            </button>
            <button onClick={()=>navigate("/discover")} style={{ padding:"14px 32px", background:"rgba(255,255,255,0.12)", color:"#fff", border:"2px solid rgba(255,255,255,0.3)", borderRadius:50, fontSize:15, fontWeight:900, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
              Browse Artists
            </button>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ background:"#0f172a", padding:"32px 24px", textAlign:"center" }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#fff", letterSpacing:2, marginBottom:8 }}>ARTSPIRE</div>
        <div style={{ fontSize:13, color:"#475569", fontWeight:600 }}>Connecting local artists with the world · Made in India 🇮🇳</div>
      </footer>
    </div>
  );
}
