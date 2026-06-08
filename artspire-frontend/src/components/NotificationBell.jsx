import { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function NotificationBell({ artistId }) {
  const [notifs, setNotifs]     = useState([]);
  const [unread, setUnread]     = useState(0);
  const [open, setOpen]         = useState(false);
  const [shake, setShake]       = useState(false);
  const [toast, setToast]       = useState(null);
  const panelRef                = useRef(null);
  const pollRef                 = useRef(null);
  const toastRef                = useRef(null);

  // ── Poll every 10 seconds (replace with WebSocket/SSE for true real-time) ──
  useEffect(() => {
    if (!artistId) return;
    fetchNotifs();
    pollRef.current = setInterval(fetchNotifs, 10_000);
    return () => clearInterval(pollRef.current);
  }, [artistId]);

  // ── Close panel on outside click ──
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifs = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications/${artistId}`);
      const fresh = res.data;
      const newUnread = fresh.filter(n => !n.read).length;

      // Show toast + shake for truly new items
      if (notifs.length > 0 && fresh.length > notifs.length) {
        const newest = fresh[0];
        setToast(newest);
        setShake(true);
        clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => setToast(null), 4000);
        setTimeout(() => setShake(false), 600);
      }

      setNotifs(fresh);
      setUnread(newUnread);
    } catch (err) { console.log(err); }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/${artistId}/read-all`);
      setNotifs(n => n.map(x => ({ ...x, read: true })));
      setUnread(0);
    } catch (err) { console.log(err); }
  };

  const markOne = async (id) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/notifications/${id}/read`);
      setNotifs(n => n.map(x => x._id === id ? { ...x, read: true } : x));
      setUnread(u => Math.max(0, u - 1));
    } catch (err) { console.log(err); }
  };

  return (
    <div ref={panelRef} style={{ position: "relative" }}>

      {/* ── Bell button ── */}
      <button
        onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
        style={{
          ...btnStyle,
          animation: shake ? "bellShake 0.5s ease" : "none",
        }}
      >
        🔔
        {unread > 0 && (
          <span style={badgeStyle}>{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={panelStyle}>
          <div style={panelHeader}>
            <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: "15px", color: "#1e3a8a" }}>
              Notifications
            </span>
            <button style={markAllStyle} onClick={markAllRead}>Mark all read</button>
          </div>

          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {notifs.length === 0 ? (
              <div style={emptyStyle}>No notifications yet</div>
            ) : notifs.map(n => (
              <div key={n._id} onClick={() => markOne(n._id)}
                style={{ ...itemStyle, background: n.read ? "transparent" : "#e8f0ff" }}>
                <div style={avatarStyle(n.type)}>{ICONS[n.type]}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Nunito',sans-serif", fontSize: "13px", color: "#111", lineHeight: 1.45 }}>
                    <strong>{n.fromName}</strong> {n.message}
                  </div>
                  <div style={{ fontFamily: "'Nunito',sans-serif", fontSize: "11px", color: "#888", marginTop: "3px" }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>
                {!n.read && <div style={dotStyle} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Toast popup ── */}
      {toast && (
        <div style={toastStyle}>
          <div style={avatarStyle(toast.type)}>{ICONS[toast.type]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: "13px" }}>
              {toast.fromName}
            </div>
            <div style={{ fontFamily: "'Nunito',sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.75)" }}>
              {toast.message}
            </div>
          </div>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "18px" }}>×</button>
        </div>
      )}

      <style>{`
        @keyframes bellShake {
          0%,100%{transform:rotate(0)} 20%{transform:rotate(-14deg)}
          40%{transform:rotate(12deg)} 60%{transform:rotate(-8deg)} 80%{transform:rotate(6deg)}
        }
        @keyframes toastIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const ICONS = { like: "❤️", follow: "👤", comment: "💬", booking: "📅" };

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)  return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function avatarStyle(type) {
  const map = { like: "#fbeaf0", follow: "#e1f5ee", comment: "#e6f1fb", booking: "#fcebeb" };
  return {
    width: "36px", height: "36px", borderRadius: "50%",
    background: map[type] || "#f0f0f0",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "16px", flexShrink: 0,
  };
}

// ── Styles ───────────────────────────────────────────────────────────────────
const btnStyle = {
  position: "relative", background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)", borderRadius: "22px",
  width: "40px", height: "40px", display: "flex",
  alignItems: "center", justifyContent: "center",
  fontSize: "18px", cursor: "pointer",
};
const badgeStyle = {
  position: "absolute", top: "-5px", right: "-5px",
  background: "#e24b4a", color: "#fff", fontSize: "11px",
  fontWeight: 800, minWidth: "18px", height: "18px",
  borderRadius: "9px", display: "flex", alignItems: "center",
  justifyContent: "center", padding: "0 4px",
  border: "2px solid #050816", animation: "badgePop 0.25s ease",
};
const panelStyle = {
  position: "absolute", top: "50px", right: 0,
  width: "320px", background: "#fff", borderRadius: "16px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.18)", overflow: "hidden",
  border: "1px solid rgba(0,0,0,0.08)", zIndex: 200,
  animation: "slideIn 0.2s ease",
};
const panelHeader = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "14px 16px", borderBottom: "1px solid #f0f0f0",
};
const markAllStyle = {
  fontFamily: "'Nunito',sans-serif", fontSize: "12px",
  color: "#1e3a8a", background: "none", border: "none", cursor: "pointer", fontWeight: 700,
};
const itemStyle = {
  display: "flex", gap: "12px", padding: "12px 16px",
  borderBottom: "1px solid #f5f5f5", cursor: "pointer",
  alignItems: "flex-start", transition: "background 0.12s",
  animation: "slideIn 0.25s ease",
};
const dotStyle = {
  width: "8px", height: "8px", borderRadius: "50%",
  background: "#378add", flexShrink: 0, marginTop: "6px",
};
const emptyStyle = {
  padding: "32px", textAlign: "center",
  fontFamily: "'Nunito',sans-serif", color: "#999", fontSize: "14px",
};
const toastStyle = {
  position: "fixed", bottom: "24px", right: "24px",
  background: "#1e3a8a", color: "#fff", borderRadius: "14px",
  padding: "14px 18px", display: "flex", gap: "12px",
  alignItems: "center", minWidth: "280px", maxWidth: "340px",
  boxShadow: "0 8px 24px rgba(30,58,138,0.35)",
  animation: "toastIn 0.3s ease", zIndex: 9999,
};
