import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";
import { saveAuth } from "../utils/auth";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

// Must match ADMIN_EMAIL in backend/routes/adminRoutes.js
const ADMIN_EMAIL = "artistsconnect.arts@gmail.com";

const NOTIF_THEMES = {
  loading: { bg:"#dbeafe",color:"#1e3a5f",border:"#93c5fd" },
  success: { bg:"#dcfce7",color:"#14532d",border:"#86efac" },
  error:   { bg:"#fee2e2",color:"#7f1d1d",border:"#fca5a5" },
  google:  { bg:"#ede9fe",color:"#3b0764",border:"#c4b5fd" },
};

function NotifBar({ notif, onClose }) {
  if (!notif) return null;
  const theme = NOTIF_THEMES[notif.type] || NOTIF_THEMES.success;
  return (
    <div style={{ position:"fixed",top:"20px",left:"50%",transform:"translateX(-50%)",zIndex:9999,minWidth:"280px",maxWidth:"90vw",background:theme.bg,color:theme.color,border:`1px solid ${theme.border}`,borderRadius:"14px",padding:"14px 20px",display:"flex",alignItems:"center",gap:"12px",boxShadow:"0 8px 32px rgba(0,0,0,0.15)",fontFamily:"sans-serif",fontSize:"14px",fontWeight:"600" }}>
      <style>{`@keyframes notifSlide{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {notif.type === "loading"
        ? <div style={{ width:"18px",height:"18px",border:`2px solid ${theme.border}`,borderTop:`2px solid ${theme.color}`,borderRadius:"50%",animation:"spin 0.75s linear infinite",flexShrink:0 }} />
        : <span style={{ fontSize:"18px",flexShrink:0 }}>{notif.type==="success"?"✅":notif.type==="error"?"❌":"🔵"}</span>
      }
      <span style={{ flex:1 }}>{notif.message}</span>
      {notif.type !== "loading" && (
        <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"18px",color:theme.color,opacity:0.6,padding:0,lineHeight:1 }}>✕</button>
      )}
    </div>
  );
}

export default function UserLogin() {
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

  useEffect(() => () => clearTimeout(notifTimer.current), []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      showNotif("error","Please enter your email and password."); return;
    }
    showNotif("loading","Signing you in...",false);

    // Admin email is checked FIRST and handled entirely separately — the
    // admin account doesn't need to exist in the regular User collection
    // at all, so it must never touch /api/auth/login.
    if (formData.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      try {
        const adminRes = await axios.post(`${API}/api/admin/login`, {
          email: formData.email,
          password: formData.password,
        });
        if (adminRes.data?.success) {
          localStorage.setItem("admin_password", formData.password);
          showNotif("success", "Welcome back, Admin!");
          setTimeout(() => navigate("/admin"), 900);
        } else {
          showNotif("error", "Wrong admin password.");
        }
      } catch {
        showNotif("error", "Wrong admin password.");
      }
      return;
    }

    // Normal user login
    try {
      const res = await axios.post(`${API}/api/auth/login`, formData);
      saveAuth(res.data.token, res.data.user);
      showNotif("success", `Welcome back, ${res.data.user.name}!`);
      if (res.data.user?.role === "artist") {
        setTimeout(() => navigate("/artist-dashboard"), 1200);
      } else {
        setTimeout(() => navigate("/"), 1200);
      }
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
        name: user.displayName, email: user.email, photo: user.photoURL, role: "user",
      });
      saveAuth(res.data.token, res.data.user);
      showNotif("success", `Welcome, ${user.displayName}!`);
      if (res.data.user?.role === "artist") {
        setTimeout(() => navigate("/artist-dashboard"), 1200);
      } else {
        setTimeout(() => navigate("/"), 1200);
      }
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
        .login-wrap { min-height:100vh;background:linear-gradient(135deg,#4f46e5,#7c3aed,#312e81);display:flex;justify-content:center;align-items:center;padding:16px; }
        .login-card { width:100%;max-width:1100px;background:white;border-radius:40px;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;box-shadow:0 20px 60px rgba(0,0,0,0.4); }
        .login-left { background:#f8fafc;padding:40px;position:relative;display:flex;justify-content:center;align-items:center; }
        .login-right { padding:clamp(30px,5vw,60px);display:flex;justify-content:center;align-items:center; }
        .login-form { width:100%;max-width:400px;display:flex;flex-direction:column;gap:20px; }
        .login-input { padding:16px;border-radius:50px;border:1px solid #d1d5db;outline:none;font-size:16px;font-family:sans-serif;width:100%; }
        .login-btn-primary { padding:16px;border:none;border-radius:50px;background:linear-gradient(90deg,#4f46e5,#7c3aed);color:white;font-size:18px;font-weight:bold;cursor:pointer;width:100%; }
        .login-btn-google { padding:14px 16px;border-radius:50px;border:1.5px solid #e2e8f0;background:white;font-size:15px;cursor:pointer;font-weight:700;display:flex;align-items:center;justify-content:center;font-family:sans-serif;width:100%; }
        @media (max-width: 680px) {
          .login-card { grid-template-columns:1fr; border-radius:24px; }
          .login-left { display:none; }
          .login-right { padding:32px 20px; }
          .login-input { font-size:15px; padding:14px; }
        }
      `}</style>

      <div className="login-wrap">
        <div className="login-card">

          {/* LEFT — hidden on mobile */}
          <div className="login-left">
            <div style={{ position:"absolute",top:"20px",left:"30px",display:"flex",alignItems:"center",gap:"10px" }}>
              <img src="/logo.jpeg" alt="logo" style={{ width:"50px",height:"50px",borderRadius:"50%",objectFit:"cover" }} onError={e=>e.target.style.display="none"} />
              <h1 style={{ fontSize:"32px",fontWeight:"bold",color:"#ff7a00",margin:0 }}>ArtSpire</h1>
            </div>
            <img src="/artlogin.jpg" alt="art" style={{ width:"90%",maxWidth:"500px",borderRadius:"30px",objectFit:"cover",boxShadow:"0 10px 40px rgba(0,0,0,0.2)" }} onError={e=>e.target.style.display="none"} />
          </div>

          {/* RIGHT */}
          <div className="login-right">
            <form onSubmit={handleSubmit} className="login-form">
              <div style={{ width:"80px",height:"80px",background:"#eef2ff",borderRadius:"50%",display:"flex",justifyContent:"center",alignItems:"center",fontSize:"42px",margin:"0 auto" }}>👤</div>

              <h1 style={{ textAlign:"center",fontSize:"clamp(26px,5vw,38px)",color:"#4f46e5",fontWeight:"bold",margin:0 }}>Welcome Back</h1>
              <p style={{ textAlign:"center",color:"#94a3b8",fontSize:"14px",fontWeight:600,margin:0 }}>Sign in to your account</p>

              <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required autoComplete="username" className="login-input" />
              <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required autoComplete="current-password" className="login-input" />

              <p onClick={() => navigate("/forgot-password")} style={{ textAlign:"right",color:"#4f46e5",cursor:"pointer",fontWeight:600,fontSize:"14px",margin:"-8px 0 0" }}>
                Forgot password?
              </p>

              <button type="submit" className="login-btn-primary">LOGIN</button>

              <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
                <div style={{ flex:1,height:"1px",background:"#e2e8f0" }} />
                <span style={{ fontSize:"12px",color:"#94a3b8",fontWeight:700 }}>OR</span>
                <div style={{ flex:1,height:"1px",background:"#e2e8f0" }} />
              </div>

              <button type="button" onClick={googleLogin} className="login-btn-google">
                <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight:10,flexShrink:0 }}>
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
                </svg>
                Continue with Google
              </button>

              <div style={{ textAlign:"center",fontSize:"14px",color:"#94a3b8",fontWeight:600 }}>
                Don't have an account?{" "}
                <span onClick={() => navigate("/register")} style={{ color:"#4f46e5",cursor:"pointer",fontWeight:800 }}>Register</span>
              </div>
              <div style={{ textAlign:"center",fontSize:"13px",color:"#94a3b8" }}>
                Are you an artist?{" "}
                <span onClick={() => navigate("/artist-login")} style={{ color:"#f59e0b",cursor:"pointer",fontWeight:800 }}>Artist Login →</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}