import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

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

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);
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

  // No token in URL
  if (!token) {
    return (
      <div style={{
        minHeight:"100vh", background:"linear-gradient(135deg,#4f46e5,#7c3aed,#312e81)",
        display:"flex", justifyContent:"center", alignItems:"center",
      }}>
        <div style={{ background:"white", borderRadius:"24px", padding:"40px", textAlign:"center", maxWidth:"380px" }}>
          <div style={{ fontSize:"48px", marginBottom:"16px" }}>⚠️</div>
          <h2 style={{ color:"#7f1d1d", marginBottom:"8px" }}>Invalid Link</h2>
          <p style={{ color:"#94a3b8", fontSize:"14px", marginBottom:"24px" }}>
            This reset link is missing or invalid. Please request a new one.
          </p>
          <button onClick={() => navigate("/forgot-password")} style={{
            padding:"12px 28px", border:"none", borderRadius:"50px",
            background:"linear-gradient(90deg,#4f46e5,#7c3aed)", color:"white",
            fontWeight:"bold", fontSize:"15px", cursor:"pointer",
          }}>
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showNotif("error", "Password must be at least 6 characters."); return;
    }
    if (newPassword !== confirmPassword) {
      showNotif("error", "Passwords do not match."); return;
    }
    showNotif("loading", "Resetting your password...", false);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/reset-password/${token}`, { newPassword });
      setNotif(null);
      setDone(true);
    } catch (err) {
      showNotif("error", err.response?.data?.message || "Link expired or invalid. Please request a new one.");
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
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <img src="/logo.jpeg" alt="logo" style={{ width:"48px", height:"48px", borderRadius:"50%", objectFit:"cover" }} />
            <span style={{ fontSize:"28px", fontWeight:"bold", color:"#ff7a00" }}>ArtSpire</span>
          </div>

          {!done ? (
            <>
              <div style={{ width:"80px", height:"80px", background:"#eef2ff", borderRadius:"50%", display:"flex", justifyContent:"center", alignItems:"center", fontSize:"40px" }}>
                🔒
              </div>

              <div style={{ textAlign:"center" }}>
                <h1 style={{ fontSize:"28px", color:"#4f46e5", fontWeight:"bold", margin:"0 0 6px" }}>Set New Password</h1>
                <p style={{ color:"#94a3b8", fontSize:"14px", fontWeight:600, margin:0 }}>
                  Choose a strong password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ width:"100%", display:"flex", flexDirection:"column", gap:"16px" }}>
                <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                  <label style={{ fontSize:"11px", fontWeight:800, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase" }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{
                      padding:"16px", borderRadius:"50px",
                      border:"1px solid #d1d5db", outline:"none", fontSize:"16px",
                      boxSizing:"border-box", width:"100%",
                    }}
                  />
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                  <label style={{ fontSize:"11px", fontWeight:800, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase" }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{
                      padding:"16px", borderRadius:"50px",
                      border:"1px solid #d1d5db", outline:"none", fontSize:"16px",
                      boxSizing:"border-box", width:"100%",
                    }}
                  />
                </div>

                {/* Password strength hint */}
                {newPassword.length > 0 && (
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <div style={{
                      flex:1, height:"4px", borderRadius:"2px",
                      background: newPassword.length < 6 ? "#fca5a5" : newPassword.length < 10 ? "#fcd34d" : "#86efac",
                      transition:"background 0.3s",
                    }} />
                    <span style={{ fontSize:"12px", fontWeight:700, color: newPassword.length < 6 ? "#ef4444" : newPassword.length < 10 ? "#f59e0b" : "#22c55e" }}>
                      {newPassword.length < 6 ? "Too short" : newPassword.length < 10 ? "Good" : "Strong"}
                    </span>
                  </div>
                )}

                <button type="submit" style={{
                  padding:"16px", border:"none", borderRadius:"50px",
                  background:"linear-gradient(90deg,#4f46e5,#7c3aed)",
                  color:"white", fontSize:"17px", fontWeight:"bold", cursor:"pointer", marginTop:"4px",
                }}>
                  Reset Password
                </button>
              </form>
            </>
          ) : (
            /* ── Success state ── */
            <>
              <div style={{ width:"80px", height:"80px", background:"#dcfce7", borderRadius:"50%", display:"flex", justifyContent:"center", alignItems:"center", fontSize:"40px" }}>
                ✅
              </div>
              <div style={{ textAlign:"center" }}>
                <h1 style={{ fontSize:"26px", color:"#14532d", fontWeight:"bold", margin:"0 0 10px" }}>Password Reset!</h1>
                <p style={{ color:"#64748b", fontSize:"14px", fontWeight:600, lineHeight:1.6, margin:0 }}>
                  Your password has been updated successfully. You can now log in with your new password.
                </p>
              </div>
              <button
                onClick={() => navigate("/login")}
                style={{
                  padding:"14px 36px", border:"none", borderRadius:"50px",
                  background:"linear-gradient(90deg,#4f46e5,#7c3aed)",
                  color:"white", fontSize:"16px", fontWeight:"bold", cursor:"pointer",
                }}
              >
                Go to Login →
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
