import { useState, useEffect } from "react";
import axios from "axios";
import socket from "../socket";
import { getCurrentAccount } from "../utils/auth";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const STATUS_LABELS = {
  pending_approval: { label: "Pending",      color: "#854d0e", bg: "#fef9c3" },
  negotiating:      { label: "Negotiating",  color: "#1d4ed8", bg: "#eff6ff" },
  price_agreed:     { label: "Price Agreed", color: "#15803d", bg: "#f0fdf4" },
  payment_pending:  { label: "Awaiting Pay", color: "#7e22ce", bg: "#faf5ff" },
  confirmed:        { label: "Confirmed",    color: "#15803d", bg: "#dcfce7" },
  cancelled:        { label: "Cancelled",    color: "#7f1d1d", bg: "#fee2e2" },
};

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

/* ─── Razorpay checkout script loader ────────────────────────────────────── */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/* ─── MAIN PAGE ───────────────────────────────────────────────────────────── */
export default function BookingPage() {
  const isMobile = useIsMobile();
  const account  = getCurrentAccount();
  const userId   = account?._id;

  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [filter,     setFilter]     = useState("active");

  // negotiation form state
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMsg,   setCounterMsg]   = useState("");
  const [sending,      setSending]      = useState(false);
  const [error,        setError]        = useState("");

  // coupon state
  const [couponCode,   setCouponCode]   = useState("");
  const [couponResult, setCouponResult] = useState(null); // { valid, discountAmount, finalAmount, message }
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  // payment state
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const fetchBookings = async () => {
    if (!userId) return;
    try {
      const res = await axios.get(`${API}/api/bookings/user/${userId}`);
      setBookings(Array.isArray(res.data) ? res.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookings(); }, [userId]);

  useEffect(() => {
    if (!userId) return;
    socket.emit("join_user_room", userId);

    socket.on("booking_offer", ({ bookingId, price, message, status }) => {
      const entry = { from: "artist", price, message, timestamp: new Date() };
      setBookings(bs => bs.map(b => b._id === bookingId
        ? { ...b, status, agreedPrice: status === "price_agreed" ? price : b.agreedPrice, negotiation: [...(b.negotiation||[]), entry] }
        : b));
      setSelected(s => s?._id === bookingId
        ? { ...s, status, agreedPrice: status === "price_agreed" ? price : s.agreedPrice, negotiation: [...(s.negotiation||[]), entry] }
        : s);
    });

    socket.on("booking_confirmed", ({ bookingId, paidAmount }) => {
      setBookings(bs => bs.map(b => b._id === bookingId ? { ...b, status: "confirmed", paidAmount } : b));
      setSelected(s => s?._id === bookingId ? { ...s, status: "confirmed", paidAmount } : s);
    });

    socket.on("booking_cancelled", ({ bookingId }) => {
      setBookings(bs => bs.map(b => b._id === bookingId ? { ...b, status: "cancelled" } : b));
      setSelected(s => s?._id === bookingId ? { ...s, status: "cancelled" } : s);
    });

    return () => {
      socket.off("booking_offer");
      socket.off("booking_confirmed");
      socket.off("booking_cancelled");
    };
  }, [userId]);

  const openBooking = (b) => {
    setSelected(b);
    setError(""); setPayError("");
    setCouponCode(""); setCouponResult(null);
    const lastOffer = [...(b.negotiation||[])].reverse().find(m => m.from === "artist");
    setCounterPrice(lastOffer ? lastOffer.price : "");
    setCounterMsg("");
    if (isMobile) setShowDetail(true);
  };

  /* ── Negotiation actions ── */
  const acceptOffer = async (price) => {
    setSending(true);
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/accept`, { price });
      setSelected(s => ({ ...s, status: "price_agreed", agreedPrice: price }));
      setBookings(bs => bs.map(b => b._id === selected._id ? { ...b, status: "price_agreed", agreedPrice: price } : b));
    } catch { setError("Failed to accept price."); }
    finally { setSending(false); }
  };

  const sendCounter = async () => {
    const price = parseInt(counterPrice);
    if (!price || price <= 0) { setError("Enter a valid price."); return; }
    setSending(true); setError("");
    try {
      await axios.post(`${API}/api/bookings/${selected._id}/counter`, { price, message: counterMsg });
      const entry = { from: "user", price, message: counterMsg, timestamp: new Date() };
      setSelected(s => ({ ...s, status: "negotiating", negotiation: [...(s.negotiation||[]), entry] }));
      setBookings(bs => bs.map(b => b._id === selected._id
        ? { ...b, status: "negotiating", negotiation: [...(b.negotiation||[]), entry] } : b));
      setCounterMsg("");
    } catch { setError("Failed to send your price."); }
    finally { setSending(false); }
  };

  /* ── Coupon ── */
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true);
    try {
      const res = await axios.post(`${API}/api/coupons/validate`, {
        code: couponCode.trim(),
        amount: selected.agreedPrice,
      });
      setCouponResult(res.data);
    } catch {
      setCouponResult({ valid: false, message: "Could not check coupon. Try again." });
    } finally { setCheckingCoupon(false); }
  };

  const removeCoupon = () => { setCouponCode(""); setCouponResult(null); };

  /* ── Payment ── */
  const payNow = async () => {
    setPaying(true); setPayError("");
    try {
      const orderRes = await axios.post(`${API}/api/bookings/create-order`, {
        bookingId: selected._id,
        couponCode: couponResult?.valid ? couponCode.trim() : undefined,
      });
      const { orderId, amount, keyId, demo, finalAmount, discountAmount } = orderRes.data;

      setSelected(s => ({ ...s, status: "payment_pending", orderId, finalAmount, discountAmount }));
      setBookings(bs => bs.map(b => b._id === selected._id ? { ...b, status: "payment_pending", orderId, finalAmount, discountAmount } : b));

      if (demo) {
        // No real Razorpay keys configured — confirm immediately for testing.
        await confirmPayment({ paymentId: `demo_pay_${Date.now()}`, orderId, signature: null });
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) { setPayError("Could not load payment gateway. Check your connection."); setPaying(false); return; }

      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency: "INR",
        name: "Artspire",
        description: `Booking — ${selected.eventType}`,
        order_id: orderId,
        prefill: {
          name:    account?.name  || "",
          email:   account?.email || "",
          contact: account?.phone || "",
        },
        theme: { color: "#1e3a8a" },
        handler: async (response) => {
          await confirmPayment({
            paymentId: response.razorpay_payment_id,
            orderId:   response.razorpay_order_id,
            signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });
      rzp.open();
    } catch (err) {
      setPayError(err.response?.data?.error || "Failed to start payment.");
      setPaying(false);
    }
  };

  const confirmPayment = async ({ paymentId, orderId, signature }) => {
    try {
      const res = await axios.post(`${API}/api/bookings/${selected._id}/confirm-payment`, {
        paymentId, orderId, signature,
      });
      const updated = res.data.booking;
      setSelected(s => ({ ...s, ...updated }));
      setBookings(bs => bs.map(b => b._id === selected._id ? { ...b, ...updated } : b));
    } catch (err) {
      setPayError(err.response?.data?.error || "Payment could not be verified. If money was deducted, contact support.");
    } finally {
      setPaying(false);
    }
  };

  const activeBookings = bookings.filter(b => !["confirmed","cancelled"].includes(b.status));
  const displayList    = filter === "active" ? activeBookings : bookings;
  const lastArtistOffer = selected ? [...(selected.negotiation||[])].reverse().find(m => m.from === "artist") : null;
  const lastUserOffer   = selected ? [...(selected.negotiation||[])].reverse().find(m => m.from === "user")   : null;
  const checkoutAmount  = selected ? (couponResult?.valid ? couponResult.finalAmount : selected.agreedPrice) : 0;

  /* ── Detail panel ── */
  const DetailPanel = () => !selected ? (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:"#94a3b8", fontFamily:"'Nunito',sans-serif", gap:8 }}>
      <div style={{ fontSize:40 }}>📋</div>
      <div style={{ fontSize:14 }}>Select a booking to view details</div>
    </div>
  ) : (
    <div style={{ padding:"18px", display:"flex", flexDirection:"column", gap:14, overflowY:"auto", height:"100%" }}>
      {isMobile && (
        <button onClick={() => setShowDetail(false)} style={s.backBtn}>← Back</button>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={s.displayText}>{selected.artistName}</div>
          <div style={{ fontSize:12, color:"#94a3b8", fontFamily:"'Nunito',sans-serif" }}>{selected.eventType}</div>
        </div>
        <span style={{ ...s.badge, background: STATUS_LABELS[selected.status]?.bg, color: STATUS_LABELS[selected.status]?.color, fontSize:12, padding:"4px 12px" }}>
          {STATUS_LABELS[selected.status]?.label}
        </span>
      </div>

      <div style={s.infoCard}>
        {[
          ["Date",     selected.eventDate],
          ["Time",     selected.eventTime || "TBD"],
          ["Duration", selected.duration],
          ["Location", selected.location],
          ["Base",     `₹${selected.basePrice?.toLocaleString()}`],
          selected.agreedPrice && ["Agreed",   `₹${selected.agreedPrice?.toLocaleString()}`],
          selected.discountAmount > 0 && ["Coupon",   `− ₹${selected.discountAmount?.toLocaleString()}`],
          selected.finalAmount && selected.status !== "confirmed" && ["To Pay", `₹${selected.finalAmount?.toLocaleString()}`],
          selected.paidAmount && ["Paid",     `₹${selected.paidAmount?.toLocaleString()}`],
        ].filter(Boolean).map(([k,v]) => (
          <div key={k} style={s.infoRow}>
            <span style={{ color:"#64748b" }}>{k}</span>
            <span style={{ fontWeight:700 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Negotiation thread */}
      {(selected.negotiation||[]).length > 0 && (
        <div>
          <div style={s.sectionLabel}>Price Discussion</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:200, overflowY:"auto" }}>
            {(selected.negotiation||[]).map((msg,i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems: msg.from==="user" ? "flex-end" : "flex-start", gap:2 }}>
                <span style={{ fontSize:10, color:"#94a3b8", fontFamily:"'Nunito',sans-serif" }}>
                  {msg.from==="user" ? "You" : selected.artistName}
                </span>
                <div style={{ maxWidth:"80%", padding:"9px 13px", borderRadius: msg.from==="user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", background: msg.from==="user" ? "#1e3a8a" : "#f8fafc", border: msg.from==="user" ? "none" : "1.5px solid #e2e8f0", color: msg.from==="user" ? "#fff" : "#1e293b", fontSize:13, fontFamily:"'Nunito',sans-serif", lineHeight:1.55 }}>
                  {msg.message && <div style={{ marginBottom: msg.price ? 5 : 0 }}>{msg.message}</div>}
                  {msg.price && <span style={{ display:"inline-flex", background: msg.from==="user" ? "rgba(255,255,255,0.18)" : "#f0fdf4", color: msg.from==="user" ? "#fff" : "#15803d", padding:"2px 10px", borderRadius:20, fontSize:13, fontWeight:800, fontFamily:"'Bebas Neue',sans-serif" }}>₹{msg.price?.toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiting for artist's first response */}
      {selected.status === "pending_approval" && (
        <div style={{ background:"#fef9c3", border:"1px solid #fde68a", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#854d0e", fontFamily:"'Nunito',sans-serif" }}>
            Waiting for {selected.artistName} to respond to your request.
          </div>
        </div>
      )}

      {/* Artist sent an offer — accept or counter */}
      {selected.status === "negotiating" && lastArtistOffer && lastArtistOffer !== lastUserOffer && (
        <>
          <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:12, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:800, color:"#1d4ed8", fontFamily:"'Nunito',sans-serif" }}>{selected.artistName} offered ₹{lastArtistOffer.price?.toLocaleString()}</div>
              <div style={{ fontSize:11, color:"#3b82f6", fontFamily:"'Nunito',sans-serif" }}>Accept to lock this price</div>
            </div>
            <button onClick={() => acceptOffer(lastArtistOffer.price)} disabled={sending} style={s.acceptBtn}>
              Accept ₹{lastArtistOffer.price?.toLocaleString()}
            </button>
          </div>

          <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:14, padding:"14px 16px" }}>
            <div style={s.sectionLabel}>Or Send a Counter Price</div>
            <label style={s.miniLabel}>Your price (₹)</label>
            <input type="number" value={counterPrice} onChange={e => setCounterPrice(e.target.value)} style={{ ...s.input, marginBottom:10 }} placeholder="Enter price" />
            <label style={s.miniLabel}>Message</label>
            <textarea value={counterMsg} onChange={e => setCounterMsg(e.target.value)} placeholder="Explain your offer…" rows={3} style={{ ...s.input, resize:"none", marginBottom:10 }} />
            {error && <div style={s.errorBox}>{error}</div>}
            <button onClick={sendCounter} disabled={sending} style={{ ...s.primaryBtn, width:"100%", opacity: sending ? 0.7 : 1 }}>
              {sending ? "Sending…" : "Send Counter Price →"}
            </button>
          </div>
        </>
      )}

      {/* Waiting for artist after user sent a counter */}
      {selected.status === "negotiating" && lastUserOffer && lastUserOffer === [...(selected.negotiation||[])].reverse()[0] && (
        <div style={{ background:"#fef9c3", border:"1px solid #fde68a", borderRadius:12, padding:"12px 14px", textAlign:"center" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#854d0e", fontFamily:"'Nunito',sans-serif" }}>
            Waiting for {selected.artistName} to respond to your price.
          </div>
        </div>
      )}

      {/* Price agreed / payment pending → coupon + pay */}
      {["price_agreed","payment_pending"].includes(selected.status) && (
        <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:14, padding:"16px" }}>
          <div style={{ fontWeight:800, color:"#15803d", fontFamily:"'Nunito',sans-serif", fontSize:14, marginBottom:12 }}>
            🤝 Price agreed at ₹{selected.agreedPrice?.toLocaleString()}
          </div>

          {/* Coupon */}
          <div style={{ marginBottom:14 }}>
            <label style={s.miniLabel}>Have a coupon?</label>
            <div style={{ display:"flex", gap:8 }}>
              <input
                value={couponCode}
                onChange={e => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                disabled={!!couponResult?.valid}
                style={{ ...s.input, textTransform:"uppercase" }}
              />
              {couponResult?.valid
                ? <button onClick={removeCoupon} style={s.quickChip}>Remove</button>
                : <button onClick={applyCoupon} disabled={checkingCoupon || !couponCode.trim()} style={s.quickChip}>
                    {checkingCoupon ? "Checking…" : "Apply"}
                  </button>}
            </div>
            {couponResult && (
              <div style={{ fontSize:12, marginTop:6, fontWeight:700, color: couponResult.valid ? "#15803d" : "#b91c1c", fontFamily:"'Nunito',sans-serif" }}>
                {couponResult.message}
              </div>
            )}
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", borderTop:"1px solid #bbf7d0", marginBottom:14 }}>
            <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:700, color:"#15803d" }}>Total to pay</span>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#15803d" }}>₹{checkoutAmount?.toLocaleString()}</span>
          </div>

          {payError && <div style={s.errorBox}>{payError}</div>}

          <button onClick={payNow} disabled={paying} style={{ ...s.primaryBtn, width:"100%", background:"#15803d", opacity: paying ? 0.7 : 1 }}>
            {paying ? "Processing…" : `Pay ₹${checkoutAmount?.toLocaleString()} →`}
          </button>
        </div>
      )}

      {selected.status === "confirmed" && (
        <div style={{ background:"#dcfce7", border:"1px solid #86efac", borderRadius:12, padding:"14px", textAlign:"center" }}>
          <div style={{ fontSize:24, marginBottom:6 }}>🎉</div>
          <div style={{ fontWeight:800, color:"#15803d", fontFamily:"'Nunito',sans-serif", fontSize:14 }}>Booking Confirmed!</div>
          <div style={{ fontSize:12, color:"#16a34a", fontFamily:"'Nunito',sans-serif", marginTop:4 }}>
            ₹{selected.paidAmount?.toLocaleString()} paid{selected.discountAmount > 0 ? ` (₹${selected.discountAmount.toLocaleString()} off with ${selected.couponCode})` : ""}.
          </div>
        </div>
      )}

      {selected.status === "cancelled" && (
        <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:12, padding:"14px", textAlign:"center" }}>
          <div style={{ fontWeight:800, color:"#7f1d1d", fontFamily:"'Nunito',sans-serif", fontSize:14 }}>This booking was cancelled.</div>
        </div>
      )}
    </div>
  );

  if (!userId) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:10, color:"#94a3b8", fontFamily:"'Nunito',sans-serif" }}>
        <div style={{ fontSize:40 }}>🔒</div>
        <div>Please log in to view your bookings.</div>
      </div>
    );
  }

  /* ── Mobile ── */
  if (isMobile) {
    return (
      <div style={{ height:"100vh", display:"flex", flexDirection:"column", fontFamily:"'Nunito',sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
        {!showDetail ? (
          <>
            <div style={{ padding:"16px 16px 10px", borderBottom:"1px solid #f1f5f9" }}>
              <div style={s.displayText}>My Bookings</div>
              <div style={{ display:"flex", gap:6, marginTop:8 }}>
                {["active","all"].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{ ...s.filterBtn, background: filter===f ? "#1e3a8a" : "transparent", color: filter===f ? "#fff" : "#64748b" }}>
                    {f==="active" ? `Active (${activeBookings.length})` : `All (${bookings.length})`}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto" }}>
              {loading ? <div style={s.emptyMsg}>Loading…</div>
               : displayList.length===0 ? <div style={s.emptyMsg}>No bookings yet. Visit an artist's profile to request one.</div>
               : displayList.map(b => <BookingCard key={b._id} b={b} selected={selected} onClick={() => openBooking(b)} />)}
            </div>
          </>
        ) : (
          <div style={{ flex:1, overflowY:"auto" }}><DetailPanel /></div>
        )}
      </div>
    );
  }

  /* ── Desktop ── */
  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Nunito',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ width:320, borderRight:"1px solid #e2e8f0", display:"flex", flexDirection:"column", background:"#fff", flexShrink:0, overflowY:"auto" }}>
        <div style={{ padding:"22px 18px 14px", borderBottom:"1px solid #f1f5f9" }}>
          <div style={s.displayText}>My Bookings</div>
          <div style={{ display:"flex", gap:6, marginTop:8 }}>
            {["active","all"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ ...s.filterBtn, background: filter===f ? "#1e3a8a" : "transparent", color: filter===f ? "#fff" : "#64748b" }}>
                {f==="active" ? `Active (${activeBookings.length})` : `All (${bookings.length})`}
              </button>
            ))}
          </div>
        </div>
        {loading ? <div style={s.emptyMsg}>Loading…</div>
         : displayList.length===0 ? <div style={s.emptyMsg}>No bookings yet. Visit an artist's profile to request one.</div>
         : displayList.map(b => <BookingCard key={b._id} b={b} selected={selected} onClick={() => openBooking(b)} />)}
      </div>
      <div style={{ flex:1, background:"#f8fafc", overflowY:"auto" }}><DetailPanel /></div>
    </div>
  );
}

function BookingCard({ b, selected, onClick }) {
  const st = STATUS_LABELS[b.status] || {};
  return (
    <div onClick={onClick} style={{ padding:"14px 18px", borderBottom:"1px solid #f1f5f9", cursor:"pointer", background: selected?._id===b._id ? "#eff6ff" : "#fff", borderLeft: selected?._id===b._id ? "3px solid #1e3a8a" : "3px solid transparent" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:14, color:"#1e293b", fontFamily:"'Nunito',sans-serif" }}>{b.artistName}</div>
          <div style={{ fontSize:12, color:"#64748b", fontFamily:"'Nunito',sans-serif" }}>{b.eventType} · {b.eventDate}</div>
        </div>
        <span style={{ ...s.badge, background:st.bg, color:st.color }}>{st.label}</span>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, fontFamily:"'Nunito',sans-serif" }}>
        <span style={{ color:"#64748b" }}>{b.location}</span>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, color:"#1e3a8a" }}>₹{(b.finalAmount||b.agreedPrice||b.basePrice||0).toLocaleString()}</span>
      </div>
    </div>
  );
}

/* ─── Shared style tokens ─────────────────────────────────────────────────── */
const s = {
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
  acceptBtn:   { background:"#1d4ed8", color:"#fff", border:"none", padding:"8px 16px", borderRadius:18, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12, cursor:"pointer" },
  quickChip:   { background:"#eff6ff", color:"#1d4ed8", border:"none", padding:"9px 16px", borderRadius:10, fontSize:13, fontWeight:700, fontFamily:"'Nunito',sans-serif", cursor:"pointer", whiteSpace:"nowrap" },
  emptyMsg:    { padding:"24px", color:"#94a3b8", fontSize:13, fontFamily:"'Nunito',sans-serif" },
  backBtn:     { alignSelf:"flex-start", background:"#eff6ff", border:"none", color:"#1e3a8a", padding:"6px 14px", borderRadius:20, fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12, cursor:"pointer" },
};