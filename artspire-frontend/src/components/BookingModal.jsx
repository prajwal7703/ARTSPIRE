import { useState } from "react";
import axios from "axios";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

const EVENT_TYPES = ["Wedding","Birthday Party","Corporate Event","Concert","Private Party","Photoshoot","Art Exhibition","Festival","Other"];
const DURATIONS   = ["1 hour","2 hours","3 hours","4 hours","Half Day","Full Day"];

export default function BookingModal({ artist, currentUser, onClose, onSuccess }) {
  const [step, setStep]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState(false);

  const [form, setForm] = useState({
    eventType: "",
    eventDate: "",
    eventTime: "",
    location:  "",
    duration:  "2 hours",
    message:   "",
  });

  const change = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePay = async () => {
    if (!form.eventType || !form.eventDate || !form.location) {
      setError("Please fill all required fields."); return;
    }
    setError("");
    setLoading(true);

    try {
      // Create order
      const orderRes = await axios.post(`${API}/api/bookings/create-order`, { amount: artist.price || 500 });
      const { orderId, amount, demo } = orderRes.data;

      if (demo || !RAZORPAY_KEY) {
        // Demo mode — confirm directly without Razorpay
        await confirmBooking(null, orderId);
        return;
      }

      // Load Razorpay script
      if (!window.Razorpay) {
        await new Promise((res, rej) => {
          const s = document.createElement("script");
          s.src = "https://checkout.razorpay.com/v1/checkout.js";
          s.onload = res; s.onerror = rej;
          document.body.appendChild(s);
        });
      }

      const options = {
        key: RAZORPAY_KEY,
        amount,
        currency: "INR",
        name: "ArtSpire",
        description: `Book ${artist.name} for ${form.eventType}`,
        order_id: orderId,
        prefill: {
          name:  currentUser?.name  || "",
          email: currentUser?.email || "",
        },
        theme: { color: "#1e3a8a" },
        handler: async (response) => {
          await confirmBooking(response.razorpay_payment_id, orderId);
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError("Payment failed. Please try again.");
      setLoading(false);
    }
  };

  const confirmBooking = async (paymentId, orderId) => {
    try {
      const payload = {
        artistId:   artist._id,
        artistName: artist.name,
        userId:     currentUser?._id  || "",
        userName:   currentUser?.name || "Guest",
        userEmail:  currentUser?.email || "",
        ...form,
        amount:    artist.price || 500,
        paymentId,
        orderId,
      };

      await axios.post(`${API}/api/bookings/confirm`, payload);

      // Notify artist via socket
      socket.emit("new_booking", {
        artistId:  artist._id,
        userName:  currentUser?.name || "Someone",
        eventType: form.eventType,
        eventDate: form.eventDate,
      });

      setBooked(true);
      setLoading(false);
      setTimeout(() => { onSuccess?.(); }, 3000);
    } catch (err) {
      setError("Booking failed. Please try again.");
      setLoading(false);
    }
  };

  // ── Success screen ──
  if (booked) return (
    <div style={s.overlay}>
      <div style={{ ...s.modal, textAlign:"center", padding:"48px 32px" }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, color:"#1e3a8a", marginBottom:8 }}>Booking Confirmed!</div>
        <div style={{ fontSize:15, color:"#64748b", marginBottom:24, fontFamily:"'Nunito',sans-serif" }}>
          Your booking with <strong>{artist.name}</strong> for <strong>{form.eventType}</strong> on <strong>{form.eventDate}</strong> is confirmed.
        </div>
        <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:16, padding:"16px 20px", marginBottom:24, textAlign:"left" }}>
          {[["Event",form.eventType],["Date",form.eventDate],["Time",form.eventTime],["Location",form.location],["Duration",form.duration]].map(([k,v]) => v && (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:"#15803d", fontWeight:600, fontFamily:"'Nunito',sans-serif", marginBottom:4 }}>
              <span style={{ opacity:0.7 }}>{k}</span><span>{v}</span>
            </div>
          ))}
        </div>
        <button style={s.primaryBtn} onClick={onClose}>Done ✓</button>
      </div>
    </div>
  );

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:"#1e3a8a", letterSpacing:1 }}>Book {artist.name}</div>
            <div style={{ fontSize:12, color:"#94a3b8", fontFamily:"'Nunito',sans-serif", marginTop:2 }}>{artist.category} · {artist.city}</div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={s.steps}>
          {["Event Details","Confirm & Pay"].map((label, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background: step > i+1 ? "#22c55e" : step === i+1 ? "#1e3a8a" : "#e2e8f0", color: step >= i+1 ? "#fff" : "#94a3b8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, fontFamily:"'Nunito',sans-serif", transition:"all 0.2s" }}>
                {step > i+1 ? "✓" : i+1}
              </div>
              <span style={{ fontSize:12, fontWeight:700, color: step === i+1 ? "#1e3a8a" : "#94a3b8", fontFamily:"'Nunito',sans-serif" }}>{label}</span>
              {i < 1 && <div style={{ width:40, height:2, background: step > 1 ? "#1e3a8a" : "#e2e8f0", marginLeft:4, borderRadius:2 }} />}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div style={s.body}>
            <div style={s.fieldGrid}>
              <div style={s.field}>
                <label style={s.label}>Event Type *</label>
                <select value={form.eventType} onChange={e => change("eventType", e.target.value)} style={s.input}>
                  <option value="">Select event type</option>
                  {EVENT_TYPES.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Event Date *</label>
                <input type="date" value={form.eventDate} onChange={e => change("eventDate", e.target.value)} min={new Date().toISOString().split("T")[0]} style={s.input} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Event Time</label>
                <input type="time" value={form.eventTime} onChange={e => change("eventTime", e.target.value)} style={s.input} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Duration</label>
                <select value={form.duration} onChange={e => change("duration", e.target.value)} style={s.input}>
                  {DURATIONS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>Event Location *</label>
              <input value={form.location} onChange={e => change("location", e.target.value)} placeholder="Address or venue name" style={s.input} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Message to Artist</label>
              <textarea value={form.message} onChange={e => change("message", e.target.value)} placeholder="Tell the artist about your event..." rows={3} style={{ ...s.input, resize:"none", height:"auto" }} />
            </div>
            {error && <div style={s.errorBox}>{error}</div>}
            <div style={s.footer}>
              <button onClick={onClose} style={s.secondaryBtn}>Cancel</button>
              <button onClick={() => { if (!form.eventType || !form.eventDate || !form.location) { setError("Fill all required fields"); return; } setError(""); setStep(2); }} style={s.primaryBtn}>
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div style={s.body}>
            <div style={s.summaryCard}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:18, color:"#1e3a8a", marginBottom:12, letterSpacing:0.5 }}>Booking Summary</div>
              {[["Artist",artist.name],["Event",form.eventType],["Date",form.eventDate],["Time",form.eventTime||"TBD"],["Location",form.location],["Duration",form.duration]].map(([k,v]) => v && (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontFamily:"'Nunito',sans-serif", color:"#1e293b", marginBottom:8 }}>
                  <span style={{ color:"#64748b", fontWeight:600 }}>{k}</span>
                  <span style={{ fontWeight:800 }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop:"1px solid #e2e8f0", marginTop:12, paddingTop:12, display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, color:"#1e293b", fontSize:14 }}>Total Amount</span>
                <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#1e3a8a", letterSpacing:0.5 }}>₹{(artist.price || 500).toLocaleString()}</span>
              </div>
            </div>

            {/* Artist card */}
            <div style={s.artistCard}>
              {artist.profileImage
                ? <img src={artist.profileImage} alt="" style={s.artistAvatar} />
                : <div style={{ ...s.artistAvatar, background:"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#1e3a8a" }}>{artist.name?.[0]}</div>
              }
              <div>
                <div style={{ fontWeight:800, fontFamily:"'Nunito',sans-serif", fontSize:14, color:"#1e293b" }}>{artist.name}</div>
                <div style={{ fontSize:12, color:"#94a3b8", fontFamily:"'Nunito',sans-serif" }}>{artist.category} · ⭐ {artist.rating||5}.0</div>
              </div>
              <div style={{ marginLeft:"auto", fontFamily:"'Bebas Neue',sans-serif", fontSize:20, color:"#1e3a8a" }}>✓ Verified</div>
            </div>

            <div style={{ fontSize:12, color:"#94a3b8", fontFamily:"'Nunito',sans-serif", textAlign:"center", marginBottom:4 }}>
              🔒 Secure payment · Free cancellation within 24 hours
            </div>

            {error && <div style={s.errorBox}>{error}</div>}

            <div style={s.footer}>
              <button onClick={() => setStep(1)} style={s.secondaryBtn}>← Back</button>
              <button onClick={handlePay} disabled={loading} style={{ ...s.primaryBtn, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Processing..." : `Pay ₹${(artist.price||500).toLocaleString()} →`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" },
  modal:      { background:"#fff", borderRadius:24, width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 80px rgba(0,0,0,0.25)", fontFamily:"'Nunito',sans-serif" },
  header:     { display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"24px 24px 0" },
  closeBtn:   { background:"#f1f5f9", border:"none", width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  steps:      { display:"flex", alignItems:"center", gap:8, padding:"16px 24px", borderBottom:"1px solid #f1f5f9" },
  body:       { padding:"20px 24px 24px", display:"flex", flexDirection:"column", gap:14 },
  fieldGrid:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  field:      { display:"flex", flexDirection:"column", gap:5 },
  label:      { fontSize:11, fontWeight:800, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase" },
  input:      { padding:"11px 13px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:14, fontWeight:600, fontFamily:"'Nunito',sans-serif", outline:"none", boxSizing:"border-box", width:"100%", transition:"border-color 0.2s" },
  summaryCard:{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:16, padding:"18px 20px" },
  artistCard: { display:"flex", alignItems:"center", gap:12, background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:14, padding:"12px 16px" },
  artistAvatar: { width:44, height:44, borderRadius:"50%", objectFit:"cover", flexShrink:0 },
  errorBox:   { background:"#fee2e2", color:"#7f1d1d", borderRadius:10, padding:"10px 14px", fontSize:13, fontWeight:600 },
  footer:     { display:"flex", gap:10, marginTop:4 },
  primaryBtn: { flex:1, background:"#1e3a8a", color:"#fff", border:"none", padding:"13px", borderRadius:22, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:"pointer", transition:"opacity 0.2s" },
  secondaryBtn: { flex:1, background:"transparent", color:"#1e3a8a", border:"2px solid #1e3a8a", padding:"13px", borderRadius:22, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, cursor:"pointer" },
};