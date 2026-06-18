import { useEffect, useState, useRef } from "react";
import axios from "axios";
import socket from "./socket"; // adjust path if needed

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

export default function NotificationBell({ userId }) {
  const [notifs, setNotifs]   = useState([]);
  const [open, setOpen]       = useState(false);
  const [unread, setUnread]   = useState(0);
  const dropdownRef           = useRef(null);

  // ── Fetch on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    fetchNotifs();

    // Real-time new notifications via socket
    socket.on("new_notification", (data) => {
      setNotifs(prev => [{
        _id:      Date.now(),
        message:  data.message,
        type:     data.type,
        read:     false,
        createdAt: new Date().toISOString(),
      }, ...prev]);
      setUnread(u => u + 1);
    });

    return () => socket.off("new_notification");
  }, [userId]);

  // ── Close on outside click ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifs = async () => {
    try {
      const res = await axios.get(`${API}/api/notifications/${userId}`);
      setNotifs(res.data || []);
      setUnread((res.data || []).filter(n => !n.read).length);
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/api/notifications/${userId}/read-all`);
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      setUnread(0);
    } catch {}
  };

  const getIcon = (type) => {
    const icons = { booking:"📅", message:"💬", like:"❤️", follow:"👤", booking_update:"✅" };
    return icons[type] || "🔔";
  };

  const formatTime = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div ref={dropdownRef} style={{ position:"relative" }}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open && unread > 0) markAllRead(); }}
        style={{ position:"relative", background:"none", border:"none", cursor:"pointer", padding:"8px", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center" }}
      >
        <svg width="22" height="22" fill="none" stroke="#1e293b" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unread > 0 && (
          <div style={{ position:"absolute", top:"4px", right:"4px", width:"18px", height:"18px", borderRadius:"50%", background:"#ef4444", border:"2px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", fontWeight:800, color:"#fff", fontFamily:"'Nunito',sans-serif" }}>
            {unread > 9 ? "9+" : unread}
          </div>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ position:"absolute", right:0, top:"48px", width:"340px", background:"#fff", borderRadius:"20px", boxShadow:"0 16px 48px rgba(0,0,0,0.15)", border:"1px solid #e2e8f0", zIndex:9999, overflow:"hidden" }}>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", borderBottom:"1px solid #f1f5f9" }}>
            <div style={{ fontWeight:800, fontSize:"15px", color:"#1e293b", fontFamily:"'Nunito',sans-serif" }}>Notifications</div>
            {unread > 0 && (
              <button onClick={markAllRead} style={{ background:"none", border:"none", fontSize:"12px", color:"#1e3a8a", fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight:"380px", overflowY:"auto" }}>
            {notifs.length === 0 ? (
              <div style={{ padding:"32px", textAlign:"center", color:"#94a3b8", fontSize:"14px", fontFamily:"'Nunito',sans-serif" }}>
                <div style={{ fontSize:"36px", marginBottom:"8px" }}>🔔</div>
                No notifications yet
              </div>
            ) : (
              notifs.map((n) => (
                <div key={n._id} style={{ display:"flex", gap:"12px", padding:"14px 20px", background:n.read?"#fff":"#f0f4ff", borderBottom:"1px solid #f8fafc", transition:"background 0.2s" }}>
                  <div style={{ width:"38px", height:"38px", borderRadius:"50%", background:"#e0e7ff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", flexShrink:0 }}>
                    {getIcon(n.type)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:"13px", fontWeight:n.read?600:800, color:"#1e293b", fontFamily:"'Nunito',sans-serif", lineHeight:1.4 }}>{n.message}</div>
                    <div style={{ fontSize:"11px", color:"#94a3b8", marginTop:"4px", fontFamily:"'Nunito',sans-serif" }}>{formatTime(n.createdAt)}</div>
                  </div>
                  {!n.read && <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#1e3a8a", flexShrink:0, marginTop:"6px" }} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}