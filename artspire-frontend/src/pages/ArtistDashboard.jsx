import { useState, useEffect } from "react";
import axios from "axios";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const STATUS_LABELS = {
  pending_approval: { label: "New Request",   color: "#854d0e", bg: "#fef9c3" },
  negotiating:      { label: "Negotiating",   color: "#1d4ed8", bg: "#eff6ff" },
  price_agreed:     { label: "Price Agreed",  color: "#15803d", bg: "#f0fdf4" },
  payment_pending:  { label: "Awaiting Pay",  color: "#7e22ce", bg: "#faf5ff" },
  confirmed:        { label: "Confirmed",     color: "#15803d", bg: "#dcfce7" },
  cancelled:        { label: "Cancelled",     color: "#7f1d1d", bg: "#fee2e2" },
};

export default function ArtistBookingDashboard({ artistId, artistName }) {
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMsg, setOfferMsg]     = useState("");
  const [sending, setSending]       = useState(false);
  const [error, setError]           = useState("");
  const [filter, setFilter]         = useState("active"); // active | all

  // Join artist's socket room
  useEffect(() => {
    socket.emit("join_artist_room", artistId);

    socket.on("new_booking_request", ({ bookingId }) => {
      fetchBookings();
    });
    socket.on("user_counter", ({ bookingId, price, message }) => {
      setBookings(bs => bs.map(b =>
        b._id === bookingId
          ? { ...b, status: "negotiating", negotiation: [...b.negotiation, { from: "user", price, message, timestamp: new Date() }] }
          : b
      ));
      if (selected?._id === bookingId) {
        setSelected(s => s ? { ...s, negotiation: [...s.negotiation, { from: "user", price, message, timestamp: new Date() }] } : s);
      }
    });
    socket.on("price_accepted", ({ bookingId, price }) => {
      setBookings(bs => bs.map(b => b._id === bookingId ? { ...b, status: "price_agreed", agreedPrice: price } : b));
    });
    socket.on("booking_confirmed", ({ bookingId }) => {
      setBookings(bs => bs.map(b => b._id === bookingId ? { ...b, status: "confirmed" } : b));
    });

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
      setBookings(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [artistId]);

  const openBooking = (b) => {
    setSelected(b);
    // Pre-fill offer price with base price if no negotiation yet
    const lastOffer = [...b.negotiation].reverse().find(m => m.from === "artist");
    setOfferPrice(lastOffer ? lastOffer.price : b.basePrice);
    setOfferMsg("");
    setError("");
  };

  const sendOffer = async () => {
    const price = parseInt(offerPrice);
    if (!price || price <= 0) { setError("Enter a valid price."); return; }
    if (!offerMsg.trim())     { setError("Add a message explaining your price."); return; }
    setSending(true);
    setError("");
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/offer`, { price, message: offerMsg });
      socket.emit("artist_offer", { bookingId: selected._id, price, message: offerMsg, artistId });

      // update local state
      const entry = { from: "artist", price, message: offerMsg, timestamp: new Date() };
      setSelected(s => ({ ...s, status: "negotiating", negotiation: [...s.negotiation, entry] }));
      setBookings(bs => bs.map(b => b._id === selected._id
        ? { ...b, status: "negotiating", negotiation: [...b.negotiation, entry] }
        : b
      ));
      setOfferMsg("");
    } catch (err) {
      setError("Failed to send offer.");
    } finally {
      setSending(false);
    }
  };

  const acceptUserCounter = async (price) => {
    setSending(true);
    try {
      socket.emit("artist_accepts_counter", { bookingId: selected._id, price });
      await new Promise(r => setTimeout(r, 300)); // let socket handler update DB
      setSelected(s => ({ ...s, status: "price_agreed", agreedPrice: price }));
      setBookings(bs => bs.map(b => b._id === selected._id ? { ...b, status: "price_agreed", agreedPrice: price } : b));
    } finally {
      setSending(false);
    }
  };

  const activeBookings = bookings.filter(b => !["confirmed","cancelled"].includes(b.status));
  const displayList    = filter === "active" ? activeBookings : bookings;

  // ── last message in thread ────────────────────────────────────────────────
  const lastUserOffer = selected ? [...selected.negotiation].reverse().find(m => m.from === "user") : null;
  const lastArtistOffer = selected ? [...selected.negotiation].reverse().find(m => m.from === "artist") : null;

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Left panel — booking list */}
      <div style={s.list}>
        <div style={s.listHeader}>
          <div style={s.displayText}>Bookings</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {["active", "all"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ ...s.filterBtn, background: filter === f ? "#1e3a8a" : "transparent", color: filter === f ? "#fff" : "#64748b" }}>
                {f === "active" ? `Active (${activeBookings.length})` : `All (${bookings.length})`}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "24px", color: "#94a3b8", fontSize: 13, fontFamily: "'Nunito',sans-serif" }}>Loading…</div>
        ) : displayList.length === 0 ? (
          <div style={{ padding: "24px", color: "#94a3b8", fontSize: 13, fontFamily: "'Nunito',sans-serif" }}>No bookings yet.</div>
        ) : displayList.map(b => {
          const st = STATUS_LABELS[b.status] || {};
          const hasNew = b.status === "pending_approval" || (b.status === "negotiating" && [...b.negotiation].reverse()[0]?.from === "user");
          return (
            <div key={b._id} onClick={() => openBooking(b)} style={{ ...s.bookingCard, borderColor: selected?._id === b._id ? "#1e3a8a" : "#e2e8f0", background: selected?._id === b._id ? "#eff6ff" : "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#1e293b", fontFamily: "'Nunito',sans-serif" }}>{b.userName}</div>
                  <div style={{ fontSize: 12, color: "#64748b", fontFamily: "'Nunito',sans-serif" }}>{b.eventType} · {b.eventDate}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <span style={{ ...s.badge, background: st.bg, color: st.color }}>{st.label}</span>
                  {hasNew && <span style={{ ...s.badge, background: "#fee2e2", color: "#991b1b" }}>• New</span>}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "'Nunito',sans-serif" }}>
                <span style={{ color: "#64748b" }}>{b.location}</span>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: "#1e3a8a" }}>₹{(b.agreedPrice || b.basePrice).toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right panel — booking detail */}
      <div style={s.detail}>
        {!selected ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", fontFamily: "'Nunito',sans-serif", gap: 8 }}>
            <div style={{ fontSize: 40 }}>📋</div>
            <div style={{ fontSize: 14 }}>Select a booking to review</div>
          </div>
        ) : (
          <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: 16, height: "100%", overflowY: "auto" }}>
            {/* Detail header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={s.displayText}>{selected.userName}</div>
                <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'Nunito',sans-serif" }}>{selected.userEmail}</div>
              </div>
              <span style={{ ...s.badge, background: STATUS_LABELS[selected.status]?.bg, color: STATUS_LABELS[selected.status]?.color, fontSize: 12, padding: "4px 12px" }}>
                {STATUS_LABELS[selected.status]?.label}
              </span>
            </div>

            {/* Event summary */}
            <div style={s.infoCard}>
              {[
                ["Event type",  selected.eventType],
                ["Date",        selected.eventDate],
                ["Time",        selected.eventTime || "TBD"],
                ["Duration",    selected.duration],
                ["Location",    selected.location],
                ["Base price",  `₹${selected.basePrice?.toLocaleString()}`],
                selected.agreedPrice && ["Agreed price", `₹${selected.agreedPrice?.toLocaleString()}`],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k} style={s.infoRow}>
                  <span style={{ color: "#64748b" }}>{k}</span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Negotiation thread */}
            <div>
              <div style={s.sectionLabel}>Price Discussion</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 220, overflowY: "auto" }}>
                {selected.negotiation.map((msg, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "artist" ? "flex-end" : "flex-start", gap: 2 }}>
                    <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'Nunito',sans-serif" }}>
                      {msg.from === "artist" ? "You" : selected.userName}
                    </span>
                    <div style={{ maxWidth: "80%", padding: "9px 13px", borderRadius: msg.from === "artist" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", background: msg.from === "artist" ? "#1e3a8a" : "#f8fafc", border: msg.from === "artist" ? "none" : "1.5px solid #e2e8f0", color: msg.from === "artist" ? "#fff" : "#1e293b", fontSize: 13, fontFamily: "'Nunito',sans-serif", lineHeight: 1.55 }}>
                      {msg.message && <div style={{ marginBottom: msg.price ? 5 : 0 }}>{msg.message}</div>}
                      {msg.price && (
                        <span style={{ display: "inline-flex", background: msg.from === "artist" ? "rgba(255,255,255,0.18)" : "#f0fdf4", color: msg.from === "artist" ? "#fff" : "#15803d", padding: "2px 10px", borderRadius: 20, fontSize: 13, fontWeight: 800, fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 0.5 }}>
                          ₹{msg.price?.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accept user counter (if last message is from user) */}
            {["pending_approval","negotiating"].includes(selected.status) && lastUserOffer && lastUserOffer !== lastArtistOffer && (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#15803d", fontFamily: "'Nunito',sans-serif" }}>User offered ₹{lastUserOffer.price?.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: "#16a34a", fontFamily: "'Nunito',sans-serif" }}>Accept this price to lock it in</div>
                </div>
                <button onClick={() => acceptUserCounter(lastUserOffer.price)} disabled={sending} style={{ ...s.acceptBtn }}>
                  Accept ₹{lastUserOffer.price?.toLocaleString()}
                </button>
              </div>
            )}

            {/* Send offer form */}
            {["pending_approval","negotiating"].includes(selected.status) && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 16px" }}>
                <div style={s.sectionLabel}>Your price offer</div>
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={s.miniLabel}>Your price (₹)</label>
                    <input type="number" value={offerPrice} onChange={e => setOfferPrice(e.target.value)} style={s.input} placeholder="Enter your price" />
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={s.miniLabel}>Message to client</label>
                  <textarea value={offerMsg} onChange={e => setOfferMsg(e.target.value)} placeholder="Explain your price, what's included, any special requirements…" rows={3} style={{ ...s.input, resize: "none" }} />
                </div>
                {/* Quick price suggestions */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {[selected.basePrice, Math.round(selected.basePrice * 1.2), Math.round(selected.basePrice * 1.5)].map(p => (
                    <button key={p} onClick={() => setOfferPrice(p)} style={s.quickChip}>
                      ₹{p.toLocaleString()}
                    </button>
                  ))}
                </div>
                {error && <div style={s.errorBox}>{error}</div>}
                <button onClick={sendOffer} disabled={sending} style={{ ...s.primaryBtn, opacity: sending ? 0.7 : 1, width: "100%" }}>
                  {sending ? "Sending…" : "Send Price Offer →"}
                </button>
              </div>
            )}

            {selected.status === "price_agreed" && (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>🤝</div>
                <div style={{ fontWeight: 800, color: "#15803d", fontFamily: "'Nunito',sans-serif", fontSize: 14 }}>
                  Price agreed at ₹{selected.agreedPrice?.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: "#16a34a", fontFamily: "'Nunito',sans-serif", marginTop: 4 }}>
                  Waiting for client to complete payment.
                </div>
              </div>
            )}

            {selected.status === "confirmed" && (
              <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>🎉</div>
                <div style={{ fontWeight: 800, color: "#15803d", fontFamily: "'Nunito',sans-serif", fontSize: 14 }}>Booking Confirmed!</div>
                <div style={{ fontSize: 12, color: "#16a34a", fontFamily: "'Nunito',sans-serif", marginTop: 4 }}>
                  ₹{selected.paidAmount?.toLocaleString()} received. See you at the event!
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page:        { display: "flex", height: "100vh", fontFamily: "'Nunito',sans-serif", background: "#f8fafc" },
  list:        { width: 320, borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", background: "#fff", flexShrink: 0 },
  listHeader:  { padding: "22px 18px 14px", borderBottom: "1px solid #f1f5f9" },
  displayText: { fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: "#1e3a8a", letterSpacing: 1 },
  filterBtn:   { padding: "5px 12px", borderRadius: 16, border: "1.5px solid #e2e8f0", fontSize: 12, fontWeight: 700, fontFamily: "'Nunito',sans-serif", cursor: "pointer" },
  bookingCard: { padding: "14px 18px", border: "1px solid", borderLeft: "none", borderRight: "none", borderTop: "none", cursor: "pointer", transition: "background 0.15s" },
  detail:      { flex: 1, background: "#f8fafc" },
  infoCard:    { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 16px" },
  infoRow:     { display: "flex", justifyContent: "space-between", fontSize: 13, color: "#1e293b", marginBottom: 7, fontFamily: "'Nunito',sans-serif" },
  badge:       { padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "'Nunito',sans-serif" },
  sectionLabel: { fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontFamily: "'Nunito',sans-serif" },
  miniLabel:   { fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 4, fontFamily: "'Nunito',sans-serif" },
  input:       { padding: "9px 11px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#fff", color: "#1e293b", fontSize: 13, fontWeight: 600, fontFamily: "'Nunito',sans-serif", outline: "none", width: "100%", boxSizing: "border-box" },
  errorBox:    { background: "#fee2e2", color: "#7f1d1d", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 600, marginBottom: 8 },
  primaryBtn:  { background: "#1e3a8a", color: "#fff", border: "none", padding: "11px", borderRadius: 20, fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer" },
  acceptBtn:   { background: "#16a34a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 18, fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer" },
  quickChip:   { background: "#eff6ff", color: "#1d4ed8", border: "none", padding: "5px 12px", borderRadius: 16, fontSize: 12, fontWeight: 700, fontFamily: "'Nunito',sans-serif", cursor: "pointer" },
};