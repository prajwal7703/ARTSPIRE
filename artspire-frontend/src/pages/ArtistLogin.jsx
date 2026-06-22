import { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";
import { saveAuth } from "../utils/auth";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const NOTIF_THEMES = {
  loading: { bg:"#dbeafe",color:"#1e3a5f",border:"#93c5fd" },
  success: { bg:"#dcfce7",color:"#14532d",border:"#86efac" },
  error:   { bg:"#fee2e2",color:"#7f1d1d",border:"#fca5a5" },
  artist:  { bg:"#fef3c7",color:"#78350f",border:"#fcd34d" },
};

function NotifBar({ notif, onClose }) {
  if (!notif) return null;
  const theme = NOTIF_THEMES[notif.type] || NOTIF_THEMES.success;
  return (
    <div style={{ position:"fixed",top:"20px",left:"50%",transform:"translateX(-50%)",zIndex:9999,minWidth:"280px",maxWidth:"90vw",background:theme.bg,color:theme.color,border:`1px solid ${theme.border}`,borderRadius:"14px",padding:"14px 20px",display:"flex",alignItems:"center",gap:"12px",boxShadow:"0 8px 32px rgba(0,0,0,0.15)",fontFamily:"sans-serif",fontSize:"14px",fontWeight:"600" }}>
      <style>{`@keyframes notifSlide{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {notif.type === "loading"
        ? <div style={{ width:"18px",height:"18px",border:`2px solid ${theme.border}`,borderTop:`2px solid ${theme.color}`,borderRadius:"50%",animation:"spin 0.75s linear infinite",flexShrink:0 }} />
        : <span style={{ fontSize:"18px",flexShrink:0 }}>{notif.type==="success"?"✅":notif.type==="error"?"❌":"🎨"}</span>
      }
      <span style={{ flex:1 }}>{notif.message}</span>
      {notif.type !== "loading" && (
        <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"18px",color:theme.color,opacity:0.6,padding:0,lineHeight:1 }}>✕</button>
      )}
    </div>
  );
}

export default function ArtistLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email:"",password:"" });
  const [notif, setNotif]       = useState(null);
  const notifTimer = useRef(null);

  function showNotif(type, message, autoDismiss = true) {
    clearTimeout(notifTimer.current);
    setNotif({ type, message });
    if (autoDismiss && type !== "loading") {
      notifTimer.current = setTimeout(() => setNotif(null), 3500);
    }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      showNotif("error","Please enter your email and password."); return;
    }
    showNotif("loading","Signing you in...",false);
    try {
      const res = await axios.post(`${API}/api/auth/login`, formData);

      if (res.data.user?.role !== "artist") {
        showNotif("error","This account is not an artist account. Use user login instead.");
        return;
      }

      saveAuth(res.data.token, res.data.user);
      showNotif("artist", `Welcome back, ${res.data.user.name}! 🎨`);
      setTimeout(() => navigate("/artist-dashboard?tab=profile"), 1200);
    } catch (err) {
      showNotif("error", err.response?.data?.message || "Invalid email or password.");
    }
  };

  const googleLogin = async () => {
    showNotif("loading","Opening Google sign-in...",false);
    try {
      const result = await signInWithPopup(auth, provider);
      const user   = result.user;
      const res    = await axios.post(`${API}/api/auth/google`, {
        name: user.displayName, email: user.email, photo: user.photoURL,
        role: "artist",
      });
      saveAuth(res.data.token, res.data.user);
      showNotif("artist", `Welcome, ${user.displayName}! 🎨`);
      setTimeout(() => navigate("/artist-dashboard?tab=profile"), 1200);
    } catch (err) {
      const code = err?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") { setNotif(null); return; }
      showNotif("error","Google sign-in failed. Please try again.");
    }
  };

  return (
    <>
      <NotifBar notif={notif} onClose={() => setNotif(null)} />
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        .al-wrap { min-height:100vh;background:linear-gradient(135deg,#1e3a8a,#1d4ed8,#312e81);display:flex;justify-content:center;align-items:center;padding:16px; }
        .al-card { width:100%;max-width:1100px;background:white;border-radius:40px;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;box-shadow:0 20px 60px rgba(0,0,0,0.4); }
        .al-left { background:#f0f4ff;padding:40px;position:relative;display:flex;justify-content:center;align-items:center; }
        .al-right { padding:clamp(30px,5vw,60px);display:flex;justify-content:center;align-items:center; }
        .al-form { width:100%;max-width:400px;display:flex;flex-direction:column;gap:20px; }
        .al-input { padding:16px;border-radius:50px;border:1px solid #d1d5db;outline:none;font-size:16px;font-family:sans-serif;width:100%; }
        .al-btn-primary { padding:16px;border:none;border-radius:50px;background:linear-gradient(90deg,#1e3a8a,#1d4ed8);color:white;font-size:18px;font-weight:bold;cursor:pointer;width:100%; }
        .al-btn-google { padding:14px 16px;border-radius:50px;border:1.5px solid #e2e8f0;background:white;font-size:15px;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:sans-serif;width:100%; }
        @media (max-width: 680px) {
          .al-card { grid-template-columns:1fr; border-radius:24px; }
          .al-left { display:none; }
          .al-right { padding:32px 20px; }
          .al-input { font-size:15px; padding:14px; }
        }
      `}</style>

      <div className="al-wrap">
        <div className="al-card">

          {/* LEFT — hidden on mobile */}
          <div className="al-left">
            <div style={{ position:"absolute",top:"20px",left:"30px",display:"flex",alignItems:"center",gap:"10px" }}>
              <img src="/logo.jpeg" alt="logo" style={{ width:"50px",height:"50px",borderRadius:"50%",objectFit:"cover" }} onError={e=>e.target.style.display="none"} />
              <h1 style={{ fontSize:"32px",fontWeight:"bold",color:"#1e3a8a",margin:0 }}>ArtSpire</h1>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:"72px",marginBottom:"16px" }}>🎨</div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(20px,3vw,28px)",color:"#1e3a8a",letterSpacing:"2px",marginBottom:"8px" }}>Artist Portal</div>
              <div style={{ fontSize:"14px",color:"#64748b",fontWeight:600,lineHeight:1.7,maxWidth:"260px",margin:"0 auto" }}>
                Showcase your talent, connect with clients, and grow your creative career.
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="al-right">
            <form onSubmit={handleSubmit} className="al-form">
              <h1 style={{ textAlign:"center",fontSize:"clamp(24px,5vw,34px)",color:"#1e3a8a",fontWeight:"bold",margin:0 }}>Artist Login</h1>
              <p style={{ textAlign:"center",color:"#94a3b8",fontSize:"14px",fontWeight:600,margin:0 }}>Sign in to your artist account</p>

              <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required autoComplete="username" className="al-input" />
              <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required autoComplete="current-password" className="al-input" />

              <p onClick={() => navigate("/forgot-password")} style={{ textAlign:"right",color:"#1e3a8a",cursor:"pointer",fontWeight:600,fontSize:"14px",margin:"-8px 0 0" }}>
                Forgot password?
              </p>

              <button type="submit" className="al-btn-primary">LOGIN</button>

              <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
                <div style={{ flex:1,height:"1px",background:"#e2e8f0" }} />
                <span style={{ fontSize:"12px",color:"#94a3b8",fontWeight:700 }}>OR</span>
                <div style={{ flex:1,height:"1px",background:"#e2e8f0" }} />
              </div>

              <button type="button" onClick={googleLogin} className="al-btn-google">
                <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight:10,flexShrink:0 }}>
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
                </svg>
                Continue with Google
              </button>

              <div style={{ textAlign:"center",fontSize:"14px",color:"#94a3b8",fontWeight:600 }}>
                New artist?{" "}
                <span onClick={() => navigate("/artist-register")} style={{ color:"#1e3a8a",cursor:"pointer",fontWeight:800 }}>Register here</span>
              </div>
              <div style={{ textAlign:"center",fontSize:"13px",color:"#94a3b8" }}>
                Not an artist?{" "}
                <span onClick={() => navigate("/login")} style={{ color:"#f59e0b",cursor:"pointer",fontWeight:800 }}>User Login →</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
