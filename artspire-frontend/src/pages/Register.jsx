import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
        @keyframes spin { to { transform:rotate(360deg); } }
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

export default function Register() {
  const navigate = useNavigate();
  const notifTimer = useRef(null);
  const [role, setRole] = useState("user");
  const [showPass, setShowPass] = useState(false);
  const [notif, setNotif] = useState(null);
  const [formData, setFormData] = useState({ name:"", email:"", password:"" });

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
    if (!formData.name || !formData.email || !formData.password) {
      showNotif("error", "Please fill in all fields."); return;
    }
    if (formData.password.length < 6) {
      showNotif("error", "Password must be at least 6 characters."); return;
    }
    showNotif("loading", "Creating your account...", false);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/register`,
        { ...formData, role }
      );
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem(role === "artist" ? "artist" : "user", JSON.stringify(res.data.user));
        showNotif("success", `Welcome to ArtSpire, ${res.data.user.name}! 🎉`);
        setTimeout(() => navigate(role === "artist" ? "/artist-dashboard" : "/"), 1400);
      }
    } catch (err) {
      showNotif("error", err.response?.data?.message || "Registration failed. Try again.");
    }
  };

  const handleGoogle = () => {
    import("firebase/auth").then(({ signInWithRedirect }) => {
      import("../firebase").then(({ auth, provider }) => {
        signInWithRedirect(auth, provider);
      });
    });
  };

  const passStrength = formData.password.length >= 10 ? { w:"100%", c:"#22c55e", l:"Strong" }
    : formData.password.length >= 6 ? { w:"60%", c:"#f59e0b", l:"Medium" }
    : formData.password.length > 0  ? { w:"30%", c:"#ef4444", l:"Weak" }
    : null;

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
            <div style={s.leftTagline}>Your art.<br />Your audience.<br />Your future.</div>
            <div style={s.perks}>
              {[
                { icon:"🎨", text:"Showcase to thousands of clients" },
                { icon:"📅", text:"Manage bookings effortlessly" },
                { icon:"💬", text:"Direct messages & real-time chat" },
                { icon:"💸", text:"Get paid securely & on time" },
              ].map((p) => (
                <div key={p.text} style={s.perkRow}>
                  <span style={s.perkIcon}>{p.icon}</span>
                  <span style={s.perkText}>{p.text}</span>
                </div>
              ))}
            </div>
            <div style={s.testimonialCard}>
              <p style={s.testimonialText}>"Joined ArtSpire last month — already have 5 bookings. Best decision ever."</p>
              <div style={s.testimonialAuthor}>
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Priya" alt="" style={s.testimonialAvatar} />
                <div>
                  <strong style={{ fontSize:13, display:"block", color:"#fff" }}>Priya Nair</strong>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.6)" }}>Bharatanatyam Dancer, Chennai</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={s.right}>
          <div style={s.formCard}>
            <div style={s.topLink}>
              Already have an account?{" "}
              <span style={s.topLinkBtn} onClick={() => navigate("/login")}>Sign In</span>
            </div>

            <div style={s.avatar}>✨</div>
            <div style={s.title}>Create Account</div>
            <div style={s.subtitle}>Join India's #1 creative marketplace</div>

            {/* Role Toggle */}
            <div style={s.roleToggle}>
              {[
                { val:"user",   label:"👤 I'm a Client" },
                { val:"artist", label:"🎨 I'm an Artist" },
              ].map((r) => (
                <button key={r.val} type="button" onClick={() => setRole(r.val)}
                  style={{ ...s.roleBtn, ...(role === r.val ? s.roleBtnActive : {}) }}>
                  {r.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={s.form}>
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Full Name</label>
                <input name="name" placeholder="Arjun Sharma"
                  value={formData.name} onChange={handleChange}
                  style={s.input} autoComplete="name" />
              </div>

              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Email Address</label>
                <input name="email" type="email" placeholder="you@example.com"
                  value={formData.email} onChange={handleChange}
                  style={s.input} autoComplete="email" />
              </div>

              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Password</label>
                <div style={s.passWrap}>
                  <input name="password" type={showPass ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={formData.password} onChange={handleChange}
                    style={{ ...s.input, flex:1, border:"none", padding:"13px 0", background:"transparent", width:"auto" }}
                    autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={s.eyeBtn}>
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
                {passStrength && (
                  <div style={{ marginTop:6 }}>
                    <div style={{ height:3, background:"#e2e8f0", borderRadius:2, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:passStrength.w, background:passStrength.c, borderRadius:2, transition:"all 0.3s" }} />
                    </div>
                    <span style={{ fontSize:11, color:passStrength.c, fontWeight:700, marginTop:3, display:"block" }}>{passStrength.l}</span>
                  </div>
                )}
              </div>

              <label style={{ display:"flex", alignItems:"flex-start", gap:10, cursor:"pointer" }}>
                <input type="checkbox" required style={{ accentColor:"#E8192C", width:16, height:16, marginTop:2, flexShrink:0 }} />
                <span style={{ fontSize:13, color:"#64748b", lineHeight:1.5, fontWeight:600 }}>
                  I agree to the <span style={{ color:"#E8192C" }}>Terms of Service</span> and <span style={{ color:"#E8192C" }}>Privacy Policy</span>
                </span>
              </label>

              <button type="submit" style={s.primaryBtn}>
                {role === "artist" ? "🎨 Create Artist Account →" : "✨ Create Account →"}
              </button>
            </form>

            <div style={s.divider}>
              <div style={{ height:1, background:"#e2e8f0", position:"absolute", top:"50%", left:0, right:0 }} />
              <span style={s.dividerText}>or continue with</span>
            </div>

            <button onClick={handleGoogle} style={s.googleBtn}>
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight:10, flexShrink:0 }}>
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ textAlign:"center", marginTop:20, fontSize:14, color:"#94a3b8", fontWeight:600 }}>
              Already have an account?{" "}
              <span onClick={() => navigate("/login")} style={{ color:"#E8192C", cursor:"pointer", fontWeight:800 }}>
                Sign In →
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const s = {
  page: { minHeight:"100vh", display:"flex", fontFamily:"'Nunito', sans-serif" },
  left: { width:"42%", position:"relative", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  leftImg: { position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" },
  leftOverlay: { position:"absolute", inset:0, background:"linear-gradient(to top, rgba(2,6,23,0.95), rgba(139,0,20,0.6))", zIndex:1 },
  leftContent: { position:"relative", zIndex:2, padding:"48px 40px", color:"#fff", width:"100%" },
  leftBrand: { fontFamily:"'Bebas Neue', sans-serif", fontSize:"52px", letterSpacing:"4px", color:"#fff", marginBottom:"8px" },
  leftTagline: { fontSize:"20px", color:"rgba(255,255,255,0.85)", fontWeight:800, lineHeight:1.6, marginBottom:"32px" },
  perks: { display:"flex", flexDirection:"column", gap:"14px", marginBottom:"32px" },
  perkRow: { display:"flex", alignItems:"center", gap:"14px" },
  perkIcon: { fontSize:"20px", width:"36px", height:"36px", background:"rgba(255,255,255,0.1)", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  perkText: { fontSize:"14px", color:"rgba(255,255,255,0.8)", fontWeight:600 },
  testimonialCard: { background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:16, padding:"18px 20px" },
  testimonialText: { fontSize:13, color:"rgba(255,255,255,0.8)", lineHeight:1.7, fontStyle:"italic", marginBottom:12 },
  testimonialAuthor: { display:"flex", alignItems:"center", gap:10 },
  testimonialAvatar: { width:34, height:34, borderRadius:"50%", border:"2px solid #E8192C" },
  right: { flex:1, background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", padding:"32px 24px", overflowY:"auto" },
  formCard: { width:"100%", maxWidth:"420px", background:"#fff", borderRadius:"28px", padding:"36px", boxShadow:"0 8px 40px rgba(0,0,0,0.08)" },
  topLink: { textAlign:"center", fontSize:13, color:"#94a3b8", fontWeight:600, marginBottom:20 },
  topLinkBtn: { color:"#E8192C", cursor:"pointer", fontWeight:800 },
  avatar: { width:72, height:72, background:"linear-gradient(135deg, #E8192C22, #E8192C11)", border:"2px solid #E8192C33", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 14px" },
  title: { fontSize:26, fontWeight:900, color:"#1e293b", textAlign:"center", marginBottom:4 },
  subtitle: { fontSize:14, color:"#94a3b8", fontWeight:600, textAlign:"center", marginBottom:24 },
  roleToggle: { display:"flex", background:"#f1f5f9", borderRadius:14, padding:4, marginBottom:20, gap:4 },
  roleBtn: { flex:1, padding:"10px 8px", borderRadius:10, border:"none", background:"transparent", fontSize:13, fontWeight:700, cursor:"pointer", color:"#94a3b8", transition:"all 0.2s", fontFamily:"'Nunito', sans-serif" },
  roleBtnActive: { background:"#fff", color:"#E8192C", boxShadow:"0 2px 8px rgba(0,0,0,0.1)" },
  form: { display:"flex", flexDirection:"column", gap:16 },
  fieldGroup: { display:"flex", flexDirection:"column", gap:6 },
  fieldLabel: { fontSize:11, fontWeight:800, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase" },
  input: { padding:"13px 16px", borderRadius:12, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:14, fontWeight:600, fontFamily:"'Nunito', sans-serif", outline:"none", width:"100%", boxSizing:"border-box" },
  passWrap: { display:"flex", alignItems:"center", padding:"0 16px", borderRadius:12, border:"1.5px solid #e2e8f0", background:"#f8fafc" },
  eyeBtn: { border:"none", background:"none", cursor:"pointer", fontSize:16, padding:"0 4px", flexShrink:0 },
  primaryBtn: { background:"linear-gradient(90deg, #E8192C, #ff4458)", color:"#fff", border:"none", padding:"14px", borderRadius:"50px", fontFamily:"'Nunito', sans-serif", fontWeight:800, fontSize:15, cursor:"pointer", width:"100%", marginTop:4 },
  divider: { textAlign:"center", margin:"20px 0", position:"relative" },
  dividerText: { background:"#fff", padding:"0 14px", fontSize:13, color:"#94a3b8", fontWeight:600, position:"relative", zIndex:1 },
  googleBtn: { width:"100%", padding:"13px 20px", border:"1.5px solid #e2e8f0", borderRadius:12, background:"#fff", color:"#1e293b", fontSize:14, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Nunito', sans-serif" },
};