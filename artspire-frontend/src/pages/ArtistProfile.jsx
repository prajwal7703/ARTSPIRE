import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import BookingModal from "../components/BookingModal";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const PALETTES = {
  Singer:       { a:"#ff4d6d", b:"#c9184a" },
  Dancer:       { a:"#7209b7", b:"#f72585" },
  Musician:     { a:"#0096c7", b:"#48cae4" },
  Painter:      { a:"#f4a261", b:"#e76f51" },
  Photographer: { a:"#2d6a4f", b:"#74c69d" },
  Actor:        { a:"#ffd60a", b:"#f48c06" },
  Comedian:     { a:"#06d6a0", b:"#118ab2" },
  default:      { a:"#9d4edd", b:"#c77dff" },
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
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
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
        senderId:   myId,
        receiverId: artistId,
        message:    input.trim(),
      });
      setInput("");
      fetchMessages();
    } catch {}
    setSending(false);
  };

  if (!currentUser) return (
    <div style={S.emptyState}>
      <div style={{ fontSize:40, marginBottom:12 }}>💬</div>
      <div style={{ color:"rgba(255,255,255,0.5)", fontSize:14, fontWeight:700 }}>Login to chat with {artist.name}</div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", minHeight:0 }}>
      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px", display:"flex", flexDirection:"column", gap:8, minHeight:0 }}>
        {messages.length === 0 && (
          <div style={S.emptyState}>
            <div style={{ fontSize:36, marginBottom:8 }}>👋</div>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:13, fontWeight:600 }}>Start the conversation!</div>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.senderId === myId || getId(msg.sender) === myId;
          return (
            <div key={i} style={{ display:"flex", justifyContent: isMe ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth:"72%", padding:"9px 14px", borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background: isMe ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.1)",
                color:"#fff", fontSize:13, fontWeight:600, lineHeight:1.5,
                fontFamily:"'Nunito',sans-serif", wordBreak:"break-word",
              }}>
                {msg.message || msg.text || msg.content}
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginTop:3, textAlign: isMe ? "right" : "left" }}>
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : ""}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.08)", display:"flex", gap:10, alignItems:"center", flexShrink:0 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={`Message ${artist.name?.split(" ")[0]}...`}
          style={{
            flex:1, padding:"11px 16px", borderRadius:24,
            border:"1.5px solid rgba(255,255,255,0.12)",
            background:"rgba(255,255,255,0.07)", color:"#fff",
            fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight:600,
          }}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          style={{
            width:42, height:42, borderRadius:"50%", border:"none",
            background: input.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "rgba(255,255,255,0.1)",
            color:"#fff", fontSize:16, cursor: input.trim() ? "pointer" : "default",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            transition:"background 0.2s",
          }}
        >
          {sending ? "⏳" : "➤"}
        </button>
      </div>
    </div>
  );
}

// ── BOOKING TAB ───────────────────────────────────────────────────────────────
function BookingTab({ artist, currentUser, artistId }) {
  const [bookings, setBookings] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

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
    <div style={S.emptyState}>
      <div style={{ fontSize:40, marginBottom:12 }}>📅</div>
      <div style={{ color:"rgba(255,255,255,0.4)", fontSize:14, fontWeight:700 }}>Login to book {artist.name}</div>
    </div>
  );

  const p = PALETTES[artist.category] || PALETTES.default;
  const statusColor = { confirmed:"#22c55e", pending:"#f59e0b", cancelled:"#ef4444" };

  return (
    <div style={{ padding:"16px", overflowY:"auto", height:"100%" }}>
      {/* Book button */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          width:"100%", padding:"14px", borderRadius:14, border:"none",
          background:`linear-gradient(135deg,${p.a},${p.b})`,
          color:"#fff", fontFamily:"'Nunito',sans-serif", fontWeight:900,
          fontSize:15, cursor:"pointer", marginBottom:20,
          boxShadow:`0 8px 24px ${p.a}44`,
        }}
      >
        📅 Book {artist.name?.split(" ")[0]} Now
        {artist.price && <span style={{ opacity:0.8, fontSize:12, marginLeft:8 }}>· From ₹{Number(artist.price).toLocaleString("en-IN")}</span>}
      </button>

      {done && (
        <div style={{ background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:12, padding:"12px 16px", marginBottom:16, color:"#22c55e", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:13 }}>
          ✅ Booking request sent!
        </div>
      )}

      {/* Past bookings */}
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontWeight:800, letterSpacing:1, textTransform:"uppercase", marginBottom:10, fontFamily:"'Nunito',sans-serif" }}>
        Your Bookings
      </div>

      {loading ? (
        <div style={{ color:"rgba(255,255,255,0.3)", fontSize:13, fontFamily:"'Nunito',sans-serif", textAlign:"center", padding:"20px 0" }}>Loading...</div>
      ) : bookings.length === 0 ? (
        <div style={S.emptyState}>
          <div style={{ fontSize:32, marginBottom:8 }}>📋</div>
          <div style={{ color:"rgba(255,255,255,0.35)", fontSize:13, fontWeight:600 }}>No bookings yet</div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {bookings.map((b, i) => (
            <div key={i} style={{ background:"rgba(255,255,255,0.06)", borderRadius:12, padding:"14px 16px", border:"1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14, color:"#fff" }}>{b.eventType || "Event"}</div>
                <span style={{ background: statusColor[b.status] + "22", color: statusColor[b.status] || "#fff", fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:20, fontFamily:"'Nunito',sans-serif", textTransform:"uppercase" }}>
                  {b.status || "pending"}
                </span>
              </div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontFamily:"'Nunito',sans-serif", fontWeight:600 }}>
                {b.date && `📅 ${new Date(b.date).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}`}
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

  useEffect(() => {
    fetchReviews();
  }, [artistId]);

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
        userId:   getId(currentUser),
        userName: currentUser.name,
        rating,
        review:   review.trim(),
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
    <div style={{ padding:"16px", overflowY:"auto", height:"100%" }}>
      {/* Average */}
      <div style={{ textAlign:"center", marginBottom:20, padding:"16px", background:"rgba(255,255,255,0.04)", borderRadius:14, border:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:48, color:"#ffd60a", lineHeight:1 }}>{avg}</div>
        <div style={{ display:"flex", justifyContent:"center", gap:4, margin:"8px 0 4px" }}>
          {Array.from({ length:5 }).map((_,i) => (
            <span key={i} style={{ fontSize:20, color: i < Math.round(avg) ? "#ffd60a" : "rgba(255,255,255,0.2)" }}>★</span>
          ))}
        </div>
        <div style={{ color:"rgba(255,255,255,0.4)", fontSize:12, fontFamily:"'Nunito',sans-serif", fontWeight:700 }}>
          {reviews.length} review{reviews.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Submit rating */}
      {currentUser && !submitted && (
        <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:14, padding:"16px", marginBottom:16, border:"1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:800, letterSpacing:1, textTransform:"uppercase", fontFamily:"'Nunito',sans-serif", marginBottom:10 }}>
            Rate {artist.name?.split(" ")[0]}
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:12, justifyContent:"center" }}>
            {Array.from({ length:5 }).map((_,i) => (
              <span
                key={i}
                onMouseEnter={() => setHover(i+1)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(i+1)}
                style={{ fontSize:32, cursor:"pointer", color: i < (hover || rating) ? "#ffd60a" : "rgba(255,255,255,0.2)", transition:"color 0.1s, transform 0.1s", transform: i < (hover || rating) ? "scale(1.15)" : "scale(1)" }}
              >★</span>
            ))}
          </div>
          <textarea
            value={review}
            onChange={e => setReview(e.target.value)}
            placeholder="Write a review (optional)..."
            rows={3}
            style={{
              width:"100%", padding:"10px 14px", borderRadius:10,
              border:"1.5px solid rgba(255,255,255,0.1)",
              background:"rgba(255,255,255,0.06)", color:"#fff",
              fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight:600,
              resize:"none", marginBottom:10,
            }}
          />
          <button
            onClick={submit}
            disabled={!rating || loading}
            style={{
              width:"100%", padding:"11px", borderRadius:10, border:"none",
              background: rating ? "linear-gradient(135deg,#ffd60a,#f48c06)" : "rgba(255,255,255,0.08)",
              color: rating ? "#000" : "rgba(255,255,255,0.3)",
              fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:14,
              cursor: rating ? "pointer" : "default",
            }}
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      )}

      {submitted && (
        <div style={{ background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:12, padding:"12px 16px", marginBottom:16, color:"#22c55e", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:13 }}>
          ✅ Thanks for your review!
        </div>
      )}

      {/* Reviews list */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {reviews.map((r, i) => (
          <div key={i} style={{ background:"rgba(255,255,255,0.05)", borderRadius:12, padding:"14px 16px", border:"1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:13, color:"#fff" }}>{r.userName || "User"}</div>
              <div style={{ display:"flex", gap:2 }}>
                {Array.from({ length:5 }).map((_,j) => (
                  <span key={j} style={{ fontSize:11, color: j < r.rating ? "#ffd60a" : "rgba(255,255,255,0.2)" }}>★</span>
                ))}
              </div>
            </div>
            {r.review && <div style={{ color:"rgba(255,255,255,0.6)", fontSize:13, fontFamily:"'Nunito',sans-serif", lineHeight:1.5, fontWeight:600 }}>{r.review}</div>}
          </div>
        ))}
        {reviews.length === 0 && (
          <div style={S.emptyState}>
            <div style={{ fontSize:32, marginBottom:8 }}>⭐</div>
            <div style={{ color:"rgba(255,255,255,0.35)", fontSize:13, fontWeight:600 }}>No reviews yet. Be the first!</div>
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
    <div style={{ height:"100%", overflowY:"auto" }}>
      {lightbox && (
        <div
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)" }}
          onClick={() => setLightbox(null)}
        >
          <button style={{ position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.1)", border:"none", color:"#fff", width:40, height:40, borderRadius:"50%", fontSize:18, cursor:"pointer" }}>✕</button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth:"90vw", maxHeight:"90vh", borderRadius:12, overflow:"hidden" }}>
            {lightbox.type === "video"
              ? <video src={lightbox.media} controls style={{ maxWidth:"85vw", maxHeight:"85vh" }} />
              : <img src={lightbox.media} alt="" style={{ maxWidth:"85vw", maxHeight:"85vh", objectFit:"contain", display:"block" }} />
            }
            {lightbox.title && (
              <div style={{ background:"rgba(0,0,0,0.8)", color:"#fff", padding:"10px 16px", fontSize:13, fontWeight:700, fontFamily:"'Nunito',sans-serif" }}>{lightbox.title}</div>
            )}
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div style={{ ...S.emptyState, height:"100%" }}>
          <div style={{ fontSize:44, marginBottom:12 }}>🎨</div>
          <div style={{ color:"rgba(255,255,255,0.4)", fontSize:14, fontWeight:700, marginBottom:16 }}>No works uploaded yet</div>
          {isOwner && (
            <button
              onClick={() => navigate("/artist-dashboard")}
              style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", color:"#fff", padding:"10px 24px", borderRadius:24, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}
            >
              Upload Your First Work
            </button>
          )}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
          {posts.map((post, i) => (
            <div
              key={post._id || i}
              onClick={() => setLightbox(post)}
              style={{
                aspectRatio:"1/1", position:"relative", overflow:"hidden",
                cursor:"pointer", background:"rgba(255,255,255,0.05)",
              }}
            >
              {post.type === "video"
                ? <video src={post.media} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} muted />
                : <img src={post.media} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
              }
              {post.type === "video" && (
                <div style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,0.6)", borderRadius:4, padding:"2px 6px", fontSize:10, color:"#fff", fontWeight:700 }}>▶</div>
              )}
              {post.title && (
                <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"linear-gradient(transparent,rgba(0,0,0,0.75))", padding:"12px 6px 6px", color:"#fff", fontSize:10, fontWeight:800, fontFamily:"'Nunito',sans-serif" }}>
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

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
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
  const isLoggedIn  = !!(loggedArtist || loggedUser);
  const role        = loggedArtist ? "artist" : loggedUser ? "user" : null;
  const isOwner     = role === "artist" && getId(loggedArtist) === id;

  useEffect(() => {
    fetchArtist();
    fetchPosts();
    if (!isOwner) axios.post(`${API}/api/users/${id}/view`).catch(() => {});
  }, [id]);

  const fetchArtist = async () => {
    try {
      // Try direct artist fetch first
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
    <div style={{ background:"#0d0d14", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap" rel="stylesheet" />
      <div style={{ fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:18, color:"rgba(255,255,255,0.5)" }}>Loading...</div>
    </div>
  );

  const p       = PALETTES[artist.category] || PALETTES.default;
  const icon    = ICONS[artist.category] || ICONS.default;
  const initials = artist.name ? artist.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2) : "A";
  const stars   = Math.round(artist.rating || 5);

  const TABS = [
    { id:"art",     label:"Art",     emoji:"🎨", count:posts.length },
    { id:"chat",    label:"Chat",    emoji:"💬", count:null },
    { id:"book",    label:"Book",    emoji:"📅", count:null },
    { id:"rating",  label:"Rating",  emoji:"⭐", count:null },
  ];

  return (
    <div style={{ background:"#0d0d14", minHeight:"100vh", color:"#fff", fontFamily:"'Nunito',sans-serif", overflowX:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing:border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        textarea:focus, input:focus { outline:none; border-color:rgba(255,255,255,0.3)!important; }
        textarea::placeholder, input::placeholder { color:rgba(255,255,255,0.3); }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:3px; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{
        position:"fixed", top:0, left:0, right:0, zIndex:200,
        background:"rgba(13,13,20,0.9)", backdropFilter:"blur(20px)",
        borderBottom:"1px solid rgba(255,255,255,0.07)",
        display:"flex", alignItems:"center", gap:12, padding:"10px 16px",
      }}>
        <button
          onClick={() => navigate("/artists")}
          style={{ background:"rgba(255,255,255,0.08)", border:"none", color:"#fff", width:34, height:34, borderRadius:10, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}
        >
          ←
        </button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:900, fontSize:15, color:"#fff", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{artist.name}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:700 }}>{artist.category}{artist.city ? ` · ${artist.city}` : ""}</div>
        </div>
        {isOwner ? (
          <button onClick={() => navigate("/artist-dashboard")} style={S.topBtn}>🛠 Edit</button>
        ) : (
          <button onClick={handleLogout} style={{ ...S.topBtn, background:"rgba(239,68,68,0.15)", color:"#ef4444" }}>Logout</button>
        )}
      </div>

      {/* ── PROFILE HERO ── */}
      <div style={{ paddingTop:56 }}>
        <div style={{ position:"relative", width:"100%", aspectRatio:"4/3", maxHeight:340, overflow:"hidden" }}>
          {/* Background blur */}
          {artist.profileImage && !imgError && (
            <div style={{ position:"absolute", inset:0, backgroundImage:`url(${artist.profileImage})`, backgroundSize:"cover", backgroundPosition:"center", filter:"blur(20px) brightness(0.4)", transform:"scale(1.1)" }} />
          )}
          <div style={{ position:"absolute", inset:0, background:`linear-gradient(135deg,${p.a}22,${p.b}11)` }} />

          {/* Photo */}
          <div style={{ position:"relative", zIndex:2, display:"flex", justifyContent:"center", alignItems:"center", height:"100%", padding:"20px 0 0" }}>
            <div style={{
              width:"clamp(100px,30vw,140px)", height:"clamp(100px,30vw,140px)",
              borderRadius:"50%", overflow:"hidden",
              border:`3px solid ${p.a}`,
              boxShadow:`0 0 40px ${p.a}55, 0 8px 32px rgba(0,0,0,0.6)`,
              background:"#1a1a2e", flexShrink:0,
            }}>
              {artist.profileImage && !imgError
                ? <img src={artist.profileImage} alt="" onError={() => setImgError(true)} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <div style={{ width:"100%", height:"100%", background:`linear-gradient(135deg,${p.a},${p.b})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"clamp(28px,8vw,44px)", fontWeight:900, color:"#fff" }}>{initials}</div>
              }
            </div>
          </div>

          {/* Gradient fade to dark */}
          <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"50%", background:"linear-gradient(transparent,#0d0d14)", zIndex:3 }} />
        </div>

        {/* ── NAME + INFO ── */}
        <div style={{ padding:"0 16px 0", marginTop:-20, position:"relative", zIndex:10, animation:"fadeUp 0.4s ease" }}>
          {/* Category badge */}
          <div style={{ display:"flex", justifyContent:"center", marginBottom:10 }}>
            <span style={{
              background:`linear-gradient(135deg,${p.a},${p.b})`,
              color:"#fff", fontSize:11, fontWeight:800,
              padding:"5px 14px", borderRadius:20,
              letterSpacing:0.5, textTransform:"uppercase",
            }}>
              {icon} {artist.category || "Artist"}
            </span>
          </div>

          <h1 style={{ textAlign:"center", fontWeight:900, fontSize:"clamp(22px,6vw,32px)", margin:"0 0 4px", letterSpacing:-0.5 }}>
            {artist.name}
          </h1>

          {/* Stars + city */}
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ display:"flex", gap:2 }}>
              {Array.from({ length:5 }).map((_,i) => (
                <span key={i} style={{ fontSize:13, color: i < stars ? "#ffd60a" : "rgba(255,255,255,0.2)" }}>★</span>
              ))}
            </div>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)", fontWeight:700 }}>{(artist.rating||5).toFixed(1)}</span>
            {artist.city && <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)", fontWeight:600 }}>· 📍 {artist.city}</span>}
          </div>

          {/* Bio */}
          {artist.bio && (
            <p style={{ textAlign:"center", color:"rgba(255,255,255,0.55)", fontSize:13, lineHeight:1.6, fontWeight:600, margin:"0 0 14px", maxWidth:400, marginLeft:"auto", marginRight:"auto" }}>
              {artist.bio}
            </p>
          )}

          {/* Stats row */}
          <div style={{
            display:"grid", gridTemplateColumns:"repeat(3,1fr)",
            background:"rgba(255,255,255,0.05)", borderRadius:14,
            border:"1px solid rgba(255,255,255,0.08)",
            marginBottom:14, overflow:"hidden",
          }}>
            {[
              { num:posts.length,           lbl:"Works" },
              { num:artist.profileViews||0, lbl:"Views" },
              { num:artist.price ? `₹${Number(artist.price).toLocaleString("en-IN")}` : "—", lbl:"From" },
            ].map((st, i) => (
              <div key={i} style={{ textAlign:"center", padding:"12px 8px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <div style={{ fontWeight:900, fontSize:"clamp(15px,4vw,20px)", color:"#fff" }}>{st.num}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontWeight:700, letterSpacing:0.5, textTransform:"uppercase" }}>{st.lbl}</div>
              </div>
            ))}
          </div>

          {/* Quick action buttons */}
          {!isOwner && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:4 }}>
              <button
                onClick={() => setActiveTab("book")}
                style={{
                  padding:"12px", borderRadius:12, border:"none",
                  background:`linear-gradient(135deg,${p.a},${p.b})`,
                  color:"#fff", fontWeight:900, fontSize:14, cursor:"pointer",
                  boxShadow:`0 6px 20px ${p.a}44`,
                }}
              >
                📅 Book Now
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                style={{
                  padding:"12px", borderRadius:12,
                  border:"1.5px solid rgba(255,255,255,0.15)",
                  background:"rgba(255,255,255,0.06)",
                  color:"#fff", fontWeight:900, fontSize:14, cursor:"pointer",
                }}
              >
                💬 Chat
              </button>
            </div>
          )}
          {isOwner && (
            <button
              onClick={() => navigate("/artist-dashboard")}
              style={{
                width:"100%", padding:"12px", borderRadius:12, border:"none",
                background:`linear-gradient(135deg,${p.a},${p.b})`,
                color:"#fff", fontWeight:900, fontSize:14, cursor:"pointer",
                marginBottom:4,
              }}
            >
              🛠 Go to Dashboard
            </button>
          )}
        </div>

        {/* ── TABS ── */}
        <div style={{
          display:"grid", gridTemplateColumns:`repeat(${TABS.length},1fr)`,
          borderTop:"1px solid rgba(255,255,255,0.08)",
          borderBottom:"1px solid rgba(255,255,255,0.08)",
          marginTop:16, background:"rgba(255,255,255,0.02)",
          position:"sticky", top:56, zIndex:100,
        }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding:"12px 4px", border:"none",
                background: activeTab === tab.id ? "rgba(255,255,255,0.07)" : "transparent",
                color: activeTab === tab.id ? "#fff" : "rgba(255,255,255,0.4)",
                fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12,
                cursor:"pointer", display:"flex", flexDirection:"column",
                alignItems:"center", gap:3,
                borderBottom: activeTab === tab.id ? `2px solid ${p.a}` : "2px solid transparent",
                transition:"all 0.2s",
              }}
            >
              <span style={{ fontSize:16 }}>{tab.emoji}</span>
              <span>{tab.label}{tab.count !== null ? ` (${tab.count})` : ""}</span>
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div style={{ minHeight:"50vh" }}>
          {activeTab === "art" && (
            <ArtTab posts={posts} artist={artist} isOwner={isOwner} navigate={navigate} />
          )}
          {activeTab === "chat" && (
            <ChatTab artist={artist} currentUser={currentUser} artistId={id} />
          )}
          {activeTab === "book" && (
            <BookingTab artist={artist} currentUser={currentUser} artistId={id} />
          )}
          {activeTab === "rating" && (
            <RatingTab
              artist={artist}
              currentUser={currentUser}
              artistId={id}
              onRatingUpdate={fetchArtist}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  topBtn: {
    background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.12)",
    color:"#fff", padding:"7px 14px", borderRadius:10,
    fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:12, cursor:"pointer",
  },
  emptyState: {
    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
    padding:"40px 20px", textAlign:"center",
  },
};