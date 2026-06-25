// artspire-frontend/src/pages/ArtistBookingDashboard.jsx
// This is a NEW page for the artist to manage all bookings.
// Add to App.jsx:  <Route path="/artist/bookings" element={<ArtistBookingDashboard />} />
// Link from ArtistDashboard.jsx navbar/sidebar.

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const fmt = (n) => Number(n).toLocaleString("en-IN");

const getArtist = () => {
  try {
    return (
      JSON.parse(localStorage.getItem("artist")) ||
      JSON.parse(localStorage.getItem("user"))   ||
      null
    );
  } catch { return null; }
};

const STATUS_META = {
  pending_approval: { label: "New Request",   color: "#b45309", bg: "#fef3c7", dot: "#f59e0b" },
  negotiating:      { label: "Negotiating",   color: "#1d4ed8", bg: "#eff6ff", dot: "#3b82f6" },
  price_agreed:     { label: "Price Agreed",  color: "#15803d", bg: "#f0fdf4", dot: "#22c55e" },
  payment_pending:  { label: "Awaiting Pay",  color: "#7c3aed", bg: "#f5f3ff", dot: "#8b5cf6" },
  confirmed:        { label: "Confirmed ✓",   color: "#065f46", bg: "#ecfdf5", dot: "#10b981" },
  cancelled:        { label: "Cancelled",     color: "#7f1d1d", bg: "#fef2f2", dot: "#ef4444" },
};

const STEPS = [
  { key: "pending_approval", label: "Received",   icon: "📥" },
  { key: "negotiating",      label: "Negotiating", icon: "💬" },
  { key: "price_agreed",     label: "Agreed",      icon: "🤝" },
  { key: "payment_pending",  label: "Awaiting Pay",icon: "💳" },
  { key: "confirmed",        label: "Confirmed",   icon: "✅" },
];
const STEP_ORDER = STEPS.map((s) => s.key);
const stepIndex  = (status) => { const i = STEP_ORDER.indexOf(status); return i === -1 ? 0 : i; };

export default function ArtistBookingDashboard() {
  const artist   = getArtist();
  const artistId = artist?._id;

  const [bookings,  setBookings]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [tab,       setTab]       = useState("new");
  const [sending,   setSending]   = useState(false);
  const [err,       setErr]       = useState("");
  const [offerPrice,   setOfferPrice]   = useState("");
  const [offerMsg,     setOfferMsg]     = useState("");
  const threadRef = useRef(null);
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => { const fn = () => setMobile(window.innerWidth < 768); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn); }, []);

  // ── fetch ──
  const fetchBookings = async () => {
    if (!artistId) return;
    try {
      const { data } = await axios.get(`${API}/api/bookings/artist/${artistId}`);
      setBookings(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, [artistId]);

  // auto-scroll thread
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [selected?.negotiation?.length]);

  // ── socket ──
  useEffect(() => {
    if (!artistId) return;
    socket.emit("join_artist_room", artistId);

    const applyUpdate = (bookingId, patch) => {
      setBookings((bs) => bs.map((b) => b._id === bookingId ? { ...b, ...patch } : b));
      setSelected((s)  => s?._id === bookingId ? { ...s, ...patch } : s);
    };

    socket.on("new_booking_request", ({ bookingId }) => {
      fetchBookings();
    });

    socket.on("user_counter", ({ bookingId, price, message, userName }) => {
      const entry = { from: "user", price, message, timestamp: new Date().toISOString() };
      setBookings((bs) => bs.map((b) => {
        if (b._id !== bookingId) return b;
        return { ...b, status: "negotiating", negotiation: [...(b.negotiation || []), entry] };
      }));
      setSelected((s) => {
        if (!s || s._id !== bookingId) return s;
        return { ...s, status: "negotiating", negotiation: [...(s.negotiation || []), entry] };
      });
    });

    socket.on("price_accepted", ({ bookingId, price }) => {
      applyUpdate(bookingId, { status: "price_agreed", agreedPrice: price });
    });

    socket.on("booking_confirmed", ({ bookingId, paidAmount }) => {
      applyUpdate(bookingId, { status: "confirmed", paidAmount });
    });

    socket.on("booking_cancelled", ({ bookingId }) => {
      applyUpdate(bookingId, { status: "cancelled" });
    });

    return () => {
      socket.off("new_booking_request");
      socket.off("user_counter");
      socket.off("price_accepted");
      socket.off("booking_confirmed");
      socket.off("booking_cancelled");
    };
  }, [artistId]);

  // ── select ──
  const openBooking = (b) => {
    setSelected(b);
    setErr("");
    const lastUserOffer = [...(b.negotiation || [])].reverse().find((m) => m.from === "user");
    setOfferPrice(lastUserOffer ? lastUserOffer.price : b.basePrice || "");
    setOfferMsg("");
  };

  // ── send price offer to user ──
  const sendOffer = async () => {
    const price = parseInt(offerPrice, 10);
    if (!price || price <= 0) { setErr("Enter a valid price."); return; }
    setSending(true); setErr("");
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/offer`, {
        price, message: offerMsg,
      });
      const entry = { from: "artist", price, message: offerMsg, timestamp: new Date().toISOString() };
      const patch  = { status: "negotiating", negotiation: [...(selected.negotiation || []), entry] };
      setSelected((s) => ({ ...s, ...patch }));
      setBookings((bs) => bs.map((b) => b._id === selected._id ? { ...b, ...patch } : b));
      setOfferMsg("");
    } catch { setErr("Failed to send offer. Try again."); }
    finally { setSending(false); }
  };

  // ── accept user's counter ──
  const acceptCounter = async (price) => {
    setSending(true); setErr("");
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/artist-accept`, { price });
      const patch = { status: "price_agreed", agreedPrice: price };
      setSelected((s) => ({ ...s, ...patch }));
      setBookings((bs) => bs.map((b) => b._id === selected._id ? { ...b, ...patch } : b));
    } catch { setErr("Failed to accept. Try again."); }
    finally { setSending(false); }
  };

  // ── cancel ──
  const cancelBooking = async () => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/cancel`, { cancelledBy: "artist" });
      const patch = { status: "cancelled" };
      setSelected((s) => ({ ...s, ...patch }));
      setBookings((bs) => bs.map((b) => b._id === selected._id ? { ...b, ...patch } : b));
    } catch { setErr("Could not cancel."); }
  };

  // ── derived ──
  const newBookings    = bookings.filter((b) => b.status === "pending_approval");
  const activeBookings = bookings.filter((b) => !["confirmed", "cancelled"].includes(b.status));
  const list = tab === "new" ? newBookings : tab === "active" ? activeBookings : bookings;

  const lastUserOffer   = selected ? [...(selected.negotiation || [])].reverse().find((m) => m.from === "user")   : null;
  const lastArtistOffer = selected ? [...(selected.negotiation || [])].reverse().find((m) => m.from === "artist") : null;
  const canAcceptUser   = lastUserOffer && selected?.status === "negotiating";

  // ── render ──
  return (
    <div style={{...styles.page, flexDirection: mobile ? "column" : "row"}}>
      {/* ── LEFT PANEL ── */}
      <div style={{...styles.left, display: mobile && selected ? "none" : "flex", width: mobile ? "100%" : 340}}>
        <div style={styles.leftHeader}>
          <h2 style={styles.pageTitle}>Booking Requests</h2>
          <p style={styles.pageSubtitle}>Manage and respond to booking requests</p>
          <div style={{...styles.tabGroup, flexWrap: "wrap"}}>
            {[
              { key: "new",    label: `New (${newBookings.length})` },
              { key: "active", label: `Active (${activeBookings.length})` },
              { key: "all",    label: `All (${bookings.length})` },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{ ...styles.tabBtn, ...(tab === t.key ? styles.tabActive : {}) }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{...styles.list, maxHeight: mobile ? "400px" : "auto"}}>
          {loading ? (
            <div style={styles.empty}>Loading…</div>
          ) : list.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: 36 }}>📭</div>
              <div>{tab === "new" ? "No new requests." : "Nothing here yet."}</div>
            </div>
          ) : (
            list.map((b) => (
              <BookingCard
                key={b._id}
                booking={b}
                selected={selected?._id === b._id}
                onClick={() => openBooking(b)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{...styles.right, display: mobile && !selected ? "none" : "flex", width: mobile ? "100%" : "auto"}}>
        {!selected ? (
          <div style={styles.placeholder}>
            <div style={{ fontSize: 52 }}>📋</div>
            <div style={{ fontSize: 15, color: "#64748b", marginTop: 8 }}>Select a booking to respond</div>
          </div>
        ) : (
          <div style={styles.detail}>
            {mobile && (
              <button
                onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#1e3a8a", fontWeight: 800, fontSize: 13, padding: "0 0 12px 0", marginBottom: "12px" }}
              >
                ← Back
              </button>
            )}

            {/* Status + cancel */}
            <div style={styles.statusRow}>
              <StatusBadge status={selected.status} />
              {!["confirmed", "cancelled"].includes(selected.status) && (
                <button onClick={cancelBooking} style={styles.cancelBtn}>Decline</button>
              )}
            </div>

            {/* Progress */}
            {selected.status !== "cancelled" && (
              <Stepper currentStatus={selected.status} mobile={mobile} />
            )}

            {/* Booking info */}
            <BookingInfo booking={selected} mobile={mobile} />

            {/* Thread */}
            <NegThread
              negotiation={selected.negotiation}
              artistName={artist?.name || "You"}
              threadRef={threadRef}
              mobile={mobile}
            />

            {err && <div style={styles.errorBox}>{err}</div>}

            {/* ── ACTIONS ── */}

            {/* New request — send initial offer */}
            {selected.status === "pending_approval" && (
              <div style={styles.actionCard}>
                <div style={styles.actionTitle}>Send a price offer to this user</div>
                <div style={{...styles.offerRow, flexDirection: mobile ? "column" : "row"}}>
                  <div style={styles.inputGroup}>
                    <label style={styles.inputLabel}>Your Price (₹)</label>
                    <input
                      type="number"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      placeholder={`Base: ₹${fmt(selected.basePrice || 0)}`}
                      style={styles.priceInput}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.inputLabel}>Message (optional)</label>
                    <input
                      type="text"
                      value={offerMsg}
                      onChange={(e) => setOfferMsg(e.target.value)}
                      placeholder="e.g. Includes sound system"
                      style={styles.msgInput}
                    />
                  </div>
                </div>
                <button onClick={sendOffer} disabled={sending} style={{...styles.offerBtn, width: "100%"}}>
                  {sending ? "Sending…" : "Send Price Offer →"}
                </button>
              </div>
            )}

            {/* Negotiating — user sent counter */}
            {selected.status === "negotiating" && (
              <div style={styles.actionCard}>
                {canAcceptUser && (
                  <>
                    <div style={styles.actionTitle}>
                      User's counter offer: <strong style={{ color: "#1e3a8a" }}>₹{fmt(lastUserOffer.price)}</strong>
                    </div>
                    <div style={styles.actionRow}>
                      <button
                        onClick={() => acceptCounter(lastUserOffer.price)}
                        disabled={sending}
                        style={{...styles.acceptBtn, flex: 1}}
                      >
                        {sending ? "…" : `✓ Accept ₹${fmt(lastUserOffer.price)}`}
                      </button>
                    </div>
                    <div style={styles.divider}><span>or send a new offer</span></div>
                  </>
                )}

                {!canAcceptUser && (
                  <div style={styles.actionTitle}>Update your offer</div>
                )}

                <div style={{...styles.offerRow, flexDirection: mobile ? "column" : "row"}}>
                  <div style={styles.inputGroup}>
                    <label style={styles.inputLabel}>New Price (₹)</label>
                    <input
                      type="number"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      style={styles.priceInput}
                    />
                  </div>
                  <div style={styles.inputGroup}>
                    <label style={styles.inputLabel}>Message</label>
                    <input
                      type="text"
                      value={offerMsg}
                      onChange={(e) => setOfferMsg(e.target.value)}
                      placeholder="Optional note"
                      style={styles.msgInput}
                    />
                  </div>
                </div>
                <button onClick={sendOffer} disabled={sending} style={{...styles.offerBtn, width: "100%"}}>
                  {sending ? "Sending…" : "Send New Offer →"}
                </button>
              </div>
            )}

            {/* Price agreed — waiting for user payment */}
            {selected.status === "price_agreed" && (
              <div style={styles.waitingBox}>
                🤝 Price agreed at <strong>₹{fmt(selected.agreedPrice)}</strong>.
                Waiting for the user to complete payment.
              </div>
            )}

            {/* Awaiting payment */}
            {selected.status === "payment_pending" && (
              <div style={styles.waitingBox}>
                💳 User has initiated payment. You'll be notified once it's confirmed.
              </div>
            )}

            {/* Confirmed */}
            {selected.status === "confirmed" && (
              <div style={styles.confirmedBox}>
                <div style={{ fontSize: 32 }}>🎊</div>
                <div style={styles.confirmedTitle}>Booking Confirmed!</div>
                <div style={styles.confirmedSub}>
                  Paid ₹{fmt(selected.paidAmount || selected.agreedPrice)} by {selected.userName}
                </div>
                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                  {selected.eventType} · {selected.eventDate} · {selected.location}
                </div>
              </div>
            )}

            {/* Cancelled */}
            {selected.status === "cancelled" && (
              <div style={{ ...styles.waitingBox, background: "#fef2f2", color: "#7f1d1d", borderColor: "#fecaca" }}>
                ❌ This booking was cancelled.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────

function BookingCard({ booking, selected, onClick }) {
  const meta = STATUS_META[booking.status] || {};
  return (
    <div onClick={onClick} style={{ ...styles.card, ...(selected ? styles.cardSelected : {}) }}>
      <div style={styles.cardTop}>
        <div style={styles.cardUser}>{booking.userName}</div>
        <span style={{ ...styles.badge, color: meta.color, background: meta.bg }}>
          <span style={{ ...styles.dot, background: meta.dot }} />
          {meta.label}
        </span>
      </div>
      <div style={styles.cardEvent}>{booking.eventType} · {booking.eventDate}</div>
      <div style={styles.cardLocation}>📍 {booking.location}</div>
      {booking.agreedPrice ? (
        <div style={styles.cardPrice}>Agreed: ₹{fmt(booking.agreedPrice)}</div>
      ) : booking.basePrice ? (
        <div style={{ ...styles.cardPrice, color: "#94a3b8" }}>Base: ₹{fmt(booking.basePrice)}</div>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || {};
  return (
    <span style={{ ...styles.badge, color: meta.color, background: meta.bg, fontSize: 13, padding: "5px 14px" }}>
      <span style={{ ...styles.dot, background: meta.dot }} />
      {meta.label}
    </span>
  );
}

function Stepper({ currentStatus, mobile }) {
  const ci = stepIndex(currentStatus);
  return (
    <div style={{...styles.stepper, overflowX: mobile ? "auto" : "visible", flexWrap: mobile ? "nowrap" : "wrap"}}>
      {STEPS.map((step, i) => {
        const done   = i < ci;
        const active = i === ci;
        return (
          <div key={step.key} style={{...styles.stepItem, flex: mobile ? "0 0 auto" : 1}}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                ...styles.stepCircle,
                background: done ? "#1e3a8a" : active ? "#3b82f6" : "#e2e8f0",
                color:      done || active ? "#fff" : "#94a3b8",
              }}>
                {done ? "✓" : step.icon}
              </div>
              <div style={{
                ...styles.stepLabel,
                color:      active ? "#1e3a8a" : done ? "#475569" : "#94a3b8",
                fontWeight: active ? 700 : 400,
              }}>
                {step.label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ ...styles.stepLine, background: done ? "#1e3a8a" : "#e2e8f0", display: mobile ? "none" : "block" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BookingInfo({ booking, mobile }) {
  const rows = [
    ["User",      booking.userName],
    ["Email",     booking.userEmail],
    ["Event",     booking.eventType],
    ["Date",      booking.eventDate],
    booking.eventTime && ["Time", booking.eventTime],
    ["Location",  booking.location],
    booking.duration && ["Duration", booking.duration],
    booking.notes && ["Notes", booking.notes],
    ["Base Price", `₹${fmt(booking.basePrice || 0)}`],
    booking.agreedPrice && ["Agreed Price", `₹${fmt(booking.agreedPrice)}`],
    booking.paidAmount  && ["Paid",         `₹${fmt(booking.paidAmount)}`],
  ].filter(Boolean);

  return (
    <div style={styles.infoCard}>
      {rows.map(([label, value]) => (
        <div key={label} style={{...styles.infoRow, flexDirection: mobile ? "column" : "row", gap: mobile ? 4 : 0}}>
          <span style={styles.infoLabel}>{label}</span>
          <span style={styles.infoValue}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function NegThread({ negotiation, artistName, threadRef, mobile }) {
  if (!negotiation?.length) return null;
  return (
    <div style={styles.thread}>
      <div style={styles.threadTitle}>Price Discussion</div>
      <div ref={threadRef} style={{...styles.threadScroll, maxHeight: mobile ? "200px" : "220px"}}>
        {negotiation.map((msg, i) => {
          const isArtist = msg.from === "artist";
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isArtist ? "flex-end" : "flex-start", gap: 2 }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>
                {isArtist ? "You" : "User"}
              </span>
              <div style={{
                ...styles.bubble,
                maxWidth: mobile ? "90%" : "80%",
                background:   isArtist ? "#1e3a8a" : "#f1f5f9",
                color:        isArtist ? "#fff" : "#1e293b",
                borderRadius: isArtist ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
              }}>
                {msg.message && <div style={{ marginBottom: msg.price ? 4 : 0 }}>{msg.message}</div>}
                {msg.price && (
                  <span style={{
                    display:    "inline-block",
                    background: isArtist ? "rgba(255,255,255,0.2)" : "#1e3a8a",
                    color:      "#fff",
                    padding:    "2px 10px",
                    borderRadius: 20,
                    fontSize:   13,
                    fontWeight: 700,
                  }}>
                    ₹{fmt(msg.price)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const styles = {
  page:        { display:"flex", height:"100vh", fontFamily:"'Nunito','Inter',sans-serif", background:"#f8fafc", overflow:"hidden" },
  left:        { width:340, minWidth:280, display:"flex", flexDirection:"column", borderRight:"1px solid #e2e8f0", background:"#fff" },
  leftHeader:  { padding:"20px 18px 14px", borderBottom:"1px solid #f1f5f9" },
  pageTitle:   { margin:0, fontSize:20, fontWeight:800, color:"#0f172a", letterSpacing:"-0.02em" },
  pageSubtitle:{ margin:"2px 0 12px", fontSize:12, color:"#94a3b8" },
  tabGroup:    { display:"flex", gap:5, flexWrap:"wrap" },
  tabBtn:      { padding:"5px 10px", borderRadius:20, border:"1px solid #e2e8f0", background:"transparent", fontSize:11, color:"#64748b", cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontWeight:600 },
  tabActive:   { background:"#1e3a8a", color:"#fff", border:"1px solid #1e3a8a" },
  list:        { flex:1, overflowY:"auto", padding:"10px 12px", display:"flex", flexDirection:"column", gap:8 },
  empty:       { textAlign:"center", padding:"40px 20px", color:"#64748b", fontSize:14, fontWeight:600 },
  card:        { padding:"14px 16px", borderRadius:12, border:"1px solid #e2e8f0", cursor:"pointer", background:"#fff", transition:"all 0.15s" },
  cardSelected:{ borderColor:"#1e3a8a", background:"#f0f4ff", boxShadow:"0 0 0 2px #1e3a8a22" },
  cardTop:     { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 },
  cardUser:    { fontSize:14, fontWeight:800, color:"#0f172a" },
  cardEvent:   { fontSize:12, color:"#475569", margin:"2px 0" },
  cardLocation:{ fontSize:11, color:"#94a3b8" },
  cardPrice:   { fontSize:13, fontWeight:800, color:"#1e3a8a", marginTop:4 },
  badge:       { display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 },
  dot:         { width:6, height:6, borderRadius:"50%", flexShrink:0 },
  right:       { flex:1, overflowY:"auto", background:"#f8fafc" },
  placeholder: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:"#94a3b8" },
  detail:      { maxWidth:680, margin:"0 auto", padding:"24px 20px", display:"flex", flexDirection:"column", gap:16, width: "100%" },
  statusRow:   { display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap: "wrap", gap: 8 },
  cancelBtn:   { padding:"5px 14px", borderRadius:8, border:"1px solid #fecaca", background:"#fff", color:"#dc2626", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif" },
  stepper:     { display:"flex", alignItems:"flex-start", background:"#fff", borderRadius:14, padding:"16px 12px", border:"1px solid #e2e8f0", overflowX:"auto" },
  stepItem:    { display:"flex", alignItems:"center", flex:1 },
  stepCircle:  { width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 },
  stepLabel:   { fontSize:10, textAlign:"center", marginTop:4, fontWeight:600, whiteSpace:"nowrap" },
  stepLine:    { flex:1, height:2, margin:"0 4px", marginBottom:20, borderRadius:2 },
  infoCard:    { background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"14px 18px", display:"flex", flexDirection:"column", gap:8 },
  infoRow:     { display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13 },
  infoLabel:   { color:"#94a3b8", fontWeight:600 },
  infoValue:   { color:"#0f172a", fontWeight:700 },
  thread:      { background:"#fff", border:"1px solid #e2e8f0", borderRadius:14, padding:"14px 16px" },
  threadTitle: { fontSize:11, fontWeight:800, color:"#475569", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 },
  threadScroll:{ display:"flex", flexDirection:"column", gap:8, overflowY:"auto" },
  bubble:      { padding:"9px 14px", fontSize:13, lineHeight:1.5 },
  actionCard:  { background:"#fff", border:"1.5px solid #1e3a8a", borderRadius:14, padding:"18px 18px", display:"flex", flexDirection:"column", gap:12 },
  actionTitle: { fontSize:15, fontWeight:700, color:"#0f172a" },
  actionRow:   { display:"flex", gap:8 },
  acceptBtn:   { padding:"11px 0", borderRadius:10, border:"none", background:"#15803d", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif" },
  divider:     { display:"flex", alignItems:"center", gap:8, color:"#94a3b8", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.05em" },
  offerRow:    { display:"flex", gap:8 },
  inputGroup:  { display:"flex", flexDirection:"column", gap:4, flex:1, minWidth:120 },
  inputLabel:  { fontSize:11, fontWeight:700, color:"#64748b" },
  priceInput:  { padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, fontFamily:"'Nunito',sans-serif", outline:"none" },
  msgInput:    { padding:"9px 12px", borderRadius:8, border:"1.5px solid #e2e8f0", fontSize:13, fontFamily:"'Nunito',sans-serif", outline:"none" },
  offerBtn:    { padding:"11px 0", borderRadius:10, border:"none", background:"#1e3a8a", color:"#fff", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif" },
  waitingBox:  { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:12, padding:"16px 18px", fontSize:13, color:"#475569", fontWeight:600 },
  confirmedBox:{ background:"linear-gradient(135deg,#065f46,#15803d)", borderRadius:14, padding:"24px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, color:"#fff", textAlign:"center" },
  confirmedTitle:{ fontSize:20, fontWeight:800 },
  confirmedSub:{ fontSize:13, opacity:0.85 },
  errorBox:    { background:"#fef2f2", border:"1px solid #fecaca", color:"#dc2626", borderRadius:8, padding:"9px 14px", fontSize:13, fontWeight:600 },
};
