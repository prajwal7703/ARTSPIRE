import { useEffect, useState, useRef } from "react";
import axios from "axios";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const TYPE_CONFIG = {
  booking: { icon:"📅", color:"#dbeafe", text:"#1e3a8a" },
  like:    { icon:"❤️", color:"#ffe4e6", text:"#9f1239" },
  message: { icon:"💬", color:"#dcfce7", text:"#14532d" },
  default: { icon:"🔔", color:"#fef3c7", text:"#92400e" },
};

export default function NotificationBell({ userId }) {
  const [notifs, setNotifs]   = useState([]);
  const [open, setOpen]       = useState(false);
  const [pulse, setPulse]     = useState(false);
  const dropRef               = useRef(null);

  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    if (!userId) return;
    fetchNotifs();

    // Real-time booking notifications
    socket.on("booking_notification", (data) => {
      const newNotif = { _id: Date.now(), type:"booking", fromName: data.userName, message: data.message || `New booking from ${data.userName}`, read: false, createdAt: new Date().toISOString() };
      setNotifs(prev => [newNotif, ...prev]);
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    });

    // Real-time message notifications
    socket.on("receive_message", (data) => {
      if (data.receiverId === userId) {
        const newNotif = { _id: Date.now() + 1, type:"message", fromName: "Someone", message: data.message || "Sent you a message", read: false, createdAt: new Date().toISOString() };
        setNotifs(prev => [newNotif, ...prev]);
        setPulse(true);
        setTimeout(() => setPulse(false), 1000);
      }
    });

    // Close on outside click
    const handleOutside = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handleOutside);

    return () => {
      socket.off("booking_notification");
      socket.off("receive_message");
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [userId]);

  const fetchNotifs = async () => {
    try {
      const res = await axios.get(`${API}/api/notifications/${userId}`);
      setNotifs(Array.isArray(res.data) ? res.data.slice(0, 20) : []);
    } catch { setNotifs([]); }
  };

  const markAllRead = async () => {
    try {
      await axios.patch(`${API}/api/notifications/${userId}/read-all`);
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    } catch {
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const markOne = async (id) => {
    try {
      await axios.patch(`${API}/api/notifications/${id}/read`);
    } catch {}
    setNotifs(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
  };

  const formatTime = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h/24)}d ago`;
  };

  return (
    <div ref={dropRef} style={{ position:"relative", display:"inline-block" }}>
      <style>{`
        @keyframes bellShake {
          0%,100%{transform:rotate(0)} 20%{transform:rotate(-15deg)} 40%{transform:rotate(15deg)} 60%{transform:rotate(-10deg)} 80%{transform:rotate(10deg)}
        }
        @keyframes dropIn { from{opacity:0;transform:translateY(-8px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes notifPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.3)} }
        .notif-item:hover { background: #f8fafc !important; }
      `}</style>

      {/* Bell button */}
      <button
        onClick={() => { setOpen(o => !o); if (!open && unread > 0) {} }}
        style={{ position:"relative", background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:"50%", width:42, height:42, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.2s", animation: pulse ? "bellShake 0.5s ease" : "none" }}
      >
        <svg width="20" height="20" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <div style={{ position:"absolute", top:4, right:4, minWidth:18, height:18, background:"#ef4444", borderRadius:"50%", border:"2px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:"#fff", fontFamily:"'Nunito',sans-serif", animation: pulse ? "notifPulse 0.5s ease" : "none", padding:"0 3px" }}>
            {unread > 9 ? "9+" : unread}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 10px)", right:0, width:340, background:"#fff", borderRadius:20, boxShadow:"0 16px 48px rgba(0,0,0,0.15)", border:"1px solid #e2e8f0", zIndex:1000, overflow:"hidden", animation:"dropIn 0.2s ease", fontFamily:"'Nunito',sans-serif" }}>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 18px 12px", borderBottom:"1px solid #f1f5f9" }}>
            <div style={{ fontWeight:900, fontSize:15, color:"#1e293b" }}>
              Notifications {unread > 0 && <span style={{ background:"#ef4444", color:"#fff", fontSize:10, fontWeight:800, padding:"2px 7px", borderRadius:20, marginLeft:6 }}>{unread}</span>}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background:"none", border:"none", color:"#1e3a8a", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight:360, overflowY:"auto" }}>
            {notifs.length === 0 ? (
              <div style={{ padding:"40px 20px", textAlign:"center", color:"#94a3b8", fontSize:14 }}>
                <div style={{ fontSize:36, marginBottom:8 }}>🔔</div>
                No notifications yet
              </div>
            ) : notifs.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.default;
              return (
                <div
                  key={n._id}
                  className="notif-item"
                  onClick={() => markOne(n._id)}
                  style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 16px", cursor:"pointer", background: n.read ? "#fff" : "#f8faff", borderBottom:"1px solid #f8fafc", transition:"background 0.15s", borderLeft: n.read ? "3px solid transparent" : "3px solid #1e3a8a" }}
                >
                  <div style={{ width:38, height:38, borderRadius:12, background: cfg.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight: n.read ? 600 : 800, color:"#1e293b", lineHeight:1.4 }}>{n.message}</div>
                    <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>{formatTime(n.createdAt)}</div>
                  </div>
                  {!n.read && <div style={{ width:8, height:8, borderRadius:"50%", background:"#1e3a8a", flexShrink:0, marginTop:4 }} />}
                </div>
              );
            })}
          </div>

          {notifs.length > 0 && (
            <div style={{ padding:"10px 16px", borderTop:"1px solid #f1f5f9", textAlign:"center" }}>
              <button
                onClick={() => { setNotifs([]); setOpen(false); }}
                style={{ background:"none", border:"none", color:"#94a3b8", fontSize:12, fontWeight:600, cursor:"pointer" }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}