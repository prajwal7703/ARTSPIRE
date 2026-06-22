import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

/* ─── STATUS CONFIG ─────────────────────────────────────────────────────────── */
const STATUS_META = {
  pending_approval: { label: "New Request",  bg: "#fef9c3", color: "#854d0e", dot: "#ca8a04" },
  negotiating:      { label: "Negotiating",  bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  price_agreed:     { label: "Price Agreed", bg: "#f0fdf4", color: "#15803d", dot: "#16a34a" },
  payment_pending:  { label: "Awaiting Pay", bg: "#faf5ff", color: "#7e22ce", dot: "#a855f7" },
  confirmed:        { label: "Confirmed",    bg: "#dcfce7", color: "#15803d", dot: "#16a34a" },
  cancelled:        { label: "Cancelled",    bg: "#fee2e2", color: "#7f1d1d", dot: "#ef4444" },
};

/* ─── HELPERS ────────────────────────────────────────────────────────────────── */
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
const s = (obj) => ({ fontFamily: "'Nunito',sans-serif", ...obj });

/* ─── STATUS BADGE ───────────────────────────────────────────────────────────── */
function StatusBadge({ status, size = "sm" }) {
  const m = STATUS_META[status] || { label: status, bg: "#f1f5f9", color: "#64748b", dot: "#94a3b8" };
  return (
    <span style={s({
      display: "inline-flex", alignItems: "center", gap: 5,
      background: m.bg, color: m.color,
      padding: size === "lg" ? "5px 14px" : "3px 10px",
      borderRadius: 20, fontSize: size === "lg" ? 13 : 11, fontWeight: 700,
    })}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

/* ─── AMOUNT DISPLAY ─────────────────────────────────────────────────────────── */
function AmountDisplay({ booking }) {
  if (booking.paidAmount) {
    return (
      <div style={s({ textAlign: "right" })}>
        <div style={s({ fontSize: 9, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: 1 })}>Received</div>
        <div style={s({ fontSize: 18, fontWeight: 800, color: "#15803d", fontFamily: "'Bebas Neue',sans-serif" })}>₹{fmt(booking.paidAmount)}</div>
      </div>
    );
  }
  if (booking.agreedPrice) {
    return (
      <div style={s({ textAlign: "right" })}>
        <div style={s({ fontSize: 9, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: 1 })}>Agreed</div>
        <div style={s({ fontSize: 18, fontWeight: 800, color: "#1e3a8a", fontFamily: "'Bebas Neue',sans-serif" })}>₹{fmt(booking.agreedPrice)}</div>
      </div>
    );
  }
  return (
    <div style={s({ textAlign: "right" })}>
      <div style={s({ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 })}>Base</div>
      <div style={s({ fontSize: 18, fontWeight: 800, color: "#64748b", fontFamily: "'Bebas Neue',sans-serif" })}>₹{fmt(booking.basePrice)}</div>
    </div>
  );
}

/* ─── BOOKING LIST CARD ──────────────────────────────────────────────────────── */
function BookingCard({ b, isSelected, onClick }) {
  const hasNew =
    b.status === "pending_approval" ||
    (b.status === "negotiating" && [...(b.negotiation || [])].reverse()[0]?.from === "user");

  return (
    <div
      onClick={onClick}
      style={{
        padding: "14px 16px",
        borderBottom: "1px solid #f1f5f9",
        cursor: "pointer",
        background: isSelected ? "#eff6ff" : "#fff",
        borderLeft: `3px solid ${isSelected ? "#1e3a8a" : "transparent"}`,
        transition: "background 0.12s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={s({ fontWeight: 800, fontSize: 14, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" })}>
            {b.userName}
          </div>
          <div style={s({ fontSize: 12, color: "#64748b", marginTop: 1 })}>{b.eventType} · {b.eventDate}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, marginLeft: 8 }}>
          <StatusBadge status={b.status} />
          {hasNew && (
            <span style={s({ fontSize: 10, fontWeight: 800, background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 20 })}>
              ● New
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={s({ fontSize: 11, color: "#94a3b8" })}>📍 {b.location}</span>
        <AmountDisplay booking={b} />
      </div>
    </div>
  );
}

/* ─── NEGOTIATION THREAD ─────────────────────────────────────────────────────── */
function NegThread({ negotiation, userName }) {
  if (!negotiation?.length) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={s({ fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 })}>
        Price Discussion
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto", padding: "2px 0" }}>
        {negotiation.map((msg, i) => {
          const isArtist = msg.from === "artist";
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isArtist ? "flex-end" : "flex-start", gap: 2 }}>
              <span style={s({ fontSize: 10, color: "#94a3b8" })}>{isArtist ? "You" : userName}</span>
              <div style={{
                maxWidth: "80%", padding: "9px 13px",
                borderRadius: isArtist ? "16px 3px 16px 16px" : "3px 16px 16px 16px",
                background: isArtist ? "#1e3a8a" : "#f8fafc",
                border: isArtist ? "none" : "1px solid #e2e8f0",
                color: isArtist ? "#fff" : "#1e293b",
                fontSize: 13, fontFamily: "'Nunito',sans-serif", lineHeight: 1.55,
              }}>
                {msg.message && <div style={{ marginBottom: msg.price ? 5 : 0 }}>{msg.message}</div>}
                {msg.price && (
                  <span style={{
                    display: "inline-block",
                    background: isArtist ? "rgba(255,255,255,0.18)" : "#f0fdf4",
                    color: isArtist ? "#fff" : "#15803d",
                    padding: "2px 10px", borderRadius: 20,
                    fontSize: 13, fontWeight: 800, fontFamily: "'Bebas Neue',sans-serif",
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

/* ─── LIVE STATUS PANEL (shown in detail view below booking info) ────────────── */
function LiveStatusPanel({ booking, onAccept, offerPrice, setOfferPrice, offerMsg, setOfferMsg, onSendOffer, sending, error }) {
  const { status, agreedPrice, paidAmount, basePrice, userName, negotiation } = booking;
  const lastUserOffer = [...(negotiation || [])].reverse().find((m) => m.from === "user");
  const lastArtistOffer = [...(negotiation || [])].reverse().find((m) => m.from === "artist");
  const canAcceptUser = ["pending_approval", "negotiating"].includes(status) && lastUserOffer && lastUserOffer !== lastArtistOffer;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Real-time status tracker */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 16px" }}>
        <div style={s({ fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 })}>
          Booking Progress
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            { key: "pending_approval", label: "Request received",   icon: "📥" },
            { key: "negotiating",      label: "Negotiating price",  icon: "💬" },
            { key: "price_agreed",     label: "Price agreed",       icon: "🤝" },
            { key: "payment_pending",  label: "Payment in progress",icon: "💳" },
            { key: "confirmed",        label: "Booking confirmed",  icon: "✅" },
          ].map((step, idx, arr) => {
            const statuses = ["pending_approval","negotiating","price_agreed","payment_pending","confirmed"];
            const currentIdx = statuses.indexOf(status);
            const stepIdx = statuses.indexOf(step.key);
            const done = stepIdx < currentIdx || (status !== "cancelled" && step.key === status);
            const active = step.key === status && status !== "cancelled";
            const cancelled = status === "cancelled";

            return (
              <div key={step.key} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14,
                    background: cancelled ? "#fee2e2" : done ? (active ? "#1e3a8a" : "#dcfce7") : "#f1f5f9",
                    border: active ? "2px solid #1e3a8a" : "2px solid transparent",
                  }}>
                    {cancelled ? "✕" : done ? (active ? step.icon : "✓") : "○"}
                  </div>
                  {idx < arr.length - 1 && (
                    <div style={{ width: 2, height: 18, background: stepIdx < currentIdx && !cancelled ? "#16a34a" : "#e2e8f0", margin: "2px 0" }} />
                  )}
                </div>
                <div style={{ paddingTop: 4, paddingBottom: idx < arr.length - 1 ? 0 : 0 }}>
                  <div style={s({
                    fontSize: 12, fontWeight: active ? 800 : 600,
                    color: active ? "#1e293b" : done && !cancelled ? "#16a34a" : "#94a3b8",
                    lineHeight: 1.6,
                  })}>
                    {step.label}
                    {active && agreedPrice && step.key === "price_agreed" && (
                      <span style={s({ marginLeft: 6, fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: "#15803d" })}>
                        ₹{fmt(agreedPrice)}
                      </span>
                    )}
                    {active && paidAmount && step.key === "confirmed" && (
                      <span style={s({ marginLeft: 6, fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, color: "#15803d" })}>
                        ₹{fmt(paidAmount)} received
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {status === "cancelled" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✕</div>
              <div style={s({ fontSize: 12, fontWeight: 800, color: "#7f1d1d" })}>Booking cancelled</div>
            </div>
          )}
        </div>
      </div>

      {/* Accept user counter offer */}
      {canAcceptUser && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={s({ fontSize: 13, fontWeight: 800, color: "#15803d" })}>{userName} offered ₹{fmt(lastUserOffer.price)}</div>
            <div style={s({ fontSize: 11, color: "#16a34a", marginTop: 2 })}>Accept to lock this price</div>
          </div>
          <button
            onClick={() => onAccept(lastUserOffer.price)}
            disabled={sending}
            style={s({ background: "#16a34a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer", opacity: sending ? 0.7 : 1 })}
          >
            Accept ₹{fmt(lastUserOffer.price)}
          </button>
        </div>
      )}

      {/* Send offer panel */}
      {["pending_approval", "negotiating"].includes(status) && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "14px 16px" }}>
          <div style={s({ fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 })}>
            Send Your Price
          </div>
          <label style={s({ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4 })}>Your price (₹)</label>
          <input
            type="number"
            value={offerPrice}
            onChange={(e) => setOfferPrice(e.target.value)}
            placeholder="Enter price"
            style={s({ width: "100%", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10 })}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {[basePrice, Math.round(basePrice * 1.2), Math.round(basePrice * 1.5)].map((p) => (
              <button
                key={p}
                onClick={() => setOfferPrice(p)}
                style={s({ background: "#fff", border: "1px solid #e2e8f0", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer" })}
              >
                ₹{fmt(p)}
              </button>
            ))}
          </div>
          <label style={s({ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4 })}>Message to client</label>
          <textarea
            value={offerMsg}
            onChange={(e) => setOfferMsg(e.target.value)}
            placeholder="Explain your offer…"
            rows={3}
            style={s({ width: "100%", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 10 })}
          />
          {error && (
            <div style={s({ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 10 })}>
              {error}
            </div>
          )}
          <button
            onClick={onSendOffer}
            disabled={sending}
            style={s({ background: "#1e3a8a", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer", width: "100%", opacity: sending ? 0.7 : 1 })}
          >
            {sending ? "Sending…" : "Send Price Offer →"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────────── */
import { useSearchParams } from "react-router-dom"; // add this import at the top alongside useNavigate
import { getArtist } from "../utils/auth";            // add this import too

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────────── */
export default function ArtistDashboard() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "bookings";

  const artist   = getArtist();
  const artistId = artist?._id;

  // ✅ If the URL says tab=profile, redirect to the real profile page
  useEffect(() => {
    if (tab === "profile" && artistId) {
      navigate(`/artist-profile/${artistId}`, { replace: true });
    }
  }, [tab, artistId, navigate]);

  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMsg,   setOfferMsg]   = useState("");
  const [sending,    setSending]    = useState(false);
  const [error,      setError]      = useState("");
  const [filter,     setFilter]     = useState("pending_approval");

  /* ── socket listeners ── */
  useEffect(() => {
    if (!artistId) return;
    socket.emit("join_artist_room", artistId);
    socket.on("new_booking_request", fetchBookings);
    socket.on("user_counter", ({ bookingId, price, message }) => {
      const entry = { from: "user", price, message, timestamp: new Date() };
      updateBooking(bookingId, (b) => ({ ...b, status: "negotiating", negotiation: [...(b.negotiation || []), entry] }));
    });
    socket.on("price_accepted", ({ bookingId, price }) =>
      updateBooking(bookingId, (b) => ({ ...b, status: "price_agreed", agreedPrice: price }))
    );
    socket.on("booking_confirmed", ({ bookingId, paidAmount }) =>
      updateBooking(bookingId, (b) => ({ ...b, status: "confirmed", paidAmount }))
    );
    return () => {
      socket.off("new_booking_request");
      socket.off("user_counter");
      socket.off("price_accepted");
      socket.off("booking_confirmed");
    };
  }, [artistId]);

  const updateBooking = (id, fn) => {
    setBookings((bs) => bs.map((b) => (b._id === id ? fn(b) : b)));
    setSelected((s) => (s?._id === id ? fn(s) : s));
  };

  const fetchBookings = async () => {
    if (!artistId) { setLoading(false); return; }
    try {
      const res = await axios.get(`${API}/api/bookings/artist/${artistId}`);
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchBookings(); }, [artistId]);

  const openBooking = (b) => {
    setSelected(b);
    const lastArtist = [...(b.negotiation || [])].reverse().find((m) => m.from === "artist");
    setOfferPrice(lastArtist ? lastArtist.price : b.basePrice);
    setOfferMsg("");
    setError("");
    if (isMobile) setShowDetail(true);
  };

  const sendOffer = async () => {
    const price = parseInt(offerPrice);
    if (!price || price <= 0) { setError("Enter a valid price."); return; }
    if (!offerMsg.trim())     { setError("Add a message."); return; }
    setSending(true); setError("");
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/offer`, { price, message: offerMsg });
      const entry = { from: "artist", price, message: offerMsg, timestamp: new Date() };
      updateBooking(selected._id, (b) => ({ ...b, status: "negotiating", negotiation: [...(b.negotiation || []), entry] }));
      setOfferMsg("");
    } catch {
      setError("Failed to send offer. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const acceptUserCounter = async (price) => {
    setSending(true);
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/artist-accept`, { price });
      updateBooking(selected._id, (b) => ({ ...b, status: "price_agreed", agreedPrice: price }));
    } catch {
      setError("Failed to accept price.");
    } finally {
      setSending(false);
    }
  };

  /* ── filter logic ── */
  const pendingList = bookings.filter((b) => b.status === "pending_approval");
  const ongoingList = bookings.filter((b) => ["negotiating", "price_agreed", "payment_pending"].includes(b.status));
  const pastList    = bookings.filter((b) => ["confirmed", "cancelled"].includes(b.status));

  const displayList =
    filter === "pending_approval" ? pendingList :
    filter === "ongoing"          ? ongoingList :
    filter === "past"             ? pastList    : bookings;

  /* ── detail panel ── */
  const DetailPanel = () => {
    if (!selected) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8", gap: 10, padding: 40 }}>
          <div style={{ fontSize: 40 }}>📋</div>
          <div style={s({ fontSize: 14 })}>Select a booking to review</div>
        </div>
      );
    }
    return (
      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", height: "100%" }}>
        {isMobile && (
          <button
            onClick={() => setShowDetail(false)}
            style={s({ alignSelf: "flex-start", background: "#eff6ff", border: "none", color: "#1e3a8a", padding: "6px 14px", borderRadius: 20, fontWeight: 800, fontSize: 12, cursor: "pointer" })}
          >
            ← Back
          </button>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={s({ fontSize: 20, fontWeight: 800, color: "#1e293b" })}>{selected.userName}</div>
            <div style={s({ fontSize: 12, color: "#94a3b8", marginTop: 2 })}>{selected.userEmail}</div>
          </div>
          <StatusBadge status={selected.status} size="lg" />
        </div>
        <button
          onClick={() => navigate(`/chat/${selected.userId}`)}
          style={s({ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", padding: "10px 14px", borderRadius: 10, width: "100%", fontWeight: 700, cursor: "pointer", fontSize: 13, textAlign: "center" })}
        >
          💬 Chat with {selected.userName}
        </button>
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14 }}>
          {[
            ["Event",     selected.eventType],
            ["Date",      selected.eventDate],
            ["Time",      selected.eventTime || "TBD"],
            ["Duration",  selected.duration],
            ["Location",  selected.location],
            ["Base price", `₹${fmt(selected.basePrice)}`],
            selected.agreedPrice && ["Agreed price", `₹${fmt(selected.agreedPrice)}`],
            selected.discountAmount > 0 && ["Coupon", `${selected.couponCode} (− ₹${fmt(selected.discountAmount)})`],
            selected.paidAmount && ["Amount received", `₹${fmt(selected.paidAmount)}`],
          ].filter(Boolean).map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f8fafc", fontSize: 13, fontFamily: "'Nunito',sans-serif" }}>
              <span style={{ color: "#64748b" }}>{k}</span>
              <span style={{ fontWeight: 700, color: "#1e293b" }}>{v}</span>
            </div>
          ))}
        </div>
        <NegThread negotiation={selected.negotiation} userName={selected.userName} />
        <LiveStatusPanel
          booking={selected}
          onAccept={acceptUserCounter}
          offerPrice={offerPrice}
          setOfferPrice={setOfferPrice}
          offerMsg={offerMsg}
          setOfferMsg={setOfferMsg}
          onSendOffer={sendOffer}
          sending={sending}
          error={error}
        />
      </div>
    );
  };

  const filterTabs = [
    { id: "pending_approval", label: `Requests (${pendingList.length})` },
    { id: "ongoing",          label: `Ongoing (${ongoingList.length})` },
    { id: "past",             label: `Past (${pastList.length})` },
    { id: "all",              label: `All (${bookings.length})` },
  ];

  return (
    <div style={{ display: "flex", height: "100%", fontFamily: "'Nunito',sans-serif" }}>
      {(!isMobile || !showDetail) && (
        <div style={{
          width: isMobile ? "100%" : 320,
          borderRight: "1px solid #e2e8f0",
          display: "flex", flexDirection: "column",
          background: "#fff", flexShrink: 0, overflowY: "auto",
        }}>
          <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #f1f5f9", position: "sticky", top: 0, background: "#fff", zIndex: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={s({ fontSize: 18, fontWeight: 800, color: "#1e293b" })}>Bookings</div>
              <button
                onClick={() => navigate(`/artist-profile/${artistId}`)}
                style={s({ background: "#f1f5f9", border: "none", color: "#1e293b", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer" })}
              >
                👤 Profile
              </button>
            </div>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  style={s({
                    border: "none", padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", whiteSpace: "nowrap",
                    background: filter === tab.id ? "#1e3a8a" : "transparent",
                    color: filter === tab.id ? "#fff" : "#64748b",
                  })}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={s({ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 })}>Loading…</div>
          ) : displayList.length === 0 ? (
            <div style={s({ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 })}>No bookings in this category.</div>
          ) : (
            displayList.map((b) => (
              <BookingCard key={b._id} b={b} isSelected={selected?._id === b._id} onClick={() => openBooking(b)} />
            ))
          )}
        </div>
      )}
      {(!isMobile || showDetail) && (
        <div style={{ flex: 1, background: "#f8fafc", overflowY: "auto" }}>
          <DetailPanel />
        </div>
      )}
    </div>
  );
}