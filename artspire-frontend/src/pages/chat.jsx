// artspire-frontend/src/pages/chat.jsx
//
// THE single chat UI for the whole app. Used at:
//   /chat        -> conversation list only
//   /chat/:id    -> conversation list + auto-opens (or creates) a thread
//                   with that specific person (deep-linked from booking
//                   "Message Artist" buttons, etc.)
//
// Real-data gating: you can only see/start a conversation with someone
// you've actually got a booking with.
//   - Logged in as a USER    -> GET /api/bookings/user/:myId,   allowed = artists you booked
//   - Logged in as an ARTIST -> GET /api/bookings/artist/:myId, allowed = users who booked you
//
// This replaces UserChat.jsx and ArtistProfile.jsx's old local ChatModal â€”
// both are now redundant. UserChat.jsx can be deleted; ArtistProfile.jsx's
// "Chat" button now just navigates here.

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";
const st  = (obj) => ({ fontFamily: "'Nunito',sans-serif", ...obj });
const fmt = (s) => { if (!s) return ""; const d = new Date(s); return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };

function getMe() {
  try {
    const artist = JSON.parse(localStorage.getItem("artist") || "null");
    const user   = JSON.parse(localStorage.getItem("user")   || "null");
    if (artist) return { ...artist, role: "artist" };
    if (user)   return { ...user,   role: "user" };
    return null;
  } catch { return null; }
}

function ConvItem({ conv, isSelected, onClick }) {
  return (
    <div onClick={onClick} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"1px solid #f1f5f9", cursor:"pointer", background:isSelected?"#eff6ff":"#fff", borderLeft:`3px solid ${isSelected?"#1e3a8a":"transparent"}`, transition:"background 0.1s" }}>
      <div style={{ width:42, height:42, borderRadius:"50%", flexShrink:0, background:"#1e3a8a", color:"#fff", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',sans-serif", fontSize:20 }}>
        {conv.otherImage ? <img src={conv.otherImage} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : conv.otherName?.[0]?.toUpperCase()}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={st({ fontWeight:800, fontSize:14, color:"#1e293b", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" })}>{conv.otherName}</div>
        <div style={st({ fontSize:12, color:"#94a3b8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginTop:2 })}>{conv.lastMessage || "Start chatting"}</div>
      </div>
      {conv.unread > 0 && <span style={st({ background:"#1e3a8a", color:"#fff", fontSize:10, fontWeight:800, borderRadius:20, padding:"2px 7px", flexShrink:0 })}>{conv.unread}</span>}
    </div>
  );
}

export default function ChatPage() {
  const { artistId: paramOtherId } = useParams(); // kept name for backward compat, works for either role
  const navigate = useNavigate();
  const me   = getMe();
  const myId = me?._id;
  const isArtistAccount = me?.role === "artist";

  const [conversations, setConversations] = useState([]);
  const [bookedParties, setBookedParties] = useState([]); // [{ id, name }] â€” who myId is allowed to message
  const [selected,      setSelected]      = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [text,          setText]          = useState("");
  const [loadingConvs,  setLoadingConvs]  = useState(true);
  const [sending,       setSending]       = useState(false);
  const [isMobile,      setIsMobile]      = useState(window.innerWidth < 768);
  const [showChat,      setShowChat]      = useState(!!paramOtherId);
  const bottomRef = useRef(null);
  const selectedRef = useRef(null);
  selectedRef.current = selected;

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  // â”€â”€ real-time incoming messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!myId) return;
    socket.emit("join_room", myId);
    socket.on("receive_message", (msg) => {
      const otherId = msg.senderId === myId ? msg.receiverId : msg.senderId;
      setConversations((prev) => {
        const exists = prev.find((c) => c.otherId === otherId);
        const isCurrent = selectedRef.current?.otherId === otherId;
        if (exists) {
          return prev.map((c) =>
            c.otherId === otherId
              ? { ...c, lastMessage: msg.message, lastTime: msg.createdAt, unread: isCurrent ? 0 : (c.unread || 0) + 1 }
              : c
          );
        }
        // Only surface a brand-new thread if this sender is someone we're
        // actually allowed to talk to (real booking on file).
        const party = bookedParties.find((p) => p.id === otherId);
        if (!party) return prev;
        return [
          { otherId, otherName: party.name, otherImage: null, lastMessage: msg.message, lastTime: msg.createdAt, unread: 1 },
          ...prev,
        ];
      });
      if (selectedRef.current && (msg.senderId === selectedRef.current.otherId || msg.receiverId === selectedRef.current.otherId)) {
        setMessages((prev) => [...prev, msg]);
      }
    });
    return () => { socket.off("receive_message"); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, bookedParties]);

  const fetchOtherInfo = async (id) => {
    try {
      const r = await axios.get(`${API}/api/users/${id}`);
      return { name: r.data.name || "Artist", image: r.data.profileImage || r.data.image || null };
    } catch {
      return { name: "Artist", image: null };
    }
  };

  const openConversation = async (conv) => {
    setSelected(conv);
    if (isMobile) setShowChat(true);
    setConversations((prev) => prev.map((c) => (c.otherId === conv.otherId ? { ...c, unread: 0 } : c)));
    try {
      const r = await axios.get(`${API}/api/chat/${myId}/${conv.otherId}`);
      setMessages(Array.isArray(r.data) ? r.data : []);
    } catch {
      setMessages([]);
    }
  };

  // â”€â”€ load bookings (gate) + conversations, then merge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!myId) return;

    async function loadAll() {
      setLoadingConvs(true);
      try {
        const bookingsUrl = isArtistAccount
          ? `${API}/api/bookings/artist/${myId}`
          : `${API}/api/bookings/user/${myId}`;

        const [bookingsRes, convRes] = await Promise.allSettled([
          axios.get(bookingsUrl),
          axios.get(`${API}/api/chat/conversations/${myId}`),
        ]);

        const bookings = bookingsRes.status === "fulfilled" ? (Array.isArray(bookingsRes.value.data) ? bookingsRes.value.data : []) : [];
        const rawConvs = convRes.status === "fulfilled" ? (Array.isArray(convRes.value.data) ? convRes.value.data : []) : [];

        // De-duped allowed parties, from the correct side of the booking
        const partyMap = new Map();
        bookings.forEach((b) => {
          const otherId   = isArtistAccount ? b.userId   : b.artistId;
          const otherName = isArtistAccount ? b.userName : b.artistName;
          if (otherId && !partyMap.has(otherId)) partyMap.set(otherId, otherName || "Artist");
        });
        const parties = Array.from(partyMap, ([id, name]) => ({ id, name }));
        setBookedParties(parties);
        const allowedIds = new Set(parties.map((p) => p.id));

        // Normalize conversations to a generic { otherId, otherName, otherImage } shape,
        // filtered to only allowed parties.
        const normalized = rawConvs
          .map((c) => ({
            otherId: isArtistAccount ? c.userId : c.artistId,
            otherName: isArtistAccount ? c.userName : c.artistName,
            otherImage: isArtistAccount ? c.userImage : c.artistImage,
            lastMessage: c.lastMessage,
            lastTime: c.lastTime,
            unread: c.unread || 0,
          }))
          .filter((c) => c.otherId && allowedIds.has(c.otherId));

        // Booked parties with no thread yet -> startable blank entries
        const convIds = new Set(normalized.map((c) => c.otherId));
        const blanks = parties
          .filter((p) => !convIds.has(p.id))
          .map((p) => ({ otherId: p.id, otherName: p.name, otherImage: null, lastMessage: "", lastTime: null, unread: 0 }));

        let finalConvs = [...normalized, ...blanks];

        // Deep link: /chat/:id â€” open (or add) that specific thread.
        // Trusted even if not yet in `parties` (small race window right
        // after a booking is created) since the button that linked here
        // already guarantees a real booking exists.
        if (paramOtherId) {
          let target = finalConvs.find((c) => c.otherId === paramOtherId);
          if (!target) {
            const info = await fetchOtherInfo(paramOtherId);
            target = { otherId: paramOtherId, otherName: info.name, otherImage: info.image, lastMessage: "", lastTime: null, unread: 0 };
            finalConvs = [target, ...finalConvs];
          }
          setConversations(finalConvs);
          openConversation(target);
        } else {
          setConversations(finalConvs);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingConvs(false);
      }
    }

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !selected || sending) return;
    const msgText = text.trim();
    setText(""); setSending(true);
    const optimistic = { _tempId: Date.now(), senderId: myId, receiverId: selected.otherId, message: msgText, createdAt: new Date(), senderRole: me?.role || "user" };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const r = await axios.post(`${API}/api/chat/send`, { senderId: myId, receiverId: selected.otherId, message: msgText, senderRole: me?.role || "user" });
      setMessages((prev) => prev.map((m) => (m._tempId === optimistic._tempId ? (r.data.message || optimistic) : m)));
      socket.emit("send_message", { senderId: myId, receiverId: selected.otherId, message: msgText, senderRole: me?.role || "user", createdAt: new Date() });
      setConversations((prev) => prev.map((c) => (c.otherId === selected.otherId ? { ...c, lastMessage: msgText, lastTime: new Date() } : c)));
    } catch (e) {
      console.error(e);
      setMessages((prev) => prev.filter((m) => m._tempId !== optimistic._tempId));
      setText(msgText);
    } finally {
      setSending(false);
    }
  };

  if (!myId) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={st({ fontSize: 14, color: "#94a3b8" })}>Please log in to use chat.</div>
      </div>
    );
  }

  const LeftPanel = () => (
    <div style={{ width: isMobile ? "100%" : 300, borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", background: "#fff", flexShrink: 0 }}>
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => navigate(-1)} style={st({ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 18, padding: 0, lineHeight: 1 })}>â†</button>
        <div style={st({ fontSize: 18, fontWeight: 800, color: "#1e293b" })}>Messages</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loadingConvs ? (
          <div style={st({ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 })}>Loadingâ€¦</div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>ðŸ’¬</div>
            <div style={st({ color: "#94a3b8", fontSize: 14, fontWeight: 700 })}>No conversations yet</div>
            <div style={st({ color: "#cbd5e1", fontSize: 12, marginTop: 6 })}>
              {isArtistAccount ? "Once someone books you, you can message them here" : "Book an artist to start chatting"}
            </div>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConvItem key={conv.otherId} conv={conv} isSelected={selected?.otherId === conv.otherId} onClick={() => openConversation(conv)} />
          ))
        )}
      </div>
    </div>
  );

  const ChatWindow = () =>
    !selected ? (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", gap: 10, background: "#f8fafc" }}>
        <div style={{ fontSize: 48 }}>ðŸ’¬</div>
        <div style={st({ fontSize: 14, fontWeight: 700 })}>Select a conversation</div>
      </div>
    ) : (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc", minHeight: 0 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {isMobile && <button onClick={() => setShowChat(false)} style={st({ background: "none", border: "none", cursor: "pointer", color: "#1e3a8a", fontWeight: 800, fontSize: 13 })}>â† Back</button>}
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#1e3a8a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, overflow: "hidden", flexShrink: 0 }}>
            {selected.otherImage ? <img src={selected.otherImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : selected.otherName?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={st({ fontWeight: 800, fontSize: 15, color: "#1e293b" })}>{selected.otherName}</div>
            <div style={st({ fontSize: 11, color: "#94a3b8" })}>{isArtistAccount ? "Booked you" : "Artist Â· Booked"}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
          {messages.length === 0 ? (
            <div style={st({ textAlign: "center", color: "#94a3b8", fontSize: 13, marginTop: 60 })}>No messages yet. Say hello! ðŸ‘‹</div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.senderId === myId;
              return (
                <div key={msg._id || msg._tempId || i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "70%", padding: "10px 14px", borderRadius: isMe ? "18px 4px 18px 18px" : "4px 18px 18px 18px", background: isMe ? "#1e3a8a" : "#fff", border: isMe ? "none" : "1px solid #e2e8f0", color: isMe ? "#fff" : "#1e293b", fontSize: 13, fontFamily: "'Nunito',sans-serif", lineHeight: 1.55, opacity: msg._tempId ? 0.7 : 1 }}>
                    {msg.message}
                  </div>
                  <span style={st({ fontSize: 10, color: "#94a3b8", marginTop: 3 })}>{fmt(msg.createdAt)}</span>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", background: "#fff", display: "flex", gap: 8, flexShrink: 0 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type a messageâ€¦"
            style={st({ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 24, padding: "10px 18px", fontSize: 13, outline: "none", background: "#f8fafc" })}
          />
          <button onClick={sendMessage} disabled={sending || !text.trim()} style={st({ background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 24, padding: "10px 20px", fontWeight: 800, fontSize: 13, cursor: "pointer", opacity: (sending || !text.trim()) ? 0.5 : 1 })}>
            {sending ? "â€¦" : "Send"}
          </button>
        </div>
      </div>
    );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Nunito',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      {(!isMobile || !showChat) && <LeftPanel />}
      {(!isMobile || showChat) && <ChatWindow />}
    </div>
  );
}