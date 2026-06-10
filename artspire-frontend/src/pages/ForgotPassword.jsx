import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const NOTIF_THEMES = {
  loading: { bg: "#dbeafe", color: "#1e3a5f", border: "#93c5fd" },
  success: { bg: "#dcfce7", color: "#14532d", border: "#86efac" },
  error:   { bg: "#fee2e2", color: "#7f1d1d", border: "#fca5a5" },
};
const NOTIF_ICONS = { loading: "⏳", success: "✅", error: "❌" };

function NotifBar({ notif, onClose }) {
  if (!notif) return null;
  const theme = NOTIF_THEMES[notif.type] || NOTIF_THEMES.success;
  return (
    <div style={{
      position:"fixed", top:"20px", left:"50%", transform:"translateX(-50%)",
      zIndex:9999, minWidth:"320px", maxWidth:"520px",
      background:theme.bg, color:theme.color, border:`1px solid ${theme.border}`,
      borderRadius:"14px", padding:"14px 20px", display:"flex", alignItems:"center",
      gap:"12px", boxShadow:"0 8px 32px rgba(0,0,0,0.15)",
      animation:"notifSlide 0.35s cubic-bezier(0.34,1.3,0.64,1) both",
      fontFamily:"sans-serif", fontSize:"15px", fontWeight:"600",
    }}>
      <style>{`
        @keyframes notifSlide {
          from { opacity:0; transform:translateX(-50%) translateY(-20px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      {notif.type === "loading" ? (
        <div style={{ width:"18px", height:"18px", border:`2px solid ${theme.border}`, borderTop:`2px solid ${theme.color}`, borderRadius:"50%", animation:"spin 0.75s linear infinite", flexShrink:0 }} />
      ) : (
        <span style={{ fontSize:"18px", flexShrink:0 }}>{NOTIF_ICONS[notif.type]}</span>
      )}
      <span style={{ flex:1 }}>{notif.message}</span>
      {notif.type !== "loading" && (
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"18px", color:theme.color, opacity:0.6, padding:0, lineHeight:1 }}>✕</button>
      )}
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [notif, setNotif] = useState(null);
  const notifTimer = useRef(null);

  useEffect(() => {
    return () => clearTimeout(notifTimer.current);
  }, []);

  function showNotif(type, message, autoDismiss = true) {
    clearTimeout(notifTimer.current);
    setNotif({ type, message });
    if (autoDismiss && type !== "loading") {
      notifTimer.current = setTimeout(() => setNotif(null), 4000);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { showNotif("error", "Please enter your email address."); return; }
    showNotif("loading", "Sending reset link...", false);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, { email });
      setNotif(null);
      setSent(true);
    } catch (err) {
      showNotif("error", err.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <NotifBar notif={notif} onClose={() => setNotif(null)} />
      <div style={{
        minHeight:"100vh",
        background:"linear-gradient(135deg,#4f46e5,#7c3aed,#312e81)",
        display:"flex", justifyContent:"center", alignItems:"center", padding:"30px",
      }}>
        <div style={{
          width:"100%", maxWidth:"460px", background:"white",
          borderRadius:"32px", padding:"48px 40px",
          boxShadow:"0 20px 60px rgba(0,0,0,0.4)",
          display:"flex", flexDirection:"column", alignItems:"center", gap:"20px",
        }}>

          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"4px" }}>
            <img src="/logo.jpeg" alt="logo" style={{ width:"48px", height:"48px", borderRadius:"50%", objectFit:"cover" }} />
            <span style={{ fontSize:"28px", fontWeight:"bold", color:"#ff7a00" }}>ArtSpire</span>
          </div>

          {!sent ? (
            <>
              <div style={{ width:"80px", height:"80px", background:"#eef2ff", borderRadius:"50%", display:"flex", justifyContent:"center", alignItems:"center", fontSize:"40px" }}>
                🔑
              </div>

              <div style={{ textAlign:"center" }}>
                <h1 style={{ fontSize:"28px", color:"#4f46e5", fontWeight:"bold", margin:"0 0 6px" }}>Forgot Password?</h1>
                <p style={{ color:"#94a3b8", fontSize:"14px", fontWeight:600, margin:0 }}>
                  Enter your email and we'll send you a reset link. Valid for 15 minutes.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ width:"100%", display:"flex", flexDirection:"column", gap:"16px" }}>
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    padding:"16px", borderRadius:"50px",
                    border:"1px solid #d1d5db", outline:"none", fontSize:"16px", width:"100%",
                    boxSizing:"border-box",
                  }}
                />
                <button type="submit" style={{
                  padding:"16px", border:"none", borderRadius:"50px",
                  background:"linear-gradient(90deg,#4f46e5,#7c3aed)",
                  color:"white", fontSize:"17px", fontWeight:"bold", cursor:"pointer",
                }}>
                  Send Reset Link
                </button>
              </form>

              <p onClick={() => navigate(-1)} style={{ color:"#94a3b8", cursor:"pointer", fontWeight:600, fontSize:"14px" }}>
                ← Back to Login
              </p>
            </>
          ) : (
            <>
              <div style={{ width:"80px", height:"80px", background:"#dcfce7", borderRadius:"50%", display:"flex", justifyContent:"center", alignItems:"center", fontSize:"40px" }}>
                📧
              </div>
              <div style={{ textAlign:"center" }}>
                <h1 style={{ fontSize:"26px", color:"#14532d", fontWeight:"bold", margin:"0 0 10px" }}>Check your email!</h1>
                <p style={{ color:"#64748b", fontSize:"14px", fontWeight:600, lineHeight:1.6, margin:0 }}>
                  We sent a password reset link to <br />
                  <strong style={{ color:"#1e293b" }}>{email}</strong>
                </p>
                <p style={{ color:"#94a3b8", fontSize:"13px", marginTop:"10px" }}>
                  Didn't get it? Check your spam folder. Link expires in 15 minutes.
                </p>
              </div>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                style={{
                  padding:"12px 28px", border:"1px solid #d1d5db", borderRadius:"50px",
                  background:"white", fontSize:"15px", cursor:"pointer", fontWeight:600, color:"#4f46e5",
                }}
              >
                Try a different email
              </button>
              <p onClick={() => navigate("/login")} style={{ color:"#94a3b8", cursor:"pointer", fontWeight:600, fontSize:"14px" }}>
                ← Back to Login
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}