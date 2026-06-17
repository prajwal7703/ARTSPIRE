import { useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user")) || JSON.parse(localStorage.getItem("artist"));
  } catch {}

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("artist");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .nav-center { display: none !important; }
          .hamburger { display: flex !important; }
          .nav-right-desktop { display: none !important; }
        }
        @media (min-width: 769px) {
          .hamburger { display: none !important; }
          .mobile-menu { display: none !important; }
          .nav-right-desktop { display: flex !important; }
        }
      `}</style>

      <nav style={{ position:"fixed", top:0, left:0, width:"100%", zIndex:50, padding:"16px 16px 0" }}>
        <div style={{ maxWidth:"1280px", margin:"0 auto", background:"rgba(255,255,255,0.1)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:"50px", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>

          {/* LOGO */}
          <Link to="/" style={{ display:"flex", alignItems:"center", gap:"10px", textDecoration:"none" }}>
            <img src="/logo.jpeg" alt="logo" style={{ width:"44px", height:"44px", borderRadius:"50%", objectFit:"cover", border:"2px solid #f97316" }} />
            <span style={{ fontSize:"28px", fontWeight:900, color:"#fff" }}>Art<span style={{ color:"#f97316" }}>Spire</span></span>
          </Link>

          {/* CENTER LINKS — desktop only */}
          <div className="nav-center" style={{ display:"flex", alignItems:"center", gap:"40px" }}>
            <Link to="/artist-register" style={{ color:"#fff", fontWeight:600, fontSize:"16px", textDecoration:"none" }}>Become Artist</Link>
            <Link to="/" style={{ color:"#fff", fontWeight:600, fontSize:"16px", textDecoration:"none" }}>Home</Link>
            <Link to="/artists" style={{ color:"#fff", fontWeight:600, fontSize:"16px", textDecoration:"none" }}>Artists</Link>
          </div>

          {/* RIGHT — desktop */}
          <div className="nav-right-desktop" style={{ alignItems:"center", gap:"12px" }}>
            {!user ? (
              <>
                <Link to="/login"><button style={{ padding:"8px 20px", borderRadius:"50px", border:"1px solid rgba(255,255,255,0.3)", background:"transparent", color:"#fff", fontWeight:600, cursor:"pointer", fontSize:"14px" }}>Login</button></Link>
                <Link to="/register"><button style={{ padding:"8px 20px", borderRadius:"50px", background:"#f97316", border:"none", color:"#fff", fontWeight:600, cursor:"pointer", fontSize:"14px" }}>Register</button></Link>
              </>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", background:"rgba(255,255,255,0.1)", padding:"6px 14px", borderRadius:"50px" }}>
                  <img src={user.photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="profile" style={{ width:"36px", height:"36px", borderRadius:"50%", objectFit:"cover" }} />
                  <div>
                    <p style={{ fontSize:"11px", color:"#d1d5db", margin:0 }}>Welcome</p>
                    <p style={{ fontSize:"13px", color:"#f97316", fontWeight:700, margin:0 }}>{user.name}</p>
                  </div>
                </div>
                <button onClick={handleLogout} style={{ padding:"8px 18px", borderRadius:"50px", background:"#ef4444", border:"none", color:"#fff", fontWeight:600, cursor:"pointer", fontSize:"14px" }}>Logout</button>
              </>
            )}
          </div>

          {/* HAMBURGER — mobile only */}
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:"12px", padding:"8px 12px", cursor:"pointer", display:"flex", flexDirection:"column", gap:"5px", alignItems:"center", justifyContent:"center" }}>
            <span style={{ width:"22px", height:"2px", background:"#fff", borderRadius:"2px", transition:"all 0.3s", transform:menuOpen?"rotate(45deg) translateY(7px)":"none" }} />
            <span style={{ width:"22px", height:"2px", background:"#fff", borderRadius:"2px", opacity:menuOpen?0:1, transition:"all 0.3s" }} />
            <span style={{ width:"22px", height:"2px", background:"#fff", borderRadius:"2px", transition:"all 0.3s", transform:menuOpen?"rotate(-45deg) translateY(-7px)":"none" }} />
          </button>
        </div>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="mobile-menu" style={{ maxWidth:"1280px", margin:"8px auto 0", background:"rgba(8,17,32,0.97)", backdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"24px", padding:"20px", display:"flex", flexDirection:"column", gap:"12px" }}>

            {user && (
              <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 16px", background:"rgba(255,255,255,0.07)", borderRadius:"16px", marginBottom:"4px" }}>
                <img src={user.photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt="profile" style={{ width:"44px", height:"44px", borderRadius:"50%", objectFit:"cover" }} />
                <div>
                  <p style={{ fontSize:"12px", color:"#9ca3af", margin:0 }}>Welcome back</p>
                  <p style={{ fontSize:"16px", color:"#f97316", fontWeight:700, margin:0 }}>{user.name}</p>
                </div>
              </div>
            )}

            {[
              { label:"🏠 Home", to:"/" },
              { label:"🎨 Artists", to:"/artists" },
              { label:"✨ Become Artist", to:"/artist-register" },
            ].map(({ label, to }) => (
              <Link key={to} to={to} onClick={() => setMenuOpen(false)} style={{ color:"#fff", fontWeight:700, fontSize:"16px", textDecoration:"none", padding:"14px 16px", borderRadius:"14px", background:"rgba(255,255,255,0.06)", display:"block" }}>
                {label}
              </Link>
            ))}

            {!user ? (
              <div style={{ display:"flex", gap:"10px", marginTop:"4px" }}>
                <Link to="/login" onClick={() => setMenuOpen(false)} style={{ flex:1 }}>
                  <button style={{ width:"100%", padding:"13px", borderRadius:"50px", border:"1px solid rgba(255,255,255,0.3)", background:"transparent", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:"15px" }}>Login</button>
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} style={{ flex:1 }}>
                  <button style={{ width:"100%", padding:"13px", borderRadius:"50px", background:"#f97316", border:"none", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:"15px" }}>Register</button>
                </Link>
              </div>
            ) : (
              <button onClick={handleLogout} style={{ width:"100%", padding:"13px", borderRadius:"50px", background:"#ef4444", border:"none", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:"15px", marginTop:"4px" }}>Logout</button>
            )}
          </div>
        )}
      </nav>
    </>
  );
}