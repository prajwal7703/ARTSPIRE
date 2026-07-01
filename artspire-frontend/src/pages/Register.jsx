import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { saveAuth } from "../utils/auth";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const NOTIF_THEMES = {
  loading: { bg: "#dbeafe", color: "#1e3a5f", border: "#93c5fd" },
  success: { bg: "#dcfce7", color: "#14532d", border: "#86efac" },
  error:   { bg: "#fee2e2", color: "#7f1d1d", border: "#fca5a5" },
  welcome: { bg: "#fef3c7", color: "#78350f", border: "#fcd34d" },
};
const NOTIF_ICONS = { loading: null, success: "✅", error: "❌", welcome: "🎉" };

function NotifBar({ notif, onClose }) {
  if (!notif) return null;
  const theme = NOTIF_THEMES[notif.type] || NOTIF_THEMES.success;
  return (
    <div style={{ position:"fixed",top:"20px",left:"50%",transform:"translateX(-50%)",zIndex:9999,minWidth:"280px",maxWidth:"90vw",background:theme.bg,color:theme.color,border:`1px solid ${theme.border}`,borderRadius:"14px",padding:"14px 20px",display:"flex",alignItems:"center",gap:"12px",boxShadow:"0 8px 32px rgba(0,0,0,0.15)",fontFamily:"sans-serif",fontSize:"14px",fontWeight:"600" }}>
      <style>{`@keyframes notifSlide{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {notif.type === "loading"
        ? <div style={{ width:"18px",height:"18px",border:`2px solid ${theme.border}`,borderTop:`2px solid ${theme.color}`,borderRadius:"50%",animation:"spin 0.75s linear infinite",flexShrink:0 }} />
        : <span style={{ fontSize:"18px",flexShrink:0 }}>{NOTIF_ICONS[notif.type]}</span>
      }
      <span style={{ flex:1 }}>{notif.message}</span>
      {notif.type !== "loading" && (
        <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:"18px",color:theme.color,opacity:0.6,padding:0,lineHeight:1 }}>✕</button>
      )}
    </div>
  );
}

function StepDots({ step, total }) {
  return (
    <div style={{ display:"flex",gap:"8px",justifyContent:"center",marginBottom:"28px" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ width:i===step?"24px":"8px",height:"8px",borderRadius:"4px",background:i===step?"#E8192C":i<step?"#86efac":"#d1d5db",transition:"all 0.3s ease" }} />
      ))}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep]   = useState(0);
  const [notif, setNotif] = useState(null);
  let notifTimer = null;

  const [form, setForm] = useState({ name:"",email:"",password:"",confirmPassword:"",city:"",interests:[] });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const INTERESTS = ["Music","Dance","Visual Art","Theatre","Photography","Comedy","Film","Spoken Word"];

  function showNotif(type, message, autoDismiss = true) {
    clearTimeout(notifTimer);
    setNotif({ type, message });
    if (autoDismiss && type !== "loading") {
      notifTimer = setTimeout(() => setNotif(null), 3500);
    }
  }

  const handleChange   = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const toggleInterest = (val) => setForm(f => ({ ...f, interests: f.interests.includes(val) ? f.interests.filter(i=>i!==val) : [...f.interests, val] }));

  const validateStep = () => {
    if (step === 0) {
      if (!form.name.trim())                      { showNotif("error","Please enter your full name."); return false; }
      if (!form.email.trim())                     { showNotif("error","Please enter your email address."); return false; }
      if (form.password.length < 6)               { showNotif("error","Password must be at least 6 characters."); return false; }
      if (form.password !== form.confirmPassword) { showNotif("error","Passwords do not match."); return false; }
    }
    return true;
  };

  const nextStep = () => { if (validateStep()) setStep(s => s+1); };
  const prevStep = () => setStep(s => s-1);

  const handleSubmit = async () => {
    showNotif("loading","Creating your account...",false);
    try {
      const res = await axios.post(`${API}/api/auth/register`, {
        name: form.name, email: form.email, password: form.password,
        city: form.city, interests: form.interests, role: "user",
      });
      // ✅ FIXED: use saveAuth helper — puts data in right localStorage key
      saveAuth(res.data.token, res.data.user);
      showNotif("welcome", `Welcome to ArtSpire, ${res.data.user?.name}! 🎉`);
      setTimeout(() => navigate("/"), 1400);
    } catch (err) {
      showNotif("error", err.response?.data?.message || "Registration failed. Email may already be used.");
    }
  };

  const handleGoogleRegister = async () => {
    try {
      const { signInWithPopup } = await import("firebase/auth");
      const { auth, provider }  = await import("../firebase");
      const result = await signInWithPopup(auth, provider);
      const user   = result.user;
      const res    = await axios.post(`${API}/api/auth/google`, {
        name: user.displayName, email: user.email, photo: user.photoURL, role: "user",
      });
      saveAuth(res.data.token, res.data.user);
      window.location.href = "/";
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") showNotif("error","Google sign-in failed.");
    }
  };

  const passwordStrength = form.password.length >= 10 ? 3 : form.password.length >= 6 ? 2 : form.password.length > 0 ? 1 : 0;
  const strengthColors   = ["#ef4444","#f59e0b","#22c55e"];
  const strengthLabels   = ["Weak","Good","Strong"];

  return (
    <>
      <NotifBar notif={notif} onClose={() => setNotif(null)} />
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        .reg-input { padding:13px 16px;border-radius:12px;border:1.5px solid #e2e8f0;background:#f8fafc;color:#1e293b;font-size:14px;font-weight:600;font-family:'Nunito',sans-serif;outline:none;width:100%; }
        .reg-input:focus { border-color:#E8192C; }
        .reg-primary { background:linear-gradient(90deg,#E8192C,#c0152a);color:#fff;border:none;padding:14px;border-radius:50px;font-family:'Nunito',sans-serif;font-weight:800;font-size:15px;cursor:pointer;width:100%; }
        .reg-secondary { background:#f1f5f9;color:#64748b;border:none;padding:14px 20px;border-radius:50px;font-family:'Nunito',sans-serif;font-weight:800;font-size:14px;cursor:pointer; }
        .reg-google { width:100%;padding:13px 24px;border:1.5px solid #e2e8f0;border-radius:50px;background:#fff;color:#1e293b;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:'Nunito',sans-serif; }
        .interest-btn { padding:9px 12px;border-radius:10px;font-family:'Nunito',sans-serif;font-weight:700;font-size:12px;cursor:pointer;transition:all 0.2s; }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      <div style={{ minHeight:"100vh",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px" }}>
        <div style={{ width:"100%",maxWidth:"480px",background:"#fff",borderRadius:"28px",padding:"clamp(20px,5vw,36px)",boxShadow:"0 8px 40px rgba(0,0,0,0.08)" }}>

          {/* Logo */}
          <div style={{ textAlign:"center",marginBottom:"24px" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(28px,6vw,36px)",color:"#E8192C",letterSpacing:"3px" }}>ArtSpire</div>
            <div style={{ fontSize:"13px",color:"#94a3b8",fontWeight:600 }}>Discover & Book Local Artists</div>
          </div>

          <div style={{ textAlign:"center",fontSize:"13px",color:"#94a3b8",fontWeight:600,marginBottom:"20px" }}>
            Already have an account?{" "}
            <span style={{ color:"#E8192C",cursor:"pointer",fontWeight:800 }} onClick={() => navigate("/login")}>Sign In</span>
          </div>

          <StepDots step={step} total={2} />

          {/* STEP 0 */}
          {step === 0 && (
            <div style={{ display:"flex",flexDirection:"column",gap:"16px" }}>
              <div>
                <div style={{ fontSize:"clamp(20px,5vw,24px)",fontWeight:900,color:"#1e293b",marginBottom:"4px" }}>Create Account</div>
                <div style={{ fontSize:"14px",color:"#94a3b8",fontWeight:600 }}>Find and book amazing artists</div>
              </div>

              <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
                <label style={s.fieldLabel}>Full Name</label>
                <input className="reg-input" type="text" name="name" placeholder="Arjun Sharma" value={form.name} onChange={handleChange} />
              </div>

              <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
                <label style={s.fieldLabel}>Email Address</label>
                <input className="reg-input" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} />
              </div>

              <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
                <label style={s.fieldLabel}>Password</label>
                <div style={{ display:"flex",alignItems:"center",background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:"12px",padding:"0 14px" }}>
                  <input type={showPass?"text":"password"} name="password" placeholder="Min. 6 characters" value={form.password} onChange={handleChange} style={{ border:"none",background:"none",flex:1,padding:"13px 0",fontSize:"14px",fontWeight:600,fontFamily:"'Nunito',sans-serif",outline:"none",color:"#1e293b",width:"100%" }} />
                  <button type="button" onClick={()=>setShowPass(!showPass)} style={{ border:"none",background:"none",cursor:"pointer",fontSize:"16px",flexShrink:0 }}>{showPass?"🙈":"👁️"}</button>
                </div>
                {form.password && (
                  <div>
                    <div style={{ display:"flex",gap:"4px" }}>
                      {[1,2,3].map(lvl=><div key={lvl} style={{ flex:1,height:"4px",borderRadius:"2px",background:passwordStrength>=lvl?strengthColors[passwordStrength-1]:"#e2e8f0",transition:"background 0.3s" }} />)}
                    </div>
                    <div style={{ fontSize:"11px",color:strengthColors[passwordStrength-1],fontWeight:700,marginTop:"4px" }}>{strengthLabels[passwordStrength-1]}</div>
                  </div>
                )}
              </div>

              <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
                <label style={s.fieldLabel}>Confirm Password</label>
                <div style={{ display:"flex",alignItems:"center",background:"#f8fafc",border:"1.5px solid #e2e8f0",borderRadius:"12px",padding:"0 14px" }}>
                  <input type={showConfirm?"text":"password"} name="confirmPassword" placeholder="Repeat password" value={form.confirmPassword} onChange={handleChange} style={{ border:"none",background:"none",flex:1,padding:"13px 0",fontSize:"14px",fontWeight:600,fontFamily:"'Nunito',sans-serif",outline:"none",color:"#1e293b",width:"100%" }} />
                  <button type="button" onClick={()=>setShowConfirm(!showConfirm)} style={{ border:"none",background:"none",cursor:"pointer",fontSize:"16px",flexShrink:0 }}>{showConfirm?"🙈":"👁️"}</button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && <div style={{ fontSize:"12px",color:"#ef4444",fontWeight:700 }}>Passwords do not match</div>}
                {form.confirmPassword && form.password === form.confirmPassword && form.password.length >= 6 && <div style={{ fontSize:"12px",color:"#22c55e",fontWeight:700 }}>✓ Passwords match</div>}
              </div>

              <button className="reg-primary" onClick={nextStep}>Continue →</button>

              <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
                <div style={{ flex:1,height:"1px",background:"#e2e8f0" }} />
                <span style={{ fontSize:"12px",color:"#cbd5e1",fontWeight:700 }}>or</span>
                <div style={{ flex:1,height:"1px",background:"#e2e8f0" }} />
              </div>

              <button className="reg-google" onClick={handleGoogleRegister}>
                <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight:10,flexShrink:0 }}>
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.31z"/>
                </svg>
                Continue with Google
              </button>
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div style={{ display:"flex",flexDirection:"column",gap:"16px" }}>
              <div>
                <div style={{ fontSize:"clamp(20px,5vw,24px)",fontWeight:900,color:"#1e293b",marginBottom:"4px" }}>Your Preferences</div>
                <div style={{ fontSize:"14px",color:"#94a3b8",fontWeight:600 }}>Help us personalise your experience</div>
              </div>

              <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
                <label style={s.fieldLabel}>City (optional)</label>
                <input className="reg-input" type="text" name="city" placeholder="Mumbai" value={form.city} onChange={handleChange} />
              </div>

              <div style={{ display:"flex",flexDirection:"column",gap:"6px" }}>
                <label style={s.fieldLabel}>Interests (optional)</label>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",gap:"8px" }}>
                  {INTERESTS.map(item=>(
                    <button key={item} type="button" className="interest-btn" onClick={()=>toggleInterest(item)} style={{ border:`1.5px solid ${form.interests.includes(item)?"#E8192C":"#e2e8f0"}`,background:form.interests.includes(item)?"#fff0f0":"#f8fafc",color:form.interests.includes(item)?"#E8192C":"#64748b" }}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div style={{ background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:"14px",padding:"16px",display:"flex",flexDirection:"column",gap:"10px" }}>
                <Row label="Name"  value={form.name} />
                <Row label="Email" value={form.email} />
                {form.city && <Row label="City" value={form.city} />}
              </div>

              <div style={{ display:"flex",gap:"12px" }}>
                <button className="reg-secondary" onClick={prevStep}>← Back</button>
                <button className="reg-primary" style={{ flex:1 }} onClick={handleSubmit}>🎉 Join ArtSpire</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display:"flex",justifyContent:"space-between",gap:8 }}>
      <span style={{ fontSize:"11px",fontWeight:800,color:"#94a3b8",textTransform:"uppercase" }}>{label}</span>
      <span style={{ fontSize:"13px",fontWeight:700,color:"#1e293b",textAlign:"right" }}>{value}</span>
    </div>
  );
}

const s = {
  fieldLabel: { fontSize:"11px",fontWeight:800,color:"#64748b",letterSpacing:"1px",textTransform:"uppercase" },
};
