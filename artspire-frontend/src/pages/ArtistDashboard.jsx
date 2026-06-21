import { useState, useEffect } from "react";
import axios from "axios";
import ArtistBookingDashboard from "./ArtistBookingDashboard"; // adjust path as needed

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const TABS = [
  { id: "bookings", label: "Bookings",     icon: "📋" },
  { id: "profile",  label: "Edit Profile", icon: "✏️" },
  { id: "reviews",  label: "Reviews",      icon: "⭐" },
  { id: "earnings", label: "Earnings",     icon: "₹" },
];

// ─── Edit Profile Tab ───────────────────────────────────────────────────────
function EditProfileTab({ artistId }) {
  const [form, setForm]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState({ type: "", text: "" });

  useEffect(() => {
    axios.get(`${API}/api/artists/${artistId}`)
      .then(r => setForm(r.data))
      .catch(() => setMsg({ type: "error", text: "Failed to load profile." }))
      .finally(() => setLoading(false));
  }, [artistId]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const save = async () => {
    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      await axios.put(`${API}/api/artists/${artistId}`, form);
      setMsg({ type: "ok", text: "Profile saved successfully!" });
    } catch {
      setMsg({ type: "error", text: "Failed to save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={t.centreMsg}>Loading profile…</div>;
  if (!form)   return <div style={t.centreMsg}>Could not load profile.</div>;

  return (
    <div style={t.tabBody}>
      <div style={t.sectionTitle}>Edit Profile</div>

      {/* Basic info */}
      <div style={t.card}>
        <div style={t.cardTitle}>Basic Info</div>
        <div style={t.grid2}>
          <Field label="Artist / Stage Name" value={form.name || ""} onChange={v => set("name", v)} />
          <Field label="Category" value={form.category || ""} onChange={v => set("category", v)} placeholder="e.g. Musician, Photographer" />
          <Field label="Location" value={form.location || ""} onChange={v => set("location", v)} />
          <Field label="Phone" value={form.phone || ""} onChange={v => set("phone", v)} />
        </div>
        <Field label="Bio" value={form.bio || ""} onChange={v => set("bio", v)} multiline placeholder="Describe yourself, your style and experience…" />
      </div>

      {/* Pricing */}
      <div style={t.card}>
        <div style={t.cardTitle}>Pricing</div>
        <div style={t.grid2}>
          <Field label="Base Price (₹)" type="number" value={form.basePrice || ""} onChange={v => set("basePrice", v)} />
          <Field label="Price Note" value={form.priceNote || ""} onChange={v => set("priceNote", v)} placeholder="e.g. per hour, per event" />
        </div>
      </div>

      {/* Social / Portfolio */}
      <div style={t.card}>
        <div style={t.cardTitle}>Social & Portfolio</div>
        <div style={t.grid2}>
          <Field label="Instagram" value={form.instagram || ""} onChange={v => set("instagram", v)} placeholder="@handle" />
          <Field label="YouTube / Portfolio URL" value={form.portfolioUrl || ""} onChange={v => set("portfolioUrl", v)} placeholder="https://…" />
        </div>
      </div>

      {/* Skills / Tags */}
      <div style={t.card}>
        <div style={t.cardTitle}>Skills / Tags</div>
        <Field
          label="Tags (comma-separated)"
          value={Array.isArray(form.tags) ? form.tags.join(", ") : form.tags || ""}
          onChange={v => set("tags", v.split(",").map(s => s.trim()).filter(Boolean))}
          placeholder="e.g. Jazz, Live Events, Weddings"
        />
      </div>

      {msg.text && (
        <div style={{ ...t.msgBox, background: msg.type === "ok" ? "#f0fdf4" : "#fee2e2", color: msg.type === "ok" ? "#15803d" : "#7f1d1d", borderColor: msg.type === "ok" ? "#86efac" : "#fca5a5" }}>
          {msg.text}
        </div>
      )}

      <button onClick={save} disabled={saving} style={{ ...t.primaryBtn, opacity: saving ? 0.7 : 1 }}>
        {saving ? "Saving…" : "Save Changes →"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", multiline = false, placeholder = "" }) {
  const shared = {
    value,
    onChange: e => onChange(e.target.value),
    placeholder,
    style: t.input,
  };
  return (
    <div style={{ marginBottom: 14, gridColumn: multiline ? "1 / -1" : undefined }}>
      <label style={t.miniLabel}>{label}</label>
      {multiline
        ? <textarea {...shared} rows={4} style={{ ...t.input, resize: "vertical" }} />
        : <input {...shared} type={type} />
      }
    </div>
  );
}

// ─── Reviews Tab ────────────────────────────────────────────────────────────
function ReviewsTab({ artistId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    axios.get(`${API}/api/artists/${artistId}/reviews`)
      .then(r => setReviews(r.data))
      .catch(() => setError("Could not load reviews."))
      .finally(() => setLoading(false));
  }, [artistId]);

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  if (loading) return <div style={t.centreMsg}>Loading reviews…</div>;

  return (
    <div style={t.tabBody}>
      <div style={t.sectionTitle}>Reviews</div>

      {error && <div style={{ ...t.msgBox, background: "#fee2e2", color: "#7f1d1d", borderColor: "#fca5a5" }}>{error}</div>}

      {/* Summary strip */}
      {reviews.length > 0 && (
        <div style={{ ...t.card, display: "flex", gap: 32, alignItems: "center", padding: "18px 22px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 48, color: "#1e3a8a", lineHeight: 1 }}>{avg}</div>
            <div style={t.miniLabel}>Overall Rating</div>
          </div>
          <div style={{ flex: 1 }}>
            {[5,4,3,2,1].map(star => {
              const count = reviews.filter(r => Math.round(r.rating) === star).length;
              const pct   = Math.round((count / reviews.length) * 100);
              return (
                <div key={star} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#64748b", fontFamily: "'Nunito',sans-serif", width: 14 }}>{star}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 4, background: "#e2e8f0", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#1e3a8a", borderRadius: 4, transition: "width 0.5s" }} />
                  </div>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Nunito',sans-serif", width: 28 }}>{count}</span>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 36, color: "#1e3a8a", lineHeight: 1 }}>{reviews.length}</div>
            <div style={t.miniLabel}>Total Reviews</div>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div style={{ ...t.card, textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontFamily: "'Nunito',sans-serif" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⭐</div>
          <div style={{ fontWeight: 700 }}>No reviews yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Reviews from confirmed bookings will appear here.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reviews.map((r, i) => (
            <div key={r._id || i} style={t.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#1e293b", fontFamily: "'Nunito',sans-serif" }}>{r.userName || "Anonymous"}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "'Nunito',sans-serif" }}>
                    {r.eventType} · {r.eventDate ? new Date(r.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} style={{ fontSize: 14, color: s <= Math.round(r.rating) ? "#f59e0b" : "#e2e8f0" }}>★</span>
                  ))}
                </div>
              </div>
              {r.comment && <div style={{ fontSize: 13, color: "#475569", fontFamily: "'Nunito',sans-serif", lineHeight: 1.6 }}>{r.comment}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Earnings Tab ───────────────────────────────────────────────────────────
function EarningsTab({ artistId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    axios.get(`${API}/api/artists/${artistId}/earnings`)
      .then(r => setData(r.data))
      .catch(() => setError("Could not load earnings."))
      .finally(() => setLoading(false));
  }, [artistId]);

  if (loading) return <div style={t.centreMsg}>Loading earnings…</div>;
  if (error)   return <div style={{ ...t.tabBody }}><div style={{ ...t.msgBox, background: "#fee2e2", color: "#7f1d1d", borderColor: "#fca5a5" }}>{error}</div></div>;

  // Fallback shape if API returns a simple array of confirmed bookings
  const bookings       = Array.isArray(data) ? data : (data?.bookings || []);
  const totalEarned    = data?.totalEarned    ?? bookings.reduce((s, b) => s + (b.paidAmount || 0), 0);
  const totalBookings  = data?.totalBookings  ?? bookings.length;
  const pendingPayout  = data?.pendingPayout  ?? 0;
  const thisMonth      = data?.thisMonth      ?? bookings
    .filter(b => new Date(b.updatedAt).getMonth() === new Date().getMonth())
    .reduce((s, b) => s + (b.paidAmount || 0), 0);

  const stats = [
    { label: "Total Earned",    value: `₹${totalEarned.toLocaleString()}`,   color: "#1e3a8a" },
    { label: "This Month",      value: `₹${thisMonth.toLocaleString()}`,      color: "#15803d" },
    { label: "Pending Payout",  value: `₹${pendingPayout.toLocaleString()}`,  color: "#7e22ce" },
    { label: "Completed Gigs",  value: totalBookings,                          color: "#0e7490" },
  ];

  return (
    <div style={t.tabBody}>
      <div style={t.sectionTitle}>Earnings</div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {stats.map(s => (
          <div key={s.label} style={{ ...t.card, padding: "18px 16px", textAlign: "center" }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, color: s.color, letterSpacing: 1 }}>{s.value}</div>
            <div style={t.miniLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Booking history table */}
      {bookings.length > 0 && (
        <div style={t.card}>
          <div style={t.cardTitle}>Completed Bookings</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Nunito',sans-serif", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  {["Client", "Event", "Date", "Amount", "Status"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, i) => (
                  <tr key={b._id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 10px", fontWeight: 700, color: "#1e293b" }}>{b.userName}</td>
                    <td style={{ padding: "10px 10px", color: "#475569" }}>{b.eventType}</td>
                    <td style={{ padding: "10px 10px", color: "#475569" }}>{b.eventDate}</td>
                    <td style={{ padding: "10px 10px", fontFamily: "'Bebas Neue',sans-serif", fontSize: 16, color: "#1e3a8a" }}>₹{(b.paidAmount || b.agreedPrice || 0).toLocaleString()}</td>
                    <td style={{ padding: "10px 10px" }}>
                      <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Confirmed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {bookings.length === 0 && (
        <div style={{ ...t.card, textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontFamily: "'Nunito',sans-serif" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>₹</div>
          <div style={{ fontWeight: 700 }}>No completed bookings yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Earnings from confirmed bookings will appear here.</div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard Page ────────────────────────────────────────────────────
export default function ArtistDashboard() {
  const [activeTab, setActiveTab] = useState("bookings");
  const [artist, setArtist]       = useState(null);

  // Pull artistId from wherever your auth stores it
  const artistId   = localStorage.getItem("artistId");
  const artistName = localStorage.getItem("artistName") || "Artist";

  useEffect(() => {
    if (!artistId) return;
    axios.get(`${API}/api/artists/${artistId}`)
      .then(r => setArtist(r.data))
      .catch(() => {});
  }, [artistId]);

  return (
    <div style={t.shell}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <aside style={t.sidebar}>
        {/* Artist identity */}
        <div style={t.identity}>
          <div style={t.avatar}>{(artist?.name || artistName)[0]?.toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={t.artistName}>{artist?.name || artistName}</div>
            <div style={t.artistMeta}>{artist?.category || "Artist"}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...t.navBtn,
                background:  activeTab === tab.id ? "rgba(255,255,255,0.12)" : "transparent",
                color:       activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.6)",
                borderLeft:  activeTab === tab.id ? "3px solid #93c5fd" : "3px solid transparent",
              }}
            >
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={t.sidebarFooter}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'Nunito',sans-serif", letterSpacing: 0.5 }}>ARTSPIRE</div>
        </div>
      </aside>

      {/* Main content */}
      <main style={t.main}>
        {/* Mobile tab bar (visible < 640px) */}
        <div style={t.mobileTabBar}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...t.mobileTab,
                borderBottom: activeTab === tab.id ? "2px solid #1e3a8a" : "2px solid transparent",
                color: activeTab === tab.id ? "#1e3a8a" : "#94a3b8",
                fontWeight: activeTab === tab.id ? 800 : 600,
              }}
            >
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              <span style={{ fontSize: 11 }}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "bookings" && artistId && (
          <ArtistBookingDashboard artistId={artistId} artistName={artist?.name || artistName} />
        )}
        {activeTab === "profile"  && artistId && <EditProfileTab artistId={artistId} />}
        {activeTab === "reviews"  && artistId && <ReviewsTab     artistId={artistId} />}
        {activeTab === "earnings" && artistId && <EarningsTab    artistId={artistId} />}

        {!artistId && (
          <div style={t.centreMsg}>Artist not found. Please log in again.</div>
        )}
      </main>
    </div>
  );
}

// ─── Token system ────────────────────────────────────────────────────────────
const t = {
  shell:         { display: "flex", height: "100vh", fontFamily: "'Nunito',sans-serif", background: "#f8fafc", overflow: "hidden" },

  // Sidebar
  sidebar:       { width: 220, background: "#1e3a8a", display: "flex", flexDirection: "column", padding: "24px 14px 16px", flexShrink: 0, "@media(maxWidth:640px)": { display: "none" } },
  identity:      { display: "flex", alignItems: "center", gap: 12, marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.1)" },
  avatar:        { width: 42, height: 42, borderRadius: "50%", background: "#3b82f6", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, flexShrink: 0 },
  artistName:    { fontFamily: "'Bebas Neue',sans-serif", fontSize: 17, color: "#fff", letterSpacing: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  artistMeta:    { fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "'Nunito',sans-serif", marginTop: 1 },
  navBtn:        { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 13, textAlign: "left", transition: "background 0.15s, color 0.15s" },
  sidebarFooter: { marginTop: "auto", paddingTop: 20, textAlign: "center" },

  // Mobile tab bar
  mobileTabBar:  { display: "none", "@media(maxWidth:640px)": { display: "flex" }, borderBottom: "1px solid #e2e8f0", background: "#fff", overflowX: "auto" },
  mobileTab:     { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "'Nunito',sans-serif", whiteSpace: "nowrap" },

  // Main area
  main:          { flex: 1, overflowY: "auto", overflowX: "hidden" },

  // Shared inside tabs
  tabBody:       { padding: "28px 28px 40px", maxWidth: 800, display: "flex", flexDirection: "column", gap: 16 },
  sectionTitle:  { fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: "#1e3a8a", letterSpacing: 1, marginBottom: 4 },
  card:          { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "16px 18px" },
  cardTitle:     { fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, fontFamily: "'Nunito',sans-serif" },
  grid2:         { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" },
  miniLabel:     { fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 4, fontFamily: "'Nunito',sans-serif" },
  input:         { padding: "9px 11px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#1e293b", fontSize: 13, fontWeight: 600, fontFamily: "'Nunito',sans-serif", outline: "none", width: "100%", boxSizing: "border-box" },
  msgBox:        { border: "1px solid", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 700, fontFamily: "'Nunito',sans-serif" },
  primaryBtn:    { background: "#1e3a8a", color: "#fff", border: "none", padding: "13px 24px", borderRadius: 20, fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14, cursor: "pointer", alignSelf: "flex-start" },
  centreMsg:     { display: "flex", alignItems: "center", justifyContent: "center", height: "60%", color: "#94a3b8", fontFamily: "'Nunito',sans-serif", fontSize: 14 },
};