import { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../socket";
import { getArtist } from "../utils/auth";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const STATUS_LABELS = {
  pending_approval: { label: "New Request",  color: "#854d0e", bg: "#fef9c3" },
  negotiating:      { label: "Negotiating",  color: "#1d4ed8", bg: "#eff6ff" },
  price_agreed:     { label: "Price Agreed", color: "#15803d", bg: "#f0fdf4" },
  payment_pending:  { label: "Awaiting Pay", color: "#7e22ce", bg: "#faf5ff" },
  confirmed:        { label: "Confirmed",    color: "#15803d", bg: "#dcfce7" },
  cancelled:        { label: "Cancelled",    color: "#7f1d1d", bg: "#fee2e2" },
};

const TABS = [
  { id: "bookings", label: "Bookings",  icon: "📋" },
  { id: "profile",  label: "Profile",   icon: "✏️" },
  { id: "posts",    label: "My Works",  icon: "🎨" },
  { id: "reviews",  label: "Reviews",   icon: "⭐" },
  { id: "earnings", label: "Earnings",  icon: "₹"  },
];

/* ─── useIsMobile ─────────────────────────────────────────────────────────── */
function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

/* ─── BOOKINGS TAB ────────────────────────────────────────────────────────── */
function ArtistBookingDashboard({ artistId }) {
  const isMobile = useIsMobile();
  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [showDetail,  setShowDetail]  = useState(false); // mobile: show detail panel
  const [offerPrice,  setOfferPrice]  = useState("");
  const [offerMsg,    setOfferMsg]    = useState("");
  const [sending,     setSending]     = useState(false);
  const [error,       setError]       = useState("");
  const [filter,      setFilter]      = useState("active");

  useEffect(() => {
    socket.emit("join_artist_room", artistId);
    socket.on("new_booking_request", fetchBookings);
    socket.on("user_counter", ({ bookingId, price, message }) => {
      const entry = { from: "user", price, message, timestamp: new Date() };
      setBookings(bs => bs.map(b => b._id === bookingId
        ? { ...b, status: "negotiating", negotiation: [...(b.negotiation||[]), entry] } : b));
      setSelected(s => s?._id === bookingId
        ? { ...s, status: "negotiating", negotiation: [...(s.negotiation||[]), entry] } : s);
    });
    socket.on("price_accepted", ({ bookingId, price }) =>
      setBookings(bs => bs.map(b => b._id === bookingId ? { ...b, status: "price_agreed", agreedPrice: price } : b)));
    socket.on("booking_confirmed", ({ bookingId }) =>
      setBookings(bs => bs.map(b => b._id === bookingId ? { ...b, status: "confirmed" } : b)));
    return () => {
      socket.off("new_booking_request");
      socket.off("user_counter");
      socket.off("price_accepted");
      socket.off("booking_confirmed");
    };
  }, [artistId]);

  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${API}/api/bookings/artist/${artistId}`);
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchBookings(); }, [artistId]);

  const openBooking = (b) => {
    setSelected(b);
    const lastOffer = [...(b.negotiation||[])].reverse().find(m => m.from === "artist");
    setOfferPrice(lastOffer ? lastOffer.price : b.basePrice);
    setOfferMsg(""); setError("");
    if (isMobile) setShowDetail(true);
  };

  const sendOffer = async () => {
    const price = parseInt(offerPrice);
    if (!price || price <= 0) { setError("Enter a valid price."); return; }
    if (!offerMsg.trim())     { setError("Add a message."); return; }
    setSending(true); setError("");
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/offer`, { price, message: offerMsg });
      socket.emit("artist_offer", { bookingId: selected._id, price, message: offerMsg, artistId });
      const entry = { from: "artist", price, message: offerMsg, timestamp: new Date() };
      setSelected(s => ({ ...s, status: "negotiating", negotiation: [...(s.negotiation||[]), entry] }));
      setBookings(bs => bs.map(b => b._id === selected._id
        ? { ...b, status: "negotiating", negotiation: [...(b.negotiation||[]), entry] } : b));
      setOfferMsg("");
    } catch { setError("Failed to send offer."); }
    finally { setSending(false); }
  };

  const acceptUserCounter = async (price) => {
    setSending(true);
    try {
      socket.emit("artist_accepts_counter", { bookingId: selected._id, price });
      await new Promise(r => setTimeout(r, 300));
      setSelected(s => ({ ...s, status: "price_agreed", agreedPrice: price }));
      setBookings(bs => bs.map(b => b._id === selected._id ? { ...b, status: "price_agreed", agreedPrice: price } : b));
    } finally { setSending(false); }
  };

  const activeBookings = bookings.filter(b => !["confirmed","cancelled"].includes(b.status));
  const displayList    = filter === "active" ? activeBookings : bookings;
  const lastUserOffer  = selected ? [...(selected.negotiation||[])].reverse().find(m => m.from === "user")   : null;
  const lastArtistOffer= selected ? [...(selected.negotiation||[])].reverse().find(m => m.from === "artist") : null;

  /* ── Detail panel content (shared between mobile/desktop) ── */
  const DetailPanel = () => !selected ? (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:"#94a3b8", fontFamily:"'Nunito',sans-serif", gap:8 }}>
      <div style={{ fontSize:40 }}>📋</div>
      <div style={{ fontSize:14 }}>Select a booking to review</div>
    </div>
  ) : (
    <div style={{ padding:"18px", display:"flex", flexDirection:"column", gap:14, overflowY:"auto", height:"100%" }}>
      {isMobile && (
        <button onClick={() => setShowDetail(false)} style={{ alignSelf:"flex-start", background:"#eff6ff", border:"none", color:"#1e3a8a", padding:"6px 14px", borderRadius:20, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12, cursor:"pointer" }}>
          ← Back
        </button>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={bs.displayText}>{selected.userName}</div>
          <div style={{ fontSize:12, color:"#94a3b8", fontFamily:"'Nunito',sans-serif" }}>{selected.userEmail}</div>
        </div>
        <span style={{ ...bs.badge, background: STATUS_LABELS[selected.status]?.bg, color: STATUS_LABELS[selected.status]?.color, fontSize:12, padding:"4px 12px" }}>
          {STATUS_LABELS[selected.status]?.label}
        </span>
      </div>

      <div style={bs.infoCard}>
        {[
          ["Event",    selected.eventType],
          ["Date",     selected.eventDate],
          ["Time",     selected.eventTime || "TBD"],
          ["Duration", selected.duration],
          ["Location", selected.location],
          ["Base",     `₹${selected.basePrice?.toLocaleString()}`],
          selected.agreedPrice && ["Agreed", `₹${selected.agreedPrice?.toLocaleString()}`],
        ].filter(Boolean).map(([k,v]) => (
          <div key={k} style={bs.infoRow}>
            <span style={{ color:"#64748b" }}>{k}</span>
            <span style={{ fontWeight:700 }}>{v}</span>
          </div>
        ))}
      </div>

      {(selected.negotiation||[]).length > 0 && (
        <div>
          <div style={bs.sectionLabel}>Price Discussion</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:200, overflowY:"auto" }}>
            {(selected.negotiation||[]).map((msg,i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems: msg.from==="artist" ? "flex-end" : "flex-start", gap:2 }}>
                <span style={{ fontSize:10, color:"#94a3b8", fontFamily:"'Nunito',sans-serif" }}>
                  {msg.from==="artist" ? "You" : selected.userName}
                </span>
                <div style={{ maxWidth:"80%", padding:"9px 13px", borderRadius: msg.from==="artist" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", background: msg.from==="artist" ? "#1e3a8a" : "#f8fafc", border: msg.from==="artist" ? "none" : "1.5px solid #e2e8f0", color: msg.from==="artist" ? "#fff" : "#1e293b", fontSize:13, fontFamily:"'Nunito',sans-serif", lineHeight:1.55 }}>
                  {msg.message && <div style={{ marginBottom: msg.price ? 5 : 0 }}>{msg.message}</div>}
                  {msg.price && <span style={{ display:"inline-flex", background: msg.from==="artist" ? "rgba(255,255,255,0.18)" : "#f0fdf4", color: msg.from==="artist" ? "#fff" : "#15803d", padding:"2px 10px", borderRadius:20, fontSize:13, fontWeight:800, fontFamily:"'Bebas Neue',sans-serif" }}>₹{msg.price?.toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {["pending_approval","negotiating"].includes(selected.status) && lastUserOffer && lastUserOffer !== lastArtistOffer && (
        <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:12, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:800, color:"#15803d", fontFamily:"'Nunito',sans-serif" }}>User offered ₹{lastUserOffer.price?.toLocaleString()}</div>
            <div style={{ fontSize:11, color:"#16a34a", fontFamily:"'Nunito',sans-serif" }}>Accept to lock this price</div>
          </div>
          <button onClick={() => acceptUserCounter(lastUserOffer.price)} disabled={sending} style={bs.acceptBtn}>
            Accept ₹{lastUserOffer.price?.toLocaleString()}
          </button>
        </div>
      )}

      {["pending_approval","negotiating"].includes(selected.status) && (
        <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:"14px 16px" }}>
          <div style={bs.sectionLabel}>Send Your Price</div>
          <label style={bs.miniLabel}>Your price (₹)</label>
          <input type="number" value={offerPrice} onChange={e => setOfferPrice(e.target.value)} style={{ ...bs.input, marginBottom:10 }} placeholder="Enter price" />
          <label style={bs.miniLabel}>Message to client</label>
          <textarea value={offerMsg} onChange={e => setOfferMsg(e.target.value)} placeholder="Explain your offer…" rows={3} style={{ ...bs.input, resize:"none", marginBottom:10 }} />
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
            {[selected.basePrice, Math.round(selected.basePrice*1.2), Math.round(selected.basePrice*1.5)].map(p => (
              <button key={p} onClick={() => setOfferPrice(p)} style={bs.quickChip}>₹{p?.toLocaleString()}</button>
            ))}
          </div>
          {error && <div style={bs.errorBox}>{error}</div>}
          <button onClick={sendOffer} disabled={sending} style={{ ...bs.primaryBtn, width:"100%", opacity: sending ? 0.7 : 1 }}>
            {sending ? "Sending…" : "Send Price Offer →"}
          </button>
        </div>
      )}

      {selected.status === "price_agreed" && (
        <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:12, padding:"14px", textAlign:"center" }}>
          <div style={{ fontSize:24, marginBottom:6 }}>🤝</div>
          <div style={{ fontWeight:800, color:"#15803d", fontFamily:"'Nunito',sans-serif", fontSize:14 }}>Price agreed at ₹{selected.agreedPrice?.toLocaleString()}</div>
          <div style={{ fontSize:12, color:"#16a34a", fontFamily:"'Nunito',sans-serif", marginTop:4 }}>Waiting for client to complete payment.</div>
        </div>
      )}
      {selected.status === "confirmed" && (
        <div style={{ background:"#dcfce7", border:"1px solid #86efac", borderRadius:12, padding:"14px", textAlign:"center" }}>
          <div style={{ fontSize:24, marginBottom:6 }}>🎉</div>
          <div style={{ fontWeight:800, color:"#15803d", fontFamily:"'Nunito',sans-serif", fontSize:14 }}>Booking Confirmed!</div>
          <div style={{ fontSize:12, color:"#16a34a", fontFamily:"'Nunito',sans-serif", marginTop:4 }}>₹{selected.paidAmount?.toLocaleString()} received.</div>
        </div>
      )}
    </div>
  );

  /* ── Mobile: show list OR detail ── */
  if (isMobile) {
    return (
      <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
        {!showDetail ? (
          <>
            <div style={{ padding:"16px 16px 10px", borderBottom:"1px solid #f1f5f9" }}>
              <div style={bs.displayText}>Bookings</div>
              <div style={{ display:"flex", gap:6, marginTop:8 }}>
                {["active","all"].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ ...bs.filterBtn, background: filter===f ? "#1e3a8a" : "transparent", color: filter===f ? "#fff" : "#64748b" }}>
                    {f==="active" ? `Active (${activeBookings.length})` : `All (${bookings.length})`}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto" }}>
              {loading ? <div style={bs.emptyMsg}>Loading…</div>
               : displayList.length===0 ? <div style={bs.emptyMsg}>No bookings yet.</div>
               : displayList.map(b => <BookingCard key={b._id} b={b} selected={selected} onClick={() => openBooking(b)} />)}
            </div>
          </>
        ) : (
          <div style={{ flex:1, overflowY:"auto" }}><DetailPanel /></div>
        )}
      </div>
    );
  }

  /* ── Desktop: side-by-side ── */
  return (
    <div style={{ display:"flex", height:"100%", fontFamily:"'Nunito',sans-serif" }}>
      <div style={{ width:320, borderRight:"1px solid #e2e8f0", display:"flex", flexDirection:"column", background:"#fff", flexShrink:0, overflowY:"auto" }}>
        <div style={{ padding:"22px 18px 14px", borderBottom:"1px solid #f1f5f9" }}>
          <div style={bs.displayText}>Bookings</div>
          <div style={{ display:"flex", gap:6, marginTop:8 }}>
            {["active","all"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ ...bs.filterBtn, background: filter===f ? "#1e3a8a" : "transparent", color: filter===f ? "#fff" : "#64748b" }}>
                {f==="active" ? `Active (${activeBookings.length})` : `All (${bookings.length})`}
              </button>
            ))}
          </div>
        </div>
        {loading ? <div style={bs.emptyMsg}>Loading…</div>
         : displayList.length===0 ? <div style={bs.emptyMsg}>No bookings yet.</div>
         : displayList.map(b => <BookingCard key={b._id} b={b} selected={selected} onClick={() => openBooking(b)} />)}
      </div>
      <div style={{ flex:1, background:"#f8fafc", overflowY:"auto" }}><DetailPanel /></div>
    </div>
  );
}

function BookingCard({ b, selected, onClick }) {
  const st = STATUS_LABELS[b.status] || {};
  const hasNew = b.status==="pending_approval" || (b.status==="negotiating" && [...(b.negotiation||[])].reverse()[0]?.from==="user");
  return (
    <div onClick={onClick} style={{ padding:"14px 18px", borderBottom:"1px solid #f1f5f9", cursor:"pointer", background: selected?._id===b._id ? "#eff6ff" : "#fff", borderLeft: selected?._id===b._id ? "3px solid #1e3a8a" : "3px solid transparent" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:14, color:"#1e293b", fontFamily:"'Nunito',sans-serif" }}>{b.userName}</div>
          <div style={{ fontSize:12, color:"#64748b", fontFamily:"'Nunito',sans-serif" }}>{b.eventType} · {b.eventDate}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
          <span style={{ ...bs.badge, background:st.bg, color:st.color }}>{st.label}</span>
          {hasNew && <span style={{ ...bs.badge, background:"#fee2e2", color:"#991b1b" }}>• New</span>}
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, fontFamily:"'Nunito',sans-serif" }}>
        <span style={{ color:"#64748b" }}>{b.location}</span>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"#1e3a8a" }}>₹{(b.agreedPrice||b.basePrice||0).toLocaleString()}</span>
      </div>
    </div>
  );
}

/* ─── EDIT PROFILE TAB ────────────────────────────────────────────────────── */
function EditProfileTab({ artistId }) {
  const [form,        setForm]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [msg,         setMsg]         = useState({ type:"", text:"" });
  const fileRef = useRef();

  useEffect(() => {
    axios.get(`${API}/api/artists/${artistId}`)
      .then(r => setForm(r.data))
      .catch(() => setMsg({ type:"error", text:"Failed to load profile." }))
      .finally(() => setLoading(false));
  }, [artistId]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const uploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await axios.post(`${API}/api/upload`, fd, { headers: { "Content-Type":"multipart/form-data" } });
      const url = res.data.imageUrl || res.data.url;
      set("profileImage", url);
      setMsg({ type:"ok", text:"Photo uploaded! Click Save to apply." });
    } catch {
      setMsg({ type:"error", text:"Photo upload failed." });
    } finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true); setMsg({ type:"", text:"" });
    try {
      // Try PATCH first (your backend), fallback to PUT
      let res;
      try {
        res = await axios.patch(`${API}/api/artists/${artistId}`, form);
      } catch {
        res = await axios.put(`${API}/api/artists/${artistId}`, form);
      }
      setForm(res.data);
      setMsg({ type:"ok", text:"Profile saved successfully! ✅" });
    } catch {
      setMsg({ type:"error", text:"Failed to save. Please try again." });
    } finally { setSaving(false); }
  };

  if (loading) return <div style={t.centreMsg}>Loading profile…</div>;
  if (!form)   return <div style={t.centreMsg}>Could not load profile.</div>;

  const initials = form.name ? form.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2) : "A";

  return (
    <div style={t.tabBody}>
      <div style={t.sectionTitle}>Edit Profile</div>

      {/* Profile Photo */}
      <div style={t.card}>
        <div style={t.cardTitle}>Profile Photo</div>
        <div style={{ display:"flex", alignItems:"center", gap:20, flexWrap:"wrap" }}>
          <div style={{ width:80, height:80, borderRadius:"50%", background:"#e0e7ff", overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, fontWeight:700, color:"#3b82f6" }}>
            {form.profileImage
              ? <img src={form.profileImage} alt="Profile" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => e.target.style.display="none"} />
              : initials}
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, color:"#64748b", fontFamily:"'Nunito',sans-serif", marginBottom:10 }}>
              JPG, PNG or WebP — recommended 400×400px
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => uploadPhoto(e.target.files[0])} />
            <button onClick={() => fileRef.current.click()} disabled={uploading} style={{ ...t.secondaryBtn, opacity: uploading ? 0.7 : 1 }}>
              {uploading ? "Uploading…" : "📷 Change Photo"}
            </button>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div style={t.card}>
        <div style={t.cardTitle}>Basic Info</div>
        <div style={t.grid2}>
          <Field label="Artist / Stage Name" value={form.name||""} onChange={v => set("name",v)} />
          <Field label="Category" value={form.category||""} onChange={v => set("category",v)} placeholder="e.g. Musician, Photographer" />
          <Field label="City" value={form.city||form.location||""} onChange={v => { set("city",v); set("location",v); }} />
          <Field label="Phone" value={form.phone||""} onChange={v => set("phone",v)} />
        </div>
        <Field label="Bio" value={form.bio||""} onChange={v => set("bio",v)} multiline placeholder="Describe yourself, your style and experience…" />
      </div>

      {/* Pricing */}
      <div style={t.card}>
        <div style={t.cardTitle}>Pricing</div>
        <div style={t.grid2}>
          <Field label="Base Price (₹)" type="number" value={form.price||form.basePrice||""} onChange={v => { set("price",v); set("basePrice",v); }} />
          <Field label="Price Note" value={form.priceNote||""} onChange={v => set("priceNote",v)} placeholder="e.g. per hour, per event" />
        </div>
      </div>

      {/* Social */}
      <div style={t.card}>
        <div style={t.cardTitle}>Social & Portfolio</div>
        <div style={t.grid2}>
          <Field label="Instagram" value={form.instagram||""} onChange={v => set("instagram",v)} placeholder="@handle" />
          <Field label="YouTube / Portfolio URL" value={form.portfolioUrl||""} onChange={v => set("portfolioUrl",v)} placeholder="https://…" />
        </div>
      </div>

      {/* Tags */}
      <div style={t.card}>
        <div style={t.cardTitle}>Skills / Tags</div>
        <Field
          label="Tags (comma-separated)"
          value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags||""}
          onChange={v => set("tags", v.split(",").map(x => x.trim()).filter(Boolean))}
          placeholder="e.g. Jazz, Live Events, Weddings"
        />
      </div>

      {msg.text && (
        <div style={{ ...t.msgBox, background: msg.type==="ok" ? "#f0fdf4" : "#fee2e2", color: msg.type==="ok" ? "#15803d" : "#7f1d1d", borderColor: msg.type==="ok" ? "#86efac" : "#fca5a5" }}>
          {msg.text}
        </div>
      )}
      <button onClick={save} disabled={saving} style={{ ...t.primaryBtn, opacity: saving ? 0.7 : 1 }}>
        {saving ? "Saving…" : "Save Changes →"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type="text", multiline=false, placeholder="" }) {
  const shared = { value, onChange: e => onChange(e.target.value), placeholder, style: t.input };
  return (
    <div style={{ marginBottom:14, gridColumn: multiline ? "1 / -1" : undefined }}>
      <label style={t.miniLabel}>{label}</label>
      {multiline
        ? <textarea {...shared} rows={4} style={{ ...t.input, resize:"vertical" }} />
        : <input {...shared} type={type} />}
    </div>
  );
}

/* ─── MY WORKS / POSTS TAB ────────────────────────────────────────────────── */
function PostsTab({ artistId }) {
  const [posts,      setPosts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(false);
  const [deleting,   setDeleting]   = useState(null);
  const [msg,        setMsg]        = useState({ type:"", text:"" });
  const [title,      setTitle]      = useState("");
  const [type,       setType]       = useState("image");
  const fileRef = useRef();

  const loadPosts = async () => {
    try {
      const res = await axios.get(`${API}/api/posts`);
      const all = Array.isArray(res.data) ? res.data : [];
      setPosts(all.filter(p => p.artistId === artistId));
    } catch { setMsg({ type:"error", text:"Could not load works." }); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadPosts(); }, [artistId]);

  const upload = async (file) => {
    if (!file) return;
    setUploading(true); setMsg({ type:"", text:"" });
    try {
      const fd = new FormData();
      fd.append("image", file);
      const uploadRes = await axios.post(`${API}/api/upload`, fd, { headers: { "Content-Type":"multipart/form-data" } });
      const mediaUrl = uploadRes.data.imageUrl || uploadRes.data.url;
      await axios.post(`${API}/api/posts`, {
        artistId,
        media:  mediaUrl,
        type:   file.type.startsWith("video") ? "video" : "image",
        title:  title.trim() || "Untitled",
      });
      setTitle("");
      setMsg({ type:"ok", text:"Work uploaded! ✅" });
      loadPosts();
    } catch {
      setMsg({ type:"error", text:"Upload failed. Please try again." });
    } finally { setUploading(false); }
  };

  const deletePost = async (postId) => {
    if (!window.confirm("Delete this work?")) return;
    setDeleting(postId);
    try {
      await axios.delete(`${API}/api/posts/${postId}`);
      setPosts(ps => ps.filter(p => p._id !== postId));
      setMsg({ type:"ok", text:"Deleted." });
    } catch {
      setMsg({ type:"error", text:"Delete failed." });
    } finally { setDeleting(null); }
  };

  return (
    <div style={t.tabBody}>
      <div style={t.sectionTitle}>My Works</div>

      {/* Upload card */}
      <div style={t.card}>
        <div style={t.cardTitle}>Upload New Work</div>
        <div style={{ display:"flex", gap:12, marginBottom:12, flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:180 }}>
            <label style={t.miniLabel}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Wedding Performance 2024" style={t.input} />
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display:"none" }} onChange={e => upload(e.target.files[0])} />
        <button onClick={() => fileRef.current.click()} disabled={uploading} style={{ ...t.primaryBtn, opacity: uploading ? 0.7 : 1 }}>
          {uploading ? "Uploading… ⏳" : "📁 Choose Photo or Video"}
        </button>
        {msg.text && (
          <div style={{ ...t.msgBox, marginTop:12, background: msg.type==="ok" ? "#f0fdf4" : "#fee2e2", color: msg.type==="ok" ? "#15803d" : "#7f1d1d", borderColor: msg.type==="ok" ? "#86efac" : "#fca5a5" }}>
            {msg.text}
          </div>
        )}
      </div>

      {/* Works grid */}
      {loading ? (
        <div style={t.centreMsg}>Loading…</div>
      ) : posts.length === 0 ? (
        <div style={{ ...t.card, textAlign:"center", padding:"40px 20px", color:"#94a3b8", fontFamily:"'Nunito',sans-serif" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🎭</div>
          <div style={{ fontWeight:700 }}>No works uploaded yet</div>
          <div style={{ fontSize:12, marginTop:4 }}>Upload your first photo or video above</div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }}>
          {posts.map(post => (
            <div key={post._id} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, overflow:"hidden", position:"relative" }}>
              <div style={{ width:"100%", aspectRatio:"1/1", background:"#f1f5f9", overflow:"hidden" }}>
                {post.type==="video"
                  ? <video src={post.media} style={{ width:"100%", height:"100%", objectFit:"cover" }} muted />
                  : <img src={post.media} alt={post.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />}
              </div>
              {post.type==="video" && (
                <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.6)", color:"#fff", borderRadius:4, padding:"2px 6px", fontSize:10, fontWeight:700 }}>▶ VIDEO</div>
              )}
              <div style={{ padding:"8px 10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#1e293b", fontFamily:"'Nunito',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
                  {post.title || "Untitled"}
                </span>
                <button onClick={() => deletePost(post._id)} disabled={deleting===post._id} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:16, padding:"0 0 0 6px", flexShrink:0 }}>
                  {deleting===post._id ? "…" : "🗑"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── REVIEWS TAB ─────────────────────────────────────────────────────────── */
function ReviewsTab({ artistId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    axios.get(`${API}/api/artists/${artistId}/reviews`)
      .then(r => setReviews(Array.isArray(r.data) ? r.data : []))
      .catch(() => setError("Could not load reviews."))
      .finally(() => setLoading(false));
  }, [artistId]);

  const avg = reviews.length
    ? (reviews.reduce((s,r) => s+(r.rating||0), 0)/reviews.length).toFixed(1)
    : null;

  if (loading) return <div style={t.centreMsg}>Loading reviews…</div>;

  return (
    <div style={t.tabBody}>
      <div style={t.sectionTitle}>Reviews</div>
      {error && <div style={{ ...t.msgBox, background:"#fee2e2", color:"#7f1d1d", borderColor:"#fca5a5" }}>{error}</div>}

      {reviews.length > 0 && (
        <div style={{ ...t.card, display:"flex", gap:24, alignItems:"center", flexWrap:"wrap", padding:"18px 22px" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, color:"#1e3a8a", lineHeight:1 }}>{avg}</div>
            <div style={t.miniLabel}>Overall</div>
          </div>
          <div style={{ flex:1, minWidth:160 }}>
            {[5,4,3,2,1].map(star => {
              const count = reviews.filter(r => Math.round(r.rating)===star).length;
              const pct   = Math.round((count/reviews.length)*100);
              return (
                <div key={star} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ fontSize:11, color:"#64748b", fontFamily:"'Nunito',sans-serif", width:14 }}>{star}</span>
                  <div style={{ flex:1, height:6, borderRadius:4, background:"#e2e8f0", overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:"#1e3a8a", borderRadius:4 }} />
                  </div>
                  <span style={{ fontSize:11, color:"#94a3b8", fontFamily:"'Nunito',sans-serif", width:24 }}>{count}</span>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"#1e3a8a", lineHeight:1 }}>{reviews.length}</div>
            <div style={t.miniLabel}>Total</div>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div style={{ ...t.card, textAlign:"center", padding:"40px 20px", color:"#94a3b8", fontFamily:"'Nunito',sans-serif" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>⭐</div>
          <div style={{ fontWeight:700 }}>No reviews yet</div>
        </div>
      ) : reviews.map((r,i) => (
        <div key={r._id||i} style={t.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8, flexWrap:"wrap", gap:6 }}>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:"#1e293b", fontFamily:"'Nunito',sans-serif" }}>{r.userName||"Anonymous"}</div>
              <div style={{ fontSize:11, color:"#94a3b8", fontFamily:"'Nunito',sans-serif" }}>
                {r.eventType} {r.eventDate ? `· ${new Date(r.eventDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}` : ""}
              </div>
            </div>
            <div style={{ display:"flex", gap:2 }}>
              {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize:14, color: s<=Math.round(r.rating) ? "#f59e0b" : "#e2e8f0" }}>★</span>)}
            </div>
          </div>
          {r.review && <div style={{ fontSize:13, color:"#475569", fontFamily:"'Nunito',sans-serif", lineHeight:1.6 }}>{r.review}</div>}
          {r.comment && <div style={{ fontSize:13, color:"#475569", fontFamily:"'Nunito',sans-serif", lineHeight:1.6 }}>{r.comment}</div>}
        </div>
      ))}
    </div>
  );
}

/* ─── EARNINGS TAB ────────────────────────────────────────────────────────── */
function EarningsTab({ artistId }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    // Try earnings endpoint, fallback to withdrawals summary
    axios.get(`${API}/api/artists/${artistId}/earnings`)
      .then(r => setData(r.data))
      .catch(() =>
        axios.get(`${API}/api/withdrawals/summary/${artistId}`)
          .then(r => setData(r.data))
          .catch(() => setError("Could not load earnings."))
      )
      .finally(() => setLoading(false));
  }, [artistId]);

  if (loading) return <div style={t.centreMsg}>Loading earnings…</div>;
  if (error)   return <div style={t.tabBody}><div style={{ ...t.msgBox, background:"#fee2e2", color:"#7f1d1d", borderColor:"#fca5a5" }}>{error}</div></div>;

  const bookings      = Array.isArray(data) ? data : (data?.bookings||[]);
  const totalEarned   = data?.totalEarned   ?? bookings.reduce((s,b) => s+(b.paidAmount||0), 0);
  const totalBookings = data?.totalBookings  ?? bookings.length;
  const pendingPayout = data?.pendingPayout  ?? data?.available ?? 0;
  const thisMonth     = data?.thisMonth      ?? bookings
    .filter(b => new Date(b.updatedAt).getMonth()===new Date().getMonth())
    .reduce((s,b) => s+(b.paidAmount||0), 0);

  const stats = [
    { label:"Total Earned",   value:`₹${totalEarned.toLocaleString()}`,  color:"#1e3a8a" },
    { label:"This Month",     value:`₹${thisMonth.toLocaleString()}`,     color:"#15803d" },
    { label:"Available",      value:`₹${pendingPayout.toLocaleString()}`, color:"#7e22ce" },
    { label:"Completed Gigs", value:totalBookings,                         color:"#0e7490" },
  ];

  return (
    <div style={t.tabBody}>
      <div style={t.sectionTitle}>Earnings</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:4 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...t.card, padding:"18px 16px", textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, color:s.color, letterSpacing:1 }}>{s.value}</div>
            <div style={t.miniLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {bookings.length > 0 && (
        <div style={t.card}>
          <div style={t.cardTitle}>Completed Bookings</div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"'Nunito',sans-serif", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"2px solid #e2e8f0" }}>
                  {["Client","Event","Date","Amount","Status"].map(h => (
                    <th key={h} style={{ textAlign:"left", padding:"8px 10px", fontSize:10, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:0.8 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b,i) => (
                  <tr key={b._id||i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"10px", fontWeight:700, color:"#1e293b" }}>{b.userName}</td>
                    <td style={{ padding:"10px", color:"#475569" }}>{b.eventType}</td>
                    <td style={{ padding:"10px", color:"#475569" }}>{b.eventDate}</td>
                    <td style={{ padding:"10px", fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"#1e3a8a" }}>₹{(b.paidAmount||b.agreedPrice||0).toLocaleString()}</td>
                    <td style={{ padding:"10px" }}>
                      <span style={{ background:"#dcfce7", color:"#15803d", padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>Confirmed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <div style={{ ...t.card, textAlign:"center", padding:"40px 20px", color:"#94a3b8", fontFamily:"'Nunito',sans-serif" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>₹</div>
          <div style={{ fontWeight:700 }}>No completed bookings yet</div>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN DASHBOARD ──────────────────────────────────────────────────────── */
export default function ArtistDashboard() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeTab, setActiveTab] = useState(() => {
    const param = new URLSearchParams(window.location.search).get("tab");
    return TABS.some(t => t.id === param) ? param : "bookings";
  });

  const [artist, setArtist] = useState(null);
  const loggedArtist = getArtist();
  const artistId     = loggedArtist?._id;
  const artistName   = loggedArtist?.name || "Artist";

  useEffect(() => {
    if (!artistId) return;
    axios.get(`${API}/api/artists/${artistId}`)
      .then(r => setArtist(r.data))
      .catch(() => {});
  }, [artistId]);

  const switchTab = (id) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  const avatarLetter = (artist?.name || artistName)[0]?.toUpperCase() || "A";

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Nunito',sans-serif", background:"#f8fafc", overflow:"hidden", position:"relative" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── Mobile overlay ── */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:40 }} />
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        width:220, background:"#1e3a8a", display:"flex", flexDirection:"column",
        padding:"24px 14px 16px", flexShrink:0,
        // Mobile: slide in/out
        ...(isMobile ? {
          position:"fixed", top:0, left:0, bottom:0, zIndex:50,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition:"transform 0.25s ease",
          boxShadow: sidebarOpen ? "4px 0 20px rgba(0,0,0,0.3)" : "none",
        } : {}),
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28, paddingBottom:20, borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ width:42, height:42, borderRadius:"50%", background:"#3b82f6", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:22, flexShrink:0 }}>
            {avatarLetter}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, color:"#fff", letterSpacing:0.5, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {artist?.name || artistName}
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", fontFamily:"'Nunito',sans-serif", marginTop:1 }}>
              {artist?.category || "Artist"}
            </div>
          </div>
        </div>

        <nav style={{ display:"flex", flexDirection:"column", gap:4, flex:1 }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => switchTab(tab.id)} style={{
              display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
              borderRadius:10, border:"none", cursor:"pointer",
              fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:13, textAlign:"left",
              background: activeTab===tab.id ? "rgba(255,255,255,0.12)" : "transparent",
              color:      activeTab===tab.id ? "#fff" : "rgba(255,255,255,0.6)",
              borderLeft: activeTab===tab.id ? "3px solid #93c5fd" : "3px solid transparent",
            }}>
              <span style={{ fontSize:16 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div style={{ paddingTop:20, textAlign:"center" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontFamily:"'Nunito',sans-serif", letterSpacing:0.5 }}>ARTSPIRE</div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Mobile top bar */}
        {isMobile && (
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"#1e3a8a", flexShrink:0 }}>
            <button onClick={() => setSidebarOpen(true)} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", width:36, height:36, borderRadius:8, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              ☰
            </button>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#fff", letterSpacing:1 }}>
              {TABS.find(t => t.id===activeTab)?.icon} {TABS.find(t => t.id===activeTab)?.label}
            </div>
            <div style={{ marginLeft:"auto", width:32, height:32, borderRadius:"50%", background:"#3b82f6", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:16 }}>
              {avatarLetter}
            </div>
          </div>
        )}

        {/* Desktop mobile-tab-bar (bottom quick nav on mobile) */}
        {isMobile && (
          <div style={{ display:"flex", borderTop:"1px solid #e2e8f0", background:"#fff", order:1, flexShrink:0 }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => switchTab(tab.id)} style={{
                flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2,
                padding:"8px 2px", border:"none", background:"transparent", cursor:"pointer",
                fontFamily:"'Nunito',sans-serif", whiteSpace:"nowrap",
                borderTop: activeTab===tab.id ? "2px solid #1e3a8a" : "2px solid transparent",
                color:     activeTab===tab.id ? "#1e3a8a" : "#94a3b8",
                fontWeight:activeTab===tab.id ? 800 : 600,
              }}>
                <span style={{ fontSize:16 }}>{tab.icon}</span>
                <span style={{ fontSize:9 }}>{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        <main style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
          {!artistId ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"60%", color:"#94a3b8", fontFamily:"'Nunito',sans-serif", fontSize:14, flexDirection:"column", gap:12 }}>
              <div style={{ fontSize:40 }}>🔒</div>
              <div>Artist not found. Please log in again.</div>
            </div>
          ) : (
            <>
              {activeTab==="bookings" && <ArtistBookingDashboard artistId={artistId} />}
              {activeTab==="profile"  && <EditProfileTab         artistId={artistId} />}
              {activeTab==="posts"    && <PostsTab               artistId={artistId} />}
              {activeTab==="reviews"  && <ReviewsTab             artistId={artistId} />}
              {activeTab==="earnings" && <EarningsTab            artistId={artistId} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ─── Shared style tokens ─────────────────────────────────────────────────── */
const bs = {
  displayText: { fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#1e3a8a", letterSpacing:1 },
  filterBtn:   { padding:"5px 12px", borderRadius:16, border:"1.5px solid #e2e8f0", fontSize:12, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:"pointer" },
  badge:       { padding:"3px 9px", borderRadius:20, fontSize:11, fontWeight:700, fontFamily:"'Nunito',sans-serif" },
  sectionLabel:{ fontSize:10, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:8, fontFamily:"'Nunito',sans-serif" },
  miniLabel:   { fontSize:10, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:0.8, display:"block", marginBottom:4, fontFamily:"'Nunito',sans-serif" },
  input:       { padding:"9px 11px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#fff", color:"#1e293b", fontSize:13, fontWeight:600, fontFamily:"'Nunito',sans-serif", outline:"none", width:"100%", boxSizing:"border-box" },
  infoCard:    { background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"14px 16px" },
  infoRow:     { display:"flex", justifyContent:"space-between", fontSize:13, color:"#1e293b", marginBottom:7, fontFamily:"'Nunito',sans-serif" },
  errorBox:    { background:"#fee2e2", color:"#7f1d1d", borderRadius:10, padding:"8px 12px", fontSize:12, fontWeight:600, marginBottom:8 },
  primaryBtn:  { background:"#1e3a8a", color:"#fff", border:"none", padding:"11px 18px", borderRadius:20, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:13, cursor:"pointer" },
  acceptBtn:   { background:"#16a34a", color:"#fff", border:"none", padding:"8px 16px", borderRadius:18, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12, cursor:"pointer" },
  quickChip:   { background:"#eff6ff", color:"#1d4ed8", border:"none", padding:"5px 12px", borderRadius:16, fontSize:12, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:"pointer" },
  emptyMsg:    { padding:"24px", color:"#94a3b8", fontSize:13, fontFamily:"'Nunito',sans-serif" },
};

const t = {
  centreMsg:    { display:"flex", alignItems:"center", justifyContent:"center", height:"60%", color:"#94a3b8", fontFamily:"'Nunito',sans-serif", fontSize:14 },
  tabBody:      { padding:"20px 20px 60px", maxWidth:800, display:"flex", flexDirection:"column", gap:16 },
  sectionTitle: { fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:"#1e3a8a", letterSpacing:1, marginBottom:4 },
  card:         { background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"16px 18px" },
  cardTitle:    { fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:14, fontFamily:"'Nunito',sans-serif" },
  grid2:        { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"0 16px" },
  miniLabel:    { fontSize:10, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:0.8, display:"block", marginBottom:4, fontFamily:"'Nunito',sans-serif" },
  input:        { padding:"9px 11px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:13, fontWeight:600, fontFamily:"'Nunito',sans-serif", outline:"none", width:"100%", boxSizing:"border-box" },
  msgBox:       { border:"1px solid", borderRadius:12, padding:"10px 14px", fontSize:13, fontWeight:700, fontFamily:"'Nunito',sans-serif" },
  primaryBtn:   { background:"#1e3a8a", color:"#fff", border:"none", padding:"11px 20px", borderRadius:20, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:13, cursor:"pointer", alignSelf:"flex-start" },
  secondaryBtn: { background:"#eff6ff", color:"#1d4ed8", border:"1.5px solid #bfdbfe", padding:"9px 18px", borderRadius:20, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:13, cursor:"pointer" },
};