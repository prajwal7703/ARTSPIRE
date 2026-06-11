import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ICONS = {
  like:    "❤️",
  follow:  "👤",
  comment: "💬",
  booking: "📅",
  message: "✉️",
  review:  "⭐",
};

const TYPE_COLORS = {
  like:    { bg: "#fbeaf0", text: "#be185d" },
  follow:  { bg: "#e1f5ee", text: "#065f46" },
  comment: { bg: "#e6f1fb", text: "#1d4ed8" },
  booking: { bg: "#fcebeb", text: "#b91c1c" },
  message: { bg: "#f0e9ff", text: "#6d28d9" },
  review:  { bg: "#fefce8", text: "#854d0e" },
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── NotificationBell ─────────────────────────────────────────────────────────
export default function NotificationBell({ artistId }) {
  const [notifs, setNotifs]   = useState([]);
  const [unread, setUnread]   = useState(0);
  const [open, setOpen]       = useState(false);
  const [shake, setShake]     = useState(false);
  const [toast, setToast]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter]   = useState("all"); // "all" | "unread"

  const panelRef      = useRef(null);
  const pollRef       = useRef(null);
  const toastRef      = useRef(null);
  // ✅ FIX: use ref to track previous count — avoids stale closure
  const prevCountRef  = useRef(0);

  // ── Fetch notifications ────────────────────────────────────────────────────
  // ✅ FIX: useCallback so fetchNotifs always reads fresh ref values
  const fetchNotifs = useCallback(async () => {
    if (!artistId) return;
    try {
      const res   = await axios.get(`${API}/api/notifications/${artistId}`);
      const fresh = Array.isArray(res.data) ? res.data : [];
      const newUnread = fresh.filter((n) => !n.read).length;

      // ✅ FIX: compare against ref (not stale state) for toast trigger
      if (prevCountRef.current > 0 && fresh.length > prevCountRef.current) {
        const newest = fresh[0];
        setToast(newest);
        setShake(true);
        clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => setToast(null), 4000);
        setTimeout(() => setShake(false), 600);

        // Browser notification
        if (Notification.permission === "granted") {
          new Notification(newest.fromName || "New notification", {
            body: newest.message,
            icon: "/favicon.ico",
          });
        }
      }

      prevCountRef.current = fresh.length;
      setNotifs(fresh);
      setUnread(newUnread);
    } catch (err) {
      console.log("Notification fetch error:", err);
    }
  }, [artistId]);

  // ── Poll every 12 seconds ──────────────────────────────────────────────────
  useEffect(() => {
    if (!artistId) return;
    setLoading(true);
    fetchNotifs().finally(() => setLoading(false));
    pollRef.current = setInterval(fetchNotifs, 12_000);
    return () => {
      clearInterval(pollRef.current);
      clearTimeout(toastRef.current);
    };
  }, [fetchNotifs]);

  // ── Close panel on outside click ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Request browser notification permission once
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── Mark all read ──────────────────────────────────────────────────────────
  const markAllRead = async () => {
    try {
      await axios.put(`${API}/api/notifications/${artistId}/read-all`);
      setNotifs((n) => n.map((x) => ({ ...x, read: true })));
      setUnread(0);
    } catch (err) {
      console.log(err);
    }
  };

  // ── Mark one read ──────────────────────────────────────────────────────────
  const markOne = async (id) => {
    try {
      await axios.put(`${API}/api/notifications/${id}/read`);
      setNotifs((n) => n.map((x) => (x._id === id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    } catch (err) {
      console.log(err);
    }
  };

  // ── Delete one ────────────────────────────────────────────────────────────
  const deleteOne = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/api/notifications/${id}`);
      const wasUnread = notifs.find((n) => n._id === id && !n.read);
      setNotifs((n) => n.filter((x) => x._id !== id));
      if (wasUnread) setUnread((u) => Math.max(0, u - 1));
      prevCountRef.current = Math.max(0, prevCountRef.current - 1);
    } catch (err) {
      console.log(err);
    }
  };

  const handleBellClick = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && unread > 0) {
      // Auto-mark all read when opening panel
      setTimeout(markAllRead, 800);
    }
  };

  const displayedNotifs = filter === "unread"
    ? notifs.filter((n) => !n.read)
    : notifs;

  return (
    <div ref={panelRef} style={{ position: "relative" }}>
      <style>{`
        @keyframes bellShake {
          0%,100%{transform:rotate(0deg)}
          15%{transform:rotate(-16deg)}
          30%{transform:rotate(14deg)}
          45%{transform:rotate(-10deg)}
          60%{transform:rotate(7deg)}
          75%{transform:rotate(-4deg)}
        }
        @keyframes badgePop {
          0%{transform:scale(0)} 70%{transform:scale(1.2)} 100%{transform:scale(1)}
        }
        @keyframes toastIn {
          from{opacity:0;transform:translateY(16px) scale(0.96)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes slideDown {
          from{opacity:0;transform:translateY(-8px) scale(0.98)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        @keyframes fadeIn {
          from{opacity:0;transform:translateY(4px)}
          to{opacity:1;transform:translateY(0)}
        }
        .notif-item:hover { background: #f5f7fa !important; }
        .notif-item:hover .notif-delete { opacity: 1 !important; }
        .notif-delete { opacity: 0; transition: opacity 0.15s; }
        .bell-btn:hover { opacity: 0.85; }
      `}</style>

      {/* ── Bell button ── */}
      <button
        className="bell-btn"
        onClick={handleBellClick}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        style={{
          position: "relative",
          background: open ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: "22px",
          width: "42px", height: "42px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px", cursor: "pointer",
          transition: "background 0.2s, opacity 0.2s",
          animation: shake ? "bellShake 0.55s ease" : "none",
        }}
      >
        🔔
        {unread > 0 && (
          <span style={{
            position: "absolute", top: "-5px", right: "-5px",
            background: "#e24b4a", color: "#fff",
            fontSize: "10px", fontWeight: 800,
            minWidth: "18px", height: "18px", borderRadius: "9px",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px", border: "2px solid #050816",
            animation: "badgePop 0.25s ease",
            fontFamily: "'Outfit', sans-serif",
          }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div style={{
          position: "absolute", top: "52px", right: 0,
          width: "340px",
          background: "#fff",
          borderRadius: "18px",
          boxShadow: "0 16px 48px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.07)",
          zIndex: 300,
          animation: "slideDown 0.22s ease",
          overflow: "hidden",
        }}>
          {/* Panel header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 16px 10px",
            borderBottom: "1px solid #f0f0f0",
          }}>
            <div>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "15px", color: "#0f172a" }}>
                Notifications
              </span>
              {unread > 0 && (
                <span style={{
                  marginLeft: "8px", background: "#e24b4a", color: "#fff",
                  fontSize: "10px", fontWeight: 700, borderRadius: "8px",
                  padding: "2px 7px", fontFamily: "'Outfit', sans-serif",
                }}>
                  {unread} new
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    fontFamily: "'Outfit', sans-serif", fontSize: "11px",
                    color: "#1e3a8a", background: "#eff6ff",
                    border: "none", borderRadius: "8px",
                    padding: "4px 10px", cursor: "pointer", fontWeight: 700,
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: "0", borderBottom: "1px solid #f0f0f0" }}>
            {["all", "unread"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  flex: 1, padding: "9px 0",
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "'Outfit', sans-serif", fontSize: "12px", fontWeight: 700,
                  color: filter === f ? "#1e3a8a" : "#94a3b8",
                  borderBottom: filter === f ? "2px solid #1e3a8a" : "2px solid transparent",
                  textTransform: "capitalize", transition: "color 0.15s",
                }}
              >
                {f === "unread" ? `Unread${unread > 0 ? ` (${unread})` : ""}` : "All"}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: "380px", overflowY: "auto" }}>
            {loading && notifs.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", fontFamily: "'Outfit', sans-serif", fontSize: "13px" }}>
                Loading...
              </div>
            ) : displayedNotifs.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                  {filter === "unread" ? "✅" : "🔔"}
                </div>
                <div style={{ fontFamily: "'Outfit', sans-serif", color: "#94a3b8", fontSize: "13px" }}>
                  {filter === "unread" ? "All caught up!" : "No notifications yet"}
                </div>
              </div>
            ) : (
              displayedNotifs.map((n, i) => {
                const tc = TYPE_COLORS[n.type] || { bg: "#f0f0f0", text: "#333" };
                return (
                  <div
                    key={n._id}
                    className="notif-item"
                    onClick={() => markOne(n._id)}
                    style={{
                      display: "flex", gap: "12px", padding: "12px 14px",
                      borderBottom: i < displayedNotifs.length - 1 ? "1px solid #f5f5f5" : "none",
                      cursor: "pointer",
                      background: n.read ? "transparent" : "#eef2ff",
                      alignItems: "flex-start",
                      transition: "background 0.12s",
                      animation: `fadeIn 0.2s ease ${i * 0.03}s both`,
                      position: "relative",
                    }}
                  >
                    {/* Type icon */}
                    <div style={{
                      width: "38px", height: "38px", borderRadius: "50%",
                      background: tc.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "16px", flexShrink: 0,
                    }}>
                      {ICONS[n.type] || "🔔"}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Outfit', sans-serif", fontSize: "13px",
                        color: "#111", lineHeight: 1.45,
                      }}>
                        <strong style={{ color: "#0f172a" }}>{n.fromName}</strong>{" "}
                        <span style={{ color: "#374151" }}>{n.message}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                        <span style={{
                          fontSize: "10px", fontWeight: 700, color: tc.text,
                          background: tc.bg, borderRadius: "6px", padding: "1px 6px",
                          fontFamily: "'Outfit', sans-serif",
                        }}>
                          {n.type}
                        </span>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "11px", color: "#9ca3af" }}>
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Unread dot + delete */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
                      {!n.read && (
                        <div style={{
                          width: "8px", height: "8px", borderRadius: "50%",
                          background: "#378add",
                        }} />
                      )}
                      <button
                        className="notif-delete"
                        onClick={(e) => deleteOne(e, n._id)}
                        title="Delete"
                        style={{
                          background: "none", border: "none",
                          color: "#d1d5db", cursor: "pointer",
                          fontSize: "14px", padding: "2px", lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div style={{
              padding: "10px 16px",
              borderTop: "1px solid #f0f0f0",
              textAlign: "center",
            }}>
              <button
                onClick={() => {
                  setNotifs([]);
                  setUnread(0);
                  prevCountRef.current = 0;
                }}
                style={{
                  background: "none", border: "none",
                  fontFamily: "'Outfit', sans-serif", fontSize: "12px",
                  color: "#94a3b8", cursor: "pointer", fontWeight: 600,
                }}
              >
                Clear all notifications
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Toast popup ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px",
          background: "linear-gradient(135deg, #1e3a8a, #1e40af)",
          color: "#fff", borderRadius: "16px",
          padding: "14px 16px",
          display: "flex", gap: "12px", alignItems: "center",
          minWidth: "280px", maxWidth: "340px",
          boxShadow: "0 8px 32px rgba(30,58,138,0.4)",
          animation: "toastIn 0.3s ease",
          zIndex: 9999,
        }}>
          {/* Icon */}
          <div style={{
            width: "38px", height: "38px", borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px", flexShrink: 0,
          }}>
            {ICONS[toast.type] || "🔔"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: "13px", color: "#fff" }}>
              {toast.fromName}
            </div>
            <div style={{
              fontFamily: "'Outfit', sans-serif", fontSize: "12px",
              color: "rgba(255,255,255,0.75)", marginTop: "2px",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {toast.message}
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none",
              color: "#fff", cursor: "pointer",
              width: "26px", height: "26px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}