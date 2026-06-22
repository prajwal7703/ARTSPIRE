import { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../socket";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; }
};

export default function UserChat() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const userId = user?._id;

  const [conversations, setConversations] = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [text,          setText]          = useState("");
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    axios.get(`${API}/api/chat/conversations/${userId}`)
      .then(r => setConversations(Array.isArray(r.data) ? r.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));

    socket.emit("join_user_room", userId);
    socket.on("receive_message", (msg) => {
      setConversations(prev => prev.map(c =>
        c.artistId === msg.senderId
          ? { ...c, lastMessage: msg.message, lastTime: msg.createdAt,
              unread: selected?.artistId === msg.senderId ? 0 : (c.unread || 0) + 1 }
          : c
      ));
      if (selected && msg.senderId === selected.artistId) {
        setMessages(prev => [...prev, msg]);
      }
    });
    return () => socket.off("receive_message");
  }, [userId, selected]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConv = async (conv) => {
    setSelected(conv);
    setConversations(prev => prev.map(c => c.artistId === conv.artistId ? { ...c, unread: 0 } : c));
    try {
      const r = await axios.get(`${API}/api/chat/${userId}/${conv.artistId}`);
      setMessages(Array.isArray(r.data) ? r.data : []);
    } catch { setMessages([]); }
  };

  const sendMessage = async () => {
    if (!text.trim() || !selected) return;
    const msgText = text.trim();
    setSending(true); setText("");
    const optimistic = { _tempId: Date.now(), senderId: userId, message: msgText, createdAt: new Date(), senderRole: "user" };
    setMessages(prev => [...prev, optimistic]);
    try {
      await axios.post(`${API}/api/chat/send`, {
        senderId: userId, receiverId: selected.artistId,
        message: msgText, senderRole: "user",
      });
      socket.emit("send_message", {
        senderId: userId, receiverId: selected.artistId,
        message: msgText, senderRole: "user", createdAt: new Date(),
      });
      setConversations(prev => prev.map(c =>
        c.artistId === selected.artistId ? { ...c, lastMessage: msgText } : c
      ));
    } catch {
      setMessages(prev => prev.filter(m => m._tempId !== optimistic._tempId));
      setText(msgText);
    } finally { setSending(false); }
  };

  const f = { fontFamily: "'Nunito', sans-serif" };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Nunito',sans-serif", background: "#f8fafc", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 300, borderRight: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => navigate("/user-dashboard")}
            style={{ ...f, background: "none", border: "none", cursor: "pointer", color: "#1e3a8a", fontWeight: 800, fontSize: 13 }}>
            ← Back
          </button>
          <div style={{ ...f, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>Messages</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading
            ? <div style={{ ...f, padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
            : conversations.length === 0
              ? <div style={{ ...f, padding: 40, textAlign: "center", color: "#94a3b8" }}>No conversations yet.</div>
             conversations.map(conv => (
  <div key={conv.artistId} onClick={() => openConv(conv)}
    style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", display:"flex", alignItems:"center", gap:12,
      background: selected?.artistId === conv.artistId ? "#eff6ff" : "#fff",
      borderLeft: `3px solid ${selected?.artistId === conv.artistId ? "#1e3a8a" : "transparent"}` }}>
    <div style={{ width:42, height:42, borderRadius:"50%", flexShrink:0, background:"#1e3a8a", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:18, overflow:"hidden" }}>
      {conv.artistImage ? <img src={conv.artistImage} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : (conv.artistName?.[0]?.toUpperCase() || "?")}
    </div>
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ ...f, fontWeight: 800, fontSize: 14, color: "#1e293b" }}>{conv.artistName || "Unknown"}</div>
        {conv.unread > 0 && (
          <span style={{ ...f, background: "#1e3a8a", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "2px 7px" }}>
            {conv.unread}
          </span>
        )}
      </div>
      <div style={{ ...f, fontSize: 12, color: "#94a3b8", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {conv.lastMessage || "Start chatting"}
      </div>
    </div>
  </div>


      {/* Chat window */}
      {!selected ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 40 }}>💬</div>
          <div style={{ ...f, fontSize: 14, marginTop: 8 }}>Select a conversation</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1e3a8a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>
              {selected.artistName?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ ...f, fontWeight: 800, fontSize: 14, color: "#1e293b" }}>{selected.artistName}</div>
              <div style={{ ...f, fontSize: 11, color: "#94a3b8" }}>Artist</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0
              ? <div style={{ ...f, textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 40 }}>No messages yet. Say hello!</div>
              : messages.map((msg, i) => {
                const isMe = msg.senderId === userId || msg.senderRole === "user";
                return (
                  <div key={msg._id || msg._tempId || i} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{ maxWidth: "72%", padding: "9px 13px",
                      borderRadius: isMe ? "16px 3px 16px 16px" : "3px 16px 16px 16px",
                      background: isMe ? "#1e3a8a" : "#fff",
                      border: isMe ? "none" : "1px solid #e2e8f0",
                      color: isMe ? "#fff" : "#1e293b",
                      fontSize: 13, lineHeight: 1.55, fontFamily: "'Nunito',sans-serif" }}>
                      {msg.message}
                    </div>
                  </div>
                );
              })
            }
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", background: "#fff", display: "flex", gap: 8 }}>
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message…"
              style={{ ...f, flex: 1, border: "1px solid #e2e8f0", borderRadius: 24, padding: "9px 16px", fontSize: 13, outline: "none", background: "#f8fafc" }} />
            <button onClick={sendMessage} disabled={sending || !text.trim()}
              style={{ ...f, background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 24, padding: "9px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer", opacity: (sending || !text.trim()) ? 0.5 : 1 }}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
