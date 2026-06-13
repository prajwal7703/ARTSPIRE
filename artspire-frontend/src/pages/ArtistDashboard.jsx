import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// ── Base URL — uses env var in production, localhost in dev ──────────────────
const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

// ── Safe helpers ──────────────────────────────────────────────────────────────
function safeParse(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === "undefined" || raw === "null") return null;
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function getId(obj) {
  if (!obj) return null;
  const raw = obj._id;
  if (!raw) return null;
  if (typeof raw === "object" && raw.$oid) return raw.$oid;
  return String(raw);
}

// ── Dot-grid SVG ──────────────────────────────────────────────────────────────
const DotGrid = ({ color = "#1e3a8a", opacity = 0.12 }) => (
  <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity, pointerEvents:"none" }} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="dots2" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="1.5" fill={color} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dots2)" />
  </svg>
);

const getInitials = (name = "") =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "A";

const CATEGORY_SKILLS = {
  Singer:       ["Vocals", "Songwriting", "Live Performance", "Recording"],
  Dancer:       ["Choreography", "Contemporary", "Hip-Hop", "Stage Performance"],
  Musician:     ["Composition", "Music Theory", "Live Gigs", "Studio Work"],
  Painter:      ["Acrylics", "Oils", "Digital Art", "Illustration"],
  Photographer: ["Portrait", "Landscape", "Editing", "Lightroom"],
  Actor:        ["Stage Acting", "Screen Acting", "Improv", "Voice Acting"],
  Comedian:     ["Stand-Up", "Improv", "Sketch", "Storytelling"],
  default:      ["Creative Work", "Collaboration", "Live Events", "Content"],
};

// ── Upload Work Component ─────────────────────────────────────────────────────
function UploadWork({ artistId, onDone }) {
  const fileInputRef              = useRef(null);
  const [file, setFile]           = useState(null);
  const [preview, setPreview]     = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;

    // ── Always send artistId as a plain string ──
    const safeArtistId = typeof artistId === "object"
      ? (artistId.$oid || String(artistId))
      : String(artistId || "");

    if (!safeArtistId) {
      alert("Artist ID missing. Please log out and log in again.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const uploadRes = await axios.post(`${API}/api/upload`, formData);
      const mediaUrl = uploadRes.data.imageUrl;

      if (!mediaUrl) {
        alert("Upload failed — no URL returned.");
        return;
      }

      const type = file.type.startsWith("video") ? "video" : "image";
      await axios.post(`${API}/api/posts`, {
        artistId: safeArtistId,
        media: mediaUrl,
        type,
      });

      setFile(null);
      setPreview(null);
      onDone();
    } catch (err) {
      console.error("Upload error:", err.response?.data || err.message);
      alert("Upload failed: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth:"500px" }}>
      <div style={s.blueBadge}>📤 Upload Work</div>
      <div style={{ marginTop:"20px" }}>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display:"none" }} onChange={handleFile} />
        <div className="upload-zone"
          style={{ ...s.uploadZone, flexDirection:"column", padding:"40px", gap:"16px", cursor:"pointer" }}
          onClick={() => fileInputRef.current?.click()}>
          {preview ? (
            file?.type.startsWith("video")
              ? <video src={preview} style={{ maxWidth:"100%", maxHeight:"260px", borderRadius:"12px" }} controls />
              : <img src={preview} alt="" style={{ maxWidth:"100%", maxHeight:"260px", borderRadius:"12px", objectFit:"cover" }} />
          ) : (
            <>
              <span style={{ fontSize:"40px" }}>🖼</span>
              <span style={{ color:"rgba(255,255,255,0.6)", fontSize:"14px", fontWeight:600 }}>Click to choose image or video</span>
            </>
          )}
        </div>
        {file && (
          <div style={{ display:"flex", gap:"10px", marginTop:"16px" }}>
            <button className="action-btn" style={s.primaryBtn} onClick={handleUpload} disabled={uploading}>
              {uploading ? "Uploading…" : "✓ Post Work"}
            </button>
            <button className="action-btn" style={s.secondaryBtn} onClick={() => { setFile(null); setPreview(null); }}>
              Discard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function ArtistDashboard() {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);

  const [artist, setArtist] = useState(() => safeParse("artist"));

  const [posts, setPosts]               = useState([]);
  const [editMode, setEditMode]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saveMsg, setSaveMsg]           = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [lightbox, setLightbox]         = useState(null);
  const [activeTab, setActiveTab]       = useState("overview");
  const [form, setForm]                 = useState({ name:"", bio:"", city:"", instagram:"", category:"" });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [pendingFile, setPendingFile]   = useState(null);

  useEffect(() => {
    if (!artist) { navigate("/login"); return; }
    const id = getId(artist);
    if (!id) { navigate("/login"); return; }

    setForm({
      name:      artist.name      || "",
      bio:       artist.bio       || "",
      city:      artist.city      || "",
      instagram: artist.instagram || "",
      category:  artist.category  || "",
    });

    fetchPosts(id);
    refreshArtist(id);
  }, []);

  const refreshArtist = async (id) => {
    try {
      const res = await axios.get(`${API}/api/artists/${id}`);
      const updated = { ...res.data, _id: getId(res.data) || id };
      setArtist(updated);
      localStorage.setItem("artist", JSON.stringify(updated));
    } catch (err) { console.log("refresh err", err); }
  };

  const fetchPosts = async (id) => {
    try {
      const res = await axios.get(`${API}/api/posts`);
      setPosts(res.data.filter((p) => String(p.artistId) === String(id)));
    } catch (err) { console.log(err); }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File too large. Max 5 MB."); return; }
    setPendingFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhoto = async () => {
    if (!pendingFile) return;
    setPhotoLoading(true);
    const id = getId(artist);
    try {
      const formData = new FormData();
      formData.append("profileImage", pendingFile);
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${API}/api/artists/${id}/photo`,
        formData,
        { headers: { "Content-Type":"multipart/form-data", ...(token ? { Authorization:`Bearer ${token}` } : {}) } }
      );
      const updated = { ...res.data, _id: getId(res.data) || id };
      setArtist(updated);
      localStorage.setItem("artist", JSON.stringify(updated));
      setPhotoPreview(null); setPendingFile(null);
      setSaveMsg("✓ Photo updated!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Photo upload failed.");
    } finally {
      setPhotoLoading(false);
    }
  };

  const discardPhoto = () => {
    setPhotoPreview(null); setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveProfile = async () => {
    setSaving(true);
    const id = getId(artist);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${API}/api/artists/${id}`,
        form,
        { headers: token ? { Authorization:`Bearer ${token}` } : {} }
      );
      const updated = { ...artist, ...res.data, _id: id };
      setArtist(updated);
      localStorage.setItem("artist", JSON.stringify(updated));
      setEditMode(false);
      setSaveMsg("✓ Profile saved!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("artist");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/");
  };

  if (!artist) return null;

  const artistId   = getId(artist);
  const skills     = CATEGORY_SKILLS[artist.category] || CATEGORY_SKILLS.default;
  const currentPhoto = photoPreview || artist.profileImage || null;

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .tab-btn:hover    { background: rgba(255,255,255,0.08) !important; }
        .post-thumb:hover { transform:scale(1.04); box-shadow:0 8px 30px rgba(30,58,138,0.4); }
        .skill-pill:hover { background:#1e3a8a !important; color:#fff !important; }
        .action-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(30,58,138,0.35); }
        .upload-zone:hover { border-color:#1e3a8a !important; background:rgba(30,58,138,0.06) !important; }
        .input-field:focus { border-color:#3b82f6 !important; outline:none; box-shadow:0 0 0 3px rgba(59,130,246,0.2); }
      `}</style>

      {/* TOP NAV */}
      <div style={s.topNav}>
        <button style={s.navLink} onClick={() => navigate(`/artist/${artistId}`)}>← View Profile</button>
        <div style={{ display:"flex", alignItems:"center", gap:"20px" }}>
          <button style={s.navLink} onClick={() => navigate("/")}>🏠 Home</button>
          <button style={s.navLink} onClick={() => navigate("/artists")}>Artists</button>
        </div>
        <div style={s.navCenter}>
          <span style={s.navBrand}>ArtSpire</span>
          <span style={s.navSub}>Dashboard</span>
        </div>
        <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
          {saveMsg && <span style={s.saveMsg}>{saveMsg}</span>}
          <button style={s.navActionBtn} onClick={logout}>Logout</button>
        </div>
      </div>

      {/* HERO STRIP */}
      <div style={s.heroStrip}>
        <DotGrid />
        <div style={s.heroInner}>
          <div style={s.photoBlock}>
            <div style={s.photoFrame}>
              {currentPhoto
                ? <img src={currentPhoto} alt="profile" style={s.photoImg} />
                : <div style={s.photoInitials}>{getInitials(artist.name)}</div>
              }
              <button style={s.cameraBtn} onClick={() => fileInputRef.current?.click()} title="Change photo">📷</button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoChange} />
            {pendingFile && (
              <div style={s.photoPending}>
                <div style={s.pendingLabel}>New photo selected</div>
                <div style={{ display:"flex", gap:"8px" }}>
                  <button style={s.savePhotoBtn} onClick={uploadPhoto} disabled={photoLoading}>
                    {photoLoading ? "Uploading…" : "✓ Save Photo"}
                  </button>
                  <button style={s.discardBtn} onClick={discardPhoto}>✕</button>
                </div>
              </div>
            )}
          </div>

          <div style={s.heroMeta}>
            <div style={s.bigName}>{(artist.name || "ARTIST").toUpperCase()}</div>
            <div style={s.bigCat}>{(artist.category || "ARTIST").toUpperCase()}</div>
            <div style={s.heroPills}>
              {artist.city      && <span style={s.heroPill}>📍 {artist.city}</span>}
              {artist.instagram && <span style={{ ...s.heroPill, background:"#fff0e6", color:"#e8621a" }}>📸 @{artist.instagram}</span>}
              <span style={{ ...s.heroPill, background:"#e8f0ff", color:"#1e3a8a" }}>🎨 {posts.length} Posts</span>
            </div>
          </div>

          <div style={s.heroStats}>
            <div style={s.statCard}><div style={s.statNum}>{posts.length}</div><div style={s.statLbl}>Posts</div></div>
            <div style={s.statCard}><div style={s.statNum}>{skills.length}</div><div style={s.statLbl}>Skills</div></div>
            <div style={s.statCard}><div style={s.statNum}>'25</div><div style={s.statLbl}>Year</div></div>
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      <div style={s.tabBar}>
        {["overview","portfolio","settings"].map((tab) => (
          <button key={tab} className="tab-btn" onClick={() => setActiveTab(tab)}
            style={{ ...s.tabBtn, ...(activeTab === tab ? s.tabActive : {}) }}>
            {tab === "overview"  && "📋 "}
            {tab === "portfolio" && "🎨 "}
            {tab === "settings"  && "⚙️ "}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* BODY */}
      <div style={s.blueBody}>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div style={s.tabContent}>
            <div style={s.editBar}>
              <div style={s.blueBadge}>✦ Profile Info</div>
              <div style={{ display:"flex", gap:"10px" }}>
                {editMode ? (
                  <>
                    <button className="action-btn" style={s.primaryBtn} onClick={saveProfile} disabled={saving}>
                      {saving ? "Saving…" : "✓ Save Changes"}
                    </button>
                    <button className="action-btn" style={s.secondaryBtn} onClick={() => {
                      setEditMode(false);
                      setForm({ name:artist.name||"", bio:artist.bio||"", city:artist.city||"", instagram:artist.instagram||"", category:artist.category||"" });
                    }}>Cancel</button>
                  </>
                ) : (
                  <button className="action-btn" style={s.primaryBtn} onClick={() => setEditMode(true)}>✏️ Edit Profile</button>
                )}
              </div>
            </div>

            {editMode ? (
              <div style={s.formGrid}>
                {[
                  { key:"name",      label:"Name",      placeholder:"Your full name" },
                  { key:"city",      label:"City",      placeholder:"Where are you based?" },
                  { key:"instagram", label:"Instagram", placeholder:"handle (without @)" },
                  { key:"category",  label:"Category",  placeholder:"Singer, Dancer, Actor…" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} style={s.formGroup}>
                    <label style={s.formLabel}>{label}</label>
                    <input className="input-field" style={s.formInput} value={form[key]} placeholder={placeholder}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div style={{ ...s.formGroup, gridColumn:"1 / -1" }}>
                  <label style={s.formLabel}>Bio</label>
                  <textarea className="input-field" style={{ ...s.formInput, height:"100px", resize:"vertical" }}
                    value={form.bio} placeholder="Tell the world about yourself…"
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
                </div>
              </div>
            ) : (
              <>
                <div style={s.infoCards}>
                  {[
                    { label:"Full Name", value:artist.name      || "—", icon:"👤" },
                    { label:"City",      value:artist.city      || "—", icon:"📍" },
                    { label:"Instagram", value:artist.instagram ? `@${artist.instagram}` : "—", icon:"📸" },
                    { label:"Category",  value:artist.category  || "—", icon:"🎭" },
                  ].map(({ label, value, icon }) => (
                    <div key={label} style={s.infoCard}>
                      <div style={s.infoIcon}>{icon}</div>
                      <div>
                        <div style={s.infoLbl}>{label}</div>
                        <div style={s.infoVal}>{value}</div>
                      </div>
                    </div>
                  ))}
                  {artist.bio && (
                    <div style={{ ...s.infoCard, gridColumn:"1 / -1" }}>
                      <div style={s.infoIcon}>📝</div>
                      <div>
                        <div style={s.infoLbl}>Bio</div>
                        <div style={{ ...s.infoVal, fontWeight:600, lineHeight:1.7 }}>{artist.bio}</div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop:"36px" }}>
                  <div style={s.blueBadge}>✦ Skills & Expertise</div>
                  <div style={s.skillsGrid}>
                    {skills.map((sk, i) => <span key={i} className="skill-pill" style={s.skillPill}>{sk}</span>)}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* PORTFOLIO */}
        {activeTab === "portfolio" && (
          <div style={s.tabContent}>
            <div style={s.editBar}>
              <div style={s.blueBadge}>🎨 My Portfolio ({posts.length} works)</div>
              <button className="action-btn" style={s.primaryBtn} onClick={() => setActiveTab("uploadwork")}>+ Upload Work</button>
            </div>
            {posts.length === 0 ? (
              <div style={s.emptyState}>
                <div style={{ fontSize:"52px" }}>🎭</div>
                <div style={s.emptyText}>No posts yet. Upload your first work!</div>
                <button className="action-btn" style={{ ...s.primaryBtn, marginTop:"16px" }} onClick={() => setActiveTab("uploadwork")}>Upload Now</button>
              </div>
            ) : (
              <div style={s.portfolioGrid}>
                {posts.map((post, i) => (
                  <div key={post._id} className="post-thumb" onClick={() => setLightbox(post)}
                    style={{ ...s.portfolioThumb, animationDelay:`${0.05*i}s` }}>
                    {post.type === "image"
                      ? <img src={post.media} alt="" style={s.thumbMedia} />
                      : <video src={post.media} style={s.thumbMedia} muted />
                    }
                    <div style={s.thumbOverlay}>
                      <span style={{ fontSize:"22px" }}>{post.type === "video" ? "▶" : "🖼"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* UPLOAD WORK */}
        {activeTab === "uploadwork" && (
          <div style={s.tabContent}>
            <div style={s.editBar}>
              <div style={s.blueBadge}>📤 Upload New Work</div>
              <button className="action-btn" style={s.secondaryBtn} onClick={() => setActiveTab("portfolio")}>← Back</button>
            </div>
            <UploadWork artistId={artistId} onDone={() => { fetchPosts(artistId); setActiveTab("portfolio"); }} />
          </div>
        )}

        {/* SETTINGS */}
        {activeTab === "settings" && (
          <div style={s.tabContent}>
            <div style={s.blueBadge}>⚙️ Account Settings</div>
            <div style={{ ...s.settingsCard, marginTop:"24px" }}>
              <div style={s.settingsCardTitle}>Profile Photo</div>
              <div style={s.photoUploadRow}>
                <div style={s.settingsPhoto}>
                  {currentPhoto
                    ? <img src={currentPhoto} alt="profile" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    : <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"40px", color:"#1e3a8a" }}>{getInitials(artist.name)}</div>
                  }
                </div>
                <div style={{ flex:1 }}>
                  <div style={s.settingsHint}>Upload a new profile photo. Max 5 MB, JPG/PNG.</div>
                  <div className="upload-zone" style={s.uploadZone} onClick={() => fileInputRef.current?.click()}>
                    <span style={{ fontSize:"28px" }}>📁</span>
                    <span style={{ color:"rgba(255,255,255,0.7)", fontSize:"14px", fontWeight:600 }}>
                      {pendingFile ? pendingFile.name : "Click to choose photo"}
                    </span>
                  </div>
                  {pendingFile && (
                    <div style={{ display:"flex", gap:"10px", marginTop:"12px" }}>
                      <button className="action-btn" style={s.primaryBtn} onClick={uploadPhoto} disabled={photoLoading}>
                        {photoLoading ? "Uploading…" : "✓ Save Photo"}
                      </button>
                      <button className="action-btn" style={s.secondaryBtn} onClick={discardPhoto}>Discard</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ ...s.settingsCard, borderColor:"rgba(220,38,38,0.3)" }}>
              <div style={{ ...s.settingsCardTitle, color:"#f87171" }}>Danger Zone</div>
              <div style={s.settingsHint}>Logging out will clear your session.</div>
              <button className="action-btn" style={{ ...s.primaryBtn, background:"#dc2626", marginTop:"14px" }} onClick={logout}>Logout</button>
            </div>
          </div>
        )}
      </div>

      {/* LIGHTBOX */}
      {lightbox && (
        <div style={s.lightboxOverlay} onClick={() => setLightbox(null)}>
          <div style={s.lightboxBox} onClick={(e) => e.stopPropagation()}>
            <button style={s.lightboxClose} onClick={() => setLightbox(null)}>✕</button>
            {lightbox.type === "image"
              ? <img src={lightbox.media} alt="" style={s.lightboxMedia} />
              : <video src={lightbox.media} controls style={s.lightboxMedia} />
            }
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page:              { fontFamily:"'Nunito',sans-serif", minHeight:"100vh", background:"#050816", color:"#fff", overflowX:"hidden" },
  topNav:            { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 40px", borderBottom:"1px solid rgba(255,255,255,0.07)", background:"#050816", position:"sticky", top:0, zIndex:100, flexWrap:"wrap", gap:"10px" },
  navLink:           { background:"none", border:"none", fontFamily:"'Nunito',sans-serif", fontSize:"14px", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontWeight:700, transition:"color 0.2s" },
  navCenter:         { display:"flex", alignItems:"baseline", gap:"10px" },
  navBrand:          { fontFamily:"'Bebas Neue',sans-serif", fontSize:"22px", color:"#fff", letterSpacing:"3px" },
  navSub:            { fontSize:"11px", color:"rgba(255,255,255,0.4)", fontWeight:700, letterSpacing:"2px", textTransform:"uppercase" },
  navActionBtn:      { background:"#ef4444", color:"#fff", border:"none", padding:"9px 22px", borderRadius:"22px", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:"13px", cursor:"pointer" },
  saveMsg:           { fontFamily:"'Nunito',sans-serif", fontSize:"13px", color:"#4ade80", fontWeight:700 },
  heroStrip:         { position:"relative", background:"#f5f0e8", overflow:"hidden", padding:"36px 40px" },
  heroInner:         { position:"relative", zIndex:2, display:"flex", alignItems:"center", gap:"36px", flexWrap:"wrap" },
  photoBlock:        { display:"flex", flexDirection:"column", alignItems:"center", gap:"10px" },
  photoFrame:        { position:"relative", width:"140px", height:"140px", borderRadius:"50%", overflow:"visible" },
  photoImg:          { width:"140px", height:"140px", borderRadius:"50%", objectFit:"cover", border:"4px solid #1e3a8a", boxShadow:"6px 6px 0 #1e3a8a", display:"block" },
  photoInitials:     { width:"140px", height:"140px", borderRadius:"50%", background:"#dbeafe", border:"4px solid #1e3a8a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:"48px", color:"#1e3a8a", boxShadow:"6px 6px 0 #1e3a8a" },
  cameraBtn:         { position:"absolute", bottom:"4px", right:"-4px", background:"#1e3a8a", color:"#fff", border:"3px solid #f5f0e8", width:"36px", height:"36px", borderRadius:"50%", fontSize:"16px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  photoPending:      { display:"flex", flexDirection:"column", alignItems:"center", gap:"6px" },
  pendingLabel:      { fontFamily:"'Nunito',sans-serif", fontSize:"11px", color:"#1e3a8a", fontWeight:700 },
  savePhotoBtn:      { background:"#1e3a8a", color:"#fff", border:"none", padding:"7px 16px", borderRadius:"20px", fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:"12px", cursor:"pointer" },
  discardBtn:        { background:"rgba(0,0,0,0.08)", color:"#1e3a8a", border:"1px solid rgba(30,58,138,0.2)", padding:"7px 12px", borderRadius:"20px", fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:"12px", cursor:"pointer" },
  heroMeta:          { flex:1, minWidth:"200px" },
  bigName:           { fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(40px,6vw,72px)", color:"#1e3a8a", lineHeight:0.95, letterSpacing:"2px" },
  bigCat:            { fontFamily:"'Bebas Neue',sans-serif", fontSize:"clamp(28px,4vw,50px)", color:"#1e3a8a", opacity:0.65, lineHeight:0.95, letterSpacing:"2px", marginBottom:"14px" },
  heroPills:         { display:"flex", gap:"8px", flexWrap:"wrap", marginTop:"10px" },
  heroPill:          { background:"#e8f0ff", color:"#1e3a8a", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:"12px", padding:"5px 14px", borderRadius:"20px" },
  heroStats:         { display:"flex", gap:"12px", flexShrink:0 },
  statCard:          { background:"#1e3a8a", borderRadius:"14px", padding:"14px 20px", textAlign:"center", minWidth:"70px", boxShadow:"4px 4px 0 rgba(30,58,138,0.3)" },
  statNum:           { fontFamily:"'Bebas Neue',sans-serif", fontSize:"26px", color:"#fff", letterSpacing:"1px" },
  statLbl:           { fontFamily:"'Nunito',sans-serif", fontSize:"10px", color:"rgba(255,255,255,0.6)", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" },
  tabBar:            { background:"#050816", display:"flex", padding:"0 40px", borderBottom:"1px solid rgba(255,255,255,0.07)", gap:"4px" },
  tabBtn:            { background:"none", color:"rgba(255,255,255,0.5)", border:"none", padding:"16px 22px", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:"13px", cursor:"pointer", borderBottom:"2px solid transparent", transition:"background 0.2s,color 0.2s", borderRadius:"8px 8px 0 0" },
  tabActive:         { color:"#fff", borderBottom:"2px solid #3b82f6", background:"rgba(255,255,255,0.04)" },
  blueBody:          { background:"linear-gradient(160deg,#1e40af 0%,#1e3a8a 40%,#1d4ed8 100%)", minHeight:"500px" },
  tabContent:        { padding:"40px 48px", animation:"fadeUp 0.4s ease", maxWidth:"1000px" },
  editBar:           { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px", flexWrap:"wrap", gap:"12px" },
  blueBadge:         { display:"inline-block", background:"rgba(255,255,255,0.15)", backdropFilter:"blur(8px)", color:"#fff", fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:"15px", padding:"9px 22px", borderRadius:"12px", border:"1px solid rgba(255,255,255,0.25)" },
  infoCards:         { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:"14px" },
  infoCard:          { background:"rgba(255,255,255,0.1)", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:"16px", padding:"18px 20px", display:"flex", gap:"14px", alignItems:"flex-start" },
  infoIcon:          { fontSize:"22px", flexShrink:0, marginTop:"2px" },
  infoLbl:           { fontFamily:"'Nunito',sans-serif", fontSize:"11px", color:"rgba(255,255,255,0.5)", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase", marginBottom:"4px" },
  infoVal:           { fontFamily:"'Nunito',sans-serif", fontSize:"15px", color:"#fff", fontWeight:800 },
  formGrid:          { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:"16px" },
  formGroup:         { display:"flex", flexDirection:"column", gap:"6px" },
  formLabel:         { fontFamily:"'Nunito',sans-serif", fontSize:"11px", color:"rgba(255,255,255,0.6)", fontWeight:800, letterSpacing:"1.5px", textTransform:"uppercase" },
  formInput:         { background:"rgba(255,255,255,0.1)", border:"1.5px solid rgba(255,255,255,0.2)", borderRadius:"10px", padding:"11px 14px", fontFamily:"'Nunito',sans-serif", fontSize:"14px", color:"#fff", fontWeight:600, transition:"border-color 0.2s,box-shadow 0.2s" },
  skillsGrid:        { display:"flex", flexWrap:"wrap", gap:"10px", marginTop:"4px" },
  skillPill:         { background:"rgba(255,255,255,0.12)", color:"#fff", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:"13px", padding:"8px 20px", borderRadius:"24px", border:"1.5px solid rgba(255,255,255,0.25)", cursor:"default", transition:"background 0.2s,color 0.2s" },
  portfolioGrid:     { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:"12px", marginTop:"8px" },
  portfolioThumb:    { aspectRatio:"3/4", borderRadius:"14px", overflow:"hidden", position:"relative", cursor:"pointer", transition:"transform 0.25s ease,box-shadow 0.25s ease", animation:"fadeUp 0.4s ease both", border:"2px solid rgba(255,255,255,0.15)", background:"rgba(0,0,0,0.3)" },
  thumbMedia:        { width:"100%", height:"100%", objectFit:"cover", display:"block" },
  thumbOverlay:      { position:"absolute", inset:0, background:"rgba(0,0,0,0.2)", display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" },
  settingsCard:      { background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:"18px", padding:"24px 28px", marginBottom:"20px" },
  settingsCardTitle: { fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:"16px", color:"#fff", marginBottom:"16px" },
  settingsHint:      { fontFamily:"'Nunito',sans-serif", fontSize:"13px", color:"rgba(255,255,255,0.5)", fontWeight:600, marginBottom:"16px", lineHeight:1.6 },
  photoUploadRow:    { display:"flex", gap:"24px", alignItems:"flex-start", flexWrap:"wrap" },
  settingsPhoto:     { width:"90px", height:"90px", borderRadius:"50%", overflow:"hidden", border:"3px solid rgba(255,255,255,0.25)", background:"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  uploadZone:        { border:"2px dashed rgba(255,255,255,0.25)", borderRadius:"12px", padding:"18px 24px", display:"flex", alignItems:"center", gap:"12px", cursor:"pointer", transition:"border-color 0.2s,background 0.2s", background:"rgba(255,255,255,0.04)" },
  primaryBtn:        { background:"#fff", color:"#1e3a8a", border:"none", padding:"11px 24px", borderRadius:"24px", fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:"13px", cursor:"pointer", transition:"transform 0.2s,box-shadow 0.2s" },
  secondaryBtn:      { background:"transparent", color:"#fff", border:"2px solid rgba(255,255,255,0.35)", padding:"11px 24px", borderRadius:"24px", fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:"13px", cursor:"pointer", transition:"transform 0.2s,box-shadow 0.2s" },
  emptyState:        { textAlign:"center", padding:"60px 0" },
  emptyText:         { color:"rgba(255,255,255,0.5)", fontFamily:"'Nunito',sans-serif", fontSize:"15px", marginTop:"12px" },
  lightboxOverlay:   { position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(10px)" },
  lightboxBox:       { position:"relative", maxWidth:"90vw", maxHeight:"90vh", borderRadius:"20px", overflow:"hidden" },
  lightboxClose:     { position:"absolute", top:"12px", right:"12px", background:"rgba(0,0,0,0.6)", color:"#fff", border:"none", width:"36px", height:"36px", borderRadius:"50%", cursor:"pointer", fontSize:"16px", zIndex:10, display:"flex", alignItems:"center", justifyContent:"center" },
  lightboxMedia:     { maxWidth:"80vw", maxHeight:"85vh", objectFit:"contain", display:"block" },
};
