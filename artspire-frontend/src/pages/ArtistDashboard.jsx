import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

// ── Dot-grid SVG ──────────────────────────────────────────────────────────────
const DotGrid = () => (
  <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.12, pointerEvents:"none" }} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="dots2" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="1.5" cy="1.5" r="1.5" fill="#1e3a8a" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dots2)" />
  </svg>
);

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  const colors = { success:"#dcfce7|#14532d|#86efac", error:"#fee2e2|#7f1d1d|#fca5a5", info:"#dbeafe|#1e3a5f|#93c5fd" };
  const [bg, color, border] = (colors[type] || colors.info).split("|");
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:9999, background:bg, color, border:`1px solid ${border}`, borderRadius:14, padding:"14px 20px", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:14, boxShadow:"0 8px 32px rgba(0,0,0,0.15)", display:"flex", alignItems:"center", gap:12, maxWidth:360, animation:"toastIn 0.3s ease" }}>
      <span style={{ flex:1 }}>{msg}</span>
      <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color, opacity:0.6 }}>✕</button>
    </div>
  );
}

export default function ArtistDashboard() {
  const navigate = useNavigate();
  const fileRef  = useRef(null);
  const coverRef = useRef(null);

  // ── Auth ──
  const [artist, setArtist]   = useState(null);
  const [tab, setTab]         = useState("overview");
  const [toast, setToast]     = useState({ msg:"", type:"info" });

  // ── Profile edit ──
  const [editing, setEditing]         = useState(false);
  const [profileForm, setProfileForm] = useState({});
  const [uploading, setUploading]     = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  // ── Posts ──
  const [posts, setPosts]         = useState([]);
  const [postMedia, setPostMedia] = useState(null);
  const [postTitle, setPostTitle] = useState("");
  const [postType, setPostType]   = useState("image");
  const [postLoading, setPostLoading] = useState(false);

  // ── Messages ──
  const [messages, setMessages]   = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Online users ──
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // ── Stats ──
  const [stats, setStats] = useState({ posts:0, messages:0, profileViews: Math.floor(Math.random()*200)+50, rating:5 });

  const showToast = (msg, type="info") => setToast({ msg, type });

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem("artist");
    if (!raw) { navigate("/artist-login"); return; }
    let a;
    try { a = JSON.parse(raw); } catch { navigate("/artist-login"); return; }
    setArtist(a);
    setProfileForm({ name: a.name||"", bio: a.bio||"", city: a.city||"", instagram: a.instagram||"", category: a.category||"", experience: a.experience||"" });

    // Socket
    socket.emit("join_room", a._id);
    socket.on("receive_message", (data) => {
      if (data.receiverId === a._id) {
        setMessages(prev => [data, ...prev]);
        setUnreadCount(c => c + 1);
        showToast(`New message from someone 💬`, "info");
      }
    });
    socket.on("user_online", (id) => setOnlineUsers(prev => new Set([...prev, id])));
    socket.on("user_offline", (id) => setOnlineUsers(prev => { const n = new Set(prev); n.delete(id); return n; }));

    fetchPosts(a._id);
    fetchMessages(a._id);

    return () => { socket.off("receive_message"); socket.off("user_online"); socket.off("user_offline"); };
  }, []);

  const fetchPosts = async (id) => {
    try {
      const res = await axios.get(`${API}/api/posts`);
      const mine = res.data.filter(p => p.artistId === id);
      setPosts(mine);
      setStats(s => ({ ...s, posts: mine.length }));
    } catch {}
  };

  const fetchMessages = async (id) => {
    try {
      const res = await axios.get(`${API}/api/users`);
      const users = res.data.filter(u => u._id !== id);
      setMessages(users.slice(0, 5));
      setStats(s => ({ ...s, messages: users.length }));
    } catch {}
  };

  // ── Profile photo upload ─────────────────────────────────────────────────
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await axios.post(`${API}/api/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = res.data.url || res.data.imageUrl || res.data.path;
      await axios.patch(`${API}/api/users/${artist._id}`, { profileImage: url });
      const updated = { ...artist, profileImage: url };
      setArtist(updated);
      localStorage.setItem("artist", JSON.stringify(updated));
      showToast("Profile photo updated! ✅", "success");
    } catch { showToast("Upload failed. Try again.", "error"); }
    setUploading(false);
  };

  // ── Cover photo upload ───────────────────────────────────────────────────
  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await axios.post(`${API}/api/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = res.data.url || res.data.imageUrl || res.data.path;
      await axios.patch(`${API}/api/users/${artist._id}`, { coverImage: url });
      const updated = { ...artist, coverImage: url };
      setArtist(updated);
      localStorage.setItem("artist", JSON.stringify(updated));
      showToast("Cover photo updated! ✅", "success");
    } catch { showToast("Upload failed.", "error"); }
    setCoverUploading(false);
  };

  // ── Save profile ─────────────────────────────────────────────────────────
  const saveProfile = async () => {
    try {
      await axios.patch(`${API}/api/users/${artist._id}`, profileForm);
      const updated = { ...artist, ...profileForm };
      setArtist(updated);
      localStorage.setItem("artist", JSON.stringify(updated));
      setEditing(false);
      showToast("Profile saved! ✅", "success");
    } catch { showToast("Save failed. Try again.", "error"); }
  };

  // ── Upload post ──────────────────────────────────────────────────────────
  const handlePostUpload = async () => {
    if (!postMedia) { showToast("Please select a file", "error"); return; }
    setPostLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", postMedia);
      const upRes = await axios.post(`${API}/api/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = upRes.data.url || upRes.data.imageUrl || upRes.data.path;
      await axios.post(`${API}/api/posts`, { artistId: artist._id, media: url, type: postType, title: postTitle });
      showToast("Post uploaded! 🎨", "success");
      setPostMedia(null);
      setPostTitle("");
      fetchPosts(artist._id);
    } catch { showToast("Upload failed.", "error"); }
    setPostLoading(false);
  };

  // ── Delete post ──────────────────────────────────────────────────────────
  const deletePost = async (postId) => {
    try {
      await axios.delete(`${API}/api/posts/${postId}`);
      setPosts(prev => prev.filter(p => p._id !== postId));
      showToast("Post deleted", "info");
    } catch { showToast("Delete failed", "error"); }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem("artist");
    localStorage.removeItem("token");
    navigate("/artist-login");
  };

  if (!artist) return (
    <div style={{ minHeight:"100vh", background:"#f0f4ff", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"#1e3a8a", letterSpacing:3 }}>LOADING...</div>
    </div>
  );

  const getInitials = (n) => n ? n.split(" ").map(x=>x[0]).join("").toUpperCase().slice(0,2) : "A";

  const TABS = [
    { id:"overview",  label:"📊 Overview" },
    { id:"profile",   label:"👤 Profile" },
    { id:"portfolio", label:"🎨 Portfolio" },
    { id:"messages",  label:`💬 Messages${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
    { id:"upload",    label:"➕ Upload" },
  ];

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes toastIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .dash-tab:hover  { background: rgba(30,58,138,0.08) !important; }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(30,58,138,0.15) !important; }
        .post-card:hover { transform: scale(1.02); }
        .action-btn:hover { transform: translateY(-2px); }
        input:focus, textarea:focus, select:focus { border-color: #1e3a8a !important; outline: none; }
      `}</style>

      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg:"", type:"info" })} />
      <input ref={fileRef}  type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoUpload} />
      <input ref={coverRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleCoverUpload} />

      {/* ── HEADER ── */}
      <div style={s.header}>
        <DotGrid />
        <div style={s.headerInner}>
          {/* Cover */}
          <div style={s.coverWrap}>
            {artist.coverImage
              ? <img src={artist.coverImage} alt="" style={s.coverImg} />
              : <div style={s.coverPlaceholder} />
            }
            <button style={s.coverEditBtn} onClick={() => coverRef.current.click()}>
              {coverUploading ? "Uploading..." : "📷 Change Cover"}
            </button>
          </div>

          {/* Profile row */}
          <div style={s.profileRow}>
            <div style={s.avatarWrap}>
              {artist.profileImage
                ? <img src={artist.profileImage} alt="" style={s.avatar} />
                : <div style={s.avatarInitials}>{getInitials(artist.name)}</div>
              }
              <button style={s.avatarEditBtn} onClick={() => fileRef.current.click()} title="Change photo">
                {uploading ? "..." : "📷"}
              </button>
            </div>
            <div style={s.profileInfo}>
              <div style={s.profileName}>{artist.name || "Artist"}</div>
              <div style={s.profileMeta}>
                {artist.category && <span style={s.metaPill}>🎨 {artist.category}</span>}
                {artist.city && <span style={s.metaPill}>📍 {artist.city}</span>}
                <span style={{ ...s.metaPill, background:"#dcfce7", color:"#14532d" }}>⭐ {artist.rating || 5}.0</span>
                <span style={{ ...s.metaPill, background:"#e0e7ff", color:"#3730a3" }}>🎯 {stats.posts} Posts</span>
              </div>
            </div>
            <div style={s.headerActions}>
              <button style={s.viewProfileBtn} onClick={() => navigate(`/artist-profile/${artist._id}`)}>
                👁 View Profile
              </button>
              <button style={s.logoutBtn} onClick={logout}>Logout</button>
            </div>
          </div>

          {/* Tabs */}
          <div style={s.tabsRow}>
            {TABS.map(t => (
              <button key={t.id} className="dash-tab" onClick={() => setTab(t.id)}
                style={{ ...s.tab, ...(tab === t.id ? s.tabActive : {}) }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={s.content}>

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" && (
          <div style={{ animation:"fadeUp 0.4s ease both" }}>
            <div style={s.sectionTitle}>Dashboard Overview</div>

            {/* Stats */}
            <div style={s.statsGrid}>
              {[
                { icon:"🎨", label:"Total Posts",     value: stats.posts,        color:"#e0e7ff", tcolor:"#3730a3" },
                { icon:"👁",  label:"Profile Views",   value: stats.profileViews, color:"#dcfce7", tcolor:"#14532d" },
                { icon:"💬", label:"Conversations",   value: stats.messages,     color:"#fef3c7", tcolor:"#92400e" },
                { icon:"⭐", label:"Average Rating",  value: `${artist.rating||5}.0`, color:"#ffe4e6", tcolor:"#9f1239" },
              ].map((st, i) => (
                <div key={i} className="stat-card" style={{ ...s.statCard, background: st.color, transition:"all 0.2s" }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>{st.icon}</div>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:40, color: st.tcolor, letterSpacing:1 }}>{st.value}</div>
                  <div style={{ fontFamily:"'Nunito',sans-serif", fontSize:13, color: st.tcolor, fontWeight:700, opacity:0.8 }}>{st.label}</div>
                </div>
              ))}
            </div>

            {/* Recent posts preview */}
            <div style={s.sectionTitle}>Recent Posts</div>
            {posts.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontSize:48, marginBottom:12 }}>🎭</div>
                <div>No posts yet. Upload your first work!</div>
                <button style={{ ...s.primaryBtn, marginTop:16 }} onClick={() => setTab("upload")}>+ Upload Now</button>
              </div>
            ) : (
              <div style={s.postsGrid}>
                {posts.slice(0,6).map((p, i) => (
                  <div key={p._id} className="post-card" style={{ ...s.postThumb, transition:"transform 0.2s" }}>
                    <img src={p.media} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                    {p.title && <div style={s.postLabel}>{p.title}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <div style={{ animation:"fadeUp 0.4s ease both" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div style={s.sectionTitle}>Edit Profile</div>
              {!editing
                ? <button style={s.primaryBtn} onClick={() => setEditing(true)}>✏️ Edit</button>
                : <div style={{ display:"flex", gap:10 }}>
                    <button style={s.primaryBtn} onClick={saveProfile}>💾 Save</button>
                    <button style={s.secondaryBtn} onClick={() => setEditing(false)}>Cancel</button>
                  </div>
              }
            </div>

            <div style={s.profileCard}>
              {[
                { key:"name",       label:"Full Name",   type:"text",     placeholder:"Your name" },
                { key:"category",   label:"Category",    type:"select",   options:["Singer","Dancer","Musician","Painter","Photographer","Actor","Comedian","Other"] },
                { key:"city",       label:"City",        type:"text",     placeholder:"Your city" },
                { key:"instagram",  label:"Instagram",   type:"text",     placeholder:"username (no @)" },
                { key:"experience", label:"Experience",  type:"text",     placeholder:"e.g. 5 years" },
              ].map(f => (
                <div key={f.key} style={s.fieldGroup}>
                  <label style={s.fieldLabel}>{f.label}</label>
                  {f.type === "select" ? (
                    <select
                      value={profileForm[f.key] || ""}
                      onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))}
                      disabled={!editing}
                      style={s.input}
                    >
                      <option value="">Select category</option>
                      {f.options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      value={profileForm[f.key] || ""}
                      onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))}
                      disabled={!editing}
                      placeholder={f.placeholder}
                      style={{ ...s.input, background: editing ? "#fff" : "#f8fafc" }}
                    />
                  )}
                </div>
              ))}
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Bio</label>
                <textarea
                  value={profileForm.bio || ""}
                  onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))}
                  disabled={!editing}
                  placeholder="Tell clients about yourself..."
                  rows={4}
                  style={{ ...s.input, resize:"vertical", height:"auto", background: editing ? "#fff" : "#f8fafc" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── PORTFOLIO TAB ── */}
        {tab === "portfolio" && (
          <div style={{ animation:"fadeUp 0.4s ease both" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div style={s.sectionTitle}>My Portfolio ({posts.length} works)</div>
              <button style={s.primaryBtn} onClick={() => setTab("upload")}>+ Add Work</button>
            </div>
            {posts.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontSize:48, marginBottom:12 }}>🎨</div>
                <div>No portfolio works yet</div>
                <button style={{ ...s.primaryBtn, marginTop:16 }} onClick={() => setTab("upload")}>Upload First Work</button>
              </div>
            ) : (
              <div style={s.portfolioGrid}>
                {posts.map((p, i) => (
                  <div key={p._id} style={s.portfolioCard}>
                    <div style={s.portfolioThumb}>
                      {p.type === "video"
                        ? <video src={p.media} style={{ width:"100%", height:"100%", objectFit:"cover" }} muted />
                        : <img src={p.media} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      }
                      <div style={s.thumbBadge}>{p.type === "video" ? "▶ Video" : "🖼 Image"}</div>
                    </div>
                    {p.title && <div style={s.portfolioTitle}>{p.title}</div>}
                    <div style={s.portfolioMeta}>
                      <span style={{ fontSize:12, color:"#94a3b8" }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                      <button style={s.deleteBtn} onClick={() => deletePost(p._id)}>🗑 Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MESSAGES TAB ── */}
        {tab === "messages" && (
          <div style={{ animation:"fadeUp 0.4s ease both" }}>
            <div style={s.sectionTitle}>Messages & Conversations</div>
            {messages.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontSize:48, marginBottom:12 }}>💬</div>
                <div>No conversations yet</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {messages.map((u, i) => (
                  <div key={u._id || i} style={s.messageRow} onClick={() => navigate(`/chat/${u._id}`)}>
                    <div style={s.msgAvatar}>
                      {u.profileImage
                        ? <img src={u.profileImage} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} />
                        : <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#1e3a8a" }}>{getInitials(u.name)}</span>
                      }
                      <span style={{ ...s.onlineDot, background: onlineUsers.has(u._id) ? "#22c55e" : "#94a3b8" }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Nunito',sans-serif", color:"#1e293b" }}>{u.name}</div>
                      <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{u.role} · {u.city || "Unknown city"}</div>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                      <span style={{ fontSize:12, color: onlineUsers.has(u._id) ? "#22c55e" : "#94a3b8", fontWeight:700 }}>
                        {onlineUsers.has(u._id) ? "● Online" : "● Offline"}
                      </span>
                      <button style={s.chatBtn}>Chat →</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── UPLOAD TAB ── */}
        {tab === "upload" && (
          <div style={{ animation:"fadeUp 0.4s ease both" }}>
            <div style={s.sectionTitle}>Upload New Work</div>
            <div style={s.uploadCard}>
              {/* File drop zone */}
              <div
                style={s.dropZone}
                onClick={() => document.getElementById("post-file-input").click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setPostMedia(f); setPostType(f.type.startsWith("video") ? "video" : "image"); } }}
              >
                <input
                  id="post-file-input"
                  type="file"
                  accept="image/*,video/*"
                  style={{ display:"none" }}
                  onChange={e => { const f = e.target.files[0]; if (f) { setPostMedia(f); setPostType(f.type.startsWith("video") ? "video" : "image"); } }}
                />
                {postMedia ? (
                  <div style={{ textAlign:"center" }}>
                    {postType === "image"
                      ? <img src={URL.createObjectURL(postMedia)} alt="" style={{ maxHeight:200, maxWidth:"100%", borderRadius:12, objectFit:"contain" }} />
                      : <video src={URL.createObjectURL(postMedia)} style={{ maxHeight:200, maxWidth:"100%", borderRadius:12 }} controls />
                    }
                    <div style={{ marginTop:10, fontSize:13, color:"#64748b", fontWeight:600 }}>{postMedia.name}</div>
                  </div>
                ) : (
                  <div style={{ textAlign:"center", color:"#94a3b8" }}>
                    <div style={{ fontSize:52, marginBottom:12 }}>📁</div>
                    <div style={{ fontSize:16, fontWeight:800, color:"#1e293b", marginBottom:6 }}>Drop your file here</div>
                    <div style={{ fontSize:13 }}>or click to browse — Images & Videos supported</div>
                  </div>
                )}
              </div>

              {/* Title input */}
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Title / Caption</label>
                <input
                  value={postTitle}
                  onChange={e => setPostTitle(e.target.value)}
                  placeholder="Add a title for your work..."
                  style={s.input}
                />
              </div>

              {/* Type toggle */}
              <div style={s.fieldGroup}>
                <label style={s.fieldLabel}>Type</label>
                <div style={{ display:"flex", gap:10 }}>
                  {["image","video"].map(t => (
                    <button key={t} type="button" onClick={() => setPostType(t)}
                      style={{ ...s.typeBtn, ...(postType === t ? s.typeBtnActive : {}) }}>
                      {t === "image" ? "🖼 Image" : "▶ Video"}
                    </button>
                  ))}
                </div>
              </div>

              <button
                style={{ ...s.primaryBtn, width:"100%", justifyContent:"center", padding:"16px", fontSize:16, opacity: postLoading ? 0.7 : 1 }}
                onClick={handlePostUpload}
                disabled={postLoading}
              >
                {postLoading ? "Uploading... ⏳" : "🚀 Publish Work"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page:        { fontFamily:"'Nunito',sans-serif", minHeight:"100vh", background:"#f0f4ff", overflowX:"hidden" },

  header:      { position:"relative", background:"#f5f0e8", overflow:"hidden" },
  headerInner: { position:"relative", zIndex:2 },

  coverWrap:        { height:180, position:"relative", overflow:"hidden", background:"linear-gradient(135deg,#1e3a8a,#3b82f6)" },
  coverImg:         { width:"100%", height:"100%", objectFit:"cover" },
  coverPlaceholder: { width:"100%", height:"100%", background:"linear-gradient(135deg,#1e3a8a 0%,#3b82f6 50%,#1d4ed8 100%)" },
  coverEditBtn:     { position:"absolute", bottom:12, right:16, background:"rgba(0,0,0,0.6)", color:"#fff", border:"none", padding:"7px 16px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif", backdropFilter:"blur(8px)" },

  profileRow:   { display:"flex", alignItems:"flex-end", gap:20, padding:"0 32px 0", marginTop:-40, flexWrap:"wrap" },
  avatarWrap:   { position:"relative", flexShrink:0 },
  avatar:       { width:96, height:96, borderRadius:"50%", border:"4px solid #fff", objectFit:"cover", display:"block", boxShadow:"0 4px 16px rgba(0,0,0,0.15)" },
  avatarInitials: { width:96, height:96, borderRadius:"50%", border:"4px solid #fff", background:"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"#1e3a8a", boxShadow:"0 4px 16px rgba(0,0,0,0.12)" },
  avatarEditBtn:  { position:"absolute", bottom:4, right:4, width:28, height:28, borderRadius:"50%", border:"2px solid #fff", background:"#1e3a8a", color:"#fff", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },

  profileInfo:  { flex:1, minWidth:200, paddingBottom:8 },
  profileName:  { fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#1e293b", letterSpacing:1 },
  profileMeta:  { display:"flex", gap:8, flexWrap:"wrap", marginTop:6 },
  metaPill:     { background:"#e0e7ff", color:"#3730a3", fontSize:12, fontWeight:700, padding:"4px 12px", borderRadius:20, fontFamily:"'Nunito',sans-serif" },

  headerActions: { display:"flex", gap:10, paddingBottom:8, flexWrap:"wrap" },
  viewProfileBtn: { background:"#1e3a8a", color:"#fff", border:"none", padding:"9px 20px", borderRadius:22, fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer" },
  logoutBtn:    { background:"#dc2626", color:"#fff", border:"none", padding:"9px 20px", borderRadius:22, fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer" },

  tabsRow:      { display:"flex", gap:4, padding:"16px 32px 0", borderBottom:"1px solid rgba(30,58,138,0.1)", flexWrap:"wrap" },
  tab:          { padding:"10px 18px", borderRadius:"10px 10px 0 0", border:"none", background:"transparent", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer", color:"#64748b", transition:"background 0.2s" },
  tabActive:    { background:"#1e3a8a", color:"#fff" },

  content:      { maxWidth:1100, margin:"0 auto", padding:"32px 24px" },
  sectionTitle: { fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:"#1e3a8a", letterSpacing:1, marginBottom:20 },

  statsGrid:    { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16, marginBottom:32 },
  statCard:     { borderRadius:16, padding:"24px 20px", textAlign:"center", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" },

  postsGrid:    { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 },
  postThumb:    { aspectRatio:"3/4", borderRadius:12, overflow:"hidden", position:"relative", background:"#e2e8f0", cursor:"pointer" },
  postLabel:    { position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:11, fontWeight:700, padding:"6px 10px", fontFamily:"'Nunito',sans-serif" },

  profileCard:  { background:"#fff", borderRadius:20, padding:28, boxShadow:"0 4px 24px rgba(0,0,0,0.07)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 },
  fieldGroup:   { display:"flex", flexDirection:"column", gap:6, gridColumn:"span 1" },
  fieldLabel:   { fontSize:11, fontWeight:800, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase" },
  input:        { padding:"12px 14px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:14, fontWeight:600, fontFamily:"'Nunito',sans-serif", outline:"none", width:"100%", boxSizing:"border-box", transition:"border-color 0.2s" },

  portfolioGrid:  { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16 },
  portfolioCard:  { background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.07)" },
  portfolioThumb: { height:180, position:"relative", overflow:"hidden", background:"#e2e8f0" },
  thumbBadge:     { position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, fontFamily:"'Nunito',sans-serif" },
  portfolioTitle: { padding:"10px 14px 4px", fontWeight:800, fontSize:14, color:"#1e293b", fontFamily:"'Nunito',sans-serif" },
  portfolioMeta:  { padding:"4px 14px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" },
  deleteBtn:      { background:"#fee2e2", color:"#dc2626", border:"none", padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif" },

  messageRow:   { background:"#fff", borderRadius:16, padding:"16px 20px", display:"flex", alignItems:"center", gap:16, cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", transition:"box-shadow 0.2s" },
  msgAvatar:    { width:48, height:48, borderRadius:"50%", background:"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative" },
  onlineDot:    { position:"absolute", bottom:2, right:2, width:12, height:12, borderRadius:"50%", border:"2px solid #fff" },
  chatBtn:      { background:"#1e3a8a", color:"#fff", border:"none", padding:"6px 16px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif" },

  uploadCard:   { background:"#fff", borderRadius:20, padding:28, boxShadow:"0 4px 24px rgba(0,0,0,0.07)", display:"flex", flexDirection:"column", gap:20, maxWidth:600 },
  dropZone:     { border:"2px dashed #c7d2fe", borderRadius:16, padding:"32px 24px", cursor:"pointer", transition:"border-color 0.2s", minHeight:180, display:"flex", alignItems:"center", justifyContent:"center" },

  typeBtn:      { flex:1, padding:"10px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#f8fafc", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif", color:"#64748b", transition:"all 0.2s" },
  typeBtnActive:{ background:"#e0e7ff", borderColor:"#1e3a8a", color:"#1e3a8a" },

  primaryBtn:   { background:"#1e3a8a", color:"#fff", border:"none", padding:"10px 24px", borderRadius:22, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", gap:8, transition:"opacity 0.2s" },
  secondaryBtn: { background:"transparent", color:"#1e3a8a", border:"2px solid #1e3a8a", padding:"10px 24px", borderRadius:22, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:"pointer" },

  empty:        { textAlign:"center", padding:"60px 20px", color:"#94a3b8", fontFamily:"'Nunito',sans-serif", fontSize:16 },
};