import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { saveAuth } from "../utils/auth";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

// -- Notification (copied from Login) -----------------------------------------
const NOTIF_THEMES = {
  loading:  { bg: "#dbeafe", color: "#1e3a5f", border: "#93c5fd" },
  success:  { bg: "#dcfce7", color: "#14532d", border: "#86efac" },
  error:    { bg: "#fee2e2", color: "#7f1d1d", border: "#fca5a5" },
  artist:   { bg: "#fef3c7", color: "#78350f", border: "#fcd34d" },
};
const NOTIF_ICONS = { loading: "?", success: "?", error: "?", artist: "??" };

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
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"18px", color:theme.color, opacity:0.6, padding:0, lineHeight:1 }}>?</button>
      )}
    </div>
  );
}

// -- Step indicator ------------------------------------------------------------
function StepDots({ step, total }) {
  return (
    <div style={{ display:"flex", gap:"8px", justifyContent:"center", marginBottom:"28px" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === step ? "24px" : "8px",
          height: "8px",
          borderRadius: "4px",
          background: i === step ? "#4f46e5" : i < step ? "#86efac" : "#d1d5db",
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  );
}

const CATEGORIES = ["Singer","Dancer","Painter","Photographer","Musician","Digital Artist","Actor","Comedian","Tatoo Artist","Model","Fasion designer","Craft Artist","Mehandi Artist"];

export default function ArtistRegister() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => { const fn = () => setIsMobile(window.innerWidth < 768); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn); }, []);
  const [step, setStep] = useState(0); // 0=account, 1=profile, 2=bio
  const [notif, setNotif] = useState(null);
  let notifTimer = null;

  const [formData, setFormData] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    category: "", city: "", instagram: "", bio: "",
  });

  function showNotif(type, message, autoDismiss = true) {
    clearTimeout(notifTimer);
    setNotif({ type, message });
    if (autoDismiss && type !== "loading") {
      notifTimer = setTimeout(() => setNotif(null), 3500);
    }
  }

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // -- Validation per step ---------------------------------------------------
  const validateStep = () => {
    if (step === 0) {
      if (!formData.name.trim()) { showNotif("error", "Please enter your full name."); return false; }
      if (!formData.email.trim()) { showNotif("error", "Please enter your email."); return false; }
      if (formData.password.length < 6) { showNotif("error", "Password must be at least 6 characters."); return false; }
      if (formData.password !== formData.confirmPassword) { showNotif("error", "Passwords do not match."); return false; }
    }
    if (step === 1) {
      if (!formData.category) { showNotif("error", "Please select your category."); return false; }
      if (!formData.city.trim()) { showNotif("error", "Please enter your city."); return false; }
    }
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep((s) => s + 1); };
  const prevStep = () => setStep((s) => s - 1);

  // -- Submit ----------------------------------------------------------------
  const handleSubmit = async () => {
    if (!validateStep()) return;
    showNotif("loading", "Creating your artist profile...", false);
    try {
const res = await axios.post(`${API}/api/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        category: formData.category,
        city: formData.city,
        instagram: formData.instagram,
        bio: formData.bio,
        role: "artist",
      });
      if (res.data.token && res.data.user) {
        saveAuth(res.data.token, res.data.user);
      }
      showNotif("artist", `Welcome to ArtSpire, ${res.data.user?.name}! ??`);
      setTimeout(() => navigate("/artist-dashboard"), 1400);
    } catch (err) {
      showNotif("error", err.response?.data?.message || "Registration failed. Email may already be used.");
    }
  };

  return (
    <>
      <NotifBar notif={notif} onClose={() => setNotif(null)} />
      <div style={s.page}>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

        {/* LEFT PANEL */}
        {!isMobile && <div style={s.left}>
          <div style={s.leftOverlay} />
          <img src="/artlogin.jpg" alt="art" style={s.leftImg} />
          <div style={s.leftContent}>
            <div style={s.leftBrand}>ArtSpire</div>
            <div style={s.leftTagline}>Showcase your talent.<br />Connect with the world.</div>
            <div style={s.leftSteps}>
              {["Account Details","Your Profile","About You"].map((label, i) => (
                <div key={i} style={{ ...s.leftStep, ...(i === step ? s.leftStepActive : i < step ? s.leftStepDone : {}) }}>
                  <div style={{ ...s.leftStepNum, ...(i === step ? s.leftStepNumActive : i < step ? s.leftStepNumDone : {}) }}>
                    {i < step ? "?" : i + 1}
                  </div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>}
        {/* RIGHT PANEL */}
        <div style={s.right}>
          <div style={s.formCard}>

            {/* Top link */}
            <div style={s.topLink}>
              Already have an account?{" "}
              <span style={s.topLinkBtn} onClick={() => navigate("/login")}>Sign In</span>
            </div>

            <StepDots step={step} total={3} />

            {/* -- STEP 0: Account -- */}
            {step === 0 && (
              <div style={s.stepWrap}>
                <div style={s.stepTitle}>Create Account</div>
                <div style={s.stepSub}>Start your creative journey</div>
                <div style={s.fields}>
                  <Field label="Full Name" name="name" placeholder="Vandana Sharma" value={formData.name} onChange={handleChange} />
                  <Field label="Email Address" name="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} />
                  <Field label="Password" name="password" type="password" placeholder="Min. 6 characters" value={formData.password} onChange={handleChange} />
                  <Field label="Confirm Password" name="confirmPassword" type="password" placeholder="Repeat password" value={formData.confirmPassword} onChange={handleChange} />
                </div>
                <button style={s.primaryBtn} onClick={nextStep}>Continue ?</button>
              </div>
            )}

            {/* -- STEP 1: Profile -- */}
            {step === 1 && (
              <div style={s.stepWrap}>
                <div style={s.stepTitle}>Your Profile</div>
                <div style={s.stepSub}>Tell us what you do</div>
                <div style={s.fields}>
                  <div style={s.fieldGroup}>
                    <label style={s.fieldLabel}>Category *</label>
                    <div style={s.categoryGrid}>
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData((f) => ({ ...f, category: cat }))}
                          style={{
                            ...s.catBtn,
                            ...(formData.category === cat ? s.catBtnActive : {}),
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Field label="City *" name="city" placeholder="Bangalore" value={formData.city} onChange={handleChange} />
                  <Field label="Instagram Handle (optional)" name="instagram" placeholder="yourhandle (without @)" value={formData.instagram} onChange={handleChange} />
                </div>
                <div style={{ display:"flex", gap:"12px" }}>
                  <button style={s.secondaryBtn} onClick={prevStep}>? Back</button>
                  <button style={{ ...s.primaryBtn, flex:1 }} onClick={nextStep}>Continue ?</button>
                </div>
              </div>
            )}

            {/* -- STEP 2: Bio -- */}
            {step === 2 && (
              <div style={s.stepWrap}>
                <div style={s.stepTitle}>About You</div>
                <div style={s.stepSub}>Let the world know your story</div>
                <div style={s.fields}>
                  <div style={s.fieldGroup}>
                    <label style={s.fieldLabel}>Bio (optional)</label>
                    <textarea
                      name="bio"
                      placeholder="Tell people about your art, style, and passion…"
                      rows={5}
                      value={formData.bio}
                      onChange={handleChange}
                      style={{ ...s.input, resize:"vertical", height:"120px" }}
                    />
                  </div>
                  {/* Summary card */}
                  <div style={s.summaryCard}>
                    <div style={s.summaryRow}><span style={s.summaryLbl}>Name</span><span style={s.summaryVal}>{formData.name}</span></div>
                    <div style={s.summaryRow}><span style={s.summaryLbl}>Email</span><span style={s.summaryVal}>{formData.email}</span></div>
                    <div style={s.summaryRow}><span style={s.summaryLbl}>Category</span><span style={s.summaryVal}>{formData.category}</span></div>
                    <div style={s.summaryRow}><span style={s.summaryLbl}>City</span><span style={s.summaryVal}>{formData.city}</span></div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:"12px" }}>
                  <button style={s.secondaryBtn} onClick={prevStep}>? Back</button>
                  <button style={{ ...s.primaryBtn, flex:1, background:"linear-gradient(90deg,#4f46e5,#7c3aed)" }} onClick={handleSubmit}>
                    ?? Join ArtSpire
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}

// -- Reusable field ------------------------------------------------------------
function Field({ label, name, type = "text", placeholder, value, onChange }) {
  return (
    <div style={s.fieldGroup}>
      <label style={s.fieldLabel}>{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={s.input}
      />
    </div>
  );
}

// -- Styles --------------------------------------------------------------------
const s = {
  page: { minHeight:"100vh", display:"flex", fontFamily:"'Nunito', sans-serif" },

  // Left
  left: { width:"42%", position:"relative", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  leftImg: { position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" },
  leftOverlay: { position:"absolute", inset:0, background:"linear-gradient(to top, rgba(2,6,23,0.92), rgba(30,58,138,0.7))", zIndex:1 },
  leftContent: { position:"relative", zIndex:2, padding:"40px", color:"#fff" },
  leftBrand: { fontFamily:"'Bebas Neue', sans-serif", fontSize:"52px", letterSpacing:"4px", color:"#fff", marginBottom:"8px" },
  leftTagline: { fontSize:"16px", color:"rgba(255,255,255,0.7)", fontWeight:600, lineHeight:1.6, marginBottom:"48px" },
  leftSteps: { display:"flex", flexDirection:"column", gap:"20px" },
  leftStep: { display:"flex", alignItems:"center", gap:"14px", color:"rgba(255,255,255,0.4)", fontWeight:700, fontSize:"14px", transition:"color 0.3s" },
  leftStepActive: { color:"#fff" },
  leftStepDone: { color:"#86efac" },
  leftStepNum: { width:"32px", height:"32px", borderRadius:"50%", background:"rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:800, flexShrink:0, transition:"background 0.3s, color 0.3s" },
  leftStepNumActive: { background:"#4f46e5", color:"#fff" },
  leftStepNumDone: { background:"#86efac", color:"#14532d" },

  // Right
  right: { flex:1, background:"#f8fafc", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 24px", overflowY:"auto" },
  formCard: { width:"100%", maxWidth:"440px", background:"#fff", borderRadius:"28px", padding:"36px", boxShadow:"0 8px 40px rgba(0,0,0,0.08)" },
  topLink: { textAlign:"center", fontSize:"13px", color:"#94a3b8", fontWeight:600, marginBottom:"20px" },
  topLinkBtn: { color:"#4f46e5", cursor:"pointer", fontWeight:800 },

  stepWrap: { display:"flex", flexDirection:"column", gap:"0" },
  stepTitle: { fontSize:"28px", fontWeight:900, color:"#1e293b", marginBottom:"4px" },
  stepSub: { fontSize:"14px", color:"#94a3b8", fontWeight:600, marginBottom:"24px" },
  fields: { display:"flex", flexDirection:"column", gap:"16px", marginBottom:"24px" },
  fieldGroup: { display:"flex", flexDirection:"column", gap:"6px" },
  fieldLabel: { fontSize:"11px", fontWeight:800, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase" },
  input: { padding:"13px 16px", borderRadius:"12px", border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:"14px", fontWeight:600, fontFamily:"'Nunito', sans-serif", outline:"none", transition:"border-color 0.2s" },

  // Category grid
  categoryGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(110px, 1fr))", gap:"8px" },
  catBtn: { padding:"9px 12px", borderRadius:"10px", border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontFamily:"'Nunito', sans-serif", fontWeight:700, fontSize:"12px", cursor:"pointer", transition:"all 0.2s", textAlign:"center" },
  catBtnActive: { background:"#eef2ff", borderColor:"#4f46e5", color:"#4f46e5" },

  // Summary
  summaryCard: { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:"14px", padding:"16px", display:"flex", flexDirection:"column", gap:"10px" },
  summaryRow: { display:"flex", justifyContent:"space-between", alignItems:"center" },
  summaryLbl: { fontSize:"11px", fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.8px" },
  summaryVal: { fontSize:"13px", fontWeight:700, color:"#1e293b" },

  // Buttons
  primaryBtn: { background:"linear-gradient(90deg,#4f46e5,#7c3aed)", color:"#fff", border:"none", padding:"14px", borderRadius:"50px", fontFamily:"'Nunito', sans-serif", fontWeight:800, fontSize:"15px", cursor:"pointer", width:"100%", letterSpacing:"0.3px" },
  secondaryBtn: { background:"#f1f5f9", color:"#64748b", border:"none", padding:"14px 20px", borderRadius:"50px", fontFamily:"'Nunito', sans-serif", fontWeight:800, fontSize:"14px", cursor:"pointer", flexShrink:0 },
};



