import { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

const EVENT_TYPES = [
  "Wedding", "Birthday Party", "Corporate Event",
  "Concert", "Private Party", "Photoshoot",
  "Art Exhibition", "Festival", "Other",
];
const DURATIONS = ["1 hour", "2 hours", "3 hours", "4 hours", "Half Day", "Full Day"];

// booking status flow:
// pending_approval → negotiating → price_agreed → payment_pending → confirmed

export default function BookingModal({ artist, currentUser, onClose, onSuccess }) {
  const [step, setStep]       = useState(1); // 1=event, 2=negotiation, 3=payment, 4=success
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [bookingId, setBookingId] = useState(null);

  const [form, setForm] = useState({
    eventType: "",
    eventDate: "",
    eventTime: "",
    location:  "",
    duration:  "2 hours",
    message:   "",
  });

  // negotiation state
  const [thread, setThread]         = useState([]);  // [{from, price, message, ts}]
  const [agreedPrice, setAgreedPrice] = useState(null);
  const [negoStatus, setNegoStatus] = useState("waiting"); // waiting | replied | agreed
  const [counterAmt, setCounterAmt] = useState("");
  const [counterMsg, setCounterMsg] = useState("");

  // payment state
  const [payMode, setPayMode] = useState("advance"); // advance | full
  const [paidAmount, setPaidAmount] = useState(null);

  const threadRef = useRef(null);
  const change = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const basePrice = artist.price || 12000;
  const advanceAmount = agreedPrice ? Math.round(agreedPrice * 0.3) : 0;
  const balanceAmount  = agreedPrice ? agreedPrice - advanceAmount : 0;

  // ── Socket: listen for artist's negotiation reply ──────────────────────────
  useEffect(() => {
    if (!bookingId) return;

    const handleOffer = (data) => {
      if (data.bookingId !== bookingId) return;
      const msg = { from: "artist", price: data.price, message: data.message, ts: new Date() };
      setThread(t => [...t, msg]);
      setNegoStatus(data.status === "price_agreed" ? "agreed" : "replied");
      if (data.status === "price_agreed") setAgreedPrice(data.price);
    };

    socket.on("booking_offer", handleOffer);
    return () => socket.off("booking_offer", handleOffer);
  }, [bookingId]);

  // auto-scroll thread
  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [thread]);

  // ── Step 1 → submit request ────────────────────────────────────────────────
  const submitRequest = async () => {
    if (!form.eventType || !form.eventDate || !form.location) {
      setError("Please fill all required fields."); return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/bookings/request`, {
        artistId:   artist._id,
        artistName: artist.name,
        userId:     currentUser?._id || "",
        userName:   currentUser?.name || "Guest",
        userEmail:  currentUser?.email || "",
        basePrice,
        ...form,
      });
      setBookingId(res.data.bookingId);
      // seed thread with the initial request as first user entry
      setThread([{
        from: "user",
        price: basePrice,
        message: form.message || "Requesting booking at base price.",
        ts: new Date(),
      }]);
      socket.emit("booking_request", { artistId: artist._id, bookingId: res.data.bookingId });
      setStep(2);
    } catch (err) {
      setError("Failed to send request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 → user sends counter offer ─────────────────────────────────────
  const sendCounter = async () => {
    const amt = parseInt(counterAmt);
    if (!amt || amt <= 0) { setError("Enter a valid amount."); return; }
    if (!counterMsg.trim()) { setError("Add a message with your offer."); return; }
    setError("");
    setLoading(true);
    try {
      await axios.post(`${API}/api/bookings/${bookingId}/counter`, {
        from:    "user",
        price:   amt,
        message: counterMsg,
      });
      setThread(t => [...t, { from: "user", price: amt, message: counterMsg, ts: new Date() }]);
      setNegoStatus("waiting");
      setCounterAmt("");
      setCounterMsg("");
      socket.emit("user_counter", { artistId: artist._id, bookingId, price: amt, message: counterMsg });
    } catch (err) {
      setError("Failed to send counter. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── User accepts artist's price ────────────────────────────────────────────
  const acceptPrice = async (price) => {
    setLoading(true);
    try {
      await axios.post(`${API}/api/bookings/${bookingId}/accept`, { price });
      setAgreedPrice(price);
      setNegoStatus("agreed");
      socket.emit("price_accepted", { artistId: artist._id, bookingId, price });
      setStep(3);
    } catch (err) {
      setError("Failed to accept price. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3 → payment ───────────────────────────────────────────────────────
  const handlePay = async () => {
    const amount = payMode === "advance" ? advanceAmount : agreedPrice;
    setError("");
    setLoading(true);
    try {
      const orderRes = await axios.post(`${API}/api/bookings/create-order`, { amount });
      const { orderId, demo } = orderRes.data;

      if (demo || !RAZORPAY_KEY) {
        await confirmPayment(null, orderId, amount);
        return;
      }

      if (!window.Razorpay) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = res; s.onerror = rej;
          document.body.appendChild(s);
        });
      }

      const rzp = new window.Razorpay({
        key:         RAZORPAY_KEY,
        amount:      amount * 100,
        currency:    "INR",
        name:        "ArtSpire",
        description: `${payMode === "advance" ? "Advance" : "Full"} payment for ${artist.name}`,
        order_id:    orderId,
        prefill: {
          name:  currentUser?.name  || "",
          email: currentUser?.email || "",
        },
        theme: { color: "#1e3a8a" },
        handler: async (response) => {
          await confirmPayment(response.razorpay_payment_id, orderId, amount);
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      rzp.open();
    } catch (err) {
      setError("Payment failed. Please try again.");
      setLoading(false);
    }
  };

  const confirmPayment = async (paymentId, orderId, amount) => {
    try {
      await axios.post(`${API}/api/bookings/${bookingId}/confirm-payment`, {
        paymentId,
        orderId,
        amount,
        payMode,
        agreedPrice,
      });
      setPaidAmount(amount);
      socket.emit("booking_confirmed", {
        artistId: artist._id,
        bookingId,
        userName: currentUser?.name || "Someone",
        eventType: form.eventType,
        eventDate: form.eventDate,
      });
      setStep(4);
    } catch (err) {
      setError("Booking confirmation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const lastArtistPrice = [...thread].reverse().find(m => m.from === "artist")?.price;

  // ── Render: success ────────────────────────────────────────────────────────
  if (step === 4) return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, textAlign: "center" }}>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
        <div style={{ padding: "40px 28px 28px" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
          <div style={s.displayText}>Booking Confirmed!</div>
          <div style={{ fontSize: 14, color: "#64748b", fontFamily: "'Nunito',sans-serif", marginBottom: 24 }}>
            <strong>₹{paidAmount?.toLocaleString()}</strong> paid.{" "}
            <strong>{artist.name}</strong> is confirmed for your <strong>{form.eventType}</strong>.
          </div>

          <div style={s.summaryCard}>
            {[
              ["Event",   form.eventType],
              ["Date",    form.eventDate],
              ["Time",    form.eventTime || "TBD"],
              ["Location",form.location],
              ["Duration",form.duration],
              ["Agreed price", `₹${agreedPrice?.toLocaleString()}`],
              ["Paid now", `₹${paidAmount?.toLocaleString()}`],
              payMode === "advance" && ["Balance due on event day", `₹${balanceAmount?.toLocaleString()}`],
            ].filter(Boolean).map(([k, v]) => v && (
              <div key={k} style={s.summaryRow}>
                <span style={{ color: "#64748b" }}>{k}</span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>

          <button style={{ ...s.primaryBtn, marginTop: 20 }} onClick={() => { onSuccess?.(); onClose(); }}>
            Done ✓
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.overlay} onClick={onClose}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @media (max-width: 500px) {
          .bm-grid { grid-template-columns: 1fr !important; }
          .bm-footer { flex-direction: column !important; }
        }
        .bm-input:focus { border-color: #1e3a8a !important; outline: none; }
        .bm-counter-input:focus { border-color: #7c3aed !important; outline: none; }
        .pay-opt:hover { border-color: #93c5fd !important; }
        .nego-bubble-artist { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 4px 16px 16px 16px; }
        .nego-bubble-user   { background: #1e3a8a; color: #fff; border-radius: 16px 4px 16px 16px; }
        .accept-price-btn:hover { background: #15803d !important; }
      `}</style>

      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={s.displayText}>{["", "Book an Artist", "Price Negotiation", "Choose Payment"][step]}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'Nunito',sans-serif", marginTop: 2 }}>
              {artist.name} · {artist.category} · {artist.city}
            </div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {/* Stepper */}
        <div style={s.stepper}>
          {[["Event", 1], ["Price", 2], ["Payment", 3]].map(([label, n], i) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                ...s.stepDot,
                background: step > n ? "#16a34a" : step === n ? "#1e3a8a" : "#e2e8f0",
                color:      step >= n ? "#fff" : "#94a3b8",
                borderColor: step > n ? "#16a34a" : step === n ? "#1e3a8a" : "#e2e8f0",
              }}>
                {step > n ? "✓" : n}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Nunito',sans-serif", color: step === n ? "#1e3a8a" : "#94a3b8" }}>
                {label}
              </span>
              {i < 2 && <div style={{ width: 28, height: 2, background: step > n ? "#16a34a" : "#e2e8f0", borderRadius: 2, marginLeft: 2 }} />}
            </div>
          ))}
        </div>

        {/* ── STEP 1: Event Details ── */}
        {step === 1 && (
          <div style={s.body}>
            {/* Base price notice */}
            <div style={s.infoNote}>
              <span style={{ fontSize: 18 }}>🎵</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#1d4ed8", fontFamily: "'Nunito',sans-serif" }}>
                  Base price: ₹{basePrice.toLocaleString()}
                </div>
                <div style={{ fontSize: 12, color: "#3b82f6", fontFamily: "'Nunito',sans-serif", marginTop: 2 }}>
                  Artist may adjust for your event. You can negotiate before confirming.
                </div>
              </div>
            </div>

            <div className="bm-grid" style={s.grid}>
              <div style={s.field}>
                <label style={s.label}>Event Type *</label>
                <select value={form.eventType} onChange={e => change("eventType", e.target.value)} className="bm-input" style={s.input}>
                  <option value="">Select event type</option>
                  {EVENT_TYPES.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Duration</label>
                <select value={form.duration} onChange={e => change("duration", e.target.value)} className="bm-input" style={s.input}>
                  {DURATIONS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="bm-grid" style={s.grid}>
              <div style={s.field}>
                <label style={s.label}>Event Date *</label>
                <input type="date" value={form.eventDate} min={new Date().toISOString().split("T")[0]} onChange={e => change("eventDate", e.target.value)} className="bm-input" style={s.input} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Event Time</label>
                <input type="time" value={form.eventTime} onChange={e => change("eventTime", e.target.value)} className="bm-input" style={s.input} />
              </div>
            </div>

            <div style={s.field}>
              <label style={s.label}>Location *</label>
              <input value={form.location} onChange={e => change("location", e.target.value)} placeholder="Venue name or address" className="bm-input" style={s.input} />
            </div>

            <div style={s.field}>
              <label style={s.label}>Message to Artist</label>
              <textarea value={form.message} onChange={e => change("message", e.target.value)} placeholder="Tell the artist about your event, expected audience size, requirements…" rows={3} className="bm-input" style={{ ...s.input, resize: "none" }} />
            </div>

            {error && <div style={s.errorBox}>{error}</div>}

            <div className="bm-footer" style={s.footer}>
              <button onClick={onClose} style={s.secondaryBtn}>Cancel</button>
              <button onClick={submitRequest} disabled={loading} style={{ ...s.primaryBtn, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Sending…" : "Send Request →"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Negotiation ── */}
        {step === 2 && (
          <div style={s.body}>
            {/* Event summary pill row */}
            <div style={s.summaryCard}>
              <div style={s.summaryRow}>
                <span style={{ color: "#64748b" }}>Event</span>
                <span style={{ fontWeight: 700 }}>{form.eventType} · {form.eventDate}</span>
              </div>
              <div style={s.summaryRow}>
                <span style={{ color: "#64748b" }}>Duration</span>
                <span style={{ fontWeight: 700 }}>{form.duration}</span>
              </div>
              <div style={s.summaryRow}>
                <span style={{ color: "#64748b" }}>Location</span>
                <span style={{ fontWeight: 700 }}>{form.location}</span>
              </div>
              <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#64748b", fontFamily: "'Nunito',sans-serif" }}>Artist base price</span>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: "#1e3a8a", letterSpacing: 0.5 }}>₹{basePrice.toLocaleString()}</span>
              </div>
            </div>

            {/* Thread */}
            <div>
              <div style={s.threadLabel}>Price Discussion</div>
              <div ref={threadRef} style={s.thread}>
                {thread.map((msg, i) => (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "user" ? "flex-end" : "flex-start", gap: 2 }}>
                    <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'Nunito',sans-serif" }}>
                      {msg.from === "user" ? (currentUser?.name || "You") : artist.name}
                    </span>
                    <div className={msg.from === "artist" ? "nego-bubble-artist" : "nego-bubble-user"} style={{ maxWidth: "82%", padding: "9px 13px", fontSize: 13, fontFamily: "'Nunito',sans-serif", lineHeight: 1.55 }}>
                      {msg.message && <div style={{ marginBottom: msg.price ? 6 : 0 }}>{msg.message}</div>}
                      {msg.price && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: msg.from === "artist" ? "#f0fdf4" : "rgba(255,255,255,0.15)", padding: "3px 10px", borderRadius: 20, fontSize: 13, fontWeight: 800, color: msg.from === "artist" ? "#15803d" : "#fff", fontFamily: "'Bebas Neue',sans-serif", letterSpacing: 0.5 }}>
                          ₹{msg.price.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {negoStatus === "waiting" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0" }}>
                    <div style={{ display: "flex", gap: 3 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8", animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Nunito',sans-serif" }}>{artist.name} is reviewing…</span>
                  </div>
                )}
              </div>
            </div>

            {/* Price agreed state */}
            {negoStatus === "agreed" && agreedPrice && (
              <div style={s.agreedBox}>
                <span style={{ fontSize: 20 }}>🤝</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#15803d", fontFamily: "'Nunito',sans-serif" }}>
                    Price agreed — ₹{agreedPrice.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 12, color: "#16a34a", fontFamily: "'Nunito',sans-serif" }}>Proceed to choose payment method</div>
                </div>
              </div>
            )}

            {/* Counter offer input — shown only when artist has replied and not yet agreed */}
            {negoStatus === "replied" && (
              <div style={s.counterArea}>
                <div style={s.threadLabel}>Your counter offer</div>
                <div className="bm-grid" style={{ ...s.grid, marginBottom: 8 }}>
                  <div style={s.field}>
                    <label style={s.label}>Your Price (₹)</label>
                    <input
                      type="number"
                      value={counterAmt}
                      onChange={e => setCounterAmt(e.target.value)}
                      placeholder={`e.g. ${Math.round((lastArtistPrice || basePrice) * 0.9 / 500) * 500}`}
                      className="bm-counter-input"
                      style={{ ...s.input, borderColor: "#a78bfa" }}
                    />
                  </div>
                  <div style={{ ...s.field, gridColumn: "span 1" }}>
                    <label style={s.label}>Message</label>
                    <input
                      value={counterMsg}
                      onChange={e => setCounterMsg(e.target.value)}
                      placeholder="Why you're offering this…"
                      className="bm-counter-input"
                      style={{ ...s.input, borderColor: "#a78bfa" }}
                    />
                  </div>
                </div>
                {lastArtistPrice && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[0.85, 0.9, 0.95].map(pct => {
                      const suggested = Math.round(lastArtistPrice * pct / 500) * 500;
                      return (
                        <button key={pct} onClick={() => { setCounterAmt(suggested); setCounterMsg(`Would ₹${suggested.toLocaleString()} work?`); }} style={s.quickChip}>
                          ₹{suggested.toLocaleString()}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Accept artist price button (shown when artist replied) */}
            {negoStatus === "replied" && lastArtistPrice && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#64748b", fontFamily: "'Nunito',sans-serif" }}>Or</span>
                <button className="accept-price-btn" onClick={() => acceptPrice(lastArtistPrice)} style={{ ...s.acceptBtn }}>
                  Accept ₹{lastArtistPrice.toLocaleString()} →
                </button>
              </div>
            )}

            {error && <div style={s.errorBox}>{error}</div>}

            <div className="bm-footer" style={s.footer}>
              <button onClick={() => setStep(1)} style={s.secondaryBtn}>← Back</button>
              {negoStatus === "agreed" ? (
                <button onClick={() => setStep(3)} style={s.primaryBtn}>Choose Payment →</button>
              ) : negoStatus === "replied" ? (
                <button onClick={sendCounter} disabled={loading} style={{ ...s.primaryBtn, opacity: loading ? 0.7 : 1 }}>
                  {loading ? "Sending…" : "Send Counter →"}
                </button>
              ) : (
                <button disabled style={{ ...s.primaryBtn, opacity: 0.4, cursor: "not-allowed" }}>
                  Waiting for artist…
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Payment ── */}
        {step === 3 && (
          <div style={s.body}>
            <div style={s.summaryCard}>
              <div style={s.summaryRow}><span style={{ color: "#64748b" }}>Artist</span><span style={{ fontWeight: 700 }}>{artist.name}</span></div>
              <div style={s.summaryRow}><span style={{ color: "#64748b" }}>Event</span><span style={{ fontWeight: 700 }}>{form.eventType} · {form.eventDate}</span></div>
              <div style={s.summaryRow}><span style={{ color: "#64748b" }}>Location</span><span style={{ fontWeight: 700 }}>{form.location}</span></div>
              <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", fontFamily: "'Nunito',sans-serif" }}>Agreed Price</span>
                <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: "#1e3a8a", letterSpacing: 0.5 }}>₹{agreedPrice?.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment mode */}
            <div>
              <div style={s.threadLabel}>How would you like to pay?</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Advance */}
                <div className="pay-opt" onClick={() => setPayMode("advance")} style={{ ...s.payOpt, borderColor: payMode === "advance" ? "#1e3a8a" : "#e2e8f0", background: payMode === "advance" ? "#eff6ff" : "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ ...s.radio, borderColor: payMode === "advance" ? "#1e3a8a" : "#cbd5e1" }}>
                        {payMode === "advance" && <div style={s.radioDot} />}
                      </div>
                      <div>
                        <div style={s.payOptTitle}>Pay advance (30%)</div>
                        <div style={s.payOptDesc}>Remaining ₹{balanceAmount.toLocaleString()} collected on event day. Booking confirmed immediately.</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: "#1e3a8a", letterSpacing: 0.5, flexShrink: 0, marginLeft: 8 }}>
                      ₹{advanceAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Full pay */}
                <div className="pay-opt" onClick={() => setPayMode("full")} style={{ ...s.payOpt, borderColor: payMode === "full" ? "#1e3a8a" : "#e2e8f0", background: payMode === "full" ? "#eff6ff" : "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ ...s.radio, borderColor: payMode === "full" ? "#1e3a8a" : "#cbd5e1" }}>
                        {payMode === "full" && <div style={s.radioDot} />}
                      </div>
                      <div>
                        <div style={s.payOptTitle}>Pay in full</div>
                        <div style={s.payOptDesc}>Full amount held in escrow by ArtSpire. Released to artist after event completion.</div>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: "#1e3a8a", letterSpacing: 0.5, flexShrink: 0, marginLeft: 8 }}>
                      ₹{agreedPrice?.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div style={s.breakdownCard}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 8, fontFamily: "'Nunito',sans-serif", textTransform: "uppercase", letterSpacing: 0.5 }}>Payment Breakdown</div>
              <div style={s.summaryRow}>
                <span style={{ color: "#64748b" }}>You pay now</span>
                <span style={{ fontWeight: 800, color: "#1e3a8a" }}>₹{(payMode === "advance" ? advanceAmount : agreedPrice)?.toLocaleString()}</span>
              </div>
              {payMode === "advance" && (
                <div style={s.summaryRow}>
                  <span style={{ color: "#64748b" }}>Balance on event day</span>
                  <span style={{ fontWeight: 800, color: "#92400e" }}>₹{balanceAmount.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div style={{ fontSize: 12, color: "#94a3b8", fontFamily: "'Nunito',sans-serif", textAlign: "center" }}>
              🔒 Payment is held securely and released to {artist.name} after your event.
            </div>

            {error && <div style={s.errorBox}>{error}</div>}

            <div className="bm-footer" style={s.footer}>
              <button onClick={() => setStep(2)} style={s.secondaryBtn}>← Back</button>
              <button onClick={handlePay} disabled={loading} style={{ ...s.primaryBtn, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Processing…" : `Pay ₹${(payMode === "advance" ? advanceAmount : agreedPrice)?.toLocaleString()} →`}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = {
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" },
  modal:   { background:"#fff", borderRadius:24, width:"100%", maxWidth:530, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 24px 80px rgba(0,0,0,0.25)", fontFamily:"'Nunito',sans-serif" },
  header:  { display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"22px 22px 0" },
  displayText: { fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:"#1e3a8a", letterSpacing:1 },
  closeBtn: { background:"#f1f5f9", border:"none", width:30, height:30, borderRadius:"50%", cursor:"pointer", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  stepper:  { display:"flex", alignItems:"center", gap:6, padding:"14px 22px", borderBottom:"1px solid #f1f5f9" },
  stepDot:  { width:24, height:24, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, fontFamily:"'Nunito',sans-serif", border:"1.5px solid", transition:"all 0.2s", flexShrink:0 },
  body:     { padding:"18px 22px 22px", display:"flex", flexDirection:"column", gap:14 },
  grid:     { display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 },
  field:    { display:"flex", flexDirection:"column", gap:4 },
  label:    { fontSize:10, fontWeight:800, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase" },
  input:    { padding:"10px 12px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:13, fontWeight:600, fontFamily:"'Nunito',sans-serif", outline:"none", boxSizing:"border-box", width:"100%", transition:"border-color 0.15s" },
  summaryCard:   { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:"14px 16px" },
  summaryRow:    { display:"flex", justifyContent:"space-between", fontSize:13, fontFamily:"'Nunito',sans-serif", color:"#1e293b", marginBottom:7 },
  breakdownCard: { background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:12, padding:"12px 14px" },
  infoNote: { background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:12, padding:"11px 14px", display:"flex", gap:10, alignItems:"flex-start" },
  threadLabel:   { fontSize:10, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:8 },
  thread:        { display:"flex", flexDirection:"column", gap:10, maxHeight:220, overflowY:"auto", padding:"4px 0" },
  counterArea:   { background:"#faf5ff", border:"1px solid #e9d5ff", borderRadius:12, padding:"12px 14px" },
  agreedBox:     { background:"#f0fdf4", border:"1px solid #86efac", borderRadius:12, padding:"12px 14px", display:"flex", gap:10, alignItems:"center" },
  errorBox:      { background:"#fee2e2", color:"#7f1d1d", borderRadius:10, padding:"9px 13px", fontSize:13, fontWeight:600 },
  footer:        { display:"flex", gap:10, marginTop:2 },
  primaryBtn:    { flex:1, background:"#1e3a8a", color:"#fff", border:"none", padding:"12px", borderRadius:22, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:"pointer", transition:"opacity 0.15s" },
  secondaryBtn:  { flex:1, background:"transparent", color:"#1e3a8a", border:"2px solid #1e3a8a", padding:"12px", borderRadius:22, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:"pointer" },
  acceptBtn:     { flex:1, background:"#16a34a", color:"#fff", border:"none", padding:"10px 16px", borderRadius:20, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:13, cursor:"pointer", transition:"background 0.15s" },
  quickChip:     { background:"#ede9fe", color:"#5b21b6", border:"none", padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:"pointer" },
  payOpt:        { border:"1.5px solid", borderRadius:14, padding:"14px 16px", cursor:"pointer", transition:"all 0.15s" },
  payOptTitle:   { fontSize:14, fontWeight:800, color:"#1e293b", fontFamily:"'Nunito',sans-serif", marginBottom:3 },
  payOptDesc:    { fontSize:12, color:"#64748b", fontFamily:"'Nunito',sans-serif", lineHeight:1.5 },
  radio:         { width:18, height:18, borderRadius:"50%", border:"2px solid", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 },
  radioDot:      { width:8, height:8, borderRadius:"50%", background:"#1e3a8a" },
};