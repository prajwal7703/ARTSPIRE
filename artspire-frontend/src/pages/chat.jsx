import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const Ticks = ({ status }) => {
  if (status === "sending") return <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.4)" }}>⏳</span>;
  if (status === "sent")    return <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.55)", letterSpacing:"-2px" }}>✓✓</span>;
  if (status === "read")    return <span style={{ fontSize:"11px", color:"#38bdf8", letterSpacing:"-2px" }}>✓✓</span>;
  if (status === "failed")  return <span style={{ fontSize:"11px", color:"#ef4444" }}>✕</span>;
  return null;
};

const Avatar = ({ image, name, size = 44, unread = 0, color }) => {
  const initials = name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) : "?";
  const bg = color || "linear-gradient(135deg,#6366f1,#8b5cf6)";
  return (
    <div style={{ position:"relative", flexShrink:0 }}>
      {image
        ? <img src={image} alt="" style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", display:"block" }} />
        : <div style={{ width:size, height:size, borderRadius:"50%", background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:size/3.2, color:"#fff", fontFamily:"'Outfit',sans-serif" }}>{initials}</div>
      }
      {unread > 0 && (
        <div style={{ position:"absolute", top:-3, right:-3, width:"18px", height:"18px", borderRadius:"50%", background:"#ef4444", border:"2px solid #1a1a2e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", fontWeight:700, color:"#fff" }}>
          {unread > 9 ? "9+" : unread}
        </div>
      )}
    </div>
  );
};

const GroupAvatar = ({ group, size = 44 }) => {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#3b82f6"];
  const c = colors[(group.name || "G").charCodeAt(0) % colors.length];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:`linear-gradient(135deg,${c},${c}aa)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <span style={{ fontSize:size/2.8, fontWeight:700, color:"#fff", fontFamily:"'Outfit',sans-serif" }}>🎵</span>
    </div>
  );
};

const Toast = ({ notif, onClose }) => {
  useEffect(() => { if (!notif) return; const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [notif]);
  if (!notif) return null;
  return (
    <div style={{ position:"fixed", top:"20px", right:"20px", zIndex:9999, background:"#1e293b", borderRadius:"14px", padding:"14px 18px", display:"flex", alignItems:"center", gap:"12px", boxShadow:"0 8px 32px rgba(0,0,0,0.4)", border:"1px solid rgba(255,255,255,0.08)", animation:"toastIn 0.3s ease", maxWidth:"320px" }}>
      <Avatar image={notif.image} name={notif.name} size={40} />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:"13px", color:"#f1f5f9", fontFamily:"'Outfit',sans-serif" }}>{notif.name}</div>
        <div style={{ fontSize:"12px", color:"#94a3b8", marginTop:"2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{notif.message}</div>
      </div>
      <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:"18px" }}>✕</button>
    </div>
  );
};

// ── Create Group Modal ──────────────────────────────────────────────────────
const CreateGroupModal = ({ users, currentUser, onClose, onCreate }) => {
  const [groupName, setGroupName] = useState("");
  const [groupType, setGroupType] = useState("band");
  const [selected,  setSelected]  = useState([]);
  const [desc,      setDesc]      = useState("");

  const TYPES = [
    { id:"band",       label:"🎸 Band",       color:"#6366f1" },
    { id:"dance_crew", label:"💃 Dance Crew", color:"#ec4899" },
    { id:"photo_club", label:"📸 Photo Club", color:"#f59e0b" },
    { id:"art_group",  label:"🎨 Art Group",  color:"#10b981" },
    { id:"general",    label:"💬 General",    color:"#3b82f6" },
  ];

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);

  const handleCreate = () => {
    if (!groupName.trim() || selected.length < 1) return;
    const newGroup = {
      name: groupName.trim(),
      type: groupType,
      description: desc.trim(),
      members: [...selected, currentUser._id],
      createdBy: currentUser._id,
      createdAt: new Date().toISOString(),
      _id: `grp_${Date.now()}`,
    };
    onCreate(newGroup);
    onClose();
  };

  const canCreate = groupName.trim().length > 0 && selected.length >= 1;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ background:"#1e293b", borderRadius:"20px", padding:"28px", width:"100%", maxWidth:"460px", boxShadow:"0 24px 64px rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px" }}>
          <div style={{ fontSize:"18px", fontWeight:700, color:"#f1f5f9", fontFamily:"'Outfit',sans-serif" }}>Create Group</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:"22px" }}>✕</button>
        </div>

        <div style={{ marginBottom:"16px" }}>
          <div style={{ fontSize:"11px", fontWeight:700, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase", marginBottom:"8px" }}>Group Type</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
            {TYPES.map(t => (
              <button key={t.id} onClick={() => setGroupType(t.id)} style={{ padding:"6px 14px", borderRadius:"20px", border:`1.5px solid ${groupType===t.id ? t.color : "rgba(255,255,255,0.1)"}`, background: groupType===t.id ? `${t.color}22` : "transparent", color: groupType===t.id ? t.color : "#94a3b8", fontSize:"12px", fontWeight:700, cursor:"pointer", fontFamily:"'Outfit',sans-serif", transition:"all 0.2s" }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:"14px" }}>
          <div style={{ fontSize:"11px", fontWeight:700, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase", marginBottom:"6px" }}>Group Name *</div>
          <input value={groupName} onChange={e=>setGroupName(e.target.value)} placeholder="e.g. The Blue Notes, Street Dancers..." style={{ width:"100%", padding:"11px 14px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"10px", color:"#f1f5f9", fontSize:"14px", fontFamily:"'Outfit',sans-serif", outline:"none", boxSizing:"border-box" }} />
        </div>

        <div style={{ marginBottom:"14px" }}>
          <div style={{ fontSize:"11px", fontWeight:700, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase", marginBottom:"6px" }}>Description</div>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What's this group about?" rows={2} style={{ width:"100%", padding:"11px 14px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:"10px", color:"#f1f5f9", fontSize:"14px", fontFamily:"'Outfit',sans-serif", outline:"none", resize:"none", boxSizing:"border-box" }} />
        </div>

        <div style={{ marginBottom:"20px" }}>
          <div style={{ fontSize:"11px", fontWeight:700, color:"#64748b", letterSpacing:"1px", textTransform:"uppercase", marginBottom:"8px" }}>
            Add Members ({selected.length} selected) <span style={{ color:"#ef4444" }}>*</span>
          </div>
          <div style={{ maxHeight:"160px", overflowY:"auto", display:"flex", flexDirection:"column", gap:"4px" }}>
            {users.length === 0 && <div style={{ fontSize:"13px", color:"#64748b", padding:"12px", textAlign:"center" }}>No users available</div>}
            {users.map(u => (
              <div key={u.id} onClick={() => toggle(u.id)} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 10px", borderRadius:"10px", cursor:"pointer", background: selected.includes(u.id) ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)", border:`1px solid ${selected.includes(u.id) ? "#6366f1" : "transparent"}`, transition:"all 0.15s" }}>
                <Avatar image={u.image} name={u.name} size={32} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"13px", fontWeight:600, color:"#f1f5f9" }}>{u.name}</div>
                  <div style={{ fontSize:"11px", color:"#64748b" }}>{u.category}</div>
                </div>
                <div style={{ width:"18px", height:"18px", borderRadius:"50%", border:`2px solid ${selected.includes(u.id) ? "#6366f1" : "#475569"}`, background: selected.includes(u.id) ? "#6366f1" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"10px", color:"#fff" }}>
                  {selected.includes(u.id) ? "✓" : ""}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleCreate} disabled={!canCreate} style={{ width:"100%", padding:"13px", background: canCreate ? "#6366f1" : "#334155", border:"none", borderRadius:"12px", color:"#fff", fontSize:"14px", fontWeight:700, cursor: canCreate ? "pointer" : "not-allowed", fontFamily:"'Outfit',sans-serif", opacity: canCreate ? 1 : 0.6, transition:"all 0.2s" }}>
          🎵 Create Group
        </button>
      </div>
    </div>
  );
};

// ── Main Chat ───────────────────────────────────────────────────────────────
export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [messages,       setMessages]      = useState([]);
  const [text,           setText]          = useState("");
  const [currentUser,    setCurrentUser]   = useState(null);
  const [selectedUser,   setSelectedUser]  = useState(null);
  const [selectedGroup,  setSelectedGroup] = useState(null);
  const [receiverId,     setReceiverId]    = useState(null);
  const [users,          setUsers]         = useState([]);
  const [groups,         setGroups]        = useState([]);
  const [unreadMap,      setUnreadMap]     = useState({});
  const [notification,   setNotification]  = useState(null);
  const [isRecording,    setIsRecording]   = useState(false);
  const [recordingTime,  setRecordingTime] = useState(0);
  const [searchQuery,    setSearchQuery]   = useState("");
  const [imagePreview,   setImagePreview]  = useState(null);
  const [sending,        setSending]       = useState(false);
  const [onlineUsers,    setOnlineUsers]   = useState(new Set());
  const [sidebarTab,     setSidebarTab]    = useState("direct");
  const [showCreateGroup,setShowCreateGroup] = useState(false);

  const messagesEndRef    = useRef(null);
  const fileInputRef      = useRef(null);
  const mediaRecorderRef  = useRef(null);
  const recordingInterval = useRef(null);
  const audioChunks       = useRef([]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const raw = localStorage.getItem("artist") || localStorage.getItem("user");
      let parsedUser;
      try {
        parsedUser = raw && raw !== "undefined" && raw !== "null"
          ? JSON.parse(raw)
          : { _id: id || "guest", name:"Me", role:"guest" };
      } catch {
        parsedUser = { _id: id || "guest", name:"Me", role:"guest" };
      }
      setCurrentUser(parsedUser);
      socket.emit("join_room", parsedUser._id);

      try {
        const res = await axios.get(`${API}/api/users`);
        const allPeople = res.data;
        const others = parsedUser.role === "artist"
          ? allPeople.filter(p => p.role === "user")
          : allPeople.filter(p => p.role === "artist");

        const mapped = others.map(p => ({
          id: p._id, name: p.name, role: p.role,
          image: p.profileImage || null, category: p.category || "Artist",
        }));
        setUsers(mapped);

        const urlUser = allPeople.find(p => p._id === id && p._id !== parsedUser._id);
        if (urlUser) {
          const sel = { id:urlUser._id, name:urlUser.name, role:urlUser.role, image:urlUser.profileImage||null, category:urlUser.category||"Artist" };
          setSelectedUser(sel);
          setReceiverId(urlUser._id);
        } else if (mapped.length > 0) {
          setSelectedUser(mapped[0]);
          setReceiverId(mapped[0].id);
        }
      } catch(err) { console.log("Init error:", err); }

      // Load saved groups from localStorage
      try {
        const savedGroups = JSON.parse(localStorage.getItem("chat_groups") || "[]");
        setGroups(savedGroups);
        // Rejoin all group socket rooms
        savedGroups.forEach(g => socket.emit("join_room", g._id));
      } catch {}
    };
    init();
  }, []);

  useEffect(() => {
    if (!currentUser || !receiverId || selectedGroup) return;
    fetchMessages();
  }, [currentUser?._id, receiverId, selectedGroup]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API}/api/chat/${currentUser._id}/${receiverId}`);
      const msgs = Array.isArray(res.data) ? res.data : [];
      setMessages(msgs.map(m => ({ ...m, status: m.senderId===currentUser._id ? "read" : undefined })));
      setUnreadMap(prev => ({ ...prev, [receiverId]:0 }));
    } catch(err) { console.log("Fetch messages error:", err); }
  };

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    const handler = (data) => {
      const isCurrentChat =
        (data.senderId===receiverId && data.receiverId===currentUser._id) ||
        (data.senderId===currentUser._id && data.receiverId===receiverId);

      if (isCurrentChat && !data.groupId) {
        setMessages(prev => {
          const isDup = prev.some(m => m.senderId===data.senderId && m.message===data.message && Math.abs(new Date(m.createdAt)-new Date(data.createdAt)) < 2000);
          if (isDup) return prev;
          return [...prev, { ...data, status: data.senderId!==currentUser._id ? "read" : "sent" }];
        });
        if (data.senderId===receiverId) setUnreadMap(prev => ({ ...prev, [data.senderId]:0 }));
      } else if (data.receiverId===currentUser._id && !data.groupId) {
        setUnreadMap(prev => ({ ...prev, [data.senderId]:(prev[data.senderId]||0)+1 }));
        setUsers(prev => {
          const sender = prev.find(u => u.id===data.senderId);
          if (sender) {
            setNotification({ name:sender.name, image:sender.image, message:data.message||"📷 Media" });
          }
          return prev;
        });
      }
      // Group messages
      if (data.groupId && selectedGroup && data.groupId === selectedGroup._id) {
        setMessages(prev => {
          const isDup = prev.some(m => m._id===data._id || (m.senderId===data.senderId && m.message===data.message && Math.abs(new Date(m.createdAt)-new Date(data.createdAt)) < 2000));
          if (isDup) return prev;
          return [...prev, data];
        });
      }
    };
    socket.on("receive_message", handler);
    socket.on("receive_group_message", handler);
    return () => {
      socket.off("receive_message", handler);
      socket.off("receive_group_message", handler);
    };
  }, [receiverId, currentUser, selectedGroup]);

  useEffect(() => {
    socket.on("user_online",  id => setOnlineUsers(prev => new Set([...prev, id])));
    socket.on("user_offline", id => setOnlineUsers(prev => { const n=new Set(prev); n.delete(id); return n; }));
    return () => { socket.off("user_online"); socket.off("user_offline"); };
  }, []);

  useEffect(() => {
    if (Notification.permission==="default") Notification.requestPermission();
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if ((!text.trim() && !imagePreview) || !currentUser) return;
    if (!selectedGroup && !receiverId) return;
    setSending(true);

    const tempId = Date.now().toString();
    const newMessage = {
      _id: tempId,
      senderId: currentUser._id,
      receiverId: selectedGroup ? null : receiverId,
      groupId:   selectedGroup ? selectedGroup._id : null,
      message: text.trim(),
      mediaUrl: null,
      mediaType: imagePreview ? "image" : null,
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    setMessages(prev => [...prev, newMessage]);
    setText("");
    const capturedPreview = imagePreview;
    setImagePreview(null);

    try {
      let finalMsg = { ...newMessage };
      if (capturedPreview?.file) {
        const fd = new FormData();
        fd.append("image", capturedPreview.file);
        const upRes = await axios.post(`${API}/api/upload`, fd, { headers:{"Content-Type":"multipart/form-data"} });
        finalMsg.mediaUrl = upRes.data.url || upRes.data.imageUrl || upRes.data.path;
      }

      if (selectedGroup) {
        socket.emit("send_group_message", { ...finalMsg, groupId:selectedGroup._id });
        // Also send to each member individually via DM socket (fallback delivery)
        selectedGroup.members.filter(m => m!==currentUser._id).forEach(memberId => {
          socket.emit("send_message", { ...finalMsg, receiverId:memberId });
        });
      } else {
        await axios.post(`${API}/api/chat/send`, finalMsg);
        socket.emit("send_message", finalMsg);
      }

      setMessages(prev => prev.map(m => m._id===tempId ? { ...finalMsg, status:"sent" } : m));
      setTimeout(() => setMessages(prev => prev.map(m => m._id===tempId ? { ...m, status:"read" } : m)), 1500);
    } catch(err) {
      console.log("Send error:", err);
      setMessages(prev => prev.map(m => m._id===tempId ? { ...m, status:"failed" } : m));
    }
    setSending(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImagePreview({ url:URL.createObjectURL(file), file });
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorderRef.current.ondataavailable = e => audioChunks.current.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type:"audio/webm" });
        const url = URL.createObjectURL(blob);
        const tempId = Date.now().toString();
        setMessages(prev => [...prev, { _id:tempId, senderId:currentUser._id, receiverId, message:"", mediaUrl:url, mediaType:"audio", createdAt:new Date().toISOString(), status:"sending" }]);
        stream.getTracks().forEach(t=>t.stop());
        setTimeout(() => setMessages(prev => prev.map(m => m._id===tempId ? { ...m, status:"sent" } : m)), 800);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true); setRecordingTime(0);
      recordingInterval.current = setInterval(() => setRecordingTime(t=>t+1), 1000);
    } catch { alert("Microphone access denied."); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    clearInterval(recordingInterval.current);
    setIsRecording(false); setRecordingTime(0);
  };

  // ── Group creation — immediately updates sidebar ────────────────────────
  const handleCreateGroup = (group) => {
    // Persist to localStorage
    const updatedGroups = [group, ...groups];
    setGroups(updatedGroups);
    localStorage.setItem("chat_groups", JSON.stringify(updatedGroups));

    // Join the group socket room
    socket.emit("join_room", group._id);

    // Switch to the new group immediately
    setSelectedGroup(group);
    setSelectedUser(null);
    setReceiverId(null);
    setMessages([]);

    // Switch sidebar to groups tab so user sees their new group
    setSidebarTab("groups");
  };

  const selectDirect = (user) => {
    setSelectedUser(user);
    setSelectedGroup(null);
    setReceiverId(user.id);
    setMessages([]);
    setUnreadMap(prev => ({ ...prev, [user.id]:0 }));
  };

  const selectGroup = (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
    setReceiverId(null);
    try {
      const saved = JSON.parse(localStorage.getItem(`grp_msgs_${group._id}`) || "[]");
      setMessages(saved);
    } catch { setMessages([]); }
  };

  // Persist group messages locally
  useEffect(() => {
    if (selectedGroup && messages.length > 0) {
      localStorage.setItem(`grp_msgs_${selectedGroup._id}`, JSON.stringify(messages.slice(-100)));
    }
  }, [messages, selectedGroup]);

  const formatRecTime = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const handleKeyDown = e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const formatTime = d => d ? new Date(d).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : "";
  const formatDate = d => {
    if (!d) return "";
    const dt = new Date(d), today = new Date(), yday = new Date();
    yday.setDate(today.getDate()-1);
    if (dt.toDateString()===today.toDateString()) return "Today";
    if (dt.toDateString()===yday.toDateString()) return "Yesterday";
    return dt.toLocaleDateString([],{month:"short",day:"numeric"});
  };

  const filteredUsers  = users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalUnread    = Object.values(unreadMap).reduce((a,b) => a+b, 0);

  const groupedMessages = messages.reduce((acc,msg) => {
    const day = formatDate(msg.createdAt);
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg); return acc;
  }, {});

  const activeChat = selectedGroup || selectedUser;

  const GROUP_TYPE_COLORS = { band:"#6366f1", dance_crew:"#ec4899", photo_club:"#f59e0b", art_group:"#10b981", general:"#3b82f6" };
  const GROUP_TYPE_LABELS = { band:"🎸 Band", dance_crew:"💃 Dance Crew", photo_club:"📸 Photo Club", art_group:"🎨 Art Group", general:"💬 General" };

  if (!currentUser) return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0f172a" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ color:"#94a3b8", fontFamily:"'Outfit',sans-serif", fontSize:"16px" }}>Connecting...</div>
    </div>
  );

  return (
    <div style={s.page}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes toastIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes msgIn   { from{opacity:0;transform:translateY(8px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.4} }
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:4px}
        .user-item:hover{background:rgba(255,255,255,0.06)!important}
        .icon-action:hover{background:rgba(255,255,255,0.1)!important}
        textarea::placeholder{color:#94a3b8}
      `}</style>

      <Toast notif={notification} onClose={() => setNotification(null)} />
      {showCreateGroup && (
        <CreateGroupModal
          users={users}
          currentUser={currentUser}
          onClose={() => setShowCreateGroup(false)}
          onCreate={handleCreateGroup}
        />
      )}

      {/* ── SIDEBAR ── */}
      <div style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <button className="icon-action" style={s.iconAction} onClick={() => navigate(-1)} title="Go back">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={s.sidebarTitle}>Messages</div>
            {totalUnread > 0 && <div style={{ background:"#ef4444", borderRadius:"10px", padding:"2px 7px", fontSize:"11px", fontWeight:700, color:"#fff" }}>{totalUnread}</div>}
          </div>
          {/* Create group button — always visible */}
          <button
            className="icon-action"
            style={{ ...s.iconAction, background:"#6366f122", color:"#6366f1" }}
            onClick={() => setShowCreateGroup(true)}
            title="Create Group"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display:"flex", gap:"6px", padding:"0 12px 12px" }}>
          {["direct","groups"].map(t => (
            <button key={t} onClick={() => setSidebarTab(t)} style={{ flex:1, padding:"7px", borderRadius:"10px", border:"none", background: sidebarTab===t ? "#6366f1" : "rgba(255,255,255,0.05)", color: sidebarTab===t ? "#fff" : "#94a3b8", fontSize:"12px", fontWeight:700, cursor:"pointer", fontFamily:"'Outfit',sans-serif", transition:"all 0.2s", textTransform:"capitalize" }}>
              {t==="direct" ? "💬 Direct" : "🎵 Groups"}
              {t==="groups" && groups.length > 0 && (
                <span style={{ marginLeft:"4px", background:"rgba(255,255,255,0.2)", borderRadius:"8px", padding:"1px 6px", fontSize:"10px" }}>{groups.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={s.searchWrap}>
          <svg style={{ position:"absolute", left:"22px", top:"50%", transform:"translateY(-50%)", opacity:0.35 }} width="13" height="13" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder={sidebarTab==="groups" ? "Search groups..." : "Search conversations..."} style={s.searchInput} />
        </div>

        {/* List */}
        <div style={s.usersList}>
          {sidebarTab === "direct" && (
            filteredUsers.length === 0
              ? <div style={{ padding:"24px 16px", color:"#475569", fontSize:"13px", textAlign:"center" }}>No conversations yet</div>
              : filteredUsers.map(user => (
                  <div key={user.id} className="user-item" onClick={() => selectDirect(user)} style={{ ...s.userItem, background: selectedUser?.id===user.id ? "rgba(99,102,241,0.15)" : "transparent", borderLeft: selectedUser?.id===user.id ? "3px solid #6366f1" : "3px solid transparent" }}>
                    <Avatar image={user.image} name={user.name} size={48} unread={unreadMap[user.id]||0} />
                    <div style={s.userInfo}>
                      <div style={s.userNameRow}>
                        <span style={s.userName}>{user.name}</span>
                        <span style={s.userTime}>{formatTime(new Date().toISOString())}</span>
                      </div>
                      <div style={s.userSubRow}>
                        <span style={s.userLastMsg}>{user.category}</span>
                        <span style={{ width:"7px", height:"7px", borderRadius:"50%", background: onlineUsers.has(user.id) ? "#22c55e" : "#475569", display:"inline-block" }} />
                      </div>
                    </div>
                  </div>
                ))
          )}

          {sidebarTab === "groups" && (
            filteredGroups.length === 0
              ? (
                <div style={{ padding:"32px 16px", color:"#475569", fontSize:"13px", textAlign:"center" }}>
                  <div style={{ fontSize:"36px", marginBottom:"10px" }}>🎵</div>
                  <div style={{ fontWeight:600, color:"#64748b", marginBottom:"6px" }}>No groups yet</div>
                  <div style={{ fontSize:"12px", marginBottom:"14px" }}>Create a band, dance crew, or art group</div>
                  <button onClick={() => setShowCreateGroup(true)} style={{ background:"#6366f1", border:"none", color:"#fff", padding:"8px 18px", borderRadius:"20px", fontSize:"12px", fontWeight:700, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>+ Create Group</button>
                </div>
              )
              : filteredGroups.map(group => (
                  <div key={group._id} className="user-item" onClick={() => selectGroup(group)} style={{ ...s.userItem, background: selectedGroup?._id===group._id ? "rgba(99,102,241,0.15)" : "transparent", borderLeft: selectedGroup?._id===group._id ? "3px solid #6366f1" : "3px solid transparent" }}>
                    <GroupAvatar group={group} size={48} />
                    <div style={s.userInfo}>
                      <div style={s.userNameRow}>
                        <span style={s.userName}>{group.name}</span>
                        <span style={{ fontSize:"10px", padding:"2px 8px", borderRadius:"10px", background:`${GROUP_TYPE_COLORS[group.type] || "#6366f1"}22`, color:GROUP_TYPE_COLORS[group.type] || "#6366f1", fontWeight:700 }}>
                          {GROUP_TYPE_LABELS[group.type] || group.type}
                        </span>
                      </div>
                      <div style={s.userSubRow}>
                        <span style={s.userLastMsg}>👥 {group.members.length} members</span>
                      </div>
                    </div>
                  </div>
                ))
          )}
        </div>
      </div>

      {/* ── CHAT AREA ── */}
      {activeChat ? (
        <div style={s.chatArea}>
          {/* Header */}
          <div style={s.chatHeader}>
            <div style={s.chatHeaderLeft}>
              {selectedGroup
                ? <GroupAvatar group={selectedGroup} size={40} />
                : <Avatar image={selectedUser.image} name={selectedUser.name} size={40} />
              }
              <div>
                <div style={s.chatHeaderName}>{selectedGroup ? selectedGroup.name : selectedUser.name}</div>
                {selectedGroup
                  ? <div style={{ fontSize:"12px", color:GROUP_TYPE_COLORS[selectedGroup.type]||"#6366f1", fontFamily:"'Outfit',sans-serif", fontWeight:600 }}>
                      {GROUP_TYPE_LABELS[selectedGroup.type]} · {selectedGroup.members.length} members
                    </div>
                  : <div style={{ fontSize:"12px", color: onlineUsers.has(selectedUser.id) ? "#22c55e" : "#94a3b8", fontFamily:"'Outfit',sans-serif" }}>
                      {onlineUsers.has(selectedUser.id) ? "● Online" : "● Away"}
                    </div>
                }
              </div>
            </div>
            <div style={s.chatHeaderActions}>
              {selectedUser && (
                <button className="icon-action" style={s.headerIconBtn} onClick={() => navigate(`/artist-profile/${selectedUser.id}`)} title="View profile">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </button>
              )}
              {selectedGroup && (
                <div style={{ display:"flex", gap:"4px", alignItems:"center" }}>
                  {selectedGroup.members.slice(0,3).map((memberId,i) => {
                    const m = users.find(u=>u.id===memberId);
                    return m ? <Avatar key={i} image={m.image} name={m.name} size={28} /> : null;
                  })}
                  {selectedGroup.members.length > 3 && <span style={{ fontSize:"11px", color:"#64748b", fontWeight:600 }}>+{selectedGroup.members.length-3}</span>}
                </div>
              )}
              <button className="icon-action" style={s.headerIconBtn}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={s.messagesArea}>
            <div style={s.profileCard}>
              {selectedGroup
                ? <>
                    <GroupAvatar group={selectedGroup} size={64} />
                    <div style={s.profileCardName}>{selectedGroup.name}</div>
                    <div style={{ fontSize:"13px", color:GROUP_TYPE_COLORS[selectedGroup.type]||"#6366f1", fontWeight:700 }}>{GROUP_TYPE_LABELS[selectedGroup.type]}</div>
                    {selectedGroup.description && <div style={{ fontSize:"12px", color:"#94a3b8", textAlign:"center", maxWidth:"260px" }}>{selectedGroup.description}</div>}
                    <div style={{ display:"flex", gap:"6px", flexWrap:"wrap", justifyContent:"center", marginTop:"4px" }}>
                      {selectedGroup.members.map((memberId,i) => {
                        const m = users.find(u=>u.id===memberId);
                        return m ? (
                          <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px" }}>
                            <Avatar image={m.image} name={m.name} size={32} />
                            <span style={{ fontSize:"10px", color:"#64748b" }}>{m.name.split(" ")[0]}</span>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </>
                : <>
                    <Avatar image={selectedUser.image} name={selectedUser.name} size={64} />
                    <div style={s.profileCardName}>{selectedUser.name}</div>
                    <div style={s.profileCardSub}>{selectedUser.category}</div>
                    {selectedUser.role==="artist" && (
                      <button style={s.viewProfileBtn} onClick={() => navigate(`/artist-profile/${selectedUser.id}`)}>View Profile →</button>
                    )}
                  </>
              }
            </div>

            {messages.length === 0 && (
              <div style={s.noMsgs}>
                <div style={{ fontSize:"36px", marginBottom:"8px" }}>{selectedGroup ? "🎵" : "👋"}</div>
                <div>{selectedGroup ? `Welcome to ${selectedGroup.name}! Say hello to the group.` : `Say hi to ${selectedUser.name}!`}</div>
              </div>
            )}

            {Object.entries(groupedMessages).map(([day, dayMsgs]) => (
              <div key={day}>
                <div style={s.dateDivider}><span style={s.datePill}>{day}</span></div>
                {dayMsgs.map((msg, i) => {
                  const myId = String(currentUser._id || currentUser.id || "");
                  const isMine = String(msg.senderId) === myId;
                  const senderUser = !isMine && selectedGroup ? users.find(u=>u.id===msg.senderId) : null;
                  return (
                    <div key={i} style={{ ...s.msgRow, justifyContent: isMine ? "flex-end" : "flex-start", animation:"msgIn 0.2s ease both" }}>
                      {!isMine && <Avatar image={selectedGroup ? senderUser?.image : selectedUser.image} name={selectedGroup ? senderUser?.name||"?" : selectedUser.name} size={28} />}
                      <div style={{ maxWidth:"62%", display:"flex", flexDirection:"column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                        {selectedGroup && !isMine && senderUser && (
                          <div style={{ fontSize:"11px", color:"#6366f1", fontWeight:700, marginBottom:"2px", marginLeft:"4px" }}>{senderUser.name}</div>
                        )}
                        {msg.mediaType==="image" && msg.mediaUrl && (
                          <img src={msg.mediaUrl} alt="" style={{ maxWidth:"240px", borderRadius:"14px", marginBottom:"4px", boxShadow:"0 2px 12px rgba(0,0,0,0.1)" }} />
                        )}
                        {msg.mediaType==="audio" && msg.mediaUrl && (
                          <div style={{ background: isMine ? "#1e293b" : "#f1f5f9", borderRadius:"14px", padding:"10px 14px", display:"flex", alignItems:"center", gap:"8px", marginBottom:"4px" }}>
                            <span style={{ fontSize:"18px" }}>🎤</span>
                            <audio src={msg.mediaUrl} controls style={{ height:"28px", width:"160px" }} />
                          </div>
                        )}
                        {(msg.message || !msg.mediaUrl) && (
                          <div style={{ ...s.bubble, background: isMine ? "#1e293b" : "#f1f5f9", color: isMine ? "#f1f5f9" : "#1e293b", borderBottomRightRadius: isMine ? "4px" : "18px", borderBottomLeftRadius: isMine ? "18px" : "4px", boxShadow: isMine ? "0 2px 12px rgba(30,41,59,0.3)" : "0 2px 8px rgba(0,0,0,0.06)" }}>
                            {msg.message && <div>{msg.message}</div>}
                            <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:"4px", marginTop:"4px" }}>
                              <span style={{ fontSize:"10px", opacity:0.5 }}>{formatTime(msg.createdAt)}</span>
                              {isMine && <Ticks status={msg.status} />}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div style={s.previewBar}>
              <img src={imagePreview.url} alt="" style={{ height:"60px", borderRadius:"8px", objectFit:"cover" }} />
              <span style={{ fontSize:"12px", color:"#64748b", flex:1 }}>Image ready to send</span>
              <button onClick={() => setImagePreview(null)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"20px", color:"#ef4444", lineHeight:1 }}>✕</button>
            </div>
          )}

          {/* Input */}
          <div style={s.inputArea}>
            <div style={s.inputLeft}>
              <button className="icon-action" style={s.inputIconBtn} onClick={() => fileInputRef.current.click()}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display:"none" }} onChange={handleImageSelect} />
            </div>
            <div style={s.inputWrap}>
              {isRecording ? (
                <div style={{ display:"flex", alignItems:"center", gap:"10px", flex:1, padding:"8px 4px" }}>
                  <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#ef4444", animation:"pulse 1s ease infinite" }} />
                  <span style={{ fontFamily:"'Outfit',sans-serif", fontSize:"14px", color:"#ef4444", fontWeight:600 }}>Recording {formatRecTime(recordingTime)}</span>
                </div>
              ) : (
                <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={handleKeyDown} placeholder={selectedGroup ? `Message ${selectedGroup.name}...` : "Write a message..."} rows={1} style={s.textInput} />
              )}
            </div>
            <div style={s.inputRight}>
              <button className="icon-action" style={{ ...s.inputIconBtn, color: isRecording ? "#ef4444" : "currentColor" }} onClick={isRecording ? stopRecording : startRecording}>
                <svg width="18" height="18" fill={isRecording ? "#ef4444" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
              <button style={{ ...s.sendBtn, opacity:(text.trim()||imagePreview)&&!sending ? 1 : 0.4 }} onClick={sendMessage} disabled={sending||(!text.trim()&&!imagePreview)}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={s.emptyState}>
          <div style={{ fontSize:"56px", marginBottom:"16px" }}>💬</div>
          <div style={s.emptyTitle}>Select a conversation</div>
          <div style={s.emptySubtitle}>Or create a group to collaborate</div>
          <button onClick={() => setShowCreateGroup(true)} style={{ marginTop:"16px", background:"#6366f1", border:"none", color:"#fff", padding:"10px 22px", borderRadius:"20px", fontSize:"13px", fontWeight:700, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>🎵 Create Group</button>
        </div>
      )}
    </div>
  );
}

const s = {
  page:             { height:"100vh", display:"flex", overflow:"hidden", fontFamily:"'Outfit',sans-serif", background:"#0f172a" },
  sidebar:          { width:"340px", flexShrink:0, background:"#0f172a", borderRight:"1px solid rgba(255,255,255,0.06)", display:"flex", flexDirection:"column", overflow:"hidden" },
  sidebarHeader:    { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 16px 14px" },
  sidebarTitle:     { fontSize:"18px", fontWeight:700, color:"#f1f5f9", letterSpacing:"0.3px" },
  iconAction:       { background:"rgba(255,255,255,0.06)", border:"none", width:"34px", height:"34px", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#94a3b8", transition:"background 0.2s", flexShrink:0 },
  searchWrap:       { position:"relative", padding:"0 12px 12px" },
  searchInput:      { width:"100%", padding:"9px 12px 9px 34px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"10px", color:"#f1f5f9", fontSize:"13px", outline:"none", fontFamily:"'Outfit',sans-serif", boxSizing:"border-box" },
  usersList:        { flex:1, overflowY:"auto" },
  userItem:         { display:"flex", alignItems:"center", gap:"12px", padding:"12px 16px", cursor:"pointer", transition:"background 0.15s" },
  userInfo:         { flex:1, minWidth:0 },
  userNameRow:      { display:"flex", justifyContent:"space-between", alignItems:"center" },
  userName:         { fontWeight:600, fontSize:"14px", color:"#f1f5f9" },
  userTime:         { fontSize:"11px", color:"#475569" },
  userSubRow:       { display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"2px" },
  userLastMsg:      { fontSize:"12px", color:"#475569", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:"160px" },
  chatArea:         { flex:1, display:"flex", flexDirection:"column", background:"#ffffff", overflow:"hidden" },
  chatHeader:       { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 20px", borderBottom:"1px solid #f1f5f9", background:"#fff" },
  chatHeaderLeft:   { display:"flex", alignItems:"center", gap:"12px" },
  chatHeaderName:   { fontWeight:700, fontSize:"15px", color:"#1e293b" },
  chatHeaderActions:{ display:"flex", gap:"6px", alignItems:"center" },
  headerIconBtn:    { background:"#f8fafc", border:"none", width:"36px", height:"36px", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#64748b", transition:"background 0.2s" },
  messagesArea:     { flex:1, overflowY:"auto", padding:"24px 20px 12px", display:"flex", flexDirection:"column", gap:"4px", background:"#f8fafc" },
  profileCard:      { display:"flex", flexDirection:"column", alignItems:"center", gap:"8px", padding:"24px 0 20px", marginBottom:"16px", borderBottom:"1px solid #e2e8f0" },
  profileCardName:  { fontWeight:700, fontSize:"17px", color:"#1e293b" },
  profileCardSub:   { fontSize:"13px", color:"#94a3b8" },
  viewProfileBtn:   { marginTop:"4px", background:"#f1f5f9", border:"none", padding:"7px 18px", borderRadius:"20px", fontSize:"12px", fontWeight:600, cursor:"pointer", color:"#1e293b", fontFamily:"'Outfit',sans-serif" },
  noMsgs:           { textAlign:"center", color:"#94a3b8", fontSize:"14px", padding:"30px 0", fontWeight:500 },
  dateDivider:      { display:"flex", justifyContent:"center", margin:"12px 0 8px" },
  datePill:         { fontSize:"11px", color:"#94a3b8", background:"#e2e8f0", borderRadius:"20px", padding:"3px 12px", fontWeight:600 },
  msgRow:           { display:"flex", alignItems:"flex-end", gap:"8px", marginBottom:"2px" },
  bubble:           { padding:"10px 14px", borderRadius:"18px", fontSize:"14px", lineHeight:1.55, wordBreak:"break-word", fontFamily:"'Outfit',sans-serif" },
  previewBar:       { display:"flex", alignItems:"center", gap:"12px", padding:"10px 16px", background:"#f8fafc", borderTop:"1px solid #e2e8f0" },
  inputArea:        { display:"flex", alignItems:"center", gap:"4px", padding:"12px 16px", borderTop:"1px solid #f1f5f9", background:"#fff" },
  inputLeft:        { display:"flex", gap:"4px" },
  inputRight:       { display:"flex", gap:"4px", alignItems:"center" },
  inputWrap:        { flex:1, background:"#f8fafc", borderRadius:"14px", border:"1px solid #e2e8f0", padding:"2px 8px", display:"flex", alignItems:"center" },
  textInput:        { flex:1, background:"none", border:"none", outline:"none", fontSize:"14px", color:"#1e293b", fontFamily:"'Outfit',sans-serif", resize:"none", padding:"8px 4px", maxHeight:"100px", lineHeight:1.5, width:"100%" },
  inputIconBtn:     { background:"none", border:"none", width:"36px", height:"36px", borderRadius:"10px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#94a3b8", transition:"background 0.2s" },
  sendBtn:          { background:"#1e3a8a", border:"none", width:"38px", height:"38px", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#fff", transition:"opacity 0.2s", flexShrink:0 },
  emptyState:       { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#f8fafc" },
  emptyTitle:       { fontWeight:700, fontSize:"18px", color:"#1e293b", marginBottom:"8px" },
  emptySubtitle:    { fontSize:"14px", color:"#94a3b8" },
};