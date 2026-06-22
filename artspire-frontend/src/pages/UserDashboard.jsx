// artspire-frontend/src/pages/UserDashboard.jsx

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../socket";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n).toLocaleString("en-IN");

const getCurrentAccount = () => {
  try {
    return (
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(localStorage.getItem("artist")) ||
      null
    );
  } catch { return null; }
};

const STATUS_META = {
  pending_approval: { label: "Pending Approval", color: "#b45309", bg: "#fef3c7", dot: "#f59e0b" },
  negotiating:      { label: "Negotiating",       color: "#1d4ed8", bg: "#eff6ff", dot: "#3b82f6" },
  price_agreed:     { label: "Price Agreed",      color: "#15803d", bg: "#f0fdf4", dot: "#22c55e" },
  payment_pending:  { label: "Pay Now",           color: "#7c3aed", bg: "#f5f3ff", dot: "#8b5cf6" },
  confirmed:        { label: "Confirmed ✓",       color: "#065f46", bg: "#ecfdf5", dot: "#10b981" },
  cancelled:        { label: "Cancelled",         color: "#7f1d1d", bg: "#fef2f2", dot: "#ef4444" },
};

const STEPS = [
  { key: "pending_approval", label: "Request Sent",  icon: "📤" },
  { key: "negotiating",      label: "Negotiating",   icon: "💬" },
  { key: "price_agreed",     label: "Price Agreed",  icon: "🤝" },
  { key: "payment_pending",  label: "Payment",       icon: "💳" },
  { key: "confirmed",        label: "Confirmed",     icon: "✅" },
];

const STEP_ORDER = STEPS.map((s) => s.key);

function stepIndex(status) {
  const i = STEP_ORDER.indexOf(status);
  return i === -1 ? 0 : i;
}

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ── main component ────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const account  = getCurrentAccount();
  const userId   = account?._id;
  const navigate = useNavigate();

  const [bookings,     setBookings]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [tab,          setTab]          = useState("active");
  const [sending,      setSending]      = useState(false);
  const [paying,       setPaying]       = useState(false);
  const [err,          setErr]          = useState("");
  const [payErr,       setPayErr]       = useState("");
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMsg,   setCounterMsg]   = useState("");
  const threadRef = useRef(null);

  // ── fetch ──
  const fetchBookings = async () => {
    if (!userId) return;
    try {
      const { data } = await axios.get(`${API}/api/bookings/user/${userId}`);
      setBookings(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, [userId]);

  // ── scroll thread to bottom when negotiation updates ──
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [selected?.negotiation?.length]);

  // ── socket ──
  useEffect(() => {
    if (!userId) return;
    socket.emit("join_user_room", userId);

    const applyUpdate = (bookingId, patch) => {
      setBookings((bs) => bs.map((b) => b._id === bookingId ? { ...b, ...patch } : b));
      setSelected((s)  => s?._id === bookingId ? { ...s, ...patch } : s);
    };

    socket.on("booking_offer", ({ bookingId, price, message, status }) => {
      const entry = { from: "artist", price, message, timestamp: new Date().toISOString() };
      setBookings((bs) => bs.map((b) => {
        if (b._id !== bookingId) return b;
        return {
          ...b,
          status,
          agreedPrice: status === "price_agreed" ? price : b.agreedPrice,
          negotiation: [...(b.negotiation || []), entry],
        };
      }));
      setSelected((s) => {
        if (!s || s._id !== bookingId) return s;
        return {
          ...s,
          status,
          agreedPrice: status === "price_agreed" ? price : s.agreedPrice,
          negotiation: [...(s.negotiation || []), entry],
        };
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
      socket.off("booking_offer");
      socket.off("price_accepted");
      socket.off("booking_confirmed");
      socket.off("booking_cancelled");
    };
  }, [userId]);

  // ── select a booking ──
  const openBooking = (b) => {
    setSelected(b);
    setErr(""); setPayErr("");
    setCounterPrice(""); setCounterMsg("");
  };

  // ── accept artist offer ──
  const acceptOffer = async (price) => {
    setSending(true); setErr("");
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/user-accept`, { price });
      const patch = { status: "price_agreed", agreedPrice: price };
      setSelected((s) => ({ ...s, ...patch }));
      setBookings((bs) => bs.map((b) => b._id === selected._id ? { ...b, ...patch } : b));
    } catch { setErr("Failed to accept offer. Try again."); }
    finally { setSending(false); }
  };

  // ── send counter offer ──
  const sendCounter = async () => {
    const price = parseInt(counterPrice, 10);
    if (!price || price <= 0) { setErr("Enter a valid price."); return; }
    setSending(true); setErr("");
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/counter`, {
        price, message: counterMsg,
      });
      const entry = { from: "user", price, message: counterMsg, timestamp: new Date().toISOString() };
      const patch  = { status: "negotiating", negotiation: [...(selected.negotiation || []), entry] };
      setSelected((s) => ({ ...s, ...patch }));
      setBookings((bs) => bs.map((b) => b._id === selected._id ? { ...b, ...patch } : b));
      setCounterPrice(""); setCounterMsg("");
    } catch { setErr("Failed to send your price. Try again."); }
    finally { setSending(false); }
  };

  // ── pay ──
  const payNow = async () => {
    setPaying(true); setPayErr("");
    try {
      const { data: orderData } = await axios.post(`${API}/api/bookings/create-order`, {
        bookingId: selected._id,
      });
      const { orderId, amount, keyId, demo } = orderData;

      if (demo) {
        await confirmPayment({ paymentId: `demo_${Date.now()}`, orderId, signature: null });
        return;
      }

      const ok = await loadRazorpay();
      if (!ok) { setPayErr("Could not load payment gateway."); setPaying(false); return; }

      const rzp = new window.Razorpay({
        key:         keyId,
        amount,
        currency:    "INR",
        name:        "Artspire",
        description: selected.eventType,
        order_id:    orderId,
        prefill:     { name: account?.name || "", email: account?.email || "" },
        theme:       { color: "#1e3a8a" },
        handler: async (r) => {
          await confirmPayment({
            paymentId: r.razorpay_payment_id,
            orderId:   r.razorpay_order_id,
            signature: r.razorpay_signature,
          });
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (e) {
      setPayErr(e.response?.data?.error || "Payment failed. Try again.");
      setPaying(false);
    }
  };

  const confirmPayment = async ({ paymentId, orderId, signature }) => {
    try {
      const { data } = await axios.post(`${API}/api/bookings/${selected._id}/confirm-payment`, {
        paymentId, orderId, signature,
      });
      const updated = data.booking;
      setSelected((s) => ({ ...s, ...updated }));
      setBookings((bs) => bs.map((b) => b._id === selected._id ? { ...b, ...updated } : b));
    } catch (e) {
      setPayErr(e.response?.data?.error || "Payment verification failed. Contact support if money was deducted.");
    } finally { setPaying(false); }
  };

  // ── cancel ──
  const cancelBooking = async () => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/cancel`, { cancelledBy: "user" });
      const patch = { status: "cancelled" };
      setSelected((s) => ({ ...s, ...patch }));
      setBookings((bs) => bs.map((b) => b._id === selected._id ? { ...b, ...patch } : b));
    } catch { setErr("Could not cancel. Try again."); }
  };

  // ── derived data ──
  const activeBookings  = bookings.filter((b) => !["confirmed", "cancelled"].includes(b.status));
  const list            = tab === "active" ? activeBookings : bookings;
  const lastArtistOffer = selected
    ? [...(selected.negotiation || [])].reverse().find((m) => m.from === "artist")
    : null;
  const canCounter = selected &&
    ["pending_approval", "negotiating"].includes(selected.status) &&
    lastArtistOffer;

  // ── render ──
  return (
    <div style={styles.page}>
      {/* ── LEFT PANEL ── */}
      <div style={styles.left}>

        {/* Header */}
        <div style={styles.leftHeader}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <h2 style={styles.pageTitle}>My Bookings</h2>

            {/* ✅ Messages button */}
            <button
              onClick={() => navigate("/user-chat")}
              style={{
                padding:     "6px 14px",
                borderRadius: 20,
                border:      "1.5px solid #1e3a8a",
                background:  "#eff6ff",
                color:       "#1e3a8a",
                fontSize:    12,
                fontWeight:  800,
                cursor:      "pointer",
                fontFamily:  "'Nunito', sans-serif",
                display:     "flex",
                alignItems:  "center",
                gap:         5,
                whiteSpace:  "nowrap",
              }}
            >
              💬 Messages
            </button>
          </div>

          <p style={styles.pageSubtitle}>Track your requests with artists</p>

          <div style={styles.tabGroup}>
            {["active", "all"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{ ...styles.tabBtn, ...(tab === t ? styles.tabActive : {}) }}
              >
                {t === "active" ? `Active (${activeBookings.length})` : `All (${bookings.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div style={styles.list}>
          {loading ? (
            <div style={styles.empty}>Loading your bookings…</div>
          ) : list.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🎨</div>
              <div>{tab === "active" ? "No active bookings." : "No bookings yet."}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                Find an artist and send a booking request!
              </div>
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

      {/* ── RIGHT PANEL (detail) ── */}
      <div style={styles.right}>
        {!selected ? (
          <div style={styles.placeholder}>
            <div style={{ fontSize: 52 }}>📋</div>
            <div style={{ fontSize: 15, color: "#64748b", marginTop: 8 }}>
              Select a booking to view details
            </div>
          </div>
        ) : (
          <div style={styles.detail}>

            {/* Status badge */}
            <div style={styles.statusRow}>
              <StatusBadge status={selected.status} />
              {!["confirmed", "cancelled"].includes(selected.status) && (
                <button onClick={cancelBooking} style={styles.cancelBtn}>Cancel</button>
              )}
            </div>

            {/* Progress stepper */}
            {selected.status !== "cancelled" && (
              <Stepper currentStatus={selected.status} />
            )}

            {/* Booking info */}
            <BookingInfo booking={selected} />

            {/* Negotiation thread */}
            <NegThread
              negotiation={selected.negotiation}
              userName={selected.userName}
              threadRef={threadRef}
            />

            {/* ── ACTION AREA ── */}
            {err && <div style={styles.errorBox}>{err}</div>}

            {/* ARTIST sent an offer → user can accept or counter */}
            {canCounter && selected.status !== "price_agreed" && (
              <div style={styles.actionCard}>
                <div style={styles.actionTitle}>
                  Artist's offer:{" "}
                  <strong style={{ color: "#1e3a8a" }}>₹{fmt(lastArtistOffer.price)}</strong>
                </div>
                <div style={styles.actionRow}>
                  <button
                    onClick={() => acceptOffer(lastArtistOffer.price)}
                    disabled={sending}
                    style={styles.acceptBtn}
                  >
                    {sending ? "…" : `✓ Accept ₹${fmt(lastArtistOffer.price)}`}
                  </button>
                </div>
                <div style={styles.divider}><span>or send a counter offer</span></div>
                <div style={styles.counterRow}>
                  <input
                    type="number"
                    placeholder="Your price (₹)"
                    value={counterPrice}
                    onChange={(e) => setCounterPrice(e.target.value)}
                    style={styles.priceInput}
                  />
                  <input
                    type="text"
                    placeholder="Add a note (optional)"
                    value={counterMsg}
                    onChange={(e) => setCounterMsg(e.target.value)}
                    style={styles.msgInput}
                  />
                  <button onClick={sendCounter} disabled={sending} style={styles.sendBtn}>
                    {sending ? "…" : "Send →"}
                  </button>
                </div>
              </div>
            )}

            {/* Waiting for artist to respond */}
            {selected.status === "negotiating" && !canCounter && (
              <div style={styles.waitingBox}>
                ⏳ Waiting for artist to respond to your offer…
              </div>
            )}

            {/* Pending approval */}
            {selected.status === "pending_approval" && !lastArtistOffer && (
              <div style={styles.waitingBox}>
                📤 Request sent! Waiting for the artist to review and send a price.
              </div>
            )}

            {/* Price agreed → pay */}
            {selected.status === "price_agreed" && (
              <div style={styles.payCard}>
                <div style={styles.payTitle}>🎉 Price agreed — ₹{fmt(selected.agreedPrice)}</div>
                <div style={styles.paySubtitle}>Complete payment to confirm your booking.</div>
                {payErr && <div style={styles.errorBox}>{payErr}</div>}
                <button onClick={payNow} disabled={paying} style={styles.payBtn}>
                  {paying ? "Processing…" : `Pay ₹${fmt(selected.agreedPrice)}`}
                </button>
              </div>
            )}

            {/* Payment pending */}
            {selected.status === "payment_pending" && (
              <div style={styles.waitingBox}>
                💳 Payment window was opened. If it closed, click below to retry.
                {payErr && <div style={{ ...styles.errorBox, marginTop: 8 }}>{payErr}</div>}
                <button onClick={payNow} disabled={paying} style={{ ...styles.payBtn, marginTop: 10 }}>
                  {paying ? "Processing…" : "Retry Payment"}
                </button>
              </div>
            )}

            {/* Confirmed */}
            {selected.status === "confirmed" && (
              <div style={styles.confirmedBox}>
                <div style={{ fontSize: 32 }}>🎊</div>
                <div style={styles.confirmedTitle}>Booking Confirmed!</div>
                <div style={styles.confirmedSub}>
                  Paid ₹{fmt(selected.paidAmount || selected.agreedPrice)} · The artist will contact you soon.
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

// ── sub-components ────────────────────────────────────────────────────────────

function BookingCard({ booking, selected, onClick }) {
  const meta = STATUS_META[booking.status] || {};
  return (
    <div onClick={onClick} style={{ ...styles.card, ...(selected ? styles.cardSelected : {}) }}>
      <div style={styles.cardTop}>
        <div style={styles.cardArtist}>{booking.artistName}</div>
        <span style={{ ...styles.badge, color: meta.color, background: meta.bg }}>
          <span style={{ ...styles.dot, background: meta.dot }} />
          {meta.label}
        </span>
      </div>
      <div style={styles.cardEvent}>{booking.eventType} · {booking.eventDate}</div>
      <div style={styles.cardLocation}>📍 {booking.location}</div>
      {booking.agreedPrice && (
        <div style={styles.cardPrice}>₹{fmt(booking.agreedPrice)}</div>
      )}
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

function Stepper({ currentStatus }) {
  const ci = stepIndex(currentStatus);
  return (
    <div style={styles.stepper}>
      {STEPS.map((step, i) => {
        const done   = i < ci;
        const active = i === ci;
        return (
          <div key={step.key} style={styles.stepItem}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                ...styles.stepCircle,
                background: done ? "#1e3a8a" : active ? "#3b82f6" : "#e2e8f0",
                color:      done || active ? "#fff" : "#94a3b8",
                fontSize:   done ? 12 : 14,
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
              <div style={{ ...styles.stepLine, background: done ? "#1e3a8a" : "#e2e8f0" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BookingInfo({ booking }) {
  const rows = [
    ["Artist",    booking.artistName],
    ["Event",     booking.eventType],
    ["Date",      booking.eventDate],
    booking.eventTime && ["Time",     booking.eventTime],
    ["Location",  booking.location],
    booking.duration && ["Duration", booking.duration],
    ["Base Price", `₹${fmt(booking.basePrice)}`],
    booking.agreedPrice && ["Agreed Price", `₹${fmt(booking.agreedPrice)}`],
    booking.paidAmount  && ["Paid",         `₹${fmt(booking.paidAmount)}`],
  ].filter(Boolean);

  return (
    <div style={styles.infoCard}>
      {rows.map(([label, value]) => (
        <div key={label} style={styles.infoRow}>
          <span style={styles.infoLabel}>{label}</span>
          <span style={styles.infoValue}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function NegThread({ negotiation, userName, threadRef }) {
  if (!negotiation?.length) return null;
  return (
    <div style={styles.thread}>
      <div style={styles.threadTitle}>Price Discussion</div>
      <div ref={threadRef} style={styles.threadScroll}>
        {negotiation.map((msg, i) => {
          const isArtist = msg.from === "artist";
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isArtist ? "flex-start" : "flex-end", gap: 2 }}>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>
                {isArtist ? "Artist" : "You"}
              </span>
              <div style={{
                ...styles.bubble,
                background:   isArtist ? "#f1f5f9" : "#1e3a8a",
                color:        isArtist ? "#1e293b" : "#fff",
                borderRadius: isArtist ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
              }}>
                {msg.message && <div style={{ marginBottom: msg.price ? 4 : 0 }}>{msg.message}</div>}
                {msg.price && (
                  <span style={{
                    display:      "inline-block",
                    background:   isArtist ? "#1e3a8a" : "rgba(255,255,255,0.2)",
                    color:        "#fff",
                    padding:      "2px 10px",
                    borderRadius: 20,
                    fontSize:     13,
                    fontWeight:   700,
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
  page: {
    display:       "flex",
    height:        "100vh",
    fontFamily:    "'Nunito', 'Inter', sans-serif",
    background:    "#f8fafc",
    overflow:      "hidden",
  },
  left: {
    width:         340,
    minWidth:      300,
    display:       "flex",
    flexDirection: "column",
    borderRight:   "1px solid #e2e8f0",
    background:    "#fff",
  },
  leftHeader: {
    padding:      "20px 18px 14px",
    borderBottom: "1px solid #f1f5f9",
  },
  pageTitle: {
    margin:        0,
    fontSize:      20,
    fontWeight:    800,
    color:         "#0f172a",
    letterSpacing: "-0.02em",
  },
  pageSubtitle: {
    margin:   "2px 0 12px",
    fontSize: 12,
    color:    "#94a3b8",
  },
  tabGroup: {
    display: "flex",
    gap:     6,
  },
  tabBtn: {
    padding:      "5px 12px",
    borderRadius: 20,
    border:       "1px solid #e2e8f0",
    background:   "transparent",
    fontSize:     12,
    color:        "#64748b",
    cursor:       "pointer",
    fontFamily:   "'Nunito', sans-serif",
    fontWeight:   600,
  },
  tabActive: {
    background: "#1e3a8a",
    color:      "#fff",
    border:     "1px solid #1e3a8a",
  },
  list: {
    flex:          1,
    overflowY:     "auto",
    padding:       "10px 12px",
    display:       "flex",
    flexDirection: "column",
    gap:           8,
  },
  empty: {
    textAlign:  "center",
    padding:    "40px 20px",
    color:      "#64748b",
    fontSize:   14,
    fontWeight: 600,
  },
  card: {
    padding:      "14px 16px",
    borderRadius: 12,
    border:       "1px solid #e2e8f0",
    cursor:       "pointer",
    background:   "#fff",
    transition:   "all 0.15s",
  },
  cardSelected: {
    borderColor: "#1e3a8a",
    background:  "#f0f4ff",
    boxShadow:   "0 0 0 2px #1e3a8a22",
  },
  cardTop: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
    marginBottom:   6,
  },
  cardArtist: {
    fontSize:   14,
    fontWeight: 800,
    color:      "#0f172a",
  },
  cardEvent: {
    fontSize: 12,
    color:    "#475569",
    margin:   "2px 0",
  },
  cardLocation: {
    fontSize: 11,
    color:    "#94a3b8",
  },
  cardPrice: {
    fontSize:   13,
    fontWeight: 800,
    color:      "#1e3a8a",
    marginTop:  4,
  },
  badge: {
    display:      "inline-flex",
    alignItems:   "center",
    gap:          5,
    padding:      "3px 10px",
    borderRadius: 20,
    fontSize:     11,
    fontWeight:   700,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: "50%",
    flexShrink:   0,
  },
  right: {
    flex:      1,
    overflowY: "auto",
    background:"#f8fafc",
  },
  placeholder: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    justifyContent: "center",
    height:         "100%",
    color:          "#94a3b8",
  },
  detail: {
    maxWidth:      680,
    margin:        "0 auto",
    padding:       "24px 20px",
    display:       "flex",
    flexDirection: "column",
    gap:           16,
  },
  statusRow: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
  },
  cancelBtn: {
    padding:      "5px 14px",
    borderRadius: 8,
    border:       "1px solid #fecaca",
    background:   "#fff",
    color:        "#dc2626",
    fontSize:     12,
    fontWeight:   700,
    cursor:       "pointer",
    fontFamily:   "'Nunito', sans-serif",
  },
  stepper: {
    display:    "flex",
    alignItems: "flex-start",
    background: "#fff",
    borderRadius: 14,
    padding:    "16px 12px",
    border:     "1px solid #e2e8f0",
    overflowX:  "auto",
  },
  stepItem: {
    display:    "flex",
    alignItems: "center",
    flex:       1,
  },
  stepCircle: {
    width:          36,
    height:         36,
    borderRadius:   "50%",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontSize:       16,
    flexShrink:     0,
    transition:     "all 0.3s",
  },
  stepLabel: {
    fontSize:   10,
    textAlign:  "center",
    marginTop:  4,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  stepLine: {
    flex:         1,
    height:       2,
    margin:       "0 4px",
    marginBottom: 20,
    borderRadius: 2,
  },
  infoCard: {
    background:    "#fff",
    border:        "1px solid #e2e8f0",
    borderRadius:  14,
    padding:       "14px 18px",
    display:       "flex",
    flexDirection: "column",
    gap:           8,
  },
  infoRow: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
    fontSize:       13,
  },
  infoLabel: {
    color:      "#94a3b8",
    fontWeight: 600,
  },
  infoValue: {
    color:      "#0f172a",
    fontWeight: 700,
  },
  thread: {
    background:   "#fff",
    border:       "1px solid #e2e8f0",
    borderRadius: 14,
    padding:      "14px 16px",
  },
  threadTitle: {
    fontSize:      11,
    fontWeight:    800,
    color:         "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom:  10,
  },
  threadScroll: {
    display:       "flex",
    flexDirection: "column",
    gap:           8,
    maxHeight:     220,
    overflowY:     "auto",
  },
  bubble: {
    maxWidth:   "80%",
    padding:    "9px 14px",
    fontSize:   13,
    lineHeight: 1.5,
  },
  actionCard: {
    background:    "#fff",
    border:        "1.5px solid #1e3a8a",
    borderRadius:  14,
    padding:       "18px 18px",
    display:       "flex",
    flexDirection: "column",
    gap:           12,
  },
  actionTitle: {
    fontSize:   15,
    fontWeight: 700,
    color:      "#0f172a",
  },
  actionRow: {
    display: "flex",
    gap:     8,
  },
  acceptBtn: {
    flex:         1,
    padding:      "11px 0",
    borderRadius: 10,
    border:       "none",
    background:   "#15803d",
    color:        "#fff",
    fontSize:     14,
    fontWeight:   700,
    cursor:       "pointer",
    fontFamily:   "'Nunito', sans-serif",
  },
  divider: {
    display:       "flex",
    alignItems:    "center",
    gap:           8,
    color:         "#94a3b8",
    fontSize:      11,
    fontWeight:    600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  counterRow: {
    display:  "flex",
    gap:      8,
    flexWrap: "wrap",
  },
  priceInput: {
    width:        100,
    padding:      "9px 12px",
    borderRadius: 8,
    border:       "1.5px solid #e2e8f0",
    fontSize:     13,
    fontFamily:   "'Nunito', sans-serif",
    outline:      "none",
  },
  msgInput: {
    flex:         1,
    minWidth:     120,
    padding:      "9px 12px",
    borderRadius: 8,
    border:       "1.5px solid #e2e8f0",
    fontSize:     13,
    fontFamily:   "'Nunito', sans-serif",
    outline:      "none",
  },
  sendBtn: {
    padding:      "9px 16px",
    borderRadius: 8,
    border:       "none",
    background:   "#1e3a8a",
    color:        "#fff",
    fontSize:     13,
    fontWeight:   700,
    cursor:       "pointer",
    fontFamily:   "'Nunito', sans-serif",
    whiteSpace:   "nowrap",
  },
  waitingBox: {
    background:    "#f8fafc",
    border:        "1px solid #e2e8f0",
    borderRadius:  12,
    padding:       "16px 18px",
    fontSize:      13,
    color:         "#475569",
    fontWeight:    600,
    display:       "flex",
    flexDirection: "column",
    gap:           6,
  },
  payCard: {
    background:    "linear-gradient(135deg,#1e3a8a,#1d4ed8)",
    borderRadius:  14,
    padding:       "20px 20px",
    display:       "flex",
    flexDirection: "column",
    gap:           8,
    color:         "#fff",
  },
  payTitle: {
    fontSize:   17,
    fontWeight: 800,
  },
  paySubtitle: {
    fontSize: 13,
    opacity:  0.8,
  },
  payBtn: {
    marginTop:     4,
    padding:       "12px 0",
    borderRadius:  10,
    border:        "none",
    background:    "#fff",
    color:         "#1e3a8a",
    fontSize:      15,
    fontWeight:    800,
    cursor:        "pointer",
    fontFamily:    "'Nunito', sans-serif",
    letterSpacing: "-0.01em",
  },
  confirmedBox: {
    background:    "linear-gradient(135deg,#065f46,#15803d)",
    borderRadius:  14,
    padding:       "24px 20px",
    display:       "flex",
    flexDirection: "column",
    alignItems:    "center",
    gap:           6,
    color:         "#fff",
    textAlign:     "center",
  },
  confirmedTitle: {
    fontSize:   20,
    fontWeight: 800,
  },
  confirmedSub: {
    fontSize: 13,
    opacity:  0.85,
  },
  errorBox: {
    background:   "#fef2f2",
    border:       "1px solid #fecaca",
    color:        "#dc2626",
    borderRadius: 8,
    padding:      "9px 14px",
    fontSize:     13,
    fontWeight:   600,
  },
};