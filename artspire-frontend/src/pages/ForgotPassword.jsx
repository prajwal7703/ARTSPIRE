import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// ✅ FIX: corrected backend URL (was pointing to wrong Render instance)
const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const NOTIF_THEMES = {
  loading: { bg: "#dbeafe", color: "#1e3a5f", border: "#93c5fd" },
  success: { bg: "#dcfce7", color: "#14532d", border: "#86efac" },
  error:   { bg: "#fee2e2", color: "#7f1d1d", border: "#fca5a5" },
};

function NotifBar({ notif, onClose }) {
  if (!notif) return null;
  const theme = NOTIF_THEMES[notif.type] || NOTIF_THEMES.success;
  return (
    <div style={{ position:"fixed", top:"20px", left:"50%", transform:"translateX(-50%)", zIndex:9999, minWidth:"320px", maxWidth:"520px", background:theme.bg, color:theme.color, border:`1px solid ${theme.border}`, borderRadius:"14px", padding:"14px 20px", display:"flex", alignItems:"center", gap:"12px", boxShadow:"0 8px 32px rgba(0,0,0,0.15)", animation:"notifSlide 0.35s cubic-bezier(0.34,1.3,0.64,1) both", fontFamily:"sans-serif", fontSize:"15px", fontWeight:"600" }}>
      <style>{`@keyframes notifSlide{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {notif.type === "loading"
        ? <div style={{ width:"18px",height:"18px",border:`2px solid ${theme.border}`,borderTop:`2px solid ${theme.color}`,borderRadius:"50%",animation:"spin 0.75s linear infinite",flexShrink:0 }} />
        : <span style={{ fontSize:"18px",flexShrink:0 }}>{notif.type === "success" ? "✅" : "❌"}</span>
      }
      <span style={{ flex:1 }}>{notif.message}</span>
      {notif.type !== "loading" && (
        <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"18px",color:theme.color,opacity:0.6,padding:0,lineHeight:1 }}>✕</button>
      )}
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [notif, setNotif] = useState(null);
  const [sent, setSent]   = useState(false);
  let notifTimer = null;

  function showNotif(type, message, autoDismiss = true) {
    clearTimeout(notifTimer);
    setNotif({ type, message });
    if (autoDismiss && type !== "loading") {
      notifTimer = setTimeout(() => setNotif(null), 4000);
    }
  }

  const handleSubmit = async () => {
    if (!email.trim()) { showNotif("error", "Please enter your email address."); return; }
    showNotif("loading", "Sending reset link...", false);
    try {
      // ✅ Correct endpoint — matches authRoutes.js
      await axios.post(`${API}/api/auth/forgot-password`, { email });
      setNotif(null);
      setSent(true);
    } catch (err) {
      showNotif("error", err.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <NotifBar notif={notif} onClose={() => setNotif(null)} />
      <div style={s.page}>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

        {/* LEFT PANEL */}
        <div style={s.left}>
          <div style={s.leftOverlay} />
          <img src="/artlogin.jpg" alt="art" style={s.leftImg} />
          <div style={s.leftContent}>
            <div style={s.leftBrand}>ArtSpire</div>
            <div style={s.leftTagline}>We'll get you<br />back in no time.</div>
            <div style={s.leftNote}>Enter your registered email and we'll send you a secure link to reset your password.</div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={s.right}>
          <div style={s.card}>
            <div style={s.topLink}>
              Remember your password?{" "}
              <span style={s.topLinkBtn} onClick={() => navigate("/login")}>Sign In</span>
            </div>

            {!sent ? (
              <>
                <div style={s.iconWrap}>🔑</div>
                <div style={s.title}>Forgot Password?</div>
                <div style={s.sub}>Enter your email and we'll send you a reset link.</div>

                <div style={s.fieldGroup}>
                  <label style={s.fieldLabel}>Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    style={s.input}
                    autoFocus
                  />
                </div>

                <button style={s.primaryBtn} onClick={handleSubmit}>Send Reset Link</button>
                <button style={s.secondaryBtn} onClick={() => navigate("/login")}>Back to Sign In</button>
              </>
            ) : (
              <>
                <div style={s.iconWrap}>📬</div>
                <div style={s.title}>Check your email</div>
                <div style={s.sub}>
                  We sent a reset link to<br />
                  <strong style={{ color:"#1e293b" }}>{email}</strong>
                  <br /><span style={{ fontSize:12 }}>Link expires in 15 minutes.</span>
                </div>
                <div style={s.noteBox}>
                  Didn't receive it? Check your <strong>Spam</strong> folder or{" "}
                  <span style={s.resendBtn} onClick={() => setSent(false)}>try again</span>.
                </div>
                <button style={s.primaryBtn} onClick={() => navigate("/login")}>Back to Sign In</button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const s = {
  page:        { minHeight:"100vh", display:"flex", fontFamily:"'Nunito', sans-serif" },
  left:        { width:"42%", position:"relative", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  leftImg:     { position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" },
  leftOverlay: { position:"absolute", inset:0, background:"linear-gradient(to top, rgba(2,6,23,0.92), rgba(100,0,20,0.72))", zIndex:1 },
  leftContent: { position:"relative", zIndex:2, padding:"40px", color:"#fff" },
  leftBrand:   { fontFamily:"'Bebas Neue', sans-serif", fontSize:"52px", letterSpacing:"4px", color:"#fff", marginBottom:"8px" },
  leftTagline: { fontSize:"22px", color:"#fff", fontWeight:800, lineHeight:1.4, marginBottom:"16px" },
  leftNote:    { fontSize:"14px", color:"rgba(255,255,255,0.65)", fontWeight:600, lineHeight:1.7, maxWidth:"280px" },
  right:       { flex:1, background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px" },
  card:        { width:"100%", maxWidth:"420px", background:"#fff", borderRadius:"28px", padding:"36px", boxShadow:"0 8px 40px rgba(0,0,0,0.08)", display:"flex", flexDirection:"column", gap:"16px" },
  topLink:     { textAlign:"center", fontSize:"13px", color:"#94a3b8", fontWeight:600 },
  topLinkBtn:  { color:"#E8192C", cursor:"pointer", fontWeight:800 },
  iconWrap:    { fontSize:"40px", textAlign:"center" },
  title:       { fontSize:"28px", fontWeight:900, color:"#1e293b", textAlign:"center" },
  sub:         { fontSize:"14px", color:"#94a3b8", fontWeight:600, textAlign:"center", lineHeight:1.6 },
  fieldGroup:  { display:"flex", flexDirection:"column", gap:"6px" },
  fieldLabel:  { fontSize:"11px", fontWeight:800, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase" },
  input:       { padding:"13px 16px", borderRadius:"12px", border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:"14px", fontWeight:600, fontFamily:"'Nunito', sans-serif", outline:"none" },
  primaryBtn:  { background:"linear-gradient(90deg,#E8192C,#c0152a)", color:"#fff", border:"none", padding:"14px", borderRadius:"50px", fontFamily:"'Nunito', sans-serif", fontWeight:800, fontSize:"15px", cursor:"pointer", width:"100%" },
  secondaryBtn:{ background:"#f1f5f9", color:"#64748b", border:"none", padding:"13px", borderRadius:"50px", fontFamily:"'Nunito', sans-serif", fontWeight:800, fontSize:"14px", cursor:"pointer", width:"100%" },
  noteBox:     { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"12px", padding:"14px 16px", fontSize:"13px", color:"#64748b", fontWeight:600, textAlign:"center", lineHeight:1.6 },
  resendBtn:   { color:"#E8192C", cursor:"pointer", fontWeight:800 },
};
