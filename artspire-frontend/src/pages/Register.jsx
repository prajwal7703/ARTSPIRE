import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/register`, form);
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setSuccess("Account created! Redirecting...");
        setTimeout(() => navigate(form.role === "artist" ? "/artist-dashboard" : "/"), 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Left panel */}
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <div style={styles.brand}>
            <span style={styles.brandDiamond}>◆</span>
            <span style={styles.brandName}>Art<span style={styles.brandAccent}>Spire</span></span>
          </div>
          <h2 style={styles.leftHeading}>Join India's premier creative marketplace</h2>
          <p style={styles.leftSub}>Connect with thousands of artists, book performances, and bring your creative vision to life.</p>
          <div style={styles.features}>
            {[
              { icon: "🎵", text: "50,000+ verified artists" },
              { icon: "⭐", text: "4.9★ average rating" },
              { icon: "🔒", text: "Secure & trusted platform" },
              { icon: "💸", text: "Best prices guaranteed" },
            ].map((f, i) => (
              <div key={i} style={styles.featureRow}>
                <span style={styles.featureIcon}>{f.icon}</span>
                <span style={styles.featureText}>{f.text}</span>
              </div>
            ))}
          </div>
          <div style={styles.testimonialCard}>
            <p style={styles.testimonialText}>"ArtSpire changed how I find clients. Within a week of joining, I had 3 bookings."</p>
            <div style={styles.testimonialAuthor}>
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Priya" alt="" style={styles.testimonialAvatar} />
              <div>
                <strong style={{ fontSize: 13, display: "block" }}>Priya Nair</strong>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Bharatanatyam Dancer, Chennai</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={styles.right}>
        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <h1 style={styles.formTitle}>Create your account</h1>
            <p style={styles.formSub}>
              Already have one?{" "}
              <Link to="/login" style={styles.link}>Sign in</Link>
            </p>
          </div>

          {/* Role toggle */}
          <div style={styles.roleToggle}>
            {["user", "artist"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setForm({ ...form, role: r })}
                style={{ ...styles.roleBtn, ...(form.role === r ? styles.roleBtnActive : {}) }}
              >
                {r === "user" ? "👤 I'm a Client" : "🎨 I'm an Artist"}
              </button>
            ))}
          </div>

          {error && (
            <div style={styles.errorBox}>
              <span>⚠️</span> {error}
            </div>
          )}
          {success && (
            <div style={styles.successBox}>
              <span>✅</span> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Full Name</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>👤</span>
                <input
                  name="name"
                  placeholder="Arjun Sharma"
                  value={form.name}
                  onChange={handleChange}
                  style={styles.input}
                  autoComplete="name"
                />
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>✉️</span>
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  style={styles.input}
                  autoComplete="email"
                />
              </div>
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>🔒</span>
                <input
                  name="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  style={styles.input}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
              {form.password && (
                <div style={styles.strengthBar}>
                  <div style={{
                    ...styles.strengthFill,
                    width: form.password.length >= 10 ? "100%" : form.password.length >= 6 ? "60%" : "30%",
                    background: form.password.length >= 10 ? "#22c55e" : form.password.length >= 6 ? "#f59e0b" : "#ef4444",
                  }} />
                </div>
              )}
            </div>

            <div style={styles.terms}>
              <input type="checkbox" id="terms" required style={{ accentColor: "#E8192C", width: 16, height: 16 }} />
              <label htmlFor="terms" style={styles.termsLabel}>
                I agree to the <a href="#" style={styles.link}>Terms of Service</a> and <a href="#" style={styles.link}>Privacy Policy</a>
              </label>
            </div>

            <button type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? (
                <span style={styles.spinner}>●&nbsp;&nbsp;Creating account...</span>
              ) : (
                `Create ${form.role === "artist" ? "Artist" : ""} Account →`
              )}
            </button>
          </form>

          <div style={styles.divider}><span>or continue with</span></div>

          <button
            style={styles.googleBtn}
            onClick={() => {
              import("firebase/auth").then(({ signInWithRedirect }) => {
                import("../firebase").then(({ auth, provider }) => {
                  signInWithRedirect(auth, provider);
                });
              });
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 10 }}>
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
            </svg>
            Continue with Google
          </button>

          <p style={styles.loginLink}>
            Already have an account?{" "}
            <Link to="/login" style={styles.link}>Sign in to ArtSpire</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'DM Sans', sans-serif",
    background: "var(--bg-primary)",
  },
  left: {
    width: "45%",
    background: "linear-gradient(135deg, #0a0a0a 0%, #1a0005 50%, #0a0a0a 100%)",
    padding: "60px 48px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  leftInner: { position: "relative", zIndex: 1 },
  brand: { display: "flex", alignItems: "center", gap: 8, marginBottom: 40 },
  brandDiamond: { color: "#E8192C", fontSize: 18 },
  brandName: { fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: "white" },
  brandAccent: { color: "#E8192C" },
  leftHeading: { fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: "white", lineHeight: 1.2, marginBottom: 16 },
  leftSub: { fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: 36 },
  features: { display: "flex", flexDirection: "column", gap: 14, marginBottom: 36 },
  featureRow: { display: "flex", alignItems: "center", gap: 12 },
  featureIcon: { fontSize: 20, width: 32, textAlign: "center" },
  featureText: { fontSize: 14, color: "rgba(255,255,255,0.8)", fontWeight: 500 },
  testimonialCard: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: "20px 24px",
  },
  testimonialText: { fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.7, fontStyle: "italic", marginBottom: 14 },
  testimonialAuthor: { display: "flex", alignItems: "center", gap: 10 },
  testimonialAvatar: { width: 36, height: 36, borderRadius: "50%", border: "2px solid #E8192C" },
  right: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 24px",
    background: "var(--bg-primary)",
    overflowY: "auto",
  },
  formCard: { width: "100%", maxWidth: 460 },
  formHeader: { marginBottom: 28 },
  formTitle: { fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, marginBottom: 8, color: "var(--text-primary)" },
  formSub: { fontSize: 15, color: "var(--text-muted)" },
  roleToggle: {
    display: "flex",
    background: "var(--bg-secondary, #f0f0f0)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  roleBtn: {
    flex: 1, padding: "10px 16px", borderRadius: 10,
    border: "none", background: "transparent",
    fontSize: 14, fontWeight: 500, cursor: "pointer",
    color: "var(--text-muted, #888)",
    transition: "all 0.2s",
    fontFamily: "'DM Sans', sans-serif",
  },
  roleBtnActive: {
    background: "var(--bg-card, #fff)",
    color: "#E8192C",
    fontWeight: 700,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  errorBox: {
    background: "#fee2e2", border: "1px solid #fca5a5",
    color: "#7f1d1d", borderRadius: 10, padding: "12px 16px",
    fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
  },
  successBox: {
    background: "#dcfce7", border: "1px solid #86efac",
    color: "#14532d", borderRadius: 10, padding: "12px 16px",
    fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 8,
  },
  form: { display: "flex", flexDirection: "column", gap: 18 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "var(--text-secondary, #444)", letterSpacing: "0.03em" },
  inputWrap: {
    display: "flex", alignItems: "center",
    background: "var(--bg-card, #fff)",
    border: "1.5px solid var(--border, rgba(0,0,0,0.08))",
    borderRadius: 12, padding: "0 14px",
    transition: "border-color 0.2s",
  },
  inputIcon: { fontSize: 16, flexShrink: 0, marginRight: 8 },
  input: {
    flex: 1, border: "none", background: "transparent",
    padding: "13px 0", fontSize: 15,
    color: "var(--text-primary, #0a0a0a)", outline: "none",
    fontFamily: "'DM Sans', sans-serif",
  },
  eyeBtn: { border: "none", background: "none", cursor: "pointer", fontSize: 16, padding: "0 4px" },
  strengthBar: { height: 3, background: "var(--border, #eee)", borderRadius: 2, marginTop: 6, overflow: "hidden" },
  strengthFill: { height: "100%", borderRadius: 2, transition: "width 0.3s, background 0.3s" },
  terms: { display: "flex", alignItems: "flex-start", gap: 10 },
  termsLabel: { fontSize: 13, color: "var(--text-muted, #888)", lineHeight: 1.5, cursor: "pointer" },
  submitBtn: {
    background: "#E8192C", color: "white",
    border: "none", borderRadius: 12,
    padding: "14px 24px", fontSize: 16, fontWeight: 700,
    cursor: "pointer", transition: "all 0.2s",
    fontFamily: "'Syne', sans-serif", letterSpacing: "0.02em",
  },
  spinner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  divider: {
    textAlign: "center", margin: "24px 0", position: "relative",
    fontSize: 13, color: "var(--text-muted, #888)",
  },
  googleBtn: {
    width: "100%", padding: "13px 24px",
    border: "1.5px solid var(--border, rgba(0,0,0,0.1))",
    borderRadius: 12, background: "var(--bg-card, #fff)",
    color: "var(--text-primary, #0a0a0a)", fontSize: 15, fontWeight: 600,
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif",
    marginBottom: 20,
  },
  loginLink: { textAlign: "center", fontSize: 14, color: "var(--text-muted, #888)" },
  link: { color: "#E8192C", fontWeight: 600, textDecoration: "none" },
};