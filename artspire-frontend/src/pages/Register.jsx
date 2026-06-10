import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// ── Notification ──────────────────────────────────────────────────────────────
const NOTIF_THEMES = {
  loading:  { bg: "#dbeafe", color: "#1e3a5f", border: "#93c5fd" },
  success:  { bg: "#dcfce7", color: "#14532d", border: "#86efac" },
  error:    { bg: "#fee2e2", color: "#7f1d1d", border: "#fca5a5" },
  register: { bg: "#d1fae5", color: "#064e3b", border: "#6ee7b7" },
};
const NOTIF_ICONS = { loading: "⏳", success: "✅", error: "❌", register: "🎉" };

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

export default function Register() {
  const navigate = useNavigate();
  const [notif, setNotif]   = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [formData, setFormData] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    city: "", phone: "",
  });
  const notifTimer = useRef(null);
useEffect(() => {
    return () => clearTimeout(notifTimer.current);
  }, []);
  function showNotif(type, message, autoDismiss = true) {
    clearTimeout(notifTimer.current);
    setNotif({ type, message });
    if (autoDismiss && type !== "loading") {
      notifTimer.current = setTimeout(() => setNotif(null), 3500);
    }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // ── Live validation ───────────────────────────────────────────────────────
  const emailValid   = formData.email.includes("@") && formData.email.includes(".");
  const passStrength = formData.password.length === 0 ? null
    : formData.password.length < 6  ? "weak"
    : formData.password.length < 10 ? "good"
    : "strong";
  const passMatch    = formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
  const passNoMatch  = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim())        { showNotif("error", "Please enter your full name.");      return; }
    if (!emailValid)                   { showNotif("error", "Please enter a valid email.");        return; }
    if (formData.password.length < 6)  { showNotif("error", "Password must be at least 6 characters."); return; }
    if (passNoMatch)                   { showNotif("error", "Passwords do not match.");            return; }

    showNotif("loading", "Creating your account...", false);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        name:     formData.name,
        email:    formData.email,
        password: formData.password,
        city:     formData.city,
        phone:    formData.phone,
        role:     "user",
      });

      localStorage.setItem("user",  JSON.stringify(res.data.user));
      localStorage.setItem("token", res.data.token);
      localStorage.removeItem("artist");

      showNotif("register", `Welcome to ArtSpire, ${res.data.user.name}! 🎉`);
      setTimeout(() => navigate("/"), 1400);

    } catch (err) {
      showNotif("error", err.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <NotifBar notif={notif} onClose={() => setNotif(null)} />

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#4f46e5,#7c3aed,#312e81)",
        display: "flex", justifyContent: "center", alignItems: "center", padding: "30px",
      }}>
        <div style={{
          width: "100%", maxWidth: "1100px", background: "white",
          borderRadius: "40px", overflow: "hidden",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}>

          {/* ── LEFT ── */}
          <div style={{
            background: "#f8fafc", padding: "40px", position: "relative",
            display: "flex", justifyContent: "center", alignItems: "center",
          }}>
            {/* Logo */}
            <div style={{ position:"absolute", top:"20px", left:"30px", display:"flex", alignItems:"center", gap:"10px" }}>
              <img src="/logo.jpeg" alt="logo" style={{ width:"60px", height:"60px", borderRadius:"50%", objectFit:"cover" }} />
              <h1 style={{ fontSize:"38px", fontWeight:"bold", color:"#ff7a00" }}>ArtSpire</h1>
            </div>
            <img src="/artlogin.jpg" alt="art" style={{ width:"90%", maxWidth:"500px", borderRadius:"30px", objectFit:"cover", boxShadow:"0 10px 40px rgba(0,0,0,0.2)" }} />
          </div>

          {/* ── RIGHT ── */}
          <div style={{ padding:"50px 60px", display:"flex", justifyContent:"center", alignItems:"center", overflowY:"auto" }}>
            <form onSubmit={handleSubmit} style={{ width:"100%", maxWidth:"400px", display:"flex", flexDirection:"column", gap:"18px" }}>

              {/* Avatar */}
              <div style={{ width:"100px", height:"100px", background:"#eef2ff", borderRadius:"50%", display:"flex", justifyContent:"center", alignItems:"center", fontSize:"52px", margin:"0 auto" }}>
                👤
              </div>

              <div style={{ textAlign:"center" }}>
                <h1 style={{ fontSize:"36px", color:"#4f46e5", fontWeight:"bold", margin:"0 0 4px" }}>Create Account</h1>
                <p style={{ color:"#94a3b8", fontSize:"14px", fontWeight:600, margin:0 }}>Join ArtSpire as a user</p>
              </div>

              {/* Full Name */}
              <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                <label style={labelStyle}>Full Name *</label>
                <input
                  type="text" name="name" placeholder="Priya Sharma"
                  value={formData.name} onChange={handleChange} required
                  style={inputStyle}
                />
              </div>

              {/* Email */}
              <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                <label style={labelStyle}>Email Address *</label>
                <div style={{ position:"relative" }}>
                  <input
                    type="email" name="email" placeholder="you@example.com"
                    value={formData.email} onChange={handleChange} required
                    style={{
                      ...inputStyle,
                      borderColor: formData.email.length > 0 ? (emailValid ? "#86efac" : "#fca5a5") : "#d1d5db",
                    }}
                  />
                  {formData.email.length > 0 && (
                    <span style={{ position:"absolute", right:"16px", top:"50%", transform:"translateY(-50%)", fontSize:"16px" }}>
                      {emailValid ? "✅" : "❌"}
                    </span>
                  )}
                </div>
              </div>

              {/* Password */}
              <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                <label style={labelStyle}>Password *</label>
                <div style={{ position:"relative" }}>
                  <input
                    type={showPass ? "text" : "password"} name="password"
                    placeholder="Min. 6 characters"
                    value={formData.password} onChange={handleChange} required
                    style={{ ...inputStyle, paddingRight:"48px" }}
                  />
                  <span
                    onClick={() => setShowPass(!showPass)}
                    style={{ position:"absolute", right:"16px", top:"50%", transform:"translateY(-50%)", cursor:"pointer", fontSize:"18px", userSelect:"none" }}
                  >
                    {showPass ? "🙈" : "👁️"}
                  </span>
                </div>
                {/* Strength bar */}
                {passStrength && (
                  <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                    <div style={{ flex:1, height:"4px", borderRadius:"2px", background: passStrength === "weak" ? "#fca5a5" : passStrength === "good" ? "#fcd34d" : "#86efac", transition:"background 0.3s" }} />
                    <span style={{ fontSize:"11px", fontWeight:700, color: passStrength === "weak" ? "#ef4444" : passStrength === "good" ? "#f59e0b" : "#22c55e" }}>
                      {passStrength === "weak" ? "Too short" : passStrength === "good" ? "Good" : "Strong ✓"}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                <label style={labelStyle}>Confirm Password *</label>
                <div style={{ position:"relative" }}>
                  <input
                    type="password" name="confirmPassword"
                    placeholder="Repeat your password"
                    value={formData.confirmPassword} onChange={handleChange} required
                    style={{
                      ...inputStyle,
                      borderColor: formData.confirmPassword.length > 0 ? (passMatch ? "#86efac" : "#fca5a5") : "#d1d5db",
                    }}
                  />
                  {formData.confirmPassword.length > 0 && (
                    <span style={{ position:"absolute", right:"16px", top:"50%", transform:"translateY(-50%)", fontSize:"16px" }}>
                      {passMatch ? "✅" : "❌"}
                    </span>
                  )}
                </div>
                {passNoMatch && <span style={{ fontSize:"12px", color:"#ef4444", fontWeight:600 }}>Passwords do not match</span>}
              </div>

              {/* City */}
              <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                <label style={labelStyle}>City</label>
                <input
                  type="text" name="city" placeholder="Bangalore"
                  value={formData.city} onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              {/* Phone */}
              <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                <label style={labelStyle}>Phone Number</label>
                <input
                  type="tel" name="phone" placeholder="+91 9876543210"
                  value={formData.phone} onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              {/* Submit */}
              <button type="submit" style={{
                padding:"16px", border:"none", borderRadius:"50px",
                background:"linear-gradient(90deg,#4f46e5,#7c3aed)",
                color:"white", fontSize:"18px", fontWeight:"bold", cursor:"pointer",
                marginTop:"4px",
              }}>
                Create Account
              </button>

              {/* Links */}
              <p style={{ textAlign:"center", color:"#94a3b8", fontSize:"14px", fontWeight:600, margin:0 }}>
                Already have an account?{" "}
                <span onClick={() => navigate("/login")} style={{ color:"#4f46e5", cursor:"pointer", fontWeight:800 }}>
                  Sign In
                </span>
              </p>

              <p style={{ textAlign:"center", fontSize:"13px", color:"#94a3b8", margin:0 }}>
                Want to join as an artist?{" "}
                <span onClick={() => navigate("/artist-register")} style={{ color:"#f59e0b", cursor:"pointer", fontWeight:800 }}>
                  Artist Register →
                </span>
              </p>

            </form>
          </div>

        </div>
      </div>
    </>
  );
}

const labelStyle = {
  fontSize: "11px", fontWeight: 800, color: "#64748b",
  letterSpacing: "1px", textTransform: "uppercase",
};

const inputStyle = {
  padding: "14px 16px", borderRadius: "50px",
  border: "1.5px solid #d1d5db", outline: "none",
  fontSize: "15px", width: "100%", boxSizing: "border-box",
  transition: "border-color 0.2s",
};
