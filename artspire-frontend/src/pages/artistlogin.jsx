import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// ── Notification ──────────────────────────────────────────────────────────────
const NOTIF_THEMES = {
  loading: { bg: "#dbeafe", color: "#1e3a5f", border: "#93c5fd" },
  success: { bg: "#dcfce7", color: "#14532d", border: "#86efac" },
  error:   { bg: "#fee2e2", color: "#7f1d1d", border: "#fca5a5" },
  artist:  { bg: "#fef3c7", color: "#78350f", border: "#fcd34d" },
};
const NOTIF_ICONS = { loading: "⏳", success: "✅", error: "❌", artist: "🎨" };

function NotifBar({ notif, onClose }) {
  if (!notif) return null;
  const theme = NOTIF_THEMES[notif.type] || NOTIF_THEMES.success;
  return (
    <div style={{
      position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, minWidth: "320px", maxWidth: "520px",
      background: theme.bg, color: theme.color, border: `1px solid ${theme.border}`,
      borderRadius: "14px", padding: "14px 20px", display: "flex", alignItems: "center",
      gap: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
      animation: "notifSlide 0.35s cubic-bezier(0.34,1.3,0.64,1) both",
      fontFamily: "sans-serif", fontSize: "15px", fontWeight: "600",
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

export default function ArtistLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [notif, setNotif] = useState(null);
  let notifTimer = null;

  function showNotif(type, message, autoDismiss = true) {
    clearTimeout(notifTimer);
    setNotif({ type, message });
    if (autoDismiss && type !== "loading") {
      notifTimer = setTimeout(() => setNotif(null), 3500);
    }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      showNotif("error", "Please enter your email and password.");
      return;
    }
    showNotif("loading", "Signing you in...", false);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        email: formData.email,
        password: formData.password,
      });

      // Make sure it's actually an artist account
      if (res.data.user?.role !== "artist") {
        showNotif("error", "This account is not an artist account. Please use User Login.");
        return;
      }

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("artist", JSON.stringify(res.data.user));
      localStorage.removeItem("user");
      showNotif("artist", `Welcome back, ${res.data.user.name}! 🎨`);
      setTimeout(() => navigate("/artist-dashboard"), 1200);
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
            <div style={s.leftTagline}>Your stage.<br />Your audience.<br />Your moment.</div>

            {/* Artist perks */}
            <div style={s.perks}>
              {[
                { icon: "🎨", text: "Showcase your portfolio" },
                { icon: "🌍", text: "Connect with local fans" },
                { icon: "📅", text: "Manage your bookings" },
                { icon: "💬", text: "Direct messages from users" },
              ].map((p) => (
                <div key={p.text} style={s.perkRow}>
                  <span style={s.perkIcon}>{p.icon}</span>
                  <span style={s.perkText}>{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={s.right}>
          <div style={s.formCard}>

            <div style={s.topLink}>
              Not an artist?{" "}
              <span style={s.topLinkBtn} onClick={() => navigate("/login")}>User Login</span>
            </div>

            {/* Avatar */}
            <div style={s.avatar}>🎨</div>

            <div style={s.title}>Artist Login</div>
            <div style={s.subtitle}>Welcome back, creator</div>

            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Email Address</label>
                <input
                  type="email" name="email" placeholder="you@example.com"
                  value={formData.email} onChange={handleChange}
                  required style={s.input}
                />
              </div>

              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Password</label>
                <input
                  type="password" name="password" placeholder="Your password"
                  value={formData.password} onChange={handleChange}
                  required style={s.input} autoComplete="current-password"
                />
              </div>

              {/* Forgot password */}
              <p
                onClick={() => navigate("/forgot-password")}
                style={{ textAlign:"right", color:"#4f46e5", cursor:"pointer", fontWeight:700, fontSize:"13px", margin:"-4px 0 4px" }}
              >
                Forgot password?
              </p>

              <button type="submit" style={s.primaryBtn}>
                🎨 Sign In as Artist
              </button>
            </form>

            <div style={{ textAlign:"center", marginTop:"20px", fontSize:"14px", color:"#94a3b8", fontWeight:600 }}>
              New artist?{" "}
              <span onClick={() => navigate("/artist-register")} style={{ color:"#4f46e5", cursor:"pointer", fontWeight:800 }}>
                Create Artist Profile →
              </span>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page: { minHeight:"100vh", display:"flex", fontFamily:"'Nunito', sans-serif" },

  left: { width:"42%", position:"relative", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  leftImg: { position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" },
  leftOverlay: { position:"absolute", inset:0, background:"linear-gradient(to top, rgba(2,6,23,0.92), rgba(30,58,138,0.7))", zIndex:1 },
  leftContent: { position:"relative", zIndex:2, padding:"40px", color:"#fff" },
  leftBrand: { fontFamily:"'Bebas Neue', sans-serif", fontSize:"52px", letterSpacing:"4px", color:"#fff", marginBottom:"8px" },
  leftTagline: { fontSize:"18px", color:"rgba(255,255,255,0.8)", fontWeight:700, lineHeight:1.7, marginBottom:"40px" },

  perks: { display:"flex", flexDirection:"column", gap:"16px" },
  perkRow: { display:"flex", alignItems:"center", gap:"14px" },
  perkIcon: { fontSize:"22px", width:"36px", height:"36px", background:"rgba(255,255,255,0.1)", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  perkText: { fontSize:"14px", color:"rgba(255,255,255,0.75)", fontWeight:600 },

  right: { flex:1, background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px" },
  formCard: { width:"100%", maxWidth:"400px", background:"#fff", borderRadius:"28px", padding:"36px", boxShadow:"0 8px 40px rgba(0,0,0,0.08)" },
  topLink: { textAlign:"center", fontSize:"13px", color:"#94a3b8", fontWeight:600, marginBottom:"20px" },
  topLinkBtn: { color:"#4f46e5", cursor:"pointer", fontWeight:800 },

  avatar: { width:"80px", height:"80px", background:"#fef3c7", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"40px", margin:"0 auto 16px" },
  title: { fontSize:"28px", fontWeight:900, color:"#1e293b", textAlign:"center", marginBottom:"4px" },
  subtitle: { fontSize:"14px", color:"#94a3b8", fontWeight:600, textAlign:"center", marginBottom:"28px" },

  form: { display:"flex", flexDirection:"column", gap:"16px" },
  fieldGroup: { display:"flex", flexDirection:"column", gap:"6px" },
  fieldLabel: { fontSize:"11px", fontWeight:800, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase" },
  input: { padding:"13px 16px", borderRadius:"12px", border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:"14px", fontWeight:600, fontFamily:"'Nunito', sans-serif", outline:"none" },

  primaryBtn: { background:"linear-gradient(90deg,#f59e0b,#d97706)", color:"#fff", border:"none", padding:"14px", borderRadius:"50px", fontFamily:"'Nunito', sans-serif", fontWeight:800, fontSize:"15px", cursor:"pointer", width:"100%", marginTop:"4px" },
};
