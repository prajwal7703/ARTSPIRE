// artspire-frontend/src/pages/AdminDashboard.jsx
// Route: /admin
// Access: email = artistsconnect.arts@gmail.com + ADMIN_PASSWORD env var

import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";
const ADMIN_PASSWORD = localStorage.getItem("admin_password") || "";

const api = (password) =>
  axios.create({
    baseURL: API,
    headers: { "x-admin-password": password },
  });

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_COLOR = {
  pending_approval: { bg: "#fef9c3", color: "#854d0e" },
  negotiating:      { bg: "#eff6ff", color: "#1d4ed8" },
  price_agreed:     { bg: "#f0fdf4", color: "#15803d" },
  payment_pending:  { bg: "#faf5ff", color: "#7e22ce" },
  confirmed:        { bg: "#dcfce7", color: "#15803d" },
  cancelled:        { bg: "#fee2e2", color: "#7f1d1d" },
};

const W_STATUS_COLOR = {
  requested:  { bg: "#fef9c3", color: "#854d0e" },
  processing: { bg: "#eff6ff", color: "#1d4ed8" },
  paid:       { bg: "#dcfce7", color: "#15803d" },
  rejected:   { bg: "#fee2e2", color: "#7f1d1d" },
};

function Badge({ label, map }) {
  const s = map[label] || { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      display: "inline-block",
    }}>{label}</span>
  );
}

// ── LOGIN SCREEN ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!pw.trim()) return;
    setLoading(true); setErr("");
    try {
      const r = await axios.post(`${API}/api/admin/login`, { password: pw });
      if (r.data.success) {
        localStorage.setItem("admin_password", pw);
        onLogin(pw);
      } else {
        setErr("Wrong password.");
      }
    } catch {
      setErr("Wrong password.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0f172a",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', 'Nunito', sans-serif",
    }}>
      <div style={{
        background: "#1e293b", borderRadius: 20, padding: "40px 36px",
        width: "100%", maxWidth: 380,
        boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        border: "1px solid #334155",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎨</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", letterSpacing: -0.5 }}>ArtSpire Admin</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Restricted access</div>
        </div>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Admin Password</label>
        <input
          type="password" value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Enter password"
          style={{
            width: "100%", padding: "11px 14px", borderRadius: 10,
            border: "1.5px solid #334155", background: "#0f172a",
            color: "#f1f5f9", fontSize: 14, outline: "none",
            boxSizing: "border-box", marginBottom: 12,
            fontFamily: "inherit",
          }}
        />
        {err && <div style={{ color: "#f87171", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>⚠ {err}</div>}
        <button
          onClick={submit} disabled={loading || !pw.trim()}
          style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "none",
            background: pw.trim() ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "#334155",
            color: pw.trim() ? "#fff" : "#64748b",
            fontWeight: 800, fontSize: 14, cursor: pw.trim() ? "pointer" : "default",
            fontFamily: "inherit",
          }}
        >{loading ? "Checking…" : "Sign In →"}</button>
      </div>
    </div>
  );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, sub }) {
  return (
    <div style={{
      background: "#1e293b", border: "1px solid #334155",
      borderRadius: 16, padding: "20px 22px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: color || "#f1f5f9", letterSpacing: -1, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

// ── SECTION HEADER ────────────────────────────────────────────────────────────
function SectionHeader({ title, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9" }}>{title}</div>
      {count !== undefined && (
        <span style={{ background: "#334155", color: "#94a3b8", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>{count}</span>
      )}
    </div>
  );
}

// ── TABLE ─────────────────────────────────────────────────────────────────────
function Table({ cols, rows, emptyMsg = "No data yet." }) {
  if (!rows.length) return (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#475569", fontSize: 13, fontWeight: 600 }}>{emptyMsg}</div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "inherit" }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.key} style={{
                textAlign: "left", padding: "10px 14px",
                fontSize: 10, fontWeight: 800, color: "#475569",
                textTransform: "uppercase", letterSpacing: 1,
                borderBottom: "1px solid #334155", whiteSpace: "nowrap",
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
              {cols.map(c => (
                <td key={c.key} style={{ padding: "11px 14px", color: "#cbd5e1", verticalAlign: "middle" }}>
                  {c.render ? c.render(row) : (row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
function Dashboard({ password }) {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [artists, setArtists] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [wUpdating, setWUpdating] = useState({});

  const client = api(password);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, bRes, uRes, aRes, wRes] = await Promise.all([
        client.get("/api/admin/stats"),
        client.get("/api/admin/bookings"),
        client.get("/api/admin/users"),
        client.get("/api/admin/artists"),
        client.get("/api/admin/withdrawals"),
      ]);
      setStats(sRes.data);
      setBookings(Array.isArray(bRes.data) ? bRes.data : []);
      setUsers(Array.isArray(uRes.data) ? uRes.data : []);
      setArtists(Array.isArray(aRes.data) ? aRes.data : []);
      setWithdrawals(Array.isArray(wRes.data) ? wRes.data : []);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Admin fetch error:", e);
    } finally { setLoading(false); }
  }, [password]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const updateWithdrawal = async (id, status) => {
    setWUpdating(prev => ({ ...prev, [id]: true }));
    try {
      await client.put(`/api/admin/withdrawals/${id}/status`, { status });
      setWithdrawals(prev => prev.map(w => w._id === id ? { ...w, status } : w));
    } catch (e) { console.error(e); }
    setWUpdating(prev => ({ ...prev, [id]: false }));
  };

  const logout = () => {
    localStorage.removeItem("admin_password");
    window.location.reload();
  };

  const TABS = [
    { id: "overview",    label: "Overview",    icon: "📊" },
    { id: "bookings",    label: "Bookings",    icon: "📋" },
    { id: "users",       label: "Users",       icon: "👤" },
    { id: "artists",     label: "Artists",     icon: "🎨" },
    { id: "withdrawals", label: "Withdrawals", icon: "💸" },
  ];

  // Derived stats
  const confirmedBookings = bookings.filter(b => b.status === "confirmed");
  const totalRevenue = confirmedBookings.reduce((s, b) => s + (b.paidAmount || b.finalAmount || b.agreedPrice || 0), 0);
  const pendingCount = bookings.filter(b => b.status === "pending_approval").length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === "requested" || w.status === "processing");

  return (
    <div style={{
      minHeight: "100vh", background: "#0f172a",
      fontFamily: "'Inter', 'Nunito', sans-serif",
      display: "flex",
    }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 220, background: "#1e293b",
        borderRight: "1px solid #334155",
        display: "flex", flexDirection: "column",
        padding: "24px 12px 20px", flexShrink: 0,
        position: "sticky", top: 0, height: "100vh",
      }}>
        <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #334155" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#f1f5f9", letterSpacing: -0.5 }}>🎨 ArtSpire</div>
          <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, marginTop: 2 }}>Admin Console</div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10, border: "none",
              cursor: "pointer", textAlign: "left",
              fontFamily: "inherit", fontWeight: 700, fontSize: 13,
              background: tab === t.id ? "rgba(99,102,241,0.2)" : "transparent",
              color: tab === t.id ? "#818cf8" : "#64748b",
              borderLeft: `3px solid ${tab === t.id ? "#6366f1" : "transparent"}`,
              transition: "all 0.12s",
            }}>
              <span>{t.icon}</span><span>{t.label}</span>
              {t.id === "withdrawals" && pendingWithdrawals.length > 0 && (
                <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 20 }}>{pendingWithdrawals.length}</span>
              )}
              {t.id === "bookings" && pendingCount > 0 && (
                <span style={{ marginLeft: "auto", background: "#f59e0b", color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 20 }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div style={{ borderTop: "1px solid #334155", paddingTop: 16 }}>
          {lastRefresh && (
            <div style={{ fontSize: 10, color: "#334155", fontWeight: 600, marginBottom: 8, textAlign: "center" }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </div>
          )}
          <button onClick={fetchAll} style={{
            width: "100%", padding: "8px", borderRadius: 8, border: "1px solid #334155",
            background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", marginBottom: 6,
          }}>↻ Refresh</button>
          <button onClick={logout} style={{
            width: "100%", padding: "8px", borderRadius: 8, border: "none",
            background: "transparent", color: "#475569", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
          }}>Sign out</button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 32px 60px" }}>
        {loading && !stats ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "#475569", fontSize: 14, fontWeight: 700 }}>
            Loading data…
          </div>
        ) : (
          <>
            {/* ══ OVERVIEW ══ */}
            {tab === "overview" && (
              <div>
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9", letterSpacing: -0.5 }}>Dashboard Overview</div>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>Real-time snapshot of ArtSpire activity</div>
                </div>

                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 32 }}>
                  <StatCard label="Total Users"     value={stats?.totalUsers    ?? users.length}        icon="👤" color="#60a5fa" />
                  <StatCard label="Total Artists"   value={stats?.totalArtists  ?? artists.length}      icon="🎨" color="#a78bfa" />
                  <StatCard label="Total Bookings"  value={stats?.totalBookings ?? bookings.length}     icon="📋" color="#34d399" />
                  <StatCard label="Confirmed"       value={confirmedBookings.length}                    icon="✅" color="#34d399" />
                  <StatCard label="Revenue"         value={`₹${fmt(totalRevenue)}`}                    icon="₹"  color="#fbbf24" sub="from confirmed bookings" />
                  <StatCard label="Pending Pay"     value={pendingWithdrawals.length}                   icon="💸" color="#f87171" sub="withdrawal requests" />
                  <StatCard label="New Requests"    value={pendingCount}                                icon="🔔" color="#f59e0b" sub="awaiting approval" />
                </div>

                {/* Recent bookings */}
                <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: "20px 22px", marginBottom: 20 }}>
                  <SectionHeader title="Recent Bookings" count={bookings.slice(0, 8).length} />
                  <Table
                    cols={[
                      { key: "userName",   label: "Client" },
                      { key: "artistName", label: "Artist" },
                      { key: "eventType",  label: "Event" },
                      { key: "eventDate",  label: "Date" },
                      { key: "status",     label: "Status",  render: r => <Badge label={r.status} map={STATUS_COLOR} /> },
                      { key: "paidAmount", label: "Amount",  render: r => r.paidAmount ? `₹${fmt(r.paidAmount)}` : r.agreedPrice ? `₹${fmt(r.agreedPrice)}` : `₹${fmt(r.basePrice)}` },
                    ]}
                    rows={bookings.slice(0, 8)}
                    emptyMsg="No bookings yet."
                  />
                </div>

                {/* Pending withdrawals */}
                {pendingWithdrawals.length > 0 && (
                  <div style={{ background: "#1e293b", border: "1px solid #ef444430", borderRadius: 16, padding: "20px 22px" }}>
                    <SectionHeader title="⚠ Pending Withdrawals" count={pendingWithdrawals.length} />
                    <Table
                      cols={[
                        { key: "artistName", label: "Artist" },
                        { key: "amount",     label: "Amount", render: r => `₹${fmt(r.amount)}` },
                        { key: "status",     label: "Status", render: r => <Badge label={r.status} map={W_STATUS_COLOR} /> },
                        { key: "createdAt",  label: "Requested", render: r => fmtDate(r.createdAt) },
                        { key: "actions",    label: "Action", render: r => r.status === "paid" || r.status === "rejected" ? <span style={{ color: "#475569", fontSize: 12 }}>Done</span> : (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => updateWithdrawal(r._id, "paid")} disabled={wUpdating[r._id]} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Mark Paid</button>
                            <button onClick={() => updateWithdrawal(r._id, "rejected")} disabled={wUpdating[r._id]} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                          </div>
                        )},
                      ]}
                      rows={pendingWithdrawals}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ══ BOOKINGS ══ */}
            {tab === "bookings" && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9" }}>All Bookings</div>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{bookings.length} total bookings</div>
                </div>

                {/* Booking status breakdown */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                  {Object.entries(
                    bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {})
                  ).map(([status, count]) => (
                    <div key={status} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 16px", display: "flex", gap: 8, alignItems: "center" }}>
                      <Badge label={status} map={STATUS_COLOR} />
                      <span style={{ fontWeight: 800, color: "#f1f5f9", fontSize: 15 }}>{count}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: "20px 22px" }}>
                  <Table
                    cols={[
                      { key: "userName",   label: "Client",  render: r => <div><div style={{ fontWeight: 700, color: "#f1f5f9" }}>{r.userName}</div><div style={{ fontSize: 11, color: "#475569" }}>{r.userEmail}</div></div> },
                      { key: "artistName", label: "Artist" },
                      { key: "eventType",  label: "Event" },
                      { key: "eventDate",  label: "Event Date" },
                      { key: "location",   label: "Location" },
                      { key: "status",     label: "Status",   render: r => <Badge label={r.status} map={STATUS_COLOR} /> },
                      { key: "amount",     label: "Amount",   render: r => {
                        const amt = r.paidAmount || r.finalAmount || r.agreedPrice || r.basePrice;
                        const label = r.paidAmount ? "Paid" : r.agreedPrice ? "Agreed" : "Base";
                        return <div><div style={{ fontWeight: 700, color: "#fbbf24", fontSize: 14 }}>₹{fmt(amt)}</div><div style={{ fontSize: 10, color: "#475569" }}>{label}</div></div>;
                      }},
                      { key: "createdAt",  label: "Created",  render: r => fmtDate(r.createdAt) },
                    ]}
                    rows={bookings}
                    emptyMsg="No bookings yet."
                  />
                </div>
              </div>
            )}

            {/* ══ USERS ══ */}
            {tab === "users" && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9" }}>Users</div>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{users.length} registered users</div>
                </div>
                <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: "20px 22px" }}>
                  <Table
                    cols={[
                      { key: "name",      label: "Name",     render: r => <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#94a3b8", fontSize: 14, flexShrink: 0 }}>{r.name?.[0]?.toUpperCase() || "?"}</div><div style={{ fontWeight: 700, color: "#f1f5f9" }}>{r.name}</div></div> },
                      { key: "email",     label: "Email",    render: r => <span style={{ color: "#94a3b8" }}>{r.email}</span> },
                      { key: "city",      label: "City",     render: r => r.city || "—" },
                      { key: "createdAt", label: "Joined",   render: r => fmtDate(r.createdAt) },
                    ]}
                    rows={users}
                    emptyMsg="No users yet."
                  />
                </div>
              </div>
            )}

            {/* ══ ARTISTS ══ */}
            {tab === "artists" && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9" }}>Artists</div>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{artists.length} registered artists</div>
                </div>
                <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: "20px 22px" }}>
                  <Table
                    cols={[
                      { key: "name",      label: "Artist",   render: r => <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#93c5fd", fontSize: 14, flexShrink: 0 }}>{r.name?.[0]?.toUpperCase() || "?"}</div><div><div style={{ fontWeight: 700, color: "#f1f5f9" }}>{r.name}</div><div style={{ fontSize: 11, color: "#475569" }}>{r.email}</div></div></div> },
                      { key: "category",  label: "Category", render: r => r.category || "—" },
                      { key: "city",      label: "City",     render: r => r.city || "—" },
                      { key: "rating",    label: "Rating",   render: r => r.rating ? <span style={{ color: "#fbbf24", fontWeight: 700 }}>★ {Number(r.rating).toFixed(1)}</span> : "—" },
                      { key: "price",     label: "Base Price", render: r => r.price || r.basePrice ? `₹${fmt(r.price || r.basePrice)}` : "—" },
                      { key: "reviews",   label: "Reviews",  render: r => r.reviews?.length ?? 0 },
                      { key: "createdAt", label: "Joined",   render: r => fmtDate(r.createdAt) },
                    ]}
                    rows={artists}
                    emptyMsg="No artists yet."
                  />
                </div>
              </div>
            )}

            {/* ══ WITHDRAWALS ══ */}
            {tab === "withdrawals" && (
              <div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#f1f5f9" }}>Withdrawal Requests</div>
                  <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>{withdrawals.length} total · {pendingWithdrawals.length} pending action</div>
                </div>

                {/* Summary */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
                  {[
                    { label: "Requested",  color: "#fbbf24", count: withdrawals.filter(w => w.status === "requested").length,  total: withdrawals.filter(w => w.status === "requested").reduce((s, w) => s + w.amount, 0) },
                    { label: "Processing", color: "#60a5fa", count: withdrawals.filter(w => w.status === "processing").length, total: withdrawals.filter(w => w.status === "processing").reduce((s, w) => s + w.amount, 0) },
                    { label: "Paid",       color: "#34d399", count: withdrawals.filter(w => w.status === "paid").length,       total: withdrawals.filter(w => w.status === "paid").reduce((s, w) => s + w.amount, 0) },
                    { label: "Rejected",   color: "#f87171", count: withdrawals.filter(w => w.status === "rejected").length,   total: withdrawals.filter(w => w.status === "rejected").reduce((s, w) => s + w.amount, 0) },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: s.color, marginTop: 4 }}>{s.count}</div>
                      <div style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>₹{fmt(s.total)}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: "20px 22px" }}>
                  <Table
                    cols={[
                      { key: "artistName",  label: "Artist",    render: r => <div><div style={{ fontWeight: 700, color: "#f1f5f9" }}>{r.artistName}</div><div style={{ fontSize: 11, color: "#475569" }}>{r.artistEmail}</div></div> },
                      { key: "amount",      label: "Amount",    render: r => <span style={{ color: "#fbbf24", fontWeight: 700, fontSize: 15 }}>₹{fmt(r.amount)}</span> },
                      { key: "status",      label: "Status",    render: r => <Badge label={r.status} map={W_STATUS_COLOR} /> },
                      { key: "note",        label: "Note",      render: r => r.note || "—" },
                      { key: "createdAt",   label: "Requested", render: r => fmtDate(r.createdAt) },
                      { key: "actions",     label: "Action",    render: r => (
                        r.status === "paid" || r.status === "rejected"
                          ? <span style={{ color: "#334155", fontSize: 12, fontWeight: 700 }}>Closed</span>
                          : (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button
                                onClick={() => updateWithdrawal(r._id, "paid")}
                                disabled={wUpdating[r._id]}
                                style={{ background: "#16a34a", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: wUpdating[r._id] ? 0.6 : 1 }}
                              >{wUpdating[r._id] ? "…" : "✓ Paid"}</button>
                              <button
                                onClick={() => updateWithdrawal(r._id, "rejected")}
                                disabled={wUpdating[r._id]}
                                style={{ background: "#dc2626", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: wUpdating[r._id] ? 0.6 : 1 }}
                              >{wUpdating[r._id] ? "…" : "✕ Reject"}</button>
                            </div>
                          )
                      )},
                    ]}
                    rows={withdrawals}
                    emptyMsg="No withdrawal requests yet."
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ── ROOT EXPORT ───────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [password, setPassword] = useState(() => localStorage.getItem("admin_password") || "");
  const [verified, setVerified] = useState(false);

  // Auto-verify saved password on mount
  useEffect(() => {
    const saved = localStorage.getItem("admin_password");
    if (saved) {
      axios.post(`${API}/api/admin/login`, { password: saved })
        .then(r => { if (r.data.success) setVerified(true); })
        .catch(() => { localStorage.removeItem("admin_password"); });
    }
  }, []);

  if (!verified) {
    return <LoginScreen onLogin={(pw) => { setPassword(pw); setVerified(true); }} />;
  }

  return <Dashboard password={password} />;
}