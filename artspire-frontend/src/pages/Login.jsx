import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { signInWithRedirect, getRedirectResult } from "firebase/auth";
import { auth, provider } from "../firebase";

// ── Notification types ───────────────────────────────────────────────────────
const NOTIF_THEMES = {
  loading:  { bg: "#dbeafe", color: "#1e3a5f", border: "#93c5fd" },
  success:  { bg: "#dcfce7", color: "#14532d", border: "#86efac" },
  error:    { bg: "#fee2e2", color: "#7f1d1d", border: "#fca5a5" },
  google:   { bg: "#ede9fe", color: "#3b0764", border: "#c4b5fd" },
  artist:   { bg: "#fef3c7", color: "#78350f", border: "#fcd34d" },
  register: { bg: "#d1fae5", color: "#064e3b", border: "#6ee7b7" },
};

const NOTIF_ICONS = {
  loading:  "⏳",
  success:  "✅",
  error:    "❌",
  google:   "🔵",
  artist:   "🎨",
  register: "🎉",
};

// ── Reusable notification bar ────────────────────────────────────────────────
function NotifBar({ notif, onClose }) {
  if (!notif) return null;
  const theme = NOTIF_THEMES[notif.type] || NOTIF_THEMES.success;
  return (
    <div style={{
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      minWidth: "320px",
      maxWidth: "520px",
      background: theme.bg,
      color: theme.color,
      border: `1px solid ${theme.border}`,
      borderRadius: "14px",
      padding: "14px 20px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
      animation: "notifSlide 0.35s cubic-bezier(0.34,1.3,0.64,1) both",
      fontFamily: "sans-serif",
      fontSize: "15px",
      fontWeight: "600",
    }}>
      <style>{`
        @keyframes notifSlide {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {notif.type === "loading" ? (
        <div style={{
          width: "18px", height: "18px",
          border: `2px solid ${theme.border}`,
          borderTop: `2px solid ${theme.color}`,
          borderRadius: "50%",
          animation: "spin 0.75s linear infinite",
          flexShrink: 0,
        }} />
      ) : (
        <span style={{ fontSize: "18px", flexShrink: 0 }}>{NOTIF_ICONS[notif.type]}</span>
      )}

      <span style={{ flex: 1 }}>{notif.message}</span>

      {notif.type !== "loading" && (
        <button onClick={onClose} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "18px", color: theme.color, opacity: 0.6,
          padding: 0, lineHeight: 1,
        }}>✕</button>
      )}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "user" });

  // ── Notification state ───────────────────────────────────────────────────
  const [notif, setNotif] = useState(null);
  let notifTimer = null;

  function showNotif(type, message, autoDismiss = true) {
    clearTimeout(notifTimer);
    setNotif({ type, message });
    if (autoDismiss && type !== "loading") {
      notifTimer = setTimeout(() => setNotif(null), 3500);
    }
  }

  function closeNotif() {
    clearTimeout(notifTimer);
    setNotif(null);
  }

  // ── Handle Google redirect result on page load ───────────────────────────
  useEffect(() => {
    showNotif("loading", "Checking Google login...", false);
    getRedirectResult(auth)
      .then(async (result) => {
        setNotif(null);
        if (!result) return; // no redirect in progress, do nothing
        const user = result.user;
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/google`, {
          name: user.displayName,
          email: user.email,
          photo: user.photoURL,
          role: "user",
        });
        const userData = res.data.user;
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", res.data.token);
        localStorage.removeItem("artist");
        showNotif("success", `Welcome, ${user.displayName}! Redirecting...`);
        setTimeout(() => navigate("/"), 1200);
      })
      .catch((err) => {
        setNotif(null);
        console.log(err);
      });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    showNotif("loading", isLogin ? "Signing you in..." : "Creating your account...", false);
    try {
      if (isLogin) {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
          email: formData.email,
          password: formData.password,
        });
        localStorage.setItem("token", res.data.token);

        if (res.data.user.role === "artist") {
          localStorage.setItem("artist", JSON.stringify(res.data.user));
          localStorage.removeItem("user");
          showNotif("artist", `Welcome ${res.data.user.name}! Opening your dashboard...`);
          setTimeout(() => navigate("/artist-dashboard"), 1200);
        } else {
          localStorage.setItem("user", JSON.stringify(res.data.user));
          localStorage.removeItem("artist");
          showNotif("success", `Welcome back, ${res.data.user.name}!`);
          setTimeout(() => navigate("/"), 1200);
        }
      } else {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/register`,
          formData
        );
        if (res.data.user?.role === "artist") {
          localStorage.setItem("artist", JSON.stringify(res.data.user));
          localStorage.setItem("token", res.data.token);
          localStorage.removeItem("user");
          showNotif("artist", `Account created! Welcome, ${res.data.user.name}!`);
          setTimeout(() => navigate("/artist-dashboard"), 1200);
        } else if (res.data.user) {
          localStorage.setItem("user", JSON.stringify(res.data.user));
          localStorage.setItem("token", res.data.token);
          localStorage.removeItem("artist");
          showNotif("register", "Account created successfully! Redirecting...");
          setTimeout(() => navigate("/"), 1200);
        }
      }
    } catch (err) {
      console.log(err);
      showNotif("error", err.response?.data?.message || "Something went wrong. Please try again.");
    }
  };

  // ── Trigger Google redirect ──────────────────────────────────────────────
  const googleLogin = () => {
    showNotif("google", "Redirecting to Google...", false);
    signInWithRedirect(auth, provider);
  };

  return (
    <>
      <NotifBar notif={notif} onClose={closeNotif} />

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#4f46e5,#7c3aed,#312e81)",
        display: "flex", justifyContent: "center", alignItems: "center", padding: "30px",
      }}>
        <div style={{
          width: "100%", maxWidth: "1200px", background: "white",
          borderRadius: "40px", overflow: "hidden",
          display: "grid", gridTemplateColumns: "1fr 1fr",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        }}>
          {/* LEFT */}
          <div style={{
            background: "#f8fafc", padding: "40px", position: "relative",
            display: "flex", justifyContent: "center", alignItems: "center",
          }}>
            <div style={{ position: "absolute", top: "20px", left: "30px", display: "flex", alignItems: "center", gap: "10px" }}>
              <img src="/logo.jpeg" alt="logo" style={{ width: "60px", height: "60px", borderRadius: "50%", objectFit: "cover" }} />
              <h1 style={{ fontSize: "38px", fontWeight: "bold", color: "#ff7a00" }}>ArtSpire</h1>
            </div>
            <img src="/artlogin.jpg" alt="art" style={{ width: "90%", maxWidth: "500px", borderRadius: "30px", objectFit: "cover", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }} />
          </div>

          {/* RIGHT */}
          <div style={{ padding: "60px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ width: "120px", height: "120px", background: "#eef2ff", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "60px", margin: "0 auto" }}>
                👤
              </div>
              <h1 style={{ textAlign: "center", fontSize: "42px", color: "#4f46e5", fontWeight: "bold" }}>
                {isLogin ? "Welcome Back" : "Create Account"}
              </h1>

              {!isLogin && (
                <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} required style={premiumInput} />
              )}
              <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required style={premiumInput} />
              <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required style={premiumInput} autoComplete="current-password" />

              {!isLogin && (
                <select name="role" value={formData.role} onChange={handleChange} style={premiumInput}>
                  <option value="user">User</option>
                  <option value="artist">Artist</option>
                </select>
              )}

              <button type="submit" style={{ padding: "16px", border: "none", borderRadius: "50px", background: "linear-gradient(90deg,#4f46e5,#7c3aed)", color: "white", fontSize: "18px", fontWeight: "bold", cursor: "pointer" }}>
                {isLogin ? "LOGIN" : "REGISTER"}
              </button>

              <button type="button" onClick={googleLogin} style={{ padding: "16px", borderRadius: "50px", border: "1px solid #ddd", background: "white", fontSize: "17px", cursor: "pointer", fontWeight: "600" }}>
                Continue with Google
              </button>

              <p onClick={() => setIsLogin(!isLogin)} style={{ textAlign: "center", color: "#4f46e5", cursor: "pointer", fontWeight: "600" }}>
                {isLogin ? "Create new account" : "Already have account?"}
              </p>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

const premiumInput = {
  padding: "16px",
  borderRadius: "50px",
  border: "1px solid #d1d5db",
  outline: "none",
  fontSize: "16px",
};
