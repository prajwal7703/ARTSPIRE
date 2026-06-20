import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import BookingModal from "../components/BookingModal";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const CATEGORY_COLORS = {
  Singer:       { pill:"#fce4ec", text:"#c2185b", dot:"#e91e63" },
  Dancer:       { pill:"#ede7f6", text:"#6a1b9a", dot:"#9c27b0" },
  Musician:     { pill:"#e3f2fd", text:"#0d47a1", dot:"#1976d2" },
  Painter:      { pill:"#fff3e0", text:"#e65100", dot:"#ff9800" },
  Photographer: { pill:"#e8f5e9", text:"#1b5e20", dot:"#4caf50" },
  Actor:        { pill:"#fffde7", text:"#f57f17", dot:"#fdd835" },
  Comedian:     { pill:"#e0f7fa", text:"#006064", dot:"#00bcd4" },
  default:      { pill:"#ede7f6", text:"#4a148c", dot:"#9c27b0" },
};

const ICONS = {
  Singer:"🎤", Dancer:"💃", Musician:"🎵", Painter:"🎨",
  Photographer:"📸", Actor:"🎭", Comedian:"😂", default:"✨",
};

function getId(obj) {
  if (!obj) return undefined;
  const raw = obj._id;
  if (!raw) return undefined;
  if (typeof raw === "object" && raw.$oid) return raw.$oid;
  return String(raw);
}

// ── CHAT TAB ──────────────────────────────────────────────────────────────────
function ChatTab({ artist, currentUser, artistId }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);
  const myId = getId(currentUser);

  useEffect(() => {
    if (!myId) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [myId, artistId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API}/api/chat/${myId}/${artistId}`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  const send = async () => {
    if (!input.trim() || !myId) return;
    setSending(true);
    try {
      await axios.post(`${API}/api/chat/send`, {
        senderId: myId, receiverId: artistId, message: input.trim(),
      });
      setInput("");
      fetchMessages();
    } catch {}
    setSending(false);
  };

  if (!currentUser) return (
    <div style={S.emptyBox}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>💬</div>
      <p style={S.emptyText}>Login to chat with {artist.name}</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 480 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <div style={S.emptyBox}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
            <p style={S.emptyText}>Start the conversation!</p>
          </div>
        )}
        {messages.map((msg, i) => {
const isMe = String(msg.senderId) === String(myId) || String(getId(msg.sender)) === String(myId);
          return (
            <div key={i} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "72%", padding: "10px 14px",
                borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isMe ? "linear-gradient(135deg,#3d5afe,#7c4dff)" : "#f0f2ff",
                color: isMe ? "#fff" : "#333",
                fontSize: 13, fontWeight: 600, lineHeight: 1.5,
                fontFamily: "'Nunito',sans-serif", wordBreak: "break-word",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}>
                {msg.message || msg.text || msg.content}
                <div style={{ fontSize: 10, opacity: 0.55, marginTop: 3, textAlign: isMe ? "right" : "left" }}>
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "12px 16px", borderTop: "1px solid #e8eaf6", display: "flex", gap: 10, alignItems: "center", background: "#fff", borderRadius: "0 0 16px 16px" }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={`Message ${artist.name?.split(" ")[0]}...`}
          style={{
            flex: 1, padding: "11px 16px", borderRadius: 24,
            border: "1.5px solid #e0e0e0", background: "#f8f9ff",
            color: "#333", fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 600,
            outline: "none",
          }}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          style={{
            width: 42, height: 42, borderRadius: "50%", border: "none",
            background: input.trim() ? "linear-gradient(135deg,#3d5afe,#7c4dff)" : "#e0e0e0",
            color: "#fff", fontSize: 16, cursor: input.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            transition: "background 0.2s",
          }}
        >{sending ? "⏳" : "➤"}</button>
      </div>
    </div>
  );
}

// ── BOOKING TAB ───────────────────────────────────────────────────────────────
function BookingTab({ artist, currentUser, artistId }) {
  const [bookings,   setBookings]   = useState([]);
  const [showModal,  setShowModal]  = useState(false);
  const [done,       setDone]       = useState(false);
  const [loading,    setLoading]    = useState(true);
  const myId = getId(currentUser);

  useEffect(() => {
    if (!myId) return;
    (async () => {
      try {
        const res = await axios.get(`${API}/api/bookings/user/${myId}`);
        const all = Array.isArray(res.data) ? res.data : [];
        setBookings(all.filter(b => b.artistId === artistId));
      } catch {}
      setLoading(false);
    })();
  }, [myId, artistId, done]);

  if (!currentUser) return (
    <div style={S.emptyBox}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
      <p style={S.emptyText}>Login to book {artist.name}</p>
    </div>
  );

  const statusColor = { confirmed: "#22c55e", pending: "#f59e0b", cancelled: "#ef4444" };
  const statusBg    = { confirmed: "#f0fdf4", pending: "#fffbeb", cancelled: "#fef2f2" };

  return (
    <div style={{ padding: 16 }}>
      <button
        onClick={() => setShowModal(true)}
        style={{
          width: "100%", padding: "14px", borderRadius: 14, border: "none",
          background: "linear-gradient(135deg,#3d5afe,#7c4dff)",
          color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 900,
          fontSize: 15, cursor: "pointer", marginBottom: 20,
          boxShadow: "0 6px 20px rgba(61,90,254,0.3)",
        }}
      >
        📅 Book {artist.name?.split(" ")[0]} Now
        {artist.price && <span style={{ opacity: 0.8, fontSize: 12, marginLeft: 8 }}>· From ₹{Number(artist.price).toLocaleString("en-IN")}</span>}
      </button>

      {done && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#16a34a", fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 13 }}>
          ✅ Booking request sent!
        </div>
      )}

      <div style={S.sectionLabel}>Your Bookings</div>
      {loading ? (
        <p style={{ color: "#999", fontSize: 13, textAlign: "center", padding: "20px 0", fontFamily: "'Nunito',sans-serif" }}>Loading...</p>
      ) : bookings.length === 0 ? (
        <div style={S.emptyBox}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <p style={S.emptyText}>No bookings yet</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bookings.map((b, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #e8eaf6", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14, color: "#1a1a2e" }}>{b.eventType || "Event"}</div>
                <span style={{
                  background: statusBg[b.status] || "#f8f9fa",
                  color: statusColor[b.status] || "#555",
                  fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20,
                  fontFamily: "'Nunito',sans-serif", textTransform: "uppercase",
                }}>
                  {b.status || "pending"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#888", fontFamily: "'Nunito',sans-serif", fontWeight: 600 }}>
                {b.date && `📅 ${new Date(b.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                {b.amount && ` · ₹${Number(b.amount).toLocaleString("en-IN")}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <BookingModal
          artist={artist}
          currentUser={currentUser}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); setDone(true); }}
        />
      )}
    </div>
  );
}

// ── RATING TAB ────────────────────────────────────────────────────────────────
function RatingTab({ artist, currentUser, artistId, onRatingUpdate }) {
  const [rating,    setRating]    = useState(0);
  const [hover,     setHover]     = useState(0);
  const [review,    setReview]    = useState("");
  const [reviews,   setReviews]   = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => { fetchReviews(); }, [artistId]);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API}/api/artists/${artistId}/reviews`);
      setReviews(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  const submit = async () => {
    if (!rating || !currentUser) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/artists/${artistId}/reviews`, {
        userId: getId(currentUser), userName: currentUser.name, rating, review: review.trim(),
      });
      setSubmitted(true);
      setReview("");
      fetchReviews();
      if (onRatingUpdate) onRatingUpdate();
    } catch {}
    setLoading(false);
  };

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : (artist.rating || 5).toFixed(1);

  return (
    <div style={{ padding: 16 }}>
      {/* Average */}
      <div style={{ textAlign: "center", marginBottom: 20, padding: 20, background: "#f8f9ff", borderRadius: 16, border: "1px solid #e8eaf6" }}>
        <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 52, color: "#f59e0b", lineHeight: 1 }}>{avg}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 4, margin: "8px 0 4px" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} style={{ fontSize: 22, color: i < Math.round(avg) ? "#f59e0b" : "#e0e0e0" }}>★</span>
          ))}
        </div>
        <div style={{ color: "#999", fontSize: 12, fontFamily: "'Nunito',sans-serif", fontWeight: 700 }}>
          {reviews.length} review{reviews.length !== 1 ? "s" : ""}
        </div>
      </div>

      {currentUser && !submitted && (
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, marginBottom: 16, border: "1px solid #e8eaf6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div style={S.sectionLabel}>Rate {artist.name?.split(" ")[0]}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, justifyContent: "center" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                onMouseEnter={() => setHover(i + 1)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(i + 1)}
                style={{ fontSize: 34, cursor: "pointer", color: i < (hover || rating) ? "#f59e0b" : "#e0e0e0", transition: "transform 0.1s", transform: i < (hover || rating) ? "scale(1.15)" : "scale(1)", display: "inline-block" }}
              >★</span>
            ))}
          </div>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="Write a review (optional)..."
            rows={3}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e0e0e0", background: "#f8f9ff", color: "#333", fontFamily: "'Nunito',sans-serif", fontSize: 13, fontWeight: 600, resize: "none", marginBottom: 10, outline: "none", boxSizing: "border-box" }}
          />
          <button
            onClick={submit}
            disabled={!rating || loading}
            style={{ width: "100%", padding: 11, borderRadius: 10, border: "none", background: rating ? "linear-gradient(135deg,#f59e0b,#f97316)" : "#e0e0e0", color: rating ? "#fff" : "#aaa", fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 14, cursor: rating ? "pointer" : "default" }}
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      )}

      {submitted && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#16a34a", fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 13 }}>
          ✅ Thanks for your review!
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {reviews.map((r, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #e8eaf6", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, color: "#1a1a2e" }}>{r.userName || "User"}</div>
              <div style={{ display: "flex", gap: 2 }}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} style={{ fontSize: 12, color: j < r.rating ? "#f59e0b" : "#e0e0e0" }}>★</span>
                ))}
              </div>
            </div>
            {r.review && <div style={{ color: "#666", fontSize: 13, fontFamily: "'Nunito',sans-serif", lineHeight: 1.5, fontWeight: 600 }}>{r.review}</div>}
          </div>
        ))}
        {reviews.length === 0 && (
          <div style={S.emptyBox}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
            <p style={S.emptyText}>No reviews yet. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ART TAB ───────────────────────────────────────────────────────────────────
function ArtTab({ posts, artist, isOwner, navigate }) {
  const [lightbox, setLightbox] = useState(null);

  return (
    <div>
      {lightbox && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}
          onClick={() => setLightbox(null)}
        >
          <button style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", width: 40, height: 40, borderRadius: "50%", fontSize: 18, cursor: "pointer" }}>✕</button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, overflow: "hidden" }}>
            {lightbox.type === "video"
              ? <video src={lightbox.media} controls style={{ maxWidth: "85vw", maxHeight: "85vh" }} />
              : <img src={lightbox.media} alt="" style={{ maxWidth: "85vw", maxHeight: "85vh", objectFit: "contain", display: "block" }} />
            }
            {lightbox.title && (
              <div style={{ background: "rgba(0,0,0,0.7)", color: "#fff", padding: "10px 16px", fontSize: 13, fontWeight: 700, fontFamily: "'Nunito',sans-serif" }}>{lightbox.title}</div>
            )}
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div style={{ ...S.emptyBox, padding: "60px 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎭</div>
          <p style={S.emptyText}>No works uploaded yet</p>
          {isOwner && (
            <button onClick={() => navigate("/artist-dashboard")} style={{ background: "linear-gradient(135deg,#3d5afe,#7c4dff)", border: "none", color: "#fff", padding: "10px 24px", borderRadius: 24, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "'Nunito',sans-serif", marginTop: 12 }}>
              Upload Your First Work
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3, borderRadius: "0 0 16px 16px", overflow: "hidden" }}>
          {posts.map((post, i) => (
            <div
              key={post._id || i}
              onClick={() => setLightbox(post)}
              style={{ aspectRatio: "1/1", position: "relative", overflow: "hidden", cursor: "pointer", background: "#f0f2ff" }}
            >
              {post.type === "video"
                ? <video src={post.media} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} muted />
                : <img src={post.media} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              }
              {post.type === "video" && (
                <div style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.55)", borderRadius: 4, padding: "2px 6px", fontSize: 10, color: "#fff", fontWeight: 700 }}>▶</div>
              )}
              {post.title && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.7))", padding: "12px 6px 6px", color: "#fff", fontSize: 10, fontWeight: 800, fontFamily: "'Nunito',sans-serif" }}>
                  {post.title}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function ArtistProfile() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [artist,    setArtist]    = useState(null);
  const [posts,     setPosts]     = useState([]);
  const [activeTab, setActiveTab] = useState("art");
  const [imgError,  setImgError]  = useState(false);

  let loggedArtist = null, loggedUser = null;
  try { loggedArtist = JSON.parse(localStorage.getItem("artist") || "null"); } catch {}
  try { loggedUser   = JSON.parse(localStorage.getItem("user")   || "null"); } catch {}

  const currentUser = loggedUser || loggedArtist;
  const role        = loggedArtist ? "artist" : loggedUser ? "user" : null;
  const isOwner     = role === "artist" && getId(loggedArtist) === id;

  useEffect(() => {
    fetchArtist();
    fetchPosts();
    if (!isOwner) axios.post(`${API}/api/users/${id}/view`).catch(() => {});
  }, [id]);

  const fetchArtist = async () => {
    try {
      const res = await axios.get(`${API}/api/artists/${id}`);
      if (res.data) { setArtist(res.data); return; }
    } catch {}
    try {
      const res = await axios.get(`${API}/api/users/all-people`);
      const all = Array.isArray(res.data) ? res.data : [];
      const found = all.find(u => u._id === id || getId(u) === id);
      if (found) setArtist(found);
    } catch {}
  };

  const fetchPosts = async () => {
    try {
      const res = await axios.get(`${API}/api/posts`);
      const all = Array.isArray(res.data) ? res.data : [];
      setPosts(all.filter(p => p.artistId === id));
    } catch {}
  };

  const handleLogout = () => {
    localStorage.removeItem("artist");
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/artist-login");
  };

  if (!artist) return (
    <div style={{ background: "#f0f2ff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 16, color: "#9e9e9e" }}>Loading profile...</div>
    </div>
  );

  const cat     = CATEGORY_COLORS[artist.category] || CATEGORY_COLORS.default;
  const icon    = ICONS[artist.category] || ICONS.default;
  const initials = artist.name ? artist.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "A";
  const stars   = Math.round(artist.rating || 5);

  const TABS = [
    { id: "art",    label: "Portfolio", emoji: "🎨" },
    { id: "chat",   label: "Messages",  emoji: "💬" },
    { id: "book",   label: "Bookings",  emoji: "📅" },
    { id: "rating", label: "Reviews",   emoji: "⭐" },
  ];

  return (
    <div style={{ background: "#f0f2ff", minHeight: "100vh", fontFamily: "'Nunito',sans-serif", color: "#1a1a2e" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        textarea:focus, input:focus { outline: none; border-color: #9fa8da !important; }
        textarea::placeholder, input::placeholder { color: #bdbdbd; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #c5cae9; border-radius: 4px; }
        .ap-tab-btn:hover { background: #e8eaf6 !important; color: #3d5afe !important; }
        @media (max-width: 600px) {
          .ap-header-row { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .ap-pill-row { flex-wrap: wrap !important; }
          .ap-stat-grid { grid-template-columns: repeat(2,1fr) !important; }
          .ap-action-grid { grid-template-columns: 1fr !important; }
          .ap-tabs-row { overflow-x: auto !important; }
          .ap-tab-btn { min-width: 80px !important; flex-shrink: 0 !important; }
        }
      `}</style>

      {/* ── TOP NAV ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "#fff",
        borderBottom: "1px solid #e8eaf6",
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 20px",
        boxShadow: "0 2px 8px rgba(61,90,254,0.07)",
      }}>
        <button
          onClick={() => navigate("/artists")}
          style={{ background: "#f0f2ff", border: "none", color: "#3d5afe", width: 36, height: 36, borderRadius: 10, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, flexShrink: 0 }}
        >←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 15, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{artist.name}</div>
          <div style={{ fontSize: 11, color: "#9e9e9e", fontWeight: 700 }}>{artist.category}{artist.city ? ` · ${artist.city}` : ""}</div>
        </div>
        {isOwner ? (
          <button onClick={() => navigate("/artist-dashboard")} style={S.navBtn}>🛠 Edit</button>
        ) : (
          <button onClick={handleLogout} style={{ ...S.navBtn, background: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }}>Logout</button>
        )}
      </div>

      {/* ── PROFILE CARD ── */}
      <div style={{ maxWidth: 720, margin: "24px auto 0", padding: "0 14px", animation: "fadeUp 0.4s ease" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: "24px 20px 20px", boxShadow: "0 2px 16px rgba(61,90,254,0.08)", border: "1px solid #e8eaf6", marginBottom: 16 }}>

          {/* Header row */}
          <div className="ap-header-row" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            {/* Avatar */}
            <div style={{
              width: 88, height: 88, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
              border: "3px solid #e8eaf6",
              background: "linear-gradient(135deg,#3d5afe,#7c4dff)",
              boxShadow: "0 4px 16px rgba(61,90,254,0.2)",
            }}>
              {artist.profileImage && !imgError
                ? <img src={artist.profileImage} alt="" onError={() => setImgError(true)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 900, color: "#fff" }}>{initials}</div>
              }
            </div>

            {/* Name + pills */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontWeight: 900, fontSize: "clamp(20px,5vw,28px)", margin: "0 0 8px", color: "#1a1a2e", letterSpacing: -0.5 }}>{artist.name}</h1>
              <div className="ap-pill-row" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {/* Category */}
                <span style={{ background: cat.pill, color: cat.text, fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 20 }}>
                  {icon} {artist.category || "Artist"}
                </span>
                {/* City */}
                {artist.city && (
                  <span style={{ background: "#fce4ec", color: "#c2185b", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 20 }}>
                    📍 {artist.city}
                  </span>
                )}
                {/* Rating */}
                <span style={{ background: "#fffde7", color: "#f57f17", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 20 }}>
                  ⭐ {(artist.rating || 5).toFixed(1)}
                </span>
                {/* Posts */}
                <span style={{ background: "#e8f5e9", color: "#2e7d32", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 20 }}>
                  🎨 {posts.length} Posts
                </span>
                {/* Views */}
                <span style={{ background: "#e3f2fd", color: "#0d47a1", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 20 }}>
                  👁 {artist.profileViews || 0} Views
                </span>
              </div>
            </div>
          </div>

          {/* Bio */}
          {artist.bio && (
            <p style={{ color: "#666", fontSize: 13, lineHeight: 1.7, fontWeight: 600, margin: "0 0 16px", padding: "12px 16px", background: "#f8f9ff", borderRadius: 12, border: "1px solid #e8eaf6" }}>
              {artist.bio}
            </p>
          )}

          {/* Stat cards */}
          <div className="ap-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { emoji: "🎨", num: posts.length,           label: "Total Posts",    bg: "#e8eaf6", color: "#3d5afe" },
              { emoji: "👁",  num: artist.profileViews||0, label: "Profile Views",  bg: "#e8f5e9", color: "#2e7d32" },
              { emoji: "⭐", num: (artist.rating||5).toFixed(1), label: "Rating",  bg: "#fffde7", color: "#f57f17" },
              { emoji: "💰", num: artist.price ? `₹${Number(artist.price).toLocaleString("en-IN")}` : "—", label: "Starting Fee", bg: "#fce4ec", color: "#c2185b" },
            ].map((st, i) => (
              <div key={i} style={{ background: st.bg, borderRadius: 14, padding: "14px 10px", textAlign: "center" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{st.emoji}</div>
                <div style={{ fontWeight: 900, fontSize: "clamp(14px,3vw,20px)", color: st.color }}>{st.num}</div>
                <div style={{ fontSize: 10, color: "#888", fontWeight: 700, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4 }}>{st.label}</div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          {!isOwner && (
            <div className="ap-action-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                onClick={() => setActiveTab("book")}
                style={{ padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#3d5afe,#7c4dff)", color: "#fff", fontWeight: 900, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(61,90,254,0.3)" }}
              >📅 Book Now</button>
              <button
                onClick={() => setActiveTab("chat")}
                style={{ padding: "13px", borderRadius: 12, border: "1.5px solid #e8eaf6", background: "#f8f9ff", color: "#3d5afe", fontWeight: 900, fontSize: 14, cursor: "pointer" }}
              >💬 Send Message</button>
            </div>
          )}
          {isOwner && (
            <button
              onClick={() => navigate("/artist-dashboard")}
              style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#3d5afe,#7c4dff)", color: "#fff", fontWeight: 900, fontSize: 14, cursor: "pointer", boxShadow: "0 4px 14px rgba(61,90,254,0.3)" }}
            >🛠 Go to Dashboard</button>
          )}
        </div>

        {/* ── TABS CARD ── */}
        <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 16px rgba(61,90,254,0.08)", border: "1px solid #e8eaf6", marginBottom: 40 }}>
          {/* Tab bar */}
          <div className="ap-tabs-row" style={{ display: "flex", borderBottom: "1px solid #e8eaf6", background: "#f8f9ff" }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                className="ap-tab-btn"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1, padding: "14px 8px", border: "none", cursor: "pointer",
                  background: activeTab === tab.id ? "#fff" : "transparent",
                  color: activeTab === tab.id ? "#3d5afe" : "#9e9e9e",
                  fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  borderBottom: activeTab === tab.id ? "2px solid #3d5afe" : "2px solid transparent",
                  transition: "all 0.18s",
                }}
              >
                <span style={{ fontSize: 18 }}>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div>
            {activeTab === "art"    && <ArtTab posts={posts} artist={artist} isOwner={isOwner} navigate={navigate} />}
            {activeTab === "chat"   && <ChatTab artist={artist} currentUser={currentUser} artistId={id} />}
            {activeTab === "book"   && <BookingTab artist={artist} currentUser={currentUser} artistId={id} />}
            {activeTab === "rating" && <RatingTab artist={artist} currentUser={currentUser} artistId={id} onRatingUpdate={fetchArtist} />}
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  navBtn: {
    background: "#f0f2ff", border: "1px solid #e8eaf6",
    color: "#3d5afe", padding: "8px 16px", borderRadius: 10,
    fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 12, cursor: "pointer",
  },
  sectionLabel: {
    fontSize: 11, color: "#9e9e9e", fontWeight: 800,
    letterSpacing: 1, textTransform: "uppercase",
    marginBottom: 10, fontFamily: "'Nunito',sans-serif",
  },
  emptyBox: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "40px 20px", textAlign: "center",
  },
  emptyText: {
    color: "#bdbdbd", fontSize: 13, fontWeight: 700, margin: 0,
    fontFamily: "'Nunito',sans-serif",
  },
};