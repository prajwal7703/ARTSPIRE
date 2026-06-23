// artspire-frontend/src/pages/ArtistDashboard.jsx

import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import socket from "../socket";
import { getArtist } from "../utils/auth";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const TABS = [
  { id: "bookings", label: "Bookings",     icon: "📋" },
  { id: "chat",     label: "Messages",     icon: "💬" },
  { id: "profile",  label: "Edit Profile", icon: "✏️" },
  { id: "reviews",  label: "Reviews",      icon: "⭐" },
  { id: "earnings", label: "Earnings",     icon: "₹"  },
];

const STATUS_META = {
  pending_approval: { label: "New Request",  bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
  negotiating:      { label: "Negotiating",  bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  price_agreed:     { label: "Price Agreed", bg: "#f0fdf4", color: "#15803d", dot: "#16a34a" },
  payment_pending:  { label: "Awaiting Pay", bg: "#faf5ff", color: "#7e22ce", dot: "#a855f7" },
  confirmed:        { label: "Confirmed",    bg: "#dcfce7", color: "#15803d", dot: "#16a34a" },
  cancelled:        { label: "Cancelled",    bg: "#fee2e2", color: "#7f1d1d", dot: "#ef4444" },
};

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mobile;
}

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const st  = (obj) => ({ fontFamily: "'Nunito',sans-serif", ...obj });

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
function StatusBadge({ status, size = "sm" }) {
  const m = STATUS_META[status] || { label: status, bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" };
  return (
    <span style={st({ display:"inline-flex", alignItems:"center", gap:5, background:m.bg, color:m.color, padding: size==="lg"?"5px 14px":"3px 10px", borderRadius:20, fontSize:size==="lg"?13:11, fontWeight:700 })}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:m.dot, flexShrink:0 }} />
      {m.label}
    </span>
  );
}

// ─── AMOUNT DISPLAY ───────────────────────────────────────────────────────────
function AmountDisplay({ booking }) {
  const val   = booking.paidAmount || booking.agreedPrice || booking.basePrice;
  const label = booking.paidAmount ? "Received" : booking.agreedPrice ? "Agreed" : "Base";
  const color = booking.paidAmount ? "#15803d"  : booking.agreedPrice ? "#1e3a8a" : "#64748b";
  return (
    <div style={st({ textAlign:"right" })}>
      <div style={st({ fontSize:9, fontWeight:700, color, textTransform:"uppercase", letterSpacing:1 })}>{label}</div>
      <div style={st({ fontSize:18, fontWeight:800, color, fontFamily:"'Bebas Neue',sans-serif" })}>₹{fmt(val)}</div>
    </div>
  );
}

// ─── BOOKING CARD ─────────────────────────────────────────────────────────────
function BookingCard({ b, isSelected, onClick }) {
  const hasNew = b.status==="pending_approval" || (b.status==="negotiating" && [...(b.negotiation||[])].reverse()[0]?.from==="user");
  return (
    <div onClick={onClick} style={{ padding:"14px 16px", borderBottom:"1px solid #f1f5f9", cursor:"pointer", background:isSelected?"#eff6ff":"#fff", borderLeft:`3px solid ${isSelected?"#1e3a8a":"transparent"}`, transition:"background 0.12s" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={st({ fontWeight:800, fontSize:14, color:"#1e293b", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" })}>{b.userName}</div>
          <div style={st({ fontSize:12, color:"#64748b", marginTop:1 })}>{b.eventType} · {b.eventDate}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, marginLeft:8 }}>
          <StatusBadge status={b.status} />
          {hasNew && <span style={st({ fontSize:10, fontWeight:800, background:"#fee2e2", color:"#991b1b", padding:"2px 8px", borderRadius:20 })}>● New</span>}
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={st({ fontSize:11, color:"#94a3b8" })}>📍 {b.location}</span>
        <AmountDisplay booking={b} />
      </div>
    </div>
  );
}

// ─── NEG THREAD ───────────────────────────────────────────────────────────────
function NegThread({ negotiation, userName }) {
  if (!negotiation?.length) return null;
  return (
    <div style={{ marginBottom:14 }}>
      <div style={st({ fontSize:11, fontWeight:800, color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 })}>Price Discussion</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:200, overflowY:"auto" }}>
        {negotiation.map((msg,i) => {
          const isA = msg.from==="artist";
          return (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:isA?"flex-end":"flex-start", gap:2 }}>
              <span style={st({ fontSize:10, color:"#94a3b8" })}>{isA?"You":userName}</span>
              <div style={{ maxWidth:"80%", padding:"9px 13px", borderRadius:isA?"16px 3px 16px 16px":"3px 16px 16px 16px", background:isA?"#1e3a8a":"#f8fafc", border:isA?"none":"1px solid #e2e8f0", color:isA?"#fff":"#1e293b", fontSize:13, fontFamily:"'Nunito',sans-serif", lineHeight:1.55 }}>
                {msg.message && <div style={{ marginBottom:msg.price?5:0 }}>{msg.message}</div>}
                {msg.price && <span style={{ display:"inline-block", background:isA?"rgba(255,255,255,0.18)":"#f0fdf4", color:isA?"#fff":"#15803d", padding:"2px 10px", borderRadius:20, fontSize:13, fontWeight:800, fontFamily:"'Bebas Neue',sans-serif" }}>₹{fmt(msg.price)}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── LIVE STATUS PANEL ────────────────────────────────────────────────────────
function LiveStatusPanel({ booking, onAccept, offerPrice, setOfferPrice, offerMsg, setOfferMsg, onSendOffer, sending, error }) {
  const { status, agreedPrice, paidAmount, basePrice, userName, negotiation } = booking;
  const lastUserOffer   = [...(negotiation||[])].reverse().find(m=>m.from==="user");
  const lastArtistOffer = [...(negotiation||[])].reverse().find(m=>m.from==="artist");
  const canAccept = ["pending_approval","negotiating"].includes(status) && lastUserOffer && lastUserOffer!==lastArtistOffer;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:"14px 16px" }}>
        <div style={st({ fontSize:11, fontWeight:800, color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 })}>Booking Progress</div>
        {[
          { key:"pending_approval", label:"Request received",    icon:"📥" },
          { key:"negotiating",      label:"Negotiating price",   icon:"💬" },
          { key:"price_agreed",     label:"Price agreed",        icon:"🤝" },
          { key:"payment_pending",  label:"Payment in progress", icon:"💳" },
          { key:"confirmed",        label:"Booking confirmed",   icon:"✅" },
        ].map((step,idx,arr) => {
          const order = ["pending_approval","negotiating","price_agreed","payment_pending","confirmed"];
          const ci = order.indexOf(status), si = order.indexOf(step.key);
          const done = si<ci || (status!=="cancelled" && step.key===status);
          const active = step.key===status && status!=="cancelled";
          const cancelled = status==="cancelled";
          return (
            <div key={step.key} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, background:cancelled?"#fee2e2":done?(active?"#1e3a8a":"#dcfce7"):"#f1f5f9", border:active?"2px solid #1e3a8a":"2px solid transparent" }}>
                  {cancelled?"✕":done?(active?step.icon:"✓"):"○"}
                </div>
                {idx<arr.length-1 && <div style={{ width:2, height:18, background:si<ci&&!cancelled?"#16a34a":"#e2e8f0", margin:"2px 0" }} />}
              </div>
              <div style={{ paddingTop:4 }}>
                <div style={st({ fontSize:12, fontWeight:active?800:600, lineHeight:1.6, color:active?"#1e293b":done&&!cancelled?"#16a34a":"#94a3b8" })}>
                  {step.label}
                  {active&&agreedPrice&&step.key==="price_agreed" && <span style={st({ marginLeft:6, fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:"#15803d" })}>₹{fmt(agreedPrice)}</span>}
                  {active&&paidAmount&&step.key==="confirmed"     && <span style={st({ marginLeft:6, fontFamily:"'Bebas Neue',sans-serif", fontSize:14, color:"#15803d" })}>₹{fmt(paidAmount)} received</span>}
                </div>
              </div>
            </div>
          );
        })}
        {status==="cancelled" && (
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:"#fee2e2", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>✕</div>
            <div style={st({ fontSize:12, fontWeight:800, color:"#7f1d1d" })}>Booking cancelled</div>
          </div>
        )}
      </div>

      {canAccept && (
        <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:12, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={st({ fontSize:13, fontWeight:800, color:"#15803d" })}>{userName} offered ₹{fmt(lastUserOffer.price)}</div>
            <div style={st({ fontSize:11, color:"#16a34a", marginTop:2 })}>Accept to lock this price</div>
          </div>
          <button onClick={()=>onAccept(lastUserOffer.price)} disabled={sending} style={st({ background:"#16a34a", color:"#fff", border:"none", padding:"8px 16px", borderRadius:8, fontWeight:800, fontSize:13, cursor:"pointer", opacity:sending?0.7:1 })}>
            Accept ₹{fmt(lastUserOffer.price)}
          </button>
        </div>
      )}

      {["pending_approval","negotiating"].includes(status) && (
        <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:"14px 16px" }}>
          <div style={st({ fontSize:11, fontWeight:800, color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 })}>Send Your Price</div>
          <label style={st({ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 })}>Your price (₹)</label>
          <input type="number" value={offerPrice} onChange={e=>setOfferPrice(e.target.value)} placeholder="Enter price"
            style={st({ width:"100%", border:"1px solid #cbd5e1", borderRadius:8, padding:"8px 12px", fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:10 })} />
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
            {[basePrice, Math.round(basePrice*1.2), Math.round(basePrice*1.5)].map(p=>(
              <button key={p} onClick={()=>setOfferPrice(p)} style={st({ background:"#fff", border:"1px solid #e2e8f0", padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer" })}>₹{fmt(p)}</button>
            ))}
          </div>
          <label style={st({ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 })}>Message to client</label>
          <textarea value={offerMsg} onChange={e=>setOfferMsg(e.target.value)} placeholder="Explain your offer…" rows={3}
            style={st({ width:"100%", border:"1px solid #cbd5e1", borderRadius:8, padding:"8px 12px", fontSize:13, outline:"none", resize:"none", boxSizing:"border-box", marginBottom:10 })} />
          {error && <div style={st({ background:"#fee2e2", border:"1px solid #fca5a5", color:"#991b1b", padding:10, borderRadius:8, fontSize:12, marginBottom:10 })}>{error}</div>}
          <button onClick={onSendOffer} disabled={sending} style={st({ background:"#1e3a8a", color:"#fff", border:"none", padding:"10px 16px", borderRadius:8, fontWeight:800, fontSize:13, cursor:"pointer", width:"100%", opacity:sending?0.7:1 })}>
            {sending?"Sending…":"Send Price Offer →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── BOOKINGS TAB ─────────────────────────────────────────────────────────────
function BookingsTab({ artistId }) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMsg,   setOfferMsg]   = useState("");
  const [sending,    setSending]    = useState(false);
  const [error,      setError]      = useState("");
  const [filter,     setFilter]     = useState("pending_approval");

  useEffect(() => {
    if (!artistId) return;
    socket.emit("join_artist_room", artistId);
    socket.on("new_booking_request", fetchBookings);
    socket.on("user_counter", ({ bookingId, price, message }) => {
      const entry = { from:"user", price, message, timestamp:new Date() };
      upd(bookingId, b=>({ ...b, status:"negotiating", negotiation:[...(b.negotiation||[]),entry] }));
    });
    socket.on("price_accepted",    ({ bookingId, price })       => upd(bookingId, b=>({ ...b, status:"price_agreed", agreedPrice:price })));
    socket.on("booking_confirmed", ({ bookingId, paidAmount })  => upd(bookingId, b=>({ ...b, status:"confirmed",    paidAmount })));
    return () => {
      socket.off("new_booking_request");
      socket.off("user_counter");
      socket.off("price_accepted");
      socket.off("booking_confirmed");
    };
  }, [artistId]);

  const upd = (id,fn) => {
    setBookings(bs=>bs.map(b=>b._id===id?fn(b):b));
    setSelected(s=>s?._id===id?fn(s):s);
  };

  const fetchBookings = async () => {
    if (!artistId) { setLoading(false); return; }
    try {
      const r = await axios.get(`${API}/api/bookings/artist/${artistId}`);
      setBookings(Array.isArray(r.data)?r.data:[]);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(()=>{ fetchBookings(); },[artistId]);

  const open = (b) => {
    setSelected(b);
    const la = [...(b.negotiation||[])].reverse().find(m=>m.from==="artist");
    setOfferPrice(la?la.price:b.basePrice);
    setOfferMsg(""); setError("");
    if (isMobile) setShowDetail(true);
  };

  const sendOffer = async () => {
    const price = parseInt(offerPrice);
    if (!price||price<=0) { setError("Enter a valid price."); return; }
    if (!offerMsg.trim())  { setError("Add a message."); return; }
    setSending(true); setError("");
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/offer`, { price, message:offerMsg });
      const entry = { from:"artist", price, message:offerMsg, timestamp:new Date() };
      upd(selected._id, b=>({ ...b, status:"negotiating", negotiation:[...(b.negotiation||[]),entry] }));
      setOfferMsg("");
    } catch { setError("Failed to send offer."); } finally { setSending(false); }
  };

  const acceptCounter = async (price) => {
    setSending(true);
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/artist-accept`, { price });
      upd(selected._id, b=>({ ...b, status:"price_agreed", agreedPrice:price }));
    } catch { setError("Failed to accept price."); } finally { setSending(false); }
  };

  const pending = bookings.filter(b=>b.status==="pending_approval");
  const ongoing = bookings.filter(b=>["negotiating","price_agreed","payment_pending"].includes(b.status));
  const past    = bookings.filter(b=>["confirmed","cancelled"].includes(b.status));
  const list    = filter==="pending_approval"?pending:filter==="ongoing"?ongoing:filter==="past"?past:bookings;

  const filters = [
    { id:"pending_approval", label:`Requests (${pending.length})` },
    { id:"ongoing",          label:`Ongoing (${ongoing.length})` },
    { id:"past",             label:`Past (${past.length})` },
    { id:"all",              label:`All (${bookings.length})` },
  ];

  const Detail = () => !selected ? (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:"#94a3b8", gap:10, padding:40 }}>
      <div style={{ fontSize:40 }}>📋</div>
      <div style={st({ fontSize:14 })}>Select a booking to review</div>
    </div>
  ) : (
    <div style={{ padding:20, display:"flex", flexDirection:"column", gap:14, overflowY:"auto", height:"100%" }}>
      {isMobile && <button onClick={()=>setShowDetail(false)} style={st({ alignSelf:"flex-start", background:"#eff6ff", border:"none", color:"#1e3a8a", padding:"6px 14px", borderRadius:20, fontWeight:800, fontSize:12, cursor:"pointer" })}>← Back</button>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={st({ fontSize:20, fontWeight:800, color:"#1e293b" })}>{selected.userName}</div>
          <div style={st({ fontSize:12, color:"#94a3b8", marginTop:2 })}>{selected.userEmail}</div>
        </div>
        <StatusBadge status={selected.status} size="lg" />
      </div>
      <button onClick={()=>navigate(`/chat/${selected.userId}`)} style={st({ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1e40af", padding:"10px 14px", borderRadius:10, width:"100%", fontWeight:700, cursor:"pointer", fontSize:13, textAlign:"center" })}>
        💬 Chat with {selected.userName}
      </button>
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:14 }}>
        {[
          ["Event",         selected.eventType],
          ["Date",          selected.eventDate],
          ["Time",          selected.eventTime||"TBD"],
          ["Duration",      selected.duration],
          ["Location",      selected.location],
          ["Base price",   `₹${fmt(selected.basePrice)}`],
          selected.agreedPrice && ["Agreed price", `₹${fmt(selected.agreedPrice)}`],
          selected.paidAmount  && ["Amount received", `₹${fmt(selected.paidAmount)}`],
        ].filter(Boolean).map(([k,v])=>(
          <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid #f8fafc", fontSize:13, fontFamily:"'Nunito',sans-serif" }}>
            <span style={{ color:"#64748b" }}>{k}</span>
            <span style={{ fontWeight:700, color:"#1e293b" }}>{v}</span>
          </div>
        ))}
      </div>
      <NegThread negotiation={selected.negotiation} userName={selected.userName} />
      <LiveStatusPanel booking={selected} onAccept={acceptCounter} offerPrice={offerPrice} setOfferPrice={setOfferPrice} offerMsg={offerMsg} setOfferMsg={setOfferMsg} onSendOffer={sendOffer} sending={sending} error={error} />
    </div>
  );

  return (
    <div style={{ display:"flex", height:"100%" }}>
      {(!isMobile||!showDetail) && (
        <div style={{ width:isMobile?"100%":320, borderRight:"1px solid #e2e8f0", display:"flex", flexDirection:"column", background:"#fff", flexShrink:0, overflowY:"auto" }}>
          <div style={{ padding:"18px 16px 12px", borderBottom:"1px solid #f1f5f9", position:"sticky", top:0, background:"#fff", zIndex:5 }}>
            <div style={st({ fontSize:18, fontWeight:800, color:"#1e293b", marginBottom:10 })}>Bookings</div>
            <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:2 }}>
              {filters.map(f=>(
                <button key={f.id} onClick={()=>setFilter(f.id)} style={st({ border:"none", padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", background:filter===f.id?"#1e3a8a":"transparent", color:filter===f.id?"#fff":"#64748b" })}>{f.label}</button>
              ))}
            </div>
          </div>
          {loading ? <div style={st({ padding:40, textAlign:"center", color:"#94a3b8", fontSize:14 })}>Loading…</div>
          : list.length===0 ? <div style={st({ padding:40, textAlign:"center", color:"#94a3b8", fontSize:14 })}>No bookings here.</div>
          : list.map(b=><BookingCard key={b._id} b={b} isSelected={selected?._id===b._id} onClick={()=>open(b)} />)}
        </div>
      )}
      {(!isMobile||showDetail) && (
        <div style={{ flex:1, background:"#f8fafc", overflowY:"auto" }}><Detail /></div>
      )}
    </div>
  );
}

// ─── GROUPS PANEL ─────────────────────────────────────────────────────────────
function GroupsPanel({ artistId }) {
  const [groups,        setGroups]        = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [text,          setText]          = useState("");
  const [loading,       setLoading]       = useState(true);
  const [showCreate,    setShowCreate]    = useState(false);
  const [newName,       setNewName]       = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberId,   setAddMemberId]   = useState("");
  const [addMemberErr,  setAddMemberErr]  = useState("");
  const [addingMember,  setAddingMember]  = useState(false);
  const isMobile  = useIsMobile();
  const [showChat, setShowChat] = useState(false);
  const bottomRef = useRef(null);

  // ── data fetching ──────────────────────────────────────────────────────────
  const fetchGroups = async () => {
    try {
      const r = await axios.get(`${API}/api/groups/${artistId}`);
      setGroups(Array.isArray(r.data) ? r.data : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { if (artistId) fetchGroups(); }, [artistId]);

  // ── socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    // New group message
    socket.on("group_message", (msg) => {
      if (selected && msg.groupId === selected._id) {
        setMessages(prev => [...prev, msg]);
      }
    });

    // ✅ FIX: Real-time group member added
    socket.on("group_member_added", ({ groupId, updatedGroup }) => {
      setGroups(prev => prev.map(g => g._id === groupId ? updatedGroup : g));
      if (selected?._id === groupId) {
        setSelected(updatedGroup);
      }
    });

    return () => {
      socket.off("group_message");
      socket.off("group_member_added");
    };
  }, [selected]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── actions ────────────────────────────────────────────────────────────────
  const createGroup = async () => {
    if (!newName.trim()) return;
    try {
      const r = await axios.post(`${API}/api/groups/create`, { name: newName.trim(), createdBy: artistId });
      setGroups(prev => [r.data, ...prev]);
      setNewName(""); setShowCreate(false);
    } catch (e) { console.error(e); }
  };

  const openGroup = async (g) => {
    setSelected(g);
    setShowAddMember(false);
    setAddMemberId("");
    setAddMemberErr("");
    if (isMobile) setShowChat(true);
    socket.emit("join_group", g._id);
    try {
      const r = await axios.get(`${API}/api/groups/${g._id}/messages`);
      setMessages(Array.isArray(r.data) ? r.data : []);
    } catch (e) { console.error(e); setMessages([]); }
  };

  const sendGroupMessage = async () => {
    if (!text.trim() || !selected) return;
    const msgText = text.trim();
    setText("");
    try {
      await axios.post(`${API}/api/groups/${selected._id}/message`, { senderId: artistId, message: msgText });
    } catch (e) { console.error(e); setText(msgText); }
  };

  // ✅ FIX: Add member with real-time socket emit + error handling
  const addMember = async () => {
    if (!addMemberId.trim() || !selected) return;
    setAddingMember(true);
    setAddMemberErr("");
    try {
      const r = await axios.post(`${API}/api/groups/${selected._id}/members`, { userId: addMemberId.trim() });
      const updatedGroup = r.data;

      // Update local state immediately
      setSelected(updatedGroup);
      setGroups(prev => prev.map(g => g._id === updatedGroup._id ? updatedGroup : g));

      // ✅ Broadcast to all members in real-time via socket
      socket.emit("group_member_added", {
        groupId: selected._id,
        updatedGroup,
      });

      setAddMemberId("");
      setShowAddMember(false);
    } catch (e) {
      console.error(e);
      setAddMemberErr(e?.response?.data?.message || "Could not add member. Check the user ID.");
    } finally {
      setAddingMember(false);
    }
  };

  // ── sub-components ─────────────────────────────────────────────────────────
  const GroupList = () => (
    <div style={{ width: isMobile ? "100%" : 300, borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", background: "#fff", flexShrink: 0 }}>
      <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={st({ fontSize: 18, fontWeight: 800, color: "#1e293b" })}>Groups</div>
        <button onClick={() => setShowCreate(s => !s)} style={st({ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer" })}>+ New</button>
      </div>
      {showCreate && (
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 6 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Group name"
            onKeyDown={e => { if (e.key === "Enter") createGroup(); }}
            style={st({ flex: 1, border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 13, outline: "none" })} />
          <button onClick={createGroup} style={st({ background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer" })}>Create</button>
        </div>
      )}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading
          ? <div style={st({ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 })}>Loading…</div>
          : groups.length === 0
            ? <div style={st({ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 })}>No groups yet.</div>
            : groups.map(g => (
              <div key={g._id} onClick={() => openGroup(g)} style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: selected?._id === g._id ? "#eff6ff" : "#fff", borderLeft: `3px solid ${selected?._id === g._id ? "#1e3a8a" : "transparent"}` }}>
                <div style={st({ fontWeight: 800, fontSize: 14, color: "#1e293b" })}>{g.name}</div>
                <div style={st({ fontSize: 12, color: "#94a3b8", marginTop: 2 })}>{g.members?.length || 0} members</div>
              </div>
            ))
        }
      </div>
    </div>
  );

  const GroupChatWindow = () => !selected ? (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", gap: 10 }}>
      <div style={{ fontSize: 40 }}>👥</div>
      <div style={st({ fontSize: 14 })}>Select a group</div>
    </div>
  ) : (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc" }}>

      {/* ── Group header ── */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
        {isMobile && (
          <button onClick={() => setShowChat(false)} style={st({ background: "none", border: "none", cursor: "pointer", color: "#1e3a8a", fontWeight: 800, fontSize: 13 })}>← Back</button>
        )}
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1e3a8a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: 18 }}>
          {selected.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <div style={st({ fontWeight: 800, fontSize: 14, color: "#1e293b" })}>{selected.name}</div>
          <div style={st({ fontSize: 11, color: "#94a3b8" })}>{selected.members?.length || 0} members</div>
        </div>

        {/* ✅ Add Member toggle button */}
        <button
          onClick={() => { setShowAddMember(s => !s); setAddMemberErr(""); setAddMemberId(""); }}
          style={st({ marginLeft: "auto", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer" })}
        >
          + Add Member
        </button>
      </div>

      {/* ✅ FIX: Add Member expandable panel with error feedback */}
      {showAddMember && (
        <div style={{ padding: "10px 16px 12px", borderBottom: "1px solid #f1f5f9", background: "#fff" }}>
          <div style={st({ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 })}>Add Member by User ID</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={addMemberId}
              onChange={e => { setAddMemberId(e.target.value); setAddMemberErr(""); }}
              placeholder="Paste user ID here…"
              onKeyDown={e => { if (e.key === "Enter") addMember(); }}
              style={st({ flex: 1, border: `1px solid ${addMemberErr ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none" })}
            />
            <button
              onClick={addMember}
              disabled={addingMember || !addMemberId.trim()}
              style={st({ background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: addingMember || !addMemberId.trim() ? "not-allowed" : "pointer", opacity: addingMember || !addMemberId.trim() ? 0.6 : 1, whiteSpace: "nowrap" })}
            >
              {addingMember ? "Adding…" : "Add"}
            </button>
          </div>
          {addMemberErr && (
            <div style={st({ fontSize: 11, color: "#dc2626", marginTop: 5, fontWeight: 600 })}>⚠ {addMemberErr}</div>
          )}
        </div>
      )}

      {/* ── Messages list ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0
          ? <div style={st({ textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 40 })}>No messages yet. Say hello!</div>
          : messages.map((msg, i) => {
            const isMe = msg.senderId === artistId;
            return (
              <div key={msg._id || i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                {!isMe && <span style={st({ fontSize: 10, color: "#94a3b8", marginBottom: 2 })}>{msg.senderName || msg.senderId}</span>}
                <div style={{ maxWidth: "72%", padding: "9px 13px", borderRadius: isMe ? "16px 3px 16px 16px" : "3px 16px 16px 16px", background: isMe ? "#1e3a8a" : "#fff", border: isMe ? "none" : "1px solid #e2e8f0", color: isMe ? "#fff" : "#1e293b", fontSize: 13, fontFamily: "'Nunito',sans-serif", lineHeight: 1.55 }}>
                  {msg.message}
                </div>
              </div>
            );
          })
        }
        <div ref={bottomRef} />
      </div>

      {/* ── Message input bar ── */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", background: "#fff", display: "flex", gap: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendGroupMessage(); } }}
          placeholder="Type a message…"
          style={st({ flex: 1, border: "1px solid #e2e8f0", borderRadius: 24, padding: "9px 16px", fontSize: 13, outline: "none", background: "#f8fafc" })}
        />
        <button
          onClick={sendGroupMessage}
          disabled={!text.trim()}
          style={st({ background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 24, padding: "9px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer", opacity: !text.trim() ? 0.5 : 1 })}
        >
          Send
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {(!isMobile || !showChat) && <GroupList />}
      {(!isMobile || showChat)  && <GroupChatWindow />}
    </div>
  );
}

// ─── CHAT TAB ─────────────────────────────────────────────────────────────────
function ChatTab({ artistId }) {
  const [conversations, setConversations] = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [text,          setText]          = useState("");
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const isMobile = useIsMobile();
  const [showChat, setShowChat] = useState(false);
  const [view,     setView]     = useState("direct"); // "direct" | "groups"
  const bottomRef = useRef(null);

  // ✅ FIX: Normalize conversation to always have a displayable name
  const normalizeConv = (c) => ({
    ...c,
    userName: c.userName || c.name || c.userEmail?.split("@")[0] || "Unknown User",
  });

  const fetchConversations = async () => {
    try {
      const r = await axios.get(`${API}/api/chat/conversations/${artistId}`);
      const convs = Array.isArray(r.data) ? r.data : [];
      setConversations(convs.map(normalizeConv));
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!artistId) return;
    fetchConversations();
    socket.emit("join_artist_room", artistId);

    socket.on("receive_message", (msg) => {
      setConversations(prev => prev.map(c =>
        c.userId === msg.senderId
          ? { ...c, lastMessage: msg.message, lastTime: msg.createdAt, unread: selected?.userId === msg.senderId ? 0 : (c.unread||0)+1 }
          : c
      ));
      if (selected && msg.senderId === selected.userId) {
        setMessages(prev => [...prev, msg]);
      }
    });

    return () => { socket.off("receive_message"); };
  }, [artistId, selected]);

  const openConversation = async (conv) => {
    setSelected(conv);
    if (isMobile) setShowChat(true);
    setConversations(prev => prev.map(c => c.userId===conv.userId ? {...c, unread:0} : c));
    try {
      const r = await axios.get(`${API}/api/chat/${artistId}/${conv.userId}`);
      setMessages(Array.isArray(r.data) ? r.data : []);
    } catch(e) { console.error(e); setMessages([]); }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !selected) return;
    const msgText = text.trim();
    setSending(true);
    setText("");
    const optimistic = { _tempId: Date.now(), senderId: artistId, receiverId: selected.userId, message: msgText, createdAt: new Date(), senderRole: "artist" };
    setMessages(prev => [...prev, optimistic]);
    try {
      await axios.post(`${API}/api/chat/send`, {
        senderId:   artistId,
        receiverId: selected.userId,
        message:    msgText,
        senderRole: "artist",
      });
      setConversations(prev => prev.map(c =>
        c.userId===selected.userId ? { ...c, lastMessage: msgText, lastTime: new Date() } : c
      ));
      socket.emit("send_message", {
        senderId:   artistId,
        receiverId: selected.userId,
        message:    msgText,
        senderRole: "artist",
        createdAt:  new Date(),
      });
    } catch(e) {
      console.error(e);
      setMessages(prev => prev.filter(m => m._tempId !== optimistic._tempId));
      setText(msgText);
    } finally { setSending(false); }
  };

  const ConvList = () => (
    <div style={{ width: isMobile?"100%":300, borderRight:"1px solid #e2e8f0", display:"flex", flexDirection:"column", background:"#fff", flexShrink:0 }}>
      <div style={{ padding:"18px 16px 12px", borderBottom:"1px solid #f1f5f9" }}>
        <div style={st({ fontSize:18, fontWeight:800, color:"#1e293b" })}>Messages</div>
      </div>
      <div style={{ overflowY:"auto", flex:1 }}>
        {loading
          ? <div style={st({ padding:40, textAlign:"center", color:"#94a3b8", fontSize:14 })}>Loading…</div>
          : conversations.length===0
            ? <div style={st({ padding:40, textAlign:"center", color:"#94a3b8", fontSize:14 })}>No conversations yet.</div>
            : conversations.map(conv => (
              <div key={conv.userId} onClick={()=>openConversation(conv)} style={{ padding:"13px 16px", borderBottom:"1px solid #f1f5f9", cursor:"pointer", background: selected?.userId===conv.userId?"#eff6ff":"#fff", borderLeft:`3px solid ${selected?.userId===conv.userId?"#1e3a8a":"transparent"}`, transition:"background 0.12s" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:6 }}>
                  {/* ✅ FIX: Avatar initial from userName */}
                  <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", background:"#1e3a8a", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:16, flexShrink:0 }}>
                      {conv.userName?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={st({ fontWeight:800, fontSize:14, color:"#1e293b", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" })}>{conv.userName}</div>
                      <div style={st({ fontSize:12, color:"#94a3b8", marginTop:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" })}>{conv.lastMessage || "Start chatting"}</div>
                    </div>
                  </div>
                  {conv.unread>0 && <span style={st({ background:"#1e3a8a", color:"#fff", fontSize:10, fontWeight:800, borderRadius:20, padding:"2px 7px", flexShrink:0 })}>{conv.unread}</span>}
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );

  const ChatWindow = () => !selected ? (
    <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"#94a3b8", gap:10 }}>
      <div style={{ fontSize:40 }}>💬</div>
      <div style={st({ fontSize:14 })}>Select a conversation</div>
    </div>
  ) : (
    <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#f8fafc" }}>
      {/* ✅ FIX: Chat header shows real user name */}
      <div style={{ padding:"14px 16px", borderBottom:"1px solid #e2e8f0", background:"#fff", display:"flex", alignItems:"center", gap:10 }}>
        {isMobile && (
          <button onClick={()=>setShowChat(false)} style={st({ background:"none", border:"none", cursor:"pointer", color:"#1e3a8a", fontWeight:800, fontSize:13 })}>← Back</button>
        )}
        <div style={{ width:36, height:36, borderRadius:"50%", background:"#1e3a8a", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:18 }}>
          {selected.userName?.[0]?.toUpperCase() || "?"}
        </div>
        <div>
          {/* ✅ FIX: Display actual userName not hardcoded "Client" */}
          <div style={st({ fontWeight:800, fontSize:14, color:"#1e293b" })}>{selected.userName}</div>
          <div style={st({ fontSize:11, color:"#94a3b8" })}>
            {selected.userEmail || "Client"}
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:10 }}>
        {messages.length===0
          ? <div style={st({ textAlign:"center", color:"#94a3b8", fontSize:13, marginTop:40 })}>No messages yet. Say hello!</div>
          : messages.map((msg, i) => {
            const isMe = msg.senderId === artistId || msg.senderRole === "artist";
            return (
              <div key={msg._id||msg._tempId||i} style={{ display:"flex", justifyContent:isMe?"flex-end":"flex-start" }}>
                <div style={{ maxWidth:"72%", padding:"9px 13px", borderRadius: isMe?"16px 3px 16px 16px":"3px 16px 16px 16px", background: isMe?"#1e3a8a":"#fff", border: isMe?"none":"1px solid #e2e8f0", color: isMe?"#fff":"#1e293b", fontSize:13, fontFamily:"'Nunito',sans-serif", lineHeight:1.55 }}>
                  {msg.message}
                </div>
              </div>
            );
          })
        }
        <div ref={bottomRef} />
      </div>

      <div style={{ padding:"12px 16px", borderTop:"1px solid #e2e8f0", background:"#fff", display:"flex", gap:8 }}>
        <input
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendMessage(); } }}
          placeholder="Type a message…"
          style={st({ flex:1, border:"1px solid #e2e8f0", borderRadius:24, padding:"9px 16px", fontSize:13, outline:"none", background:"#f8fafc" })}
        />
        <button onClick={sendMessage} disabled={sending||!text.trim()} style={st({ background:"#1e3a8a", color:"#fff", border:"none", borderRadius:24, padding:"9px 18px", fontWeight:800, fontSize:13, cursor:"pointer", opacity:(sending||!text.trim())?0.5:1 })}>
          Send
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ display:"flex", gap:6, padding:"12px 16px 0", background:"#fff", borderBottom:"1px solid #e2e8f0" }}>
        {[{ id:"direct", label:"💬 Direct Messages" }, { id:"groups", label:"👥 Groups" }].map(v => (
          <button key={v.id} onClick={()=>setView(v.id)} style={st({ border:"none", background: view===v.id?"#1e3a8a":"#f1f5f9", color: view===v.id?"#fff":"#475569", padding:"8px 16px", borderRadius:"10px 10px 0 0", fontWeight:700, fontSize:13, cursor:"pointer" })}>
            {v.label}
          </button>
        ))}
      </div>
      <div style={{ display:"flex", flex:1, minHeight:0 }}>
        {view === "direct" ? (
          <>
            {(!isMobile||!showChat) && <ConvList />}
            {(!isMobile||showChat)  && <ChatWindow />}
          </>
        ) : (
          <GroupsPanel artistId={artistId} />
        )}
      </div>
    </div>
  );
}

// ─── EDIT PROFILE TAB ─────────────────────────────────────────────────────────
function EditProfileTab({ artistId }) {
  const [form,         setForm]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [msg,          setMsg]          = useState({ type:"", text:"" });
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingWorks, setUploadingWorks] = useState(false);

  const fileRef = useRef(null);

  useEffect(()=>{
    axios.get(`${API}/api/artists/${artistId}`)
      .then(r=>{
        setForm({ works: [], ...r.data });
        setImagePreview(r.data.image||r.data.profileImage||null);
      })
      .catch(()=>setMsg({ type:"error", text:"Failed to load profile." }))
      .finally(()=>setLoading(false));
  },[artistId]);

  const set = (k,v) => setForm(f=>({ ...f, [k]:v }));

  const onImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const onWorkFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingWorks(true);
    setMsg({ type:"", text:"" });
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("image", file);
        const r = await axios.post(`${API}/api/artists/upload`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (r.data?.url) uploadedUrls.push(r.data.url);
      }
      if (uploadedUrls.length) {
        const updatedWorks = [...(form.works || []), ...uploadedUrls];
        setForm(f => ({ ...f, works: updatedWorks }));
        try {
          await axios.put(`${API}/api/artists/${artistId}`, { works: updatedWorks });
          setMsg({ type:"ok", text:"Work samples uploaded and saved!" });
        } catch (persistErr) {
          console.error("Auto-save of works failed:", persistErr);
          setMsg({ type:"error", text:"Uploaded, but failed to auto-save — click Save Changes to confirm." });
        }
      }
    } catch (err) {
      console.error(err);
      setMsg({ type:"error", text:"Failed to upload one or more files." });
    } finally {
      setUploadingWorks(false);
      e.target.value = "";
    }
  };

  const removeWork = async (urlToRemove) => {
    const updatedWorks = (form.works || []).filter(u => u !== urlToRemove);
    setForm(f => ({ ...f, works: updatedWorks }));
    try {
      await axios.put(`${API}/api/artists/${artistId}`, { works: updatedWorks });
    } catch (err) {
      console.error("Failed to persist work removal:", err);
      setMsg({ type:"error", text:"Removed locally, but failed to save — click Save Changes to confirm." });
    }
  };

  const save = async () => {
    setSaving(true); setMsg({ type:"", text:"" });
    try {
      if (imageFile) {
        const fd = new FormData();
        Object.entries(form).forEach(([k,v]) => {
          if (v === null || v === undefined) return;
          if (Array.isArray(v)) {
            fd.append(k, JSON.stringify(v));
          } else {
            fd.append(k, v);
          }
        });
        fd.append("image", imageFile);
        await axios.put(`${API}/api/artists/${artistId}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axios.put(`${API}/api/artists/${artistId}`, form);
      }
      setMsg({ type:"ok", text:"Profile saved successfully!" });
      setImageFile(null);
    } catch(e) {
      console.error(e);
      setMsg({ type:"error", text: e?.response?.data?.message || "Failed to save. Please try again." });
    } finally { setSaving(false); }
  };

  if (loading) return <div style={st({ display:"flex", alignItems:"center", justifyContent:"center", height:"60%", color:"#94a3b8", fontSize:14 })}>Loading…</div>;
  if (!form)   return <div style={st({ display:"flex", alignItems:"center", justifyContent:"center", height:"60%", color:"#94a3b8", fontSize:14 })}>Could not load profile.</div>;

  const Field = ({ label, k, type="text", multiline=false, placeholder="" }) => (
    <div style={{ marginBottom:14 }}>
      <label style={st({ fontSize:10, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:0.8, display:"block", marginBottom:4 })}>{label}</label>
      {multiline
        ? <textarea value={form[k]||""} onChange={e=>set(k,e.target.value)} placeholder={placeholder} rows={4}
            style={st({ padding:"9px 11px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:13, fontWeight:600, outline:"none", width:"100%", boxSizing:"border-box", resize:"vertical" })} />
        : <input type={type} value={form[k]||""} onChange={e=>set(k,e.target.value)} placeholder={placeholder}
            style={st({ padding:"9px 11px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:13, fontWeight:600, outline:"none", width:"100%", boxSizing:"border-box" })} />
      }
    </div>
  );

  return (
    <div style={{ padding:"28px 28px 40px", maxWidth:800, display:"flex", flexDirection:"column", gap:16 }}>
      <div style={st({ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:"#1e3a8a", letterSpacing:1 })}>Edit Profile</div>

      {/* Profile Image */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"16px 18px" }}>
        <div style={st({ fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:14 })}>Profile Photo</div>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <div style={{ width:80, height:80, borderRadius:"50%", overflow:"hidden", border:"2px solid #e2e8f0", background:"#f1f5f9", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            {imagePreview
              ? <img src={imagePreview} alt="Profile" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <span style={st({ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:"#94a3b8" })}>{form.name?.[0]?.toUpperCase()||"A"}</span>
            }
          </div>
          <div>
            <button onClick={()=>fileRef.current?.click()} style={st({ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1e40af", padding:"8px 16px", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer", marginBottom:6, display:"block" })}>
              📷 Choose Photo
            </button>
            <div style={st({ fontSize:11, color:"#94a3b8" })}>JPG, PNG or WebP · Max 5MB</div>
            {imageFile && <div style={st({ fontSize:11, color:"#16a34a", marginTop:4 })}>✓ {imageFile.name} selected</div>}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onImageChange} style={{ display:"none" }} />
        </div>
      </div>

      {/* Form fields */}
      {[
        { title:"Basic Info", fields:[
          { label:"Artist Name", k:"name" },
          { label:"Category",    k:"category", placeholder:"e.g. Musician" },
          { label:"Location",    k:"location" },
          { label:"Phone",       k:"phone" },
        ]},
        { title:"Pricing", fields:[
          { label:"Base Price (₹)", k:"basePrice", type:"number" },
          { label:"Price Note",     k:"priceNote", placeholder:"e.g. per event" },
        ]},
        { title:"Social & Portfolio", fields:[
          { label:"Instagram",     k:"instagram",    placeholder:"@handle" },
          { label:"Portfolio URL", k:"portfolioUrl", placeholder:"https://…" },
          { label:"YouTube",       k:"youtube",      placeholder:"https://youtube.com/…" },
        ]},
      ].map(section=>(
        <div key={section.title} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"16px 18px" }}>
          <div style={st({ fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:14 })}>{section.title}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
            {section.fields.map(f=><Field key={f.k} {...f} />)}
          </div>
        </div>
      ))}

      {/* Portfolio / Work Samples */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"16px 18px" }}>
        <div style={st({ fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:14 })}>Portfolio / Work Samples</div>
        {(form.works || []).length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))", gap:10, marginBottom:14 }}>
            {(form.works || []).map((url, i) => (
              <div key={url + i} style={{ position:"relative", aspectRatio:"1/1", borderRadius:10, overflow:"hidden", border:"1px solid #e2e8f0" }}>
                <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                <button
                  onClick={() => removeWork(url)}
                  title="Remove"
                  style={st({ position:"absolute", top:4, right:4, width:22, height:22, borderRadius:"50%", background:"rgba(0,0,0,0.6)", color:"#fff", border:"none", cursor:"pointer", fontSize:12, lineHeight:1 })}
                >✕</button>
              </div>
            ))}
          </div>
        )}
        <label style={st({ display:"inline-block", background: uploadingWorks ? "#f1f5f9" : "#eff6ff", border:"1px solid #bfdbfe", color:"#1e40af", padding:"8px 16px", borderRadius:10, fontWeight:700, fontSize:13, cursor: uploadingWorks ? "not-allowed" : "pointer" })}>
          {uploadingWorks ? "Uploading…" : "+ Add Work Samples"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={onWorkFilesChange}
            disabled={uploadingWorks}
            style={{ display:"none" }}
          />
        </label>
        <div style={st({ fontSize:11, color:"#94a3b8", marginTop:6 })}>
          Upload images of your past work. JPG, PNG or WebP. Uploads save automatically.
        </div>
      </div>

      {/* Bio */}
      <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"16px 18px" }}>
        <div style={st({ fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:14 })}>Bio</div>
        <Field label="Bio" k="bio" multiline placeholder="Describe yourself, your experience, and what you offer…" />
      </div>

      {msg.text && (
        <div style={{ border:"1px solid", borderRadius:12, padding:"10px 14px", fontSize:13, fontWeight:700, fontFamily:"'Nunito',sans-serif", background:msg.type==="ok"?"#f0fdf4":"#fee2e2", color:msg.type==="ok"?"#15803d":"#7f1d1d", borderColor:msg.type==="ok"?"#86efac":"#fca5a5" }}>
          {msg.text}
        </div>
      )}

      <button onClick={save} disabled={saving} style={st({ background:"#1e3a8a", color:"#fff", border:"none", padding:"13px 24px", borderRadius:20, fontWeight:800, fontSize:14, cursor:"pointer", alignSelf:"flex-start", opacity:saving?0.7:1 })}>
        {saving?"Saving…":"Save Changes →"}
      </button>
    </div>
  );
}

// ─── REVIEWS TAB ──────────────────────────────────────────────────────────────
function ReviewsTab({ artistId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    axios.get(`${API}/api/artists/${artistId}/reviews`)
      .then(r=>setReviews(Array.isArray(r.data)?r.data:[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[artistId]);

  const avg = reviews.length ? (reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length).toFixed(1) : null;

  if (loading) return <div style={st({ display:"flex", alignItems:"center", justifyContent:"center", height:"60%", color:"#94a3b8", fontSize:14 })}>Loading…</div>;

  return (
    <div style={{ padding:"28px 28px 40px", maxWidth:800, display:"flex", flexDirection:"column", gap:16 }}>
      <div style={st({ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:"#1e3a8a", letterSpacing:1 })}>Reviews</div>

      {/* ✅ FIX: Always show summary if reviews exist, including stars */}
      {reviews.length > 0 && (
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"18px 22px", display:"flex", gap:32, alignItems:"center", flexWrap:"wrap" }}>
          <div style={{ textAlign:"center" }}>
            <div style={st({ fontFamily:"'Bebas Neue',sans-serif", fontSize:48, color:"#1e3a8a", lineHeight:1 })}>{avg}</div>
            <div style={{ display:"flex", justifyContent:"center", gap:2, marginTop:4 }}>
              {[1,2,3,4,5].map(s=>(
                <span key={s} style={{ fontSize:20, color: s <= Math.round(parseFloat(avg)) ? "#f59e0b" : "#e2e8f0" }}>★</span>
              ))}
            </div>
            <div style={st({ fontSize:10, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:0.8, marginTop:4 })}>Overall</div>
          </div>
          <div style={{ flex:1, minWidth:160 }}>
            {[5,4,3,2,1].map(star=>{
              const count = reviews.filter(r=>Math.round(r.rating)===star).length;
              const pct   = Math.round((count/reviews.length)*100);
              return (
                <div key={star} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={st({ fontSize:11, color:"#64748b", width:14 })}>{star}</span>
                  <div style={{ flex:1, height:6, borderRadius:4, background:"#e2e8f0", overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:"#1e3a8a", borderRadius:4, transition:"width 0.4s" }} />
                  </div>
                  <span style={st({ fontSize:11, color:"#94a3b8", width:28 })}>{count}</span>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={st({ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, color:"#1e3a8a", lineHeight:1 })}>{reviews.length}</div>
            <div style={st({ fontSize:10, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:0.8 })}>Reviews</div>
          </div>
        </div>
      )}

      {/* ✅ FIX: Each review card shows stars prominently */}
      {reviews.length===0 ? (
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"40px 20px", textAlign:"center", color:"#94a3b8", fontFamily:"'Nunito',sans-serif" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>⭐</div>
          <div style={{ fontWeight:700 }}>No reviews yet</div>
          <div style={{ fontSize:13, marginTop:6 }}>Reviews from clients will appear here after confirmed bookings</div>
        </div>
      ) : reviews.map((r,i)=>(
        <div key={r._id||i} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"16px 18px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {/* ✅ FIX: Avatar for reviewer */}
              <div style={{ width:38, height:38, borderRadius:"50%", background:"#1e3a8a", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:18, flexShrink:0 }}>
                {(r.userName||"A")?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={st({ fontWeight:800, fontSize:14, color:"#1e293b" })}>{r.userName||"Anonymous"}</div>
                <div style={st({ fontSize:11, color:"#94a3b8" })}>{r.eventType}</div>
              </div>
            </div>
            {/* ✅ FIX: Star rating displayed prominently */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
              <div style={{ display:"flex", gap:2 }}>
                {[1,2,3,4,5].map(s=>(
                  <span key={s} style={{ fontSize:16, color:s<=Math.round(r.rating)?"#f59e0b":"#e2e8f0" }}>★</span>
                ))}
              </div>
              <span style={st({ fontSize:11, fontWeight:800, color:"#64748b" })}>{Number(r.rating).toFixed(1)} / 5</span>
            </div>
          </div>
          {(r.comment || r.review) && (
            <div style={{ background:"#f8fafc", borderRadius:10, padding:"10px 12px" }}>
              <div style={st({ fontSize:13, color:"#475569", lineHeight:1.6 })}>{r.comment || r.review}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── EARNINGS TAB ─────────────────────────────────────────────────────────────
function EarningsTab({ artistId }) {
  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchEarnings = async () => {
    try {
      let data = [];
      try {
        const r = await axios.get(`${API}/api/artists/${artistId}/earnings`);
        data = Array.isArray(r.data) ? r.data : (r.data?.bookings || []);
      } catch {
        const r = await axios.get(`${API}/api/bookings/artist/${artistId}`);
        data = (Array.isArray(r.data) ? r.data : []).filter(b => b.status === "confirmed");
      }
      setBookings(data);
      setLastUpdated(new Date());
    } catch(e) {
      console.error(e);
      setError("Could not load earnings.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!artistId) return;
    fetchEarnings();
    socket.on("booking_confirmed", ({ bookingId, paidAmount }) => {
      setBookings(prev => {
        const exists = prev.find(b => b._id === bookingId);
        if (exists) {
          return prev.map(b => b._id === bookingId ? { ...b, status:"confirmed", paidAmount } : b);
        }
        fetchEarnings();
        return prev;
      });
      setLastUpdated(new Date());
    });
    return () => { socket.off("booking_confirmed"); };
  }, [artistId]);

  if (loading) return <div style={st({ display:"flex", alignItems:"center", justifyContent:"center", height:"60%", color:"#94a3b8", fontSize:14 })}>Loading…</div>;

  const totalEarned = bookings.reduce((s,b) => s + (b.paidAmount || 0), 0);
  const thisMonth   = bookings.filter(b => {
    const d = new Date(b.updatedAt || b.createdAt);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).reduce((s,b) => s + (b.paidAmount || 0), 0);
  const totalGigs   = bookings.length;
  const avgPerGig   = totalGigs > 0 ? Math.round(totalEarned / totalGigs) : 0;

  return (
    <div style={{ padding:"28px 28px 40px", maxWidth:800, display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={st({ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:"#1e3a8a", letterSpacing:1 })}>Earnings</div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {lastUpdated && <span style={st({ fontSize:11, color:"#94a3b8" })}>Updated {lastUpdated.toLocaleTimeString()}</span>}
          <button onClick={fetchEarnings} style={st({ background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1e40af", padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:700, cursor:"pointer" })}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", color:"#7f1d1d", borderRadius:12, padding:"10px 14px", fontSize:13, fontWeight:700, fontFamily:"'Nunito',sans-serif" }}>{error}</div>}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
        {[
          { label:"Total Earned",   val:`₹${fmt(totalEarned)}`, color:"#1e3a8a" },
          { label:"This Month",     val:`₹${fmt(thisMonth)}`,   color:"#15803d" },
          { label:"Avg per Gig",    val:`₹${fmt(avgPerGig)}`,   color:"#7e22ce" },
          { label:"Completed Gigs", val:totalGigs,              color:"#0e7490" },
        ].map(s=>(
          <div key={s.label} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"18px 16px", textAlign:"center" }}>
            <div style={st({ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:s.color, letterSpacing:1 })}>{s.val}</div>
            <div style={st({ fontSize:10, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:0.8, marginTop:4 })}>{s.label}</div>
          </div>
        ))}
      </div>

      {bookings.length > 0 ? (
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"16px 18px" }}>
          <div style={st({ fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:14 })}>Completed Bookings</div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"'Nunito',sans-serif", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"2px solid #e2e8f0" }}>
                  {["Client","Event","Date","Amount"].map(h=>(
                    <th key={h} style={{ textAlign:"left", padding:"8px 10px", fontSize:10, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:0.8 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b,i)=>(
                  <tr key={b._id||i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                    <td style={{ padding:"10px", fontWeight:700, color:"#1e293b" }}>{b.userName}</td>
                    <td style={{ padding:"10px", color:"#475569" }}>{b.eventType}</td>
                    <td style={{ padding:"10px", color:"#475569" }}>{b.eventDate}</td>
                    <td style={{ padding:"10px", fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"#1e3a8a" }}>₹{fmt(b.paidAmount||b.agreedPrice||0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:16, padding:"40px 20px", textAlign:"center", color:"#94a3b8", fontFamily:"'Nunito',sans-serif" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>₹</div>
          <div style={{ fontWeight:700 }}>No completed bookings yet</div>
          <div style={{ fontSize:13, marginTop:6 }}>Earnings appear here once a client confirms payment</div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function ArtistDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab,  setActiveTab]  = useState(searchParams.get("tab") || "bookings");
  const [artistData, setArtistData] = useState(null);

  const artist   = getArtist();
  const artistId = artist?._id;

  useEffect(()=>{
    if (!artistId) return;
    axios.get(`${API}/api/artists/${artistId}`)
      .then(r=>setArtistData(r.data))
      .catch(()=>{});
  },[artistId]);

  const displayName = artistData?.name || artist?.name || "Artist";

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Nunito',sans-serif", background:"#f8fafc", overflow:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <aside style={{ width:220, background:"#1e3a8a", display:"flex", flexDirection:"column", padding:"24px 14px 16px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28, paddingBottom:20, borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ width:42, height:42, borderRadius:"50%", background:"#3b82f6", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:22, flexShrink:0, overflow:"hidden" }}>
            {artistData?.image || artistData?.profileImage
              ? <img src={artistData.image||artistData.profileImage} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : displayName[0]?.toUpperCase()
            }
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, color:"#fff", letterSpacing:0.5, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{displayName}</div>
            <div style={st({ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:1 })}>{artistData?.category||"Artist"}</div>
          </div>
        </div>
        <nav style={{ display:"flex", flexDirection:"column", gap:4 }}>
          {TABS.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"none", cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:13, textAlign:"left", background:activeTab===tab.id?"rgba(255,255,255,0.12)":"transparent", color:activeTab===tab.id?"#fff":"rgba(255,255,255,0.6)", borderLeft:activeTab===tab.id?"3px solid #93c5fd":"3px solid transparent", transition:"all 0.15s" }}>
              <span style={{ fontSize:16 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ marginTop:"auto", paddingTop:20, textAlign:"center" }}>
          <button onClick={()=>navigate(`/artist-profile/${artistId}`)} style={st({ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.7)", padding:"8px 14px", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer", width:"100%" })}>
            👤 View Profile
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflowY:"auto", overflowX:"hidden" }}>
        {!artistId ? (
          <div style={st({ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#94a3b8", fontSize:14 })}>Artist not found. Please log in again.</div>
        ) : (
          <>
            {activeTab==="bookings" && <BookingsTab    artistId={artistId} />}
            {activeTab==="chat"     && <ChatTab        artistId={artistId} />}
            {activeTab==="profile"  && <EditProfileTab artistId={artistId} />}
            {activeTab==="reviews"  && <ReviewsTab     artistId={artistId} />}
            {activeTab==="earnings" && <EarningsTab    artistId={artistId} />}
          </>
        )}
      </main>
    </div>
  );
}