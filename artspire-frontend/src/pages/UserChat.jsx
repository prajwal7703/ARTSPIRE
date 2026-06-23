// artspire-frontend/src/pages/UserChat.jsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../socket";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem("user")) || null; }
  catch { return null; }
};

const f = { fontFamily: "'Nunito', sans-serif" };

export default function UserChat() {
  const navigate = useNavigate();
  const user   = getCurrentUser();
  const userId = user?._id;

  const [conversations, setConversations] = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [text,          setText]          = useState("");
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const bottomRef = useRef(null);

  // ── load conversations ────────────────────────────────────────────────────
  const fetchConversations = async () => {
    if (!userId) return;
    try {
      const r = await axios.get(`${API}/api/chat/conversations/${userId}`);
      const data = Array.isArray(r.data) ? r.data : [];
      // Only keep conversations where we actually have an artist name
      // (filters out any ghost entries with no name)
      setConversations(data.filter(c => c.artistName));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!userId) return;
    fetchConversations();

    // Join the user's personal socket room so incoming messages arrive
    socket.emit("join_user_room", userId);

    return () => {};
  }, [userId]);

  // ── real-time incoming messages ───────────────────────────────────────────
  // Keep this in its own effect so `selected` is always fresh
  useEffect(() => {
    const handler = (msg) => {
      // Update conversation list preview
      setConversations(prev => prev.map(c =>
        c.artistId === msg.senderId
          ? {
              ...c,
              lastMessage: msg.message,
              lastTime:    msg.createdAt,
              // Only mark unread if this conversation isn't currently open
              unread: selected?.artistId === msg.senderId ? 0 : (c.unread || 0) + 1,
            }
          : c
      ));
      // Append to open chat window
      if (selected && msg.senderId === selected.artistId) {
        setMessages(prev => [...prev, msg]);
      }
    };

    socket.on("receive_message", handler);
    return () => socket.off("receive_message", handler);
  }, [userId, selected]);

  // ── scroll to bottom on new message ──────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── open a conversation ───────────────────────────────────────────────────
  const openConv = async (conv) => {
    setSelected(conv);
    // Clear unread badge
    setConversations(prev =>
      prev.map(c => c.artistId === conv.artistId ? { ...c, unread: 0 } : c)
    );
    try {
      const r = await axios.get(`${API}/api/chat/${userId}/${conv.artistId}`);
      setMessages(Array.isArray(r.data) ? r.data : []);
    } catch { setMessages([]); }
  };

  // ── send a message ────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!text.trim() || !selected || sending) return;
    const msgText = text.trim();
    setSending(true);
    setText("");

    // Optimistic UI
    const optimistic = {
      _tempId:    Date.now(),
      senderId:   userId,
      receiverId: selected.artistId,
      message:    msgText,
      createdAt:  new Date().toISOString(),
      senderRole: "user",
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const { data } = await axios.post(`${API}/api/chat/send`, {
        senderId:   userId,
        receiverId: selected.artistId,
        message:    msgText,
        senderRole: "user",
      });

      // Replace optimistic with real saved message
      setMessages(prev =>
        prev.map(m => m._tempId === optimistic._tempId ? (data.message || optimistic) : m)
      );

      // Also emit via socket so the artist's dashboard updates instantly
      socket.emit("send_message", {
        senderId:   userId,
        receiverId: selected.artistId,
        message:    msgText,
        senderRole: "user",
        createdAt:  new Date().toISOString(),
      });

      // Update conversation list
      setConversations(prev =>
        prev.map(c =>
          c.artistId === selected.artistId
            ? { ...c, lastMessage: msgText, lastTime: new Date().toISOString() }
            : c
        )
      );
    } catch (e) {
      console.error(e);
      // Roll back optimistic message
      setMessages(prev => prev.filter(m => m._tempId !== optimistic._tempId));
      setText(msgText);
    } finally {
      setSending(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Nunito',sans-serif", background: "#f8fafc", overflow: "hidden" }}>

      {/* ── Sidebar: conversation list ── */}
      <div style={{ width: 300, borderRight: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate("/user-dashboard")}
            style={{ ...f, background: "none", border: "none", cursor: "pointer", color: "#1e3a8a", fontWeight: 800, fontSize: 13, padding: 0 }}
          >
            ← Back
          </button>
          <div style={{ ...f, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>Messages</div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ ...f, padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading…</div>
          ) : conversations.length === 0 ? (
            <div style={{ ...f, padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
              No conversations yet.
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.artistId}
                onClick={() => openConv(conv)}
                style={{
                  padding:     "13px 16px",
                  borderBottom:"1px solid #f1f5f9",
                  cursor:      "pointer",
                  display:     "flex",
                  alignItems:  "center",
                  gap:         12,
                  background:  selected?.artistId === conv.artistId ? "#eff6ff" : "#fff",
                  borderLeft:  `3px solid ${selected?.artistId === conv.artistId ? "#1e3a8a" : "transparent"}`,
                  transition:  "background 0.12s",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                  background: "#1e3a8a", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 18, overflow: "hidden",
                }}>
                  {conv.artistImage
                    ? <img src={conv.artistImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (conv.artistName?.[0]?.toUpperCase() || "?")}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ ...f, fontWeight: 800, fontSize: 14, color: "#1e293b" }}>
                      {conv.artistName || "Unknown Artist"}
                    </div>
                    {conv.unread > 0 && (
                      <span style={{ ...f, background: "#1e3a8a", color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 20, padding: "2px 7px", flexShrink: 0 }}>
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <div style={{ ...f, fontSize: 12, color: "#94a3b8", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {conv.lastMessage || "Start chatting"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Chat window ── */}
      {!selected ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", gap: 10 }}>
          <div style={{ fontSize: 48 }}>💬</div>
          <div style={{ ...f, fontSize: 14 }}>Select a conversation to start chatting</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc" }}>

          {/* Chat header */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%", background: "#1e3a8a", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 16, overflow: "hidden", flexShrink: 0,
            }}>
              {selected.artistImage
                ? <img src={selected.artistImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : selected.artistName?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ ...f, fontWeight: 800, fontSize: 14, color: "#1e293b" }}>{selected.artistName}</div>
              <div style={{ ...f, fontSize: 11, color: "#94a3b8" }}>Artist</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 ? (
              <div style={{ ...f, textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 40 }}>
                No messages yet. Say hello! 👋
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.senderId === userId || msg.senderRole === "user";
                return (
                  <div key={msg._id || msg._tempId || i} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth:     "72%",
                      padding:      "9px 13px",
                      borderRadius: isMe ? "16px 3px 16px 16px" : "3px 16px 16px 16px",
                      background:   isMe ? "#1e3a8a" : "#fff",
                      border:       isMe ? "none" : "1px solid #e2e8f0",
                      color:        isMe ? "#fff" : "#1e293b",
                      fontSize:     13,
                      lineHeight:   1.55,
                      fontFamily:   "'Nunito',sans-serif",
                      opacity:      msg._tempId ? 0.7 : 1,
                    }}>
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", background: "#fff", display: "flex", gap: 8 }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message…"
              style={{ ...f, flex: 1, border: "1px solid #e2e8f0", borderRadius: 24, padding: "9px 16px", fontSize: 13, outline: "none", background: "#f8fafc" }}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !text.trim()}
              style={{ ...f, background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 24, padding: "9px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer", opacity: (sending || !text.trim()) ? 0.5 : 1 }}
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}