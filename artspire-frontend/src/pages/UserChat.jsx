// artspire-frontend/src/pages/UserChat.jsx
//
// CHANGE: conversations are now gated by real bookings. A user can only see
// / start a chat with an artist they've actually booked (any booking status
// counts â€” the relationship starts the moment a booking request exists).
//
// Real data:
//   GET /api/chat/conversations/:userId  -> existing message threads
//   GET /api/bookings/user/:userId       -> which artists you've booked
// The two are merged: booked artists with no messages yet show up as a
// "Start chatting" entry so you can message them even before the first
// message exists; conversations with artists you never booked are hidden.

import { useState, useEffect, useRef, useMemo } from "react";
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
  const [bookedArtists, setBookedArtists] = useState([]); // [{ artistId, artistName }]
  const [selected,      setSelected]      = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [text,          setText]          = useState("");
  const [loading,       setLoading]       = useState(true);
  const [sending,       setSending]       = useState(false);
  const bottomRef = useRef(null);
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  useEffect(() => { const fn = () => setMobile(window.innerWidth < 768); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn); }, []);

  // â”€â”€ load conversations + bookings, then merge/filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fetchAll = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [convRes, bookingsRes] = await Promise.allSettled([
        axios.get(`${API}/api/chat/conversations/${userId}`),
        axios.get(`${API}/api/bookings/user/${userId}`),
      ]);

      const convs = convRes.status === "fulfilled"
        ? (Array.isArray(convRes.value.data) ? convRes.value.data : []).filter((c) => c.artistName)
        : [];

      const bookings = bookingsRes.status === "fulfilled"
        ? (Array.isArray(bookingsRes.value.data) ? bookingsRes.value.data : [])
        : [];

      // De-duped list of artists this user has actually booked (any status)
      const bookedMap = new Map();
      bookings.forEach((b) => {
        if (b.artistId && !bookedMap.has(b.artistId)) {
          bookedMap.set(b.artistId, b.artistName || "Artist");
        }
      });
      const booked = Array.from(bookedMap, ([artistId, artistName]) => ({ artistId, artistName }));
      setBookedArtists(booked);

      const bookedIds = new Set(booked.map((b) => b.artistId));

      // Only keep conversations with artists you've actually booked
      const allowedConvs = convs.filter((c) => bookedIds.has(c.artistId));

      // Booked artists with no message thread yet -> show as a startable entry
      const convArtistIds = new Set(allowedConvs.map((c) => c.artistId));
      const blankEntries = booked
        .filter((b) => !convArtistIds.has(b.artistId))
        .map((b) => ({
          artistId: b.artistId,
          artistName: b.artistName,
          artistImage: null,
          lastMessage: "",
          lastTime: null,
          unread: 0,
        }));

      setConversations([...allowedConvs, ...blankEntries]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchAll();
    socket.emit("join_user_room", userId);
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // â”€â”€ real-time incoming messages â€” only matters for artists already in
  // our booked list, everyone else is ignored to keep the gate honest â”€â”€â”€â”€
  useEffect(() => {
    const bookedIds = new Set(bookedArtists.map((b) => b.artistId));

    const handler = (msg) => {
      if (!bookedIds.has(msg.senderId)) return;

      setConversations((prev) => {
        const exists = prev.some((c) => c.artistId === msg.senderId);
        if (exists) {
          return prev.map((c) =>
            c.artistId === msg.senderId
              ? {
                  ...c,
                  lastMessage: msg.message,
                  lastTime: msg.createdAt,
                  unread: selected?.artistId === msg.senderId ? 0 : (c.unread || 0) + 1,
                }
              : c
          );
        }
        // Shouldn't normally happen (booked artist with a brand-new incoming
        // message and no blank entry), but handle it gracefully anyway.
        const artist = bookedArtists.find((b) => b.artistId === msg.senderId);
        return [
          {
            artistId: msg.senderId,
            artistName: artist?.artistName || "Artist",
            artistImage: null,
            lastMessage: msg.message,
            lastTime: msg.createdAt,
            unread: 1,
          },
          ...prev,
        ];
      });

      if (selected && msg.senderId === selected.artistId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("receive_message", handler);
    return () => socket.off("receive_message", handler);
  }, [userId, selected, bookedArtists]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConv = async (conv) => {
    setSelected(conv);
    setConversations((prev) =>
      prev.map((c) => (c.artistId === conv.artistId ? { ...c, unread: 0 } : c))
    );
    try {
      const r = await axios.get(`${API}/api/chat/${userId}/${conv.artistId}`);
      setMessages(Array.isArray(r.data) ? r.data : []);
    } catch {
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!text.trim() || !selected || sending) return;
    const msgText = text.trim();
    setSending(true);
    setText("");

    const optimistic = {
      _tempId: Date.now(),
      senderId: userId,
      receiverId: selected.artistId,
      message: msgText,
      createdAt: new Date().toISOString(),
      senderRole: "user",
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const { data } = await axios.post(`${API}/api/chat/send`, {
        senderId: userId,
        receiverId: selected.artistId,
        message: msgText,
        senderRole: "user",
      });

      setMessages((prev) =>
        prev.map((m) => (m._tempId === optimistic._tempId ? (data.message || optimistic) : m))
      );

      socket.emit("send_message", {
        senderId: userId,
        receiverId: selected.artistId,
        message: msgText,
        senderRole: "user",
        createdAt: new Date().toISOString(),
      });

      setConversations((prev) =>
        prev.map((c) =>
          c.artistId === selected.artistId
            ? { ...c, lastMessage: msgText, lastTime: new Date().toISOString() }
            : c
        )
      );
    } catch (e) {
      console.error(e);
      setMessages((prev) => prev.filter((m) => m._tempId !== optimistic._tempId));
      setText(msgText);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Nunito',sans-serif", background: "#f8fafc", overflow: "hidden", flexDirection: mobile ? "column" : "row" }}>

      <div style={{ width: mobile ? "100%" : 300, borderRight: mobile ? "none" : "1px solid #e2e8f0", borderBottom: mobile ? "1px solid #e2e8f0" : "none", background: "#fff", display: selected && mobile ? "none" : "flex", flexDirection: "column", flexShrink: 0, height: mobile ? "auto" : "100%" }}>

        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => navigate("/profile")}
            style={{ ...f, background: "none", border: "none", cursor: "pointer", color: "#1e3a8a", fontWeight: 800, fontSize: 13, padding: 0 }}
          >
            â† Back
          </button>
          <div style={{ ...f, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>Messages</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", maxHeight: mobile ? "400px" : "auto" }}>
          {loading ? (
            <div style={{ ...f, padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loadingâ€¦</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>ðŸ’¬</div>
              <div style={{ ...f, color: "#94a3b8", fontSize: 14, fontWeight: 700 }}>No conversations yet</div>
              <div style={{ ...f, color: "#cbd5e1", fontSize: 12, marginTop: 6 }}>
                Book an artist to start chatting with them
              </div>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.artistId}
                onClick={() => openConv(conv)}
                style={{
                  padding: "13px 16px",
                  borderBottom: "1px solid #f1f5f9",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: selected?.artistId === conv.artistId ? "#eff6ff" : "#fff",
                  borderLeft: `3px solid ${selected?.artistId === conv.artistId ? "#1e3a8a" : "transparent"}`,
                  transition: "background 0.12s",
                }}
              >
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

      {!selected ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", gap: 10, background: "#f8fafc" }}>
          <div style={{ fontSize: 48 }}>ðŸ’¬</div>
          <div style={{ ...f, fontSize: 14 }}>Select a conversation to start chatting</div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc", width: mobile ? "100%" : "auto" }}>

          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
            {mobile && (
              <button
                onClick={() => setSelected(null)}
                style={{ ...f, background: "none", border: "none", cursor: "pointer", color: "#1e3a8a", fontWeight: 800, fontSize: 13, padding: 0 }}
              >
                â† Back
              </button>
            )}
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
              <div style={{ ...f, fontSize: 11, color: "#94a3b8" }}>Artist Â· Booked</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 ? (
              <div style={{ ...f, textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 40 }}>
                No messages yet. Say hello! ðŸ‘‹
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.senderId === userId || msg.senderRole === "user";
                return (
                  <div key={msg._id || msg._tempId || i} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: mobile ? "85%" : "72%",
                      padding: "9px 13px",
                      borderRadius: isMe ? "16px 3px 16px 16px" : "3px 16px 16px 16px",
                      background: isMe ? "#1e3a8a" : "#fff",
                      border: isMe ? "none" : "1px solid #e2e8f0",
                      color: isMe ? "#fff" : "#1e293b",
                      fontSize: "13px",
                      lineHeight: 1.55,
                      fontFamily: "'Nunito',sans-serif",
                      opacity: msg._tempId ? 0.7 : 1,
                      wordBreak: "break-word",
                    }}>
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", background: "#fff", display: "flex", gap: 8, flexWrap: mobile ? "wrap" : "nowrap" }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a messageâ€¦"
              style={{ ...f, flex: 1, border: "1px solid #e2e8f0", borderRadius: 24, padding: "9px 16px", fontSize: 13, outline: "none", background: "#f8fafc", minWidth: mobile ? "100%" : 0 }}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !text.trim()}
              style={{ ...f, background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 24, padding: "9px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer", opacity: (sending || !text.trim()) ? 0.5 : 1, flexShrink: 0 }}
            >
              {sending ? "â€¦" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}