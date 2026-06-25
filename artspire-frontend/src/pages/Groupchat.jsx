import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

// ─── Helpers ────────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL;
const isMobile = () => window.innerWidth < 768;

const formatTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};
const formatDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const today = new Date();
  if (dt.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (dt.toDateString() === yesterday.toDateString()) return "Yesterday";
  return dt.toLocaleDateString([], { month: "short", day: "numeric" });
};
const getInitials = (name = "") =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

const BAND_TYPES = [
  { value: "band", label: "🎸 Band", desc: "Rock, Metal, Pop band" },
  { value: "orchestra", label: "🎻 Orchestra", desc: "Classical ensemble" },
  { value: "djcrew", label: "🎧 DJ Crew", desc: "Electronic / DJ collective" },
  { value: "dance", label: "💃 Dance Crew", desc: "Choreography & performance" },
  { value: "theatre", label: "🎭 Theatre Group", desc: "Drama & stage" },
  { value: "art", label: "🎨 Art Collective", desc: "Visual artists & designers" },
  { value: "poetry", label: "📝 Poetry Circle", desc: "Spoken word & poetry" },
  { value: "film", label: "🎬 Film Crew", desc: "Filmmakers & videographers" },
  { value: "general", label: "✨ General", desc: "Open creative group" },
];

const COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6","#ef4444","#14b8a6",
];

// ─── Sub-components ──────────────────────────────────────────────────────────
const Avatar = ({ image, name, size = 40, color, showRing = false }) => {
  const bg = color || "#6366f1";
  return image ? (
    <img
      src={image} alt=""
      style={{
        width: size, height: size, borderRadius: "50%", objectFit: "cover",
        border: showRing ? `2px solid ${bg}` : "none", flexShrink: 0,
      }}
    />
  ) : (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${bg}, ${bg}cc)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size / 3, color: "#fff", flexShrink: 0,
      border: showRing ? `2px solid ${bg}` : "none",
      fontFamily: "'Outfit', sans-serif",
    }}>
      {getInitials(name)}
    </div>
  );
};

const GroupAvatar = ({ group, size = 44 }) => {
  const color = group.color || "#6366f1";
  const emoji = BAND_TYPES.find(b => b.value === group.type)?.label.split(" ")[0] || "🎵";
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: `linear-gradient(135deg, ${color}22, ${color}44)`,
      border: `1.5px solid ${color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, flexShrink: 0,
    }}>
      {emoji}
    </div>
  );
};

const Ticks = ({ status }) => {
  if (status === "sending") return <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>⏳</span>;
  if (status === "sent")    return <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", letterSpacing: "-2px" }}>✓✓</span>;
  if (status === "read")    return <span style={{ fontSize: "11px", color: "#38bdf8", letterSpacing: "-2px" }}>✓✓</span>;
  return null;
};

// ─── Create Group Modal ──────────────────────────────────────────────────────
const CreateGroupModal = ({ currentUser, nearbyUsers, onClose, onCreate }) => {
  const [step, setStep] = useState(1);
  const [groupType, setGroupType]     = useState("band");
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor]             = useState(COLORS[0]);
  const [selected, setSelected]       = useState([]);
  const [creating, setCreating]       = useState(false);
  const [search, setSearch]           = useState("");

  const filteredUsers = nearbyUsers.filter(
    u => u.name.toLowerCase().includes(search.toLowerCase()) &&
    u.id !== currentUser._id
  );

  const toggleMember = (u) => {
    setSelected(prev =>
      prev.find(p => p.id === u.id) ? prev.filter(p => p.id !== u.id) : [...prev, u]
    );
  };

  const handleCreate = async () => {
    if (!name.trim() || selected.length === 0) return;
    setCreating(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        type: groupType,
        color,
        createdBy: currentUser._id,
        members: [currentUser._id, ...selected.map(u => u.id)],
      };
      const res = await axios.post(`${API}/api/groups`, payload);
      onCreate(res.data);
      onClose();
    } catch (err) {
      console.log(err);
      const fakeGroup = {
        _id: Date.now().toString(),
        name: name.trim(),
        description: description.trim(),
        type: groupType,
        color,
        createdBy: currentUser._id,
        members: [
          { _id: currentUser._id, name: currentUser.name, profileImage: currentUser.profileImage },
          ...selected.map(u => ({ _id: u.id, name: u.name, profileImage: u.image })),
        ],
        createdAt: new Date().toISOString(),
        messages: [],
      };
      onCreate(fakeGroup);
      onClose();
    }
    setCreating(false);
  };

  const mobile = isMobile();

  return (
    <div style={{...modal.overlay, zIndex: 1000}} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{...modal.box, maxWidth: mobile ? "95%" : "440px"}}>
        {/* Header */}
        <div style={modal.header}>
          <div>
            <div style={modal.title}>Create Group</div>
            <div style={modal.sub}>Step {step} of 3</div>
          </div>
          <button onClick={onClose} style={modal.close}>✕</button>
        </div>

        {/* Progress */}
        <div style={{ display: "flex", gap: "6px", padding: "0 20px 16px" }}>
          {[1,2,3].map(s => (
            <div key={s} style={{
              flex: 1, height: "3px", borderRadius: "2px",
              background: s <= step ? "#6366f1" : "rgba(255,255,255,0.1)",
              transition: "background 0.3s",
            }}/>
          ))}
        </div>

        {/* Step 1 — Type */}
        {step === 1 && (
          <div style={{ padding: "0 20px 20px", overflowY: "auto", maxHeight: mobile ? "50vh" : "400px" }}>
            <div style={modal.label}>What kind of group?</div>
            <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: "8px", marginTop: "10px" }}>
              {BAND_TYPES.map(bt => (
                <button
                  key={bt.value}
                  onClick={() => setGroupType(bt.value)}
                  style={{
                    ...modal.typeBtn,
                    border: groupType === bt.value
                      ? "1.5px solid #6366f1"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: groupType === bt.value
                      ? "rgba(99,102,241,0.15)"
                      : "rgba(255,255,255,0.03)",
                  }}
                >
                  <div style={{ fontSize: "22px" }}>{bt.label.split(" ")[0]}</div>
                  <div style={{ fontWeight: 600, fontSize: "12px", color: "#f1f5f9" }}>
                    {bt.label.split(" ").slice(1).join(" ")}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>{bt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Details */}
        {step === 2 && (
          <div style={{ padding: "0 20px 20px", overflowY: "auto", maxHeight: mobile ? "50vh" : "auto" }}>
            <div style={modal.label}>Group name</div>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. The Midnight Echoes"
              style={modal.input}
              autoFocus
            />
            <div style={{ ...modal.label, marginTop: "14px" }}>Description (optional)</div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this group about?"
              rows={3}
              style={{ ...modal.input, resize: "none" }}
            />
            <div style={{ ...modal.label, marginTop: "14px" }}>Group color</div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: "28px", height: "28px", borderRadius: "50%",
                    background: c, border: color === c ? "3px solid #fff" : "2px solid transparent",
                    cursor: "pointer", transition: "transform 0.15s",
                    transform: color === c ? "scale(1.2)" : "scale(1)",
                  }}
                />
              ))}
            </div>
            {/* Preview */}
            <div style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "rgba(255,255,255,0.04)", borderRadius: "12px" }}>
              <div style={{
                width: "44px", height: "44px", borderRadius: "12px",
                background: `linear-gradient(135deg, ${color}33, ${color}55)`,
                border: `1.5px solid ${color}66`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px",
              }}>
                {BAND_TYPES.find(b => b.value === groupType)?.label.split(" ")[0]}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#f1f5f9" }}>
                  {name || "Group name"}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  {BAND_TYPES.find(b => b.value === groupType)?.label.split(" ").slice(1).join(" ")}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Members */}
        {step === 3 && (
          <div style={{ padding: "0 20px 20px", overflowY: "auto", maxHeight: mobile ? "50vh" : "auto" }}>
            <div style={modal.label}>Add nearby artists by name</div>
            <div style={{ position: "relative", marginTop: "8px" }}>
              <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "13px", opacity: 0.4 }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name..."
                style={{ ...modal.input, paddingLeft: "32px", marginTop: 0 }}
              />
            </div>

            {selected.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                {selected.map(u => (
                  <div key={u.id} style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: "20px", padding: "3px 8px 3px 4px",
                  }}>
                    <Avatar name={u.name} image={u.image} size={20} color={color} />
                    <span style={{ fontSize: "11px", color: "#a5b4fc", fontWeight: 600 }}>{u.name}</span>
                    <button onClick={() => toggleMember(u)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "12px", padding: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "10px", maxHeight: "220px", overflowY: "auto" }}>
              {filteredUsers.length === 0 ? (
                <div style={{ color: "#475569", fontSize: "13px", textAlign: "center", padding: "20px" }}>
                  No nearby artists found
                </div>
              ) : filteredUsers.map(u => (
                <div
                  key={u.id}
                  onClick={() => toggleMember(u)}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px", borderRadius: "10px", cursor: "pointer",
                    background: selected.find(s => s.id === u.id)
                      ? "rgba(99,102,241,0.12)"
                      : "transparent",
                    transition: "background 0.15s",
                    marginBottom: "2px",
                    border: selected.find(s => s.id === u.id) ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                  }}
                >
                  <Avatar name={u.name} image={u.image} size={36} color={color} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "#f1f5f9" }}>{u.name}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{u.category || "Artist"}</div>
                  </div>
                  <div style={{
                    width: "20px", height: "20px", borderRadius: "50%",
                    border: selected.find(s => s.id === u.id)
                      ? "none"
                      : "1.5px solid rgba(255,255,255,0.2)",
                    background: selected.find(s => s.id === u.id) ? "#6366f1" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "11px", color: "#fff", transition: "all 0.15s",
                  }}>
                    {selected.find(s => s.id === u.id) ? "✓" : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "0 20px 20px", display: "flex", gap: "8px", flexDirection: mobile ? "column" : "row" }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{ ...modal.backBtn, flex: mobile ? 1 : "auto" }}>
              ← Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 2 && !name.trim()}
              style={{ ...modal.nextBtn, opacity: step === 2 && !name.trim() ? 0.4 : 1, flex: 1 }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating || selected.length === 0}
              style={{ ...modal.nextBtn, opacity: creating || selected.length === 0 ? 0.4 : 1, flex: 1 }}
            >
              {creating ? "Creating..." : `Create Group (${selected.length + 1} members)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Group Info Panel ────────────────────────────────────────────────────────
const GroupInfoPanel = ({ group, currentUser, onClose, onLeave }) => {
  const typeInfo = BAND_TYPES.find(b => b.value === group.type);
  const mobile = isMobile();

  return (
    <div style={{
      ...s.infoPanel,
      width: mobile ? "100%" : "280px",
      position: mobile ? "fixed" : "relative",
      height: mobile ? "100vh" : "auto",
      bottom: 0,
      right: 0,
      zIndex: 100,
      borderLeft: mobile ? "none" : "1px solid rgba(255,255,255,0.06)",
    }}>
      <div style={s.infoPanelHeader}>
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#f1f5f9", fontFamily: "'Outfit', sans-serif" }}>Group Info</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "18px" }}>✕</button>
      </div>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {/* Group identity */}
        <div style={s.infoPanelIdentity}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "20px",
            background: `linear-gradient(135deg, ${group.color || "#6366f1"}33, ${group.color || "#6366f1"}55)`,
            border: `2px solid ${group.color || "#6366f1"}66`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "34px",
          }}>
            {typeInfo?.label.split(" ")[0]}
          </div>
          <div style={{ fontWeight: 700, fontSize: "16px", color: "#f1f5f9", textAlign: "center", fontFamily: "'Outfit', sans-serif" }}>{group.name}</div>
          <div style={{
            fontSize: "11px", fontWeight: 600, color: group.color || "#6366f1",
            background: `${group.color || "#6366f1"}22`, padding: "3px 10px", borderRadius: "20px",
          }}>
            {typeInfo?.label.split(" ").slice(1).join(" ")}
          </div>
          {group.description && (
            <div style={{ fontSize: "12px", color: "#64748b", textAlign: "center", lineHeight: 1.5 }}>{group.description}</div>
          )}
        </div>

        {/* Members */}
        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "10px" }}>
            Members · {group.members?.length || 0}
          </div>
          {(group.members || []).map((m, i) => {
            const isAdmin = m._id === group.createdBy;
            const isMe = m._id === currentUser._id;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0" }}>
                <Avatar name={m.name} image={m.profileImage} size={34} color={group.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "#f1f5f9", fontFamily: "'Outfit', sans-serif" }}>
                    {m.name}{isMe ? " (You)" : ""}
                  </div>
                  {isAdmin && (
                    <div style={{ fontSize: "10px", color: "#f59e0b", fontWeight: 600 }}>⭐ Admin</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ padding: "10px 16px 20px" }}>
          <button
            onClick={onLeave}
            style={{
              width: "100%", padding: "10px", borderRadius: "10px",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              color: "#ef4444", fontWeight: 600, fontSize: "13px", cursor: "pointer",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            🚪 Leave Group
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main GroupChat Component ─────────────────────────────────────────────────
export default function GroupChat() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser]       = useState(null);
  const [groups, setGroups]                 = useState([]);
  const [selectedGroup, setSelectedGroup]   = useState(null);
  const [messages, setMessages]             = useState([]);
  const [text, setText]                     = useState("");
  const [sending, setSending]               = useState(false);
  const [nearbyUsers, setNearbyUsers]       = useState([]);
  const [showCreate, setShowCreate]         = useState(false);
  const [showInfo, setShowInfo]             = useState(false);
  const [unreadMap, setUnreadMap]           = useState({});
  const [imagePreview, setImagePreview]     = useState(null);
  const [isRecording, setIsRecording]       = useState(false);
  const [recordingTime, setRecordingTime]   = useState(false);
  const [searchGroups, setSearchGroups]     = useState("");
  const [replyTo, setReplyTo]               = useState(null);
  const [reactions, setReactions]           = useState({});

  const messagesEndRef    = useRef(null);
  const fileInputRef      = useRef(null);
  const mediaRecorderRef  = useRef(null);
  const recordingInterval = useRef(null);
  const audioChunks       = useRef([]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const raw = localStorage.getItem("artist") || localStorage.getItem("user");
      let user;
      try { user = raw ? JSON.parse(raw) : null; } catch { user = null; }
      if (!user) return;
      setCurrentUser(user);
      socket.emit("join_room", user._id);

      try {
        const usersRes = await axios.get(`${API}/api/users`);
        const all = usersRes.data;
        const mapped = all
          .filter(p => p._id !== user._id)
          .map(p => ({
            id: p._id, name: p.name, image: p.profileImage || null,
            category: p.category || "Artist", role: p.role,
          }));
        setNearbyUsers(mapped);

        const groupsRes = await axios.get(`${API}/api/groups/user/${user._id}`);
        const grps = Array.isArray(groupsRes.data) ? groupsRes.data : [];
        setGroups(grps);
        grps.forEach(g => socket.emit("join_group", g._id));
      } catch (err) {
        console.log("Init error:", err);
      }
    };
    init();
  }, []);

  // ── Fetch group messages ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedGroup || !currentUser) return;
    fetchGroupMessages(selectedGroup._id);
  }, [selectedGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchGroupMessages = async (groupId) => {
    try {
      const res = await axios.get(`${API}/api/groups/${groupId}/messages`);
      const msgs = Array.isArray(res.data) ? res.data : [];
      setMessages(msgs);
      setUnreadMap(prev => ({ ...prev, [groupId]: 0 }));
    } catch (err) {
      console.log(err);
      setMessages([]);
    }
  };

  // ── Socket: group messages ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (data) => {
      if (data.groupId === selectedGroup?._id) {
        setMessages(prev => {
          const isDup = prev.some(
            m => m._id === data._id ||
            (m.senderId === data.senderId && m.message === data.message &&
             Math.abs(new Date(m.createdAt) - new Date(data.createdAt)) < 2000)
          );
          return isDup ? prev : [...prev, data];
        });
        setUnreadMap(prev => ({ ...prev, [data.groupId]: 0 }));
      } else {
        setUnreadMap(prev => ({
          ...prev,
          [data.groupId]: (prev[data.groupId] || 0) + 1,
        }));
      }
    };
    socket.on("receive_group_message", handler);
    return () => socket.off("receive_group_message", handler);
  }, [selectedGroup]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if ((!text.trim() && !imagePreview) || !currentUser || !selectedGroup) return;
    setSending(true);

    const tempId = Date.now().toString();
    const newMsg = {
      _id: tempId,
      groupId: selectedGroup._id,
      senderId: currentUser._id,
      senderName: currentUser.name,
      senderImage: currentUser.profileImage || null,
      message: text.trim(),
      mediaUrl: imagePreview?.url || null,
      mediaType: imagePreview ? "image" : null,
      replyTo: replyTo ? { _id: replyTo._id, message: replyTo.message, senderName: replyTo.senderName } : null,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setMessages(prev => [...prev, newMsg]);
    setText("");
    setImagePreview(null);
    setReplyTo(null);

    try {
      let finalMsg = { ...newMsg };
      if (imagePreview?.file) {
        const formData = new FormData();
        formData.append("image", imagePreview.file);
        const uploadRes = await axios.post(`${API}/api/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalMsg.mediaUrl = uploadRes.data.url || uploadRes.data.imageUrl;
      }

      await axios.post(`${API}/api/groups/${selectedGroup._id}/messages`, finalMsg);
      socket.emit("send_group_message", finalMsg);

      setMessages(prev => prev.map(m => m._id === tempId ? { ...finalMsg, status: "sent" } : m));
      setTimeout(() => {
        setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: "read" } : m));
      }, 1500);

      setGroups(prev => prev.map(g =>
        g._id === selectedGroup._id
          ? { ...g, lastMessage: finalMsg.message || "📷 Image", lastMessageAt: finalMsg.createdAt }
          : g
      ));
    } catch (err) {
      console.log(err);
      setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: "failed" } : m));
    }
    setSending(false);
  };

  // ── React to message ──────────────────────────────────────────────────────
  const addReaction = (msgId, emoji) => {
    setReactions(prev => {
      const existing = prev[msgId] || [];
      const found = existing.find(r => r.emoji === emoji && r.userId === currentUser._id);
      if (found) {
        return { ...prev, [msgId]: existing.filter(r => !(r.emoji === emoji && r.userId === currentUser._id)) };
      }
      return { ...prev, [msgId]: [...existing, { emoji, userId: currentUser._id }] };
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagePreview({ url: URL.createObjectURL(file), file });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorderRef.current.ondataavailable = e => audioChunks.current.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const tempId = Date.now().toString();
        setMessages(prev => [...prev, {
          _id: tempId, groupId: selectedGroup._id,
          senderId: currentUser._id, senderName: currentUser.name,
          message: "", mediaUrl: url, mediaType: "audio",
          createdAt: new Date().toISOString(), status: "sending",
        }]);
        stream.getTracks().forEach(t => t.stop());
        setTimeout(() => {
          setMessages(prev => prev.map(m => m._id === tempId ? { ...m, status: "sent" } : m));
        }, 800);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    clearInterval(recordingInterval.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleCreateGroup = (newGroup) => {
    setGroups(prev => [newGroup, ...prev]);
    socket.emit("join_group", newGroup._id);
    setSelectedGroup(newGroup);
    setMessages([]);
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    try {
      await axios.delete(`${API}/api/groups/${selectedGroup._id}/members/${currentUser._id}`);
    } catch (err) { console.log(err); }
    setGroups(prev => prev.filter(g => g._id !== selectedGroup._id));
    setSelectedGroup(null);
    setMessages([]);
    setShowInfo(false);
  };

  const filteredGroups = groups.filter(g =>
    g.name?.toLowerCase().includes(searchGroups.toLowerCase())
  );
  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  const groupedMessages = messages.reduce((acc, msg) => {
    const day = formatDate(msg.createdAt);
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  const mobile = isMobile();

  if (!currentUser) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1117" }}>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <div style={{ color: "#475569", fontFamily: "'Outfit', sans-serif" }}>Connecting...</div>
      </div>
    );
  }

  return (
    <div style={{...s.page, flexDirection: mobile && selectedGroup ? "column" : "row"}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes msgIn { from { opacity:0; transform:translateY(8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes slideUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        .grp-item:hover { background: rgba(255,255,255,0.05) !important; }
        .msg-actions { opacity: 0; transition: opacity 0.15s; }
        .msg-row:hover .msg-actions { opacity: 1; }
        .icon-btn:hover { background: rgba(255,255,255,0.1) !important; }
        .reaction-btn:hover { transform: scale(1.2); }
        @media (max-width: 768px) {
          ::-webkit-scrollbar { width: 3px; }
        }
      `}</style>

      {showCreate && (
        <CreateGroupModal
          currentUser={currentUser}
          nearbyUsers={nearbyUsers}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {/* ── SIDEBAR ── */}
      <div style={{...s.sidebar, display: mobile && selectedGroup ? "none" : "flex"}}>
        <div style={s.sidebarTop}>
          <button
            className="icon-btn"
            onClick={() => navigate(-1)}
            style={s.iconBtn}
            title="Go back"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={s.sidebarTitle}>
              Groups
              {totalUnread > 0 && (
                <span style={s.totalBadge}>{totalUnread}</span>
              )}
            </div>
            <div style={{ fontSize: "11px", color: "#475569" }}>{groups.length} groups</div>
          </div>
          <button
            className="icon-btn"
            onClick={() => setShowCreate(true)}
            style={{ ...s.iconBtn, background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}
            title="Create new group"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "0 12px 10px", position: "relative" }}>
          <svg style={{ position: "absolute", left: "22px", top: "50%", transform: "translateY(-50%)", opacity: 0.35 }}
            width="13" height="13" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={searchGroups}
            onChange={e => setSearchGroups(e.target.value)}
            placeholder="Search groups..."
            style={s.searchInput}
          />
        </div>

        {/* Groups list */}
        <div style={s.groupsList}>
          {filteredGroups.length === 0 ? (
            <div style={{ padding: "30px 16px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🎵</div>
              <div style={{ color: "#475569", fontSize: "13px", lineHeight: 1.5 }}>
                No groups yet.<br />Create one to start collaborating!
              </div>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  marginTop: "14px", padding: "8px 18px",
                  background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: "20px", color: "#a5b4fc", fontSize: "13px",
                  fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
                }}
              >
                + Create Group
              </button>
            </div>
          ) : filteredGroups.map(grp => {
            const isSelected = selectedGroup?._id === grp._id;
            const unread = unreadMap[grp._id] || 0;
            const typeInfo = BAND_TYPES.find(b => b.value === grp.type);
            return (
              <div
                key={grp._id}
                className="grp-item"
                onClick={() => { setSelectedGroup(grp); setShowInfo(false); }}
                style={{
                  ...s.groupItem,
                  background: isSelected ? `${grp.color || "#6366f1"}18` : "transparent",
                  borderLeft: isSelected ? `3px solid ${grp.color || "#6366f1"}` : "3px solid transparent",
                }}
              >
                <div style={{ position: "relative" }}>
                  <GroupAvatar group={grp} size={46} />
                  {unread > 0 && (
                    <div style={{
                      position: "absolute", top: -3, right: -3,
                      width: "18px", height: "18px", borderRadius: "50%",
                      background: "#ef4444", border: "2px solid #0d1117",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "9px", fontWeight: 700, color: "#fff",
                    }}>{unread > 9 ? "9+" : unread}</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "13px", color: "#f1f5f9", fontFamily: "'Outfit', sans-serif" }}>{grp.name}</span>
                    <span style={{ fontSize: "10px", color: "#475569" }}>
                      {grp.lastMessageAt ? formatTime(grp.lastMessageAt) : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                    <span style={{ fontSize: "11px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" }}>
                      {grp.lastMessage || typeInfo?.label.split(" ").slice(1).join(" ")}
                    </span>
                    <span style={{ fontSize: "10px", color: grp.color || "#6366f1" }}>
                      {grp.members?.length || 0} members
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CHAT AREA ── */}
      {selectedGroup ? (
        <div style={{...s.chatArea, width: mobile ? "100%" : "auto", flex: mobile ? 1 : 1}}>
          {/* Header */}
          <div style={s.chatHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
              {mobile && (
                <button
                  className="icon-btn"
                  onClick={() => { setSelectedGroup(null); setShowInfo(false); }}
                  style={{...s.headerIconBtn, background: "rgba(99,102,241,0.1)", color: "#3b82f6"}}
                  title="Back to groups"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>
              )}
              <GroupAvatar group={selectedGroup} size={38} />
              <div>
                <div style={{ fontWeight: 700, fontSize: "15px", color: "#1e293b", fontFamily: "'Outfit', sans-serif" }}>
                  {selectedGroup.name}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  {selectedGroup.members?.map(m => m.name).join(", ").slice(0, 50)}
                  {(selectedGroup.members?.map(m => m.name).join(", ").length || 0) > 50 ? "..." : ""}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="icon-btn"
                style={s.headerIconBtn}
                onClick={() => setShowInfo(v => !v)}
                title="Group info"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{...s.messagesArea, maxHeight: mobile ? "calc(100vh - 160px)" : "auto"}}>
            {/* Group banner */}
            <div style={s.groupBanner}>
              <div style={{
                width: "64px", height: "64px", borderRadius: "18px",
                background: `linear-gradient(135deg, ${selectedGroup.color || "#6366f1"}33, ${selectedGroup.color || "#6366f1"}55)`,
                border: `2px solid ${selectedGroup.color || "#6366f1"}55`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px",
                margin: "0 auto 10px",
              }}>
                {BAND_TYPES.find(b => b.value === selectedGroup.type)?.label.split(" ")[0]}
              </div>
              <div style={{ fontWeight: 700, fontSize: "18px", color: "#1e293b", fontFamily: "'Outfit', sans-serif" }}>{selectedGroup.name}</div>
              {selectedGroup.description && (
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px", maxWidth: "300px", textAlign: "center" }}>
                  {selectedGroup.description}
                </div>
              )}
              <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                {(selectedGroup.members || []).slice(0, 5).map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px", background: "#f1f5f9", borderRadius: "20px", padding: "3px 8px 3px 3px" }}>
                    <Avatar name={m.name} image={m.profileImage} size={18} color={selectedGroup.color} />
                    <span style={{ fontSize: "11px", color: "#64748b", fontFamily: "'Outfit', sans-serif" }}>{m.name}</span>
                  </div>
                ))}
                {(selectedGroup.members?.length || 0) > 5 && (
                  <div style={{ fontSize: "11px", color: "#64748b", padding: "4px 8px", background: "#f1f5f9", borderRadius: "20px" }}>
                    +{selectedGroup.members.length - 5} more
                  </div>
                )}
              </div>
            </div>

            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "13px", padding: "20px 0", fontFamily: "'Outfit', sans-serif" }}>
                No messages yet. Say something! 🎵
              </div>
            )}

            {/* Messages grouped by date */}
            {Object.entries(groupedMessages).map(([day, dayMsgs]) => (
              <div key={day}>
                <div style={s.dateDivider}><span style={s.datePill}>{day}</span></div>
                {dayMsgs.map((msg, i) => {
                  const myId = String(currentUser._id);
                  const isMine = String(msg.senderId) === myId;
                  const msgReactions = reactions[msg._id] || [];
                  const REACT_EMOJIS = ["❤️","🔥","🎵","👏","😂","💯"];

                  return (
                    <div
                      key={i}
                      className="msg-row"
                      style={{
                        ...s.msgRow,
                        justifyContent: isMine ? "flex-end" : "flex-start",
                        animation: "msgIn 0.2s ease both",
                        position: "relative",
                      }}
                    >
                      {!isMine && (
                        <Avatar name={msg.senderName} image={msg.senderImage} size={28} color={selectedGroup.color} />
                      )}
                      <div style={{ maxWidth: mobile ? "75%" : "62%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                        {!isMine && (
                          <div style={{ fontSize: "11px", color: selectedGroup.color || "#6366f1", fontWeight: 600, marginBottom: "3px", fontFamily: "'Outfit', sans-serif" }}>
                            {msg.senderName}
                          </div>
                        )}

                        {/* Reply preview */}
                        {msg.replyTo && (
                          <div style={{
                            background: "rgba(0,0,0,0.06)", borderLeft: `3px solid ${selectedGroup.color || "#6366f1"}`,
                            borderRadius: "8px", padding: "4px 8px", marginBottom: "4px",
                            maxWidth: "100%", fontSize: "11px", color: "#64748b",
                          }}>
                            <div style={{ fontWeight: 600, color: selectedGroup.color || "#6366f1" }}>{msg.replyTo.senderName}</div>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.replyTo.message}</div>
                          </div>
                        )}

                        {msg.mediaType === "image" && msg.mediaUrl && (
                          <img src={msg.mediaUrl} alt="" style={{ maxWidth: "220px", borderRadius: "14px", marginBottom: "4px" }} />
                        )}
                        {msg.mediaType === "audio" && msg.mediaUrl && (
                          <div style={{ background: isMine ? "#1e293b" : "#f1f5f9", borderRadius: "14px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <span style={{ fontSize: "16px" }}>🎤</span>
                            <audio src={msg.mediaUrl} controls style={{ height: "26px", width: "140px" }} />
                          </div>
                        )}
                        {(msg.message || !msg.mediaUrl) && (
                          <div style={{
                            ...s.bubble,
                            background: isMine ? "#1e293b" : "#fff",
                            color: isMine ? "#f1f5f9" : "#1e293b",
                            borderBottomRightRadius: isMine ? "4px" : "18px",
                            borderBottomLeftRadius: isMine ? "18px" : "4px",
                            boxShadow: isMine ? "0 2px 8px rgba(0,0,0,0.2)" : "0 1px 4px rgba(0,0,0,0.08)",
                            fontSize: mobile ? "13px" : "14px",
                          }}>
                            {msg.message && <div>{msg.message}</div>}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", marginTop: "4px" }}>
                              <span style={{ fontSize: "10px", opacity: 0.4 }}>{formatTime(msg.createdAt)}</span>
                              {isMine && <Ticks status={msg.status} />}
                            </div>
                          </div>
                        )}

                        {/* Reactions display */}
                        {msgReactions.length > 0 && (
                          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", marginTop: "4px" }}>
                            {Object.entries(msgReactions.reduce((a, r) => {
                              a[r.emoji] = (a[r.emoji] || 0) + 1; return a;
                            }, {})).map(([emoji, count]) => (
                              <div key={emoji} style={{
                                background: "rgba(0,0,0,0.06)", borderRadius: "10px", padding: "2px 6px",
                                fontSize: "12px", cursor: "pointer",
                              }}>{emoji} {count}</div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Quick actions on hover */}
                      <div className="msg-actions" style={{
                        display: "flex", alignItems: "center", gap: "2px",
                        order: isMine ? -1 : 1,
                      }}>
                        <button
                          onClick={() => setReplyTo(msg)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", padding: "4px", borderRadius: "6px", color: "#94a3b8" }}
                          title="Reply"
                        >↩</button>
                        {REACT_EMOJIS.map(e => (
                          <button
                            key={e}
                            className="reaction-btn"
                            onClick={() => addReaction(msg._id, e)}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", padding: "2px", transition: "transform 0.15s" }}
                          >{e}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply bar */}
          {replyTo && (
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "8px 16px", background: "#f8fafc",
              borderTop: `2px solid ${selectedGroup.color || "#6366f1"}33`,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: selectedGroup.color || "#6366f1" }}>
                  Replying to {replyTo.senderName}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {replyTo.message}
                </div>
              </div>
              <button onClick={() => setReplyTo(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#94a3b8" }}>✕</button>
            </div>
          )}

          {/* Image preview */}
          {imagePreview && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 16px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
              <img src={imagePreview.url} alt="" style={{ height: "52px", borderRadius: "8px", objectFit: "cover" }} />
              <span style={{ flex: 1, fontSize: "12px", color: "#64748b" }}>Image ready to send</span>
              <button onClick={() => setImagePreview(null)} style={{ background: "none", border: "none", fontSize: "18px", color: "#ef4444", cursor: "pointer" }}>✕</button>
            </div>
          )}

          {/* Input */}
          <div style={{...s.inputArea, flexWrap: mobile ? "wrap" : "nowrap", gap: mobile ? "2px" : "4px"}}>
            <button className="icon-btn" style={{...s.inputIconBtn, flexShrink: mobile ? 0 : 1}} onClick={() => fileInputRef.current.click()} title="Attach image">
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleImageSelect} />

            <div style={{...s.inputWrap, flex: mobile ? "1 1 100%" : 1}}>
              {isRecording ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", animation: "pulse 1s ease infinite" }} />
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "14px", color: "#ef4444", fontWeight: 600 }}>
                    Recording {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
                  </span>
                </div>
              ) : (
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedGroup.name}...`}
                  rows={1}
                  style={s.textInput}
                />
              )}
            </div>

            <button
              className="icon-btn"
              style={{ ...s.inputIconBtn, color: isRecording ? "#ef4444" : "currentColor", flexShrink: mobile ? 0 : 1 }}
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? "Stop recording" : "Voice message"}
            >
              <svg width="17" height="17" fill={isRecording ? "#ef4444" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>

            <button
              onClick={sendMessage}
              disabled={sending || (!text.trim() && !imagePreview)}
              style={{
                ...s.sendBtn,
                background: selectedGroup.color || "#1e293b",
                opacity: (text.trim() || imagePreview) && !sending ? 1 : 0.4,
                flexShrink: mobile ? 0 : 1,
              }}
            >
              <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div style={s.emptyState}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>🎸</div>
          <div style={{ fontWeight: 700, fontSize: "20px", color: "#1e293b", fontFamily: "'Outfit', sans-serif", marginBottom: "8px" }}>
            Start collaborating
          </div>
          <div style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "24px", textAlign: "center", maxWidth: "280px", lineHeight: 1.6 }}>
            Create a band, dance crew, art collective or any creative group with nearby artists.
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: "12px 28px", background: "#1e293b", border: "none",
              borderRadius: "14px", color: "#fff", fontWeight: 700, fontSize: "14px",
              cursor: "pointer", fontFamily: "'Outfit', sans-serif",
            }}
          >
            + Create a Group
          </button>
        </div>
      )}

      {/* ── INFO PANEL ── */}
      {showInfo && selectedGroup && (
        <GroupInfoPanel
          group={selectedGroup}
          currentUser={currentUser}
          onClose={() => setShowInfo(false)}
          onLeave={handleLeaveGroup}
        />
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = {
  page: { height: "100vh", display: "flex", overflow: "hidden", fontFamily: "'Outfit', sans-serif", background: "#0d1117" },
  sidebar: { width: "320px", flexShrink: 0, background: "#0d1117", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", overflow: "hidden" },
  sidebarTop: { display: "flex", alignItems: "center", gap: "10px", padding: "18px 14px 12px" },
  sidebarTitle: { fontSize: "18px", fontWeight: 700, color: "#f1f5f9", display: "flex", alignItems: "center", gap: "8px" },
  totalBadge: { background: "#ef4444", borderRadius: "10px", padding: "1px 6px", fontSize: "11px", fontWeight: 700, color: "#fff" },
  iconBtn: { background: "rgba(255,255,255,0.06)", border: "none", width: "34px", height: "34px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#94a3b8", transition: "background 0.2s", flexShrink: 0 },
  searchInput: { width: "100%", padding: "8px 12px 8px 30px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", color: "#f1f5f9", fontSize: "13px", outline: "none", fontFamily: "'Outfit', sans-serif", boxSizing: "border-box" },
  groupsList: { flex: 1, overflowY: "auto" },
  groupItem: { display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px", cursor: "pointer", transition: "background 0.15s" },
  chatArea: { flex: 1, display: "flex", flexDirection: "column", background: "#ffffff", overflow: "hidden" },
  chatHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid #f1f5f9", background: "#fff" },
  headerIconBtn: { background: "#f8fafc", border: "none", width: "34px", height: "34px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", transition: "background 0.2s" },
  messagesArea: { flex: 1, overflowY: "auto", padding: "20px 16px 10px", display: "flex", flexDirection: "column", gap: "4px", background: "#f8fafc" },
  groupBanner: { display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0 20px", marginBottom: "12px", borderBottom: "1px solid #e2e8f0" },
  dateDivider: { display: "flex", justifyContent: "center", margin: "12px 0 8px" },
  datePill: { fontSize: "11px", color: "#94a3b8", background: "#e2e8f0", borderRadius: "20px", padding: "3px 12px", fontWeight: 600 },
  msgRow: { display: "flex", alignItems: "flex-end", gap: "7px", marginBottom: "3px" },
  bubble: { padding: "9px 13px", borderRadius: "18px", fontSize: "14px", lineHeight: 1.55, wordBreak: "break-word", fontFamily: "'Outfit', sans-serif" },
  inputArea: { display: "flex", alignItems: "center", gap: "4px", padding: "10px 14px", borderTop: "1px solid #f1f5f9", background: "#fff" },
  inputWrap: { flex: 1, background: "#f8fafc", borderRadius: "14px", border: "1px solid #e2e8f0", padding: "2px 8px" },
  textInput: { width: "100%", background: "none", border: "none", outline: "none", fontSize: "14px", color: "#1e293b", fontFamily: "'Outfit', sans-serif", resize: "none", padding: "8px 4px", maxHeight: "100px", lineHeight: 1.5 },
  inputIconBtn: { background: "none", border: "none", width: "34px", height: "34px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#94a3b8", transition: "background 0.2s", flexShrink: 0 },
  sendBtn: { border: "none", width: "36px", height: "36px", borderRadius: "11px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", transition: "opacity 0.2s", flexShrink: 0 },
  emptyState: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f8fafc", padding: "20px" },
  infoPanel: { display: "flex", flexDirection: "column", overflow: "hidden" },
  infoPanelHeader: { padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0d1117" },
  infoPanelIdentity: { padding: "24px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
};

const modal = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" },
  box: { background: "#0f172a", borderRadius: "20px", width: "100%", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", overflow: "hidden" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 20px 10px" },
  title: { fontWeight: 700, fontSize: "18px", color: "#f1f5f9", fontFamily: "'Outfit', sans-serif" },
  sub: { fontSize: "12px", color: "#475569", marginTop: "2px" },
  close: { background: "rgba(255,255,255,0.06)", border: "none", width: "30px", height: "30px", borderRadius: "8px", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" },
  label: { fontSize: "12px", fontWeight: 700, color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase" },
  input: { display: "block", width: "100%", marginTop: "8px", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", color: "#f1f5f9", fontSize: "14px", outline: "none", fontFamily: "'Outfit', sans-serif", boxSizing: "border-box" },
  typeBtn: { padding: "12px 10px", borderRadius: "12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", transition: "all 0.15s", textAlign: "center", fontFamily: "'Outfit', sans-serif" },
  backBtn: { flex: 1, padding: "11px", borderRadius: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontWeight: 600, fontSize: "14px", cursor: "pointer", fontFamily: "'Outfit', sans-serif" },
  nextBtn: { flex: 2, padding: "11px", borderRadius: "12px", background: "#6366f1", border: "none", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "opacity 0.2s" },
};