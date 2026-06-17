import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebase";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const NOTIF_THEMES = {
  loading: { bg: "#dbeafe", color: "#1e3a5f", border: "#93c5fd" },
  success: { bg: "#dcfce7", color: "#14532d", border: "#86efac" },
  error:   { bg: "#fee2e2", color: "#7f1d1d", border: "#fca5a5" },
  google:  { bg: "#ede9fe", color: "#3b0764", border: "#c4b5fd" },
};

function NotifBar({ notif, onClose }) {
  if (!notif) return null;
  const theme = NOTIF_THEMES[notif.type] || NOTIF_THEMES.success;
  return (
    <div style={{ position:"fixed", top:"20px", left:"50%", transform:"translateX(-50%)", zIndex:9999, minWidth:"320px", maxWidth:"520px", background:theme.bg, color:theme.color, border:`1px solid ${theme.border}`, borderRadius:"14px", padding:"14px 20px", display:"flex", alignItems:"center", gap:"12px", boxShadow:"0 8px 32px rgba(0,0,0,0.15)", animation:"notifSlide 0.35s cubic-bezier(0.34,1.3,0.64,1) both", fontFamily:"sans-serif", fontSize:"15px", fontWeight:"600" }}>
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
  const [formData, setFormData] = useState({ email:"", password:"" });
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

  // ── Email/password login ──────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      showNotif("error", "Please enter your email and password.");
      return;
    }
    showNotif("loading", "Signing you in...", false);
    try {
      const res = await axios.post(`${API}/api/auth/login`, {
        email:    formData.email,
        password: formData.password,
      });
      localStorage.setItem("token", res.data.token);
      if (res.data.user?.role === "artist") {
        localStorage.setItem("artist", JSON.stringify(res.data.user));
        localStorage.removeItem("user");
        showNotif("success", `Welcome back, ${res.data.user.name}! 🎨`);
        setTimeout(() => navigate("/artist-dashboard"), 1200);
      } else {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.removeItem("artist");
        showNotif("success", `Welcome back, ${res.data.user.name}!`);
        setTimeout(() => navigate("/"), 1200);
      }
    } catch (err) {
      showNotif("error", err.response?.data?.message || "Invalid email or password.");
    }
  };

  // ── Google login — using POPUP (avoids unauthorized-domain error on Vercel) ─
  const googleLogin = async () => {
    showNotif("loading", "Opening Google sign-in...", false);
    try {
      const result = await signInWithPopup(auth, provider);
      const user   = result.user;

      const res = await axios.post(`${API}/api/auth/google`, {
        name:  user.displayName,
        email: user.email,
        photo: user.photoURL,
        role:  "user",
      });

      localStorage.setItem("token", res.data.token);

      if (res.data.user?.role === "artist") {
        localStorage.setItem("artist", JSON.stringify(res.data.user));
        localStorage.removeItem("user");
        showNotif("success", `Welcome back, ${user.displayName}! 🎨`);
        setTimeout(() => navigate("/artist-dashboard"), 1200);
      } else {
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.removeItem("artist");
        showNotif("success", `Welcome, ${user.displayName}!`);
        setTimeout(() => navigate("/"), 1200);
      }
    } catch (err) {
      // User closed popup or firebase domain error
      const code = err?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setNotif(null);
        return;
      }
      showNotif("error", "Google sign-in failed. Please try again.");
      console.error("Google login error:", err);
    }
  };

  return (
    <>
      <NotifBar notif={notif} onClose={() => setNotif(null)} />
      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#4f46e5,#7c3aed,#312e81)", display:"flex", justifyContent:"center", alignItems:"center", padding:"30px" }}>
        <div style={{ width:"100%", maxWidth:"1100px", background:"white", borderRadius:"40px", overflow:"hidden", display:"grid", gridTemplateColumns:"1fr 1fr", boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>

          {/* LEFT */}
          <div style={{ background:"#f8fafc", padding:"40px", position:"relative", display:"flex", justifyContent:"center", alignItems:"center" }}>
            <div style={{ position:"absolute", top:"20px", left:"30px", display:"flex", alignItems:"center", gap:"10px" }}>
              <img src="/logo.jpeg" alt="logo" style={{ width:"60px", height:"60px", borderRadius:"50%", objectFit:"cover" }} />
              <h1 style={{ fontSize:"38px", fontWeight:"bold", color:"#ff7a00" }}>ArtSpire</h1>
            </div>
            <img src="/artlogin.jpg" alt="art" style={{ width:"90%", maxWidth:"500px", borderRadius:"30px", objectFit:"cover", boxShadow:"0 10px 40px rgba(0,0,0,0.2)" }} />
          </div>

          {/* RIGHT */}
          <div style={{ padding:"60px", display:"flex", justifyContent:"center", alignItems:"center" }}>
            <form onSubmit={handleSubmit} style={{ width:"100%", maxWidth:"400px", display:"flex", flexDirection:"column", gap:"20px" }}>

              <div style={{ width:"100px", height:"100px", background:"#eef2ff", borderRadius:"50%", display:"flex", justifyContent:"center", alignItems:"center", fontSize:"52px", margin:"0 auto" }}>👤</div>

              <h1 style={{ textAlign:"center", fontSize:"38px", color:"#4f46e5", fontWeight:"bold", margin:0 }}>Welcome Back</h1>
              <p style={{ textAlign:"center", color:"#94a3b8", fontSize:"14px", fontWeight:600, margin:0 }}>Sign in to your account</p>

              <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required autoComplete="username" style={inputStyle} />
              <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required autoComplete="current-password" style={inputStyle} />

              <p onClick={() => navigate("/forgot-password")} style={{ textAlign:"right", color:"#4f46e5", cursor:"pointer", fontWeight:600, fontSize:"14px", margin:"-8px 0 0" }}>
                Forgot password?
              </p>

              <button type="submit" style={primaryBtn}>LOGIN</button>

              {/* Divider */}
              <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ flex:1, height:"1px", background:"#e2e8f0" }} />
                <span style={{ fontSize:"12px", color:"#94a3b8", fontWeight:700 }}>OR</span>
                <div style={{ flex:1, height:"1px", background:"#e2e8f0" }} />
              </div>

              {/* Google button */}
              <button type="button" onClick={googleLogin} style={googleBtn}>
                <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight:10, flexShrink:0 }}>
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
                </svg>
                Continue with Google
              </button>

              <div style={{ textAlign:"center", fontSize:"14px", color:"#94a3b8", fontWeight:600 }}>
                Don't have an account?{" "}
                <span onClick={() => navigate("/register")} style={{ color:"#4f46e5", cursor:"pointer", fontWeight:800 }}>Register</span>
              </div>
              <div style={{ textAlign:"center", fontSize:"13px", color:"#94a3b8" }}>
                Are you an artist?{" "}
                <span onClick={() => navigate("/artist-login")} style={{ color:"#f59e0b", cursor:"pointer", fontWeight:800 }}>Artist Login →</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

const inputStyle = { padding:"16px", borderRadius:"50px", border:"1px solid #d1d5db", outline:"none", fontSize:"16px", fontFamily:"sans-serif" };
const primaryBtn = { padding:"16px", border:"none", borderRadius:"50px", background:"linear-gradient(90deg,#4f46e5,#7c3aed)", color:"white", fontSize:"18px", fontWeight:"bold", cursor:"pointer" };
const googleBtn  = { padding:"14px 16px", borderRadius:"50px", border:"1.5px solid #e2e8f0", background:"white", fontSize:"15px", cursor:"pointer", fontWeight:"700", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"sans-serif" };