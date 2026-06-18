import { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

export default function BookingModal({ artist, currentUser, onClose, onSuccess }) {
  const [step, setStep]       = useState(1); // 1=details, 2=payment, 3=success
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [form, setForm]       = useState({
    date:      "",
    time:      "",
    eventType: "",
    location:  "",
    message:   "",
    amount:    artist?.price || 500,
  });

  const EVENT_TYPES = ["Wedding","Birthday Party","Corporate Event","Concert","Private Show","Festival","Other"];

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validateForm = () => {
    if (!form.date)      { setError("Please select a date"); return false; }
    if (!form.time)      { setError("Please select a time"); return false; }
    if (!form.eventType) { setError("Please select event type"); return false; }
    if (!form.location)  { setError("Please enter location"); return false; }
    return true;
  };

  // ── Load Razorpay script dynamically ────────────────────────────────────
  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handlePayment = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError("");

    try {
      const loaded = await loadRazorpay();
      if (!loaded) { setError("Payment service unavailable. Try again."); setLoading(false); return; }

      // Create Razorpay order
      const orderRes = await axios.post(`${API}/api/bookings/create-order`, { amount: form.amount });
      const order    = orderRes.data.order;

      const options = {
        key:      RAZORPAY_KEY,
        amount:   order.amount,
        currency: "INR",
        name:     "ArtSpire",
        description: `Booking ${artist.name} for ${form.eventType}`,
        order_id: order.id,
        prefill: {
          name:  currentUser.name,
          email: currentUser.email,
        },
        theme: { color: "#1e3a8a" },
        handler: async (response) => {
          try {
            // Verify payment and save booking
            await axios.post(`${API}/api/bookings/verify-payment`, {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              bookingData: {
                artistId:   artist._id,
                artistName: artist.name,
                userId:     currentUser._id,
                userName:   currentUser.name,
                userEmail:  currentUser.email,
                ...form,
              },
            });
            setStep(3);
            if (onSuccess) onSuccess();
          } catch {
            setError("Payment successful but booking failed. Contact support.");
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    }
    setLoading(false);
  };

  // ── Book without payment (request only) ─────────────────────────────────
  const handleRequestOnly = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError("");
    try {
      await axios.post(`${API}/api/bookings/create`, {
        artistId:   artist._id,
        artistName: artist.name,
        userId:     currentUser._id,
        userName:   currentUser.name,
        userEmail:  currentUser.email,
        ...form,
        paymentStatus: "pending",
        status:        "pending",
      });
      setStep(3);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed. Try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:"#fff", borderRadius:"24px", padding:"32px", width:"100%", maxWidth:"500px", boxShadow:"0 24px 64px rgba(0,0,0,0.3)", maxHeight:"90vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"24px" }}>
          <div>
            <div style={{ fontSize:"20px", fontWeight:900, color:"#1e293b", fontFamily:"'Nunito',sans-serif" }}>Book {artist.name}</div>
            <div style={{ fontSize:"13px", color:"#94a3b8", fontWeight:600 }}>{artist.category} · {artist.city}</div>
          </div>
          <button onClick={onClose} style={{ background:"#f1f5f9", border:"none", width:"36px", height:"36px", borderRadius:"50%", cursor:"pointer", fontSize:"18px" }}>✕</button>
        </div>

        {/* Step 1 — Details */}
        {step === 1 && (
          <>
            <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>

              {/* Event type */}
              <div>
                <label style={labelStyle}>Event Type *</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", marginTop:"6px" }}>
                  {EVENT_TYPES.map(t => (
                    <button key={t} type="button" onClick={() => setForm({...form, eventType:t})} style={{ padding:"7px 14px", borderRadius:"20px", border:`1.5px solid ${form.eventType===t?"#1e3a8a":"#e2e8f0"}`, background:form.eventType===t?"#1e3a8a":"#f8fafc", color:form.eventType===t?"#fff":"#64748b", fontSize:"12px", fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date + Time */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input type="date" name="date" value={form.date} onChange={handleChange} min={new Date().toISOString().split("T")[0]} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Time *</label>
                  <input type="time" name="time" value={form.time} onChange={handleChange} style={inputStyle} />
                </div>
              </div>

              {/* Location */}
              <div>
                <label style={labelStyle}>Location *</label>
                <input type="text" name="location" value={form.location} onChange={handleChange} placeholder="Event venue / address" style={inputStyle} />
              </div>

              {/* Amount */}
              <div>
                <label style={labelStyle}>Budget (₹)</label>
                <input type="number" name="amount" value={form.amount} onChange={handleChange} min="100" style={inputStyle} />
              </div>

              {/* Message */}
              <div>
                <label style={labelStyle}>Message (optional)</label>
                <textarea name="message" value={form.message} onChange={handleChange} placeholder="Tell the artist about your event..." rows={3} style={{ ...inputStyle, resize:"none" }} />
              </div>
            </div>

            {error && <div style={{ color:"#ef4444", fontSize:"13px", fontWeight:700, marginTop:"12px" }}>{error}</div>}

            {/* Summary */}
            <div style={{ background:"#f0f4ff", borderRadius:"14px", padding:"16px", marginTop:"20px", marginBottom:"20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"13px", fontWeight:700, color:"#1e293b", fontFamily:"'Nunito',sans-serif" }}>
                <span>Artist</span><span>{artist.name}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"13px", fontWeight:700, color:"#1e293b", fontFamily:"'Nunito',sans-serif", marginTop:"8px" }}>
                <span>Amount</span><span style={{ color:"#1e3a8a" }}>₹{form.amount}</span>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              <button onClick={handlePayment} disabled={loading} style={{ background:"linear-gradient(90deg,#1e3a8a,#1d4ed8)", color:"#fff", border:"none", padding:"14px", borderRadius:"50px", fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:"15px", cursor:"pointer", opacity:loading?0.7:1 }}>
                {loading ? "Processing..." : `💳 Pay ₹${form.amount} & Book`}
              </button>
              <button onClick={handleRequestOnly} disabled={loading} style={{ background:"#f1f5f9", color:"#1e293b", border:"none", padding:"13px", borderRadius:"50px", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:"14px", cursor:"pointer" }}>
                📩 Send Request (Pay Later)
              </button>
            </div>
          </>
        )}

        {/* Step 3 — Success */}
        {step === 3 && (
          <div style={{ textAlign:"center", padding:"20px 0" }}>
            <div style={{ fontSize:"64px", marginBottom:"16px" }}>🎉</div>
            <div style={{ fontSize:"22px", fontWeight:900, color:"#1e293b", fontFamily:"'Nunito',sans-serif", marginBottom:"8px" }}>Booking Confirmed!</div>
            <div style={{ fontSize:"14px", color:"#64748b", fontWeight:600, marginBottom:"24px" }}>
              {artist.name} has been notified about your booking request.
            </div>
            <button onClick={onClose} style={{ background:"#1e3a8a", color:"#fff", border:"none", padding:"12px 32px", borderRadius:"50px", fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:"14px", cursor:"pointer" }}>
              Done ✓
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle = { fontSize:"11px", fontWeight:800, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase", display:"block", marginBottom:"4px" };
const inputStyle = { width:"100%", padding:"12px 14px", borderRadius:"12px", border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#1e293b", fontSize:"14px", fontWeight:600, fontFamily:"'Nunito',sans-serif", outline:"none", boxSizing:"border-box" };