import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import BookingModal from "../components/BookingModal";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const CAT_COLORS = {
  Singer:       "#e91e63", Dancer:"#9c27b0", Musician:"#1976d2",
  Painter:      "#ff9800", Photographer:"#4caf50", Actor:"#fdd835",
  Comedian:     "#00bcd4", default:"#7c4dff",
};
const CAT_BG = {
  Singer:"#fce4ec", Dancer:"#ede7f6", Musician:"#e3f2fd",
  Painter:"#fff3e0", Photographer:"#e8f5e9", Actor:"#fffde7",
  Comedian:"#e0f7fa", default:"#ede7f6",
};
const ICONS = {
  Singer:"🎤", Dancer:"💃", Musician:"🎵", Painter:"🎨",
  Photographer:"📷", Actor:"🎭", Comedian:"😂", default:"✨",
};
const TAPES = ["#f9ca24","#f0932b","#6ab04c","#e84393","#30336b","#eb4d4b"];

function getId(obj) {
  if (!obj) return undefined;
  const raw = obj._id;
  if (!raw) return undefined;
  if (typeof raw === "object" && raw.$oid) return raw.$oid;
  return String(raw);
}

/* ── CHAT MODAL ─────────────────────────────────────────────────────────── */
function ChatModal({ artist, currentUser, artistId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);
  const myId = getId(currentUser);

  useEffect(() => {
    if (!myId) return;
    fetchMsgs(); const iv = setInterval(fetchMsgs, 3000); return () => clearInterval(iv);
  }, [myId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const fetchMsgs = async () => {
    try {
      const res = await axios.get(`${API}/api/chat/${myId}/${artistId}`);
      setMessages(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  const send = async () => {
    if (!input.trim() || !myId) return;
    setSending(true);
    try {
      await axios.post(`${API}/api/chat/send`, { senderId:myId, receiverId:artistId, message:input.trim() });
      setInput(""); fetchMsgs();
    } catch {}
    setSending(false);
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.55)",
      zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center",
      backdropFilter:"blur(4px)", padding:16,
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:"100%", maxWidth:440, borderRadius:20, overflow:"hidden",
        background:"#fff", boxShadow:"0 20px 60px rgba(0,0,0,0.3)",
        fontFamily:"'Nunito',sans-serif",
        position:"relative",
      }}>
        {/* Header */}
        <div style={{
          background:"linear-gradient(135deg,#3d5afe,#7c4dff)",
          padding:"16px 20px", display:"flex", alignItems:"center", gap:12,
        }}>
          <div style={{
            width:40, height:40, borderRadius:"50%",
            background:"rgba(255,255,255,0.2)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:20, fontWeight:900, color:"#fff",
          }}>
            {artist.name?.[0]?.toUpperCase() || "A"}
          </div>
          <div>
            <div style={{ fontWeight:900, fontSize:15, color:"#fff" }}>{artist.name}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.7)", fontWeight:700 }}>
              {ICONS[artist.category]||"✨"} {artist.category}
            </div>
          </div>
          <button onClick={onClose} style={{
            marginLeft:"auto", background:"rgba(255,255,255,0.2)",
            border:"none", color:"#fff", width:32, height:32, borderRadius:"50%",
            fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ height:320, overflowY:"auto", padding:16, display:"flex", flexDirection:"column", gap:8, background:"#f8f9ff" }}>
          {!currentUser && (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#9e9e9e", fontWeight:700, fontSize:13 }}>
              Login to chat with {artist.name}
            </div>
          )}
          {currentUser && messages.length === 0 && (
            <div style={{ textAlign:"center", padding:"40px 0", color:"#bdbdbd", fontWeight:700, fontSize:13 }}>
              👋 Say hello to {artist.name?.split(" ")[0]}!
            </div>
          )}
          {messages.map((msg,i) => {
            const isMe = String(msg.senderId)===String(myId) || String(getId(msg.sender))===String(myId);
            return (
              <div key={i} style={{ display:"flex", justifyContent:isMe?"flex-end":"flex-start" }}>
                <div style={{
                  maxWidth:"72%", padding:"9px 14px",
                  borderRadius: isMe?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  background: isMe?"linear-gradient(135deg,#3d5afe,#7c4dff)":"#fff",
                  color: isMe?"#fff":"#333",
                  fontSize:13, fontWeight:600, lineHeight:1.5,
                  boxShadow:"0 1px 4px rgba(0,0,0,0.08)", wordBreak:"break-word",
                }}>
                  {msg.message || msg.text || msg.content}
                  <div style={{ fontSize:9, opacity:0.55, marginTop:2, textAlign:isMe?"right":"left" }}>
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : ""}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        {currentUser && (
          <div style={{ display:"flex", gap:10, padding:"12px 16px", borderTop:"1px solid #e8eaf6", background:"#fff" }}>
            <input
              value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
              placeholder={`Message ${artist.name?.split(" ")[0]}…`}
              style={{
                flex:1, padding:"10px 14px", borderRadius:20,
                border:"1.5px solid #e0e0e0", background:"#f8f9ff",
                color:"#333", fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight:600,
                outline:"none",
              }}
            />
            <button onClick={send} disabled={sending||!input.trim()} style={{
              width:40, height:40, borderRadius:"50%", border:"none",
              background: input.trim()?"linear-gradient(135deg,#3d5afe,#7c4dff)":"#e0e0e0",
              color:"#fff", fontSize:16, cursor:input.trim()?"pointer":"default",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            }}>{sending?"⏳":"➤"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── LIGHTBOX ────────────────────────────────────────────────────────────── */
function Lightbox({ post, onClose }) {
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.88)",
      zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center",
      backdropFilter:"blur(6px)",
    }} onClick={onClose}>
      <button style={{
        position:"absolute", top:16, right:16, background:"rgba(255,255,255,0.15)",
        border:"none", color:"#fff", width:40, height:40, borderRadius:"50%",
        fontSize:18, cursor:"pointer",
      }}>✕</button>
      <div onClick={e=>e.stopPropagation()} style={{ maxWidth:"90vw", maxHeight:"90vh", borderRadius:12, overflow:"hidden" }}>
        {post.type==="video"
          ? <video src={post.media} controls style={{ maxWidth:"85vw", maxHeight:"85vh" }}/>
          : <img src={post.media} alt="" style={{ maxWidth:"85vw", maxHeight:"85vh", objectFit:"contain", display:"block" }}/>
        }
        {post.title && (
          <div style={{ background:"rgba(0,0,0,0.7)", color:"#fff", padding:"10px 16px", fontSize:13, fontWeight:700, fontFamily:"'Nunito',sans-serif" }}>{post.title}</div>
        )}
      </div>
    </div>
  );
}

/* ── RATING SECTION ──────────────────────────────────────────────────────── */
// BUG 2 FIX: accepts `reviews` and `avgRating` as props so parent controls the state reactively
function RatingSection({ artist, currentUser, artistId, reviews, avgRating, onReviewSubmitted }) {
  const [rating,    setRating]    = useState(0);
  const [hover,     setHover]     = useState(0);
  const [review,    setReview]    = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);

  const submit = async () => {
    if (!rating || !currentUser) return;
    setLoading(true);
    try {
      await axios.post(`${API}/api/artists/${artistId}/reviews`, {
        userId: getId(currentUser), userName: currentUser.name, rating, review: review.trim(),
      });
      setSubmitted(true);
      setReview("");
      // BUG 2 FIX: tell parent to re-fetch both artist data and reviews
      if (onReviewSubmitted) onReviewSubmitted();
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{
      background:"#fffde7",
      borderRadius:4,
      padding:20,
      boxShadow:"4px 4px 12px rgba(0,0,0,0.12), -1px -1px 0 rgba(0,0,0,0.05)",
      position:"relative",
      fontFamily:"'Nunito',sans-serif",
    }}>
      {/* Tape */}
      <div style={{
        position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)",
        width:50, height:20, background:"rgba(249,202,36,0.7)",
        borderRadius:2, boxShadow:"0 1px 3px rgba(0,0,0,0.1)",
      }}/>

      <div style={{ fontFamily:"'Caveat',cursive", fontSize:22, fontWeight:700, color:"#333", marginBottom:14, textAlign:"center" }}>
        ★ Rate {artist.name?.split(" ")[0]}
      </div>

      {/* Average display — BUG 2 FIX: uses live avgRating from parent */}
      <div style={{ textAlign:"center", marginBottom:16 }}>
        <span style={{ fontFamily:"'Caveat',cursive", fontSize:52, fontWeight:700, color:"#f59e0b", lineHeight:1 }}>{avgRating}</span>
        <div style={{ display:"flex", justifyContent:"center", gap:4, margin:"6px 0 2px" }}>
          {Array.from({length:5}).map((_,i)=>(
            <span key={i} style={{ fontSize:20, color:i<Math.round(avgRating)?"#f59e0b":"#e0e0e0" }}>★</span>
          ))}
        </div>
        <div style={{ color:"#888", fontSize:12, fontWeight:700 }}>{reviews.length} review{reviews.length!==1?"s":""}</div>
      </div>

      {currentUser && !submitted && (
        <>
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:10 }}>
            {Array.from({length:5}).map((_,i)=>(
              <span key={i}
                onMouseEnter={()=>setHover(i+1)} onMouseLeave={()=>setHover(0)}
                onClick={()=>setRating(i+1)}
                style={{
                  fontSize:30, cursor:"pointer",
                  color:i<(hover||rating)?"#f59e0b":"#e0e0e0",
                  transform:i<(hover||rating)?"scale(1.2)":"scale(1)",
                  transition:"all 0.12s", display:"inline-block",
                }}
              >★</span>
            ))}
          </div>
          <textarea value={review} onChange={e=>setReview(e.target.value)}
            placeholder="Write something nice… ✍️" rows={2}
            style={{
              width:"100%", padding:"10px 12px", borderRadius:8,
              border:"1.5px dashed #e0e0e0", background:"rgba(255,255,255,0.8)",
              fontFamily:"'Caveat',cursive", fontSize:15, resize:"none",
              outline:"none", marginBottom:10, boxSizing:"border-box", color:"#333",
            }}
          />
          <button onClick={submit} disabled={!rating||loading} style={{
            width:"100%", padding:10, borderRadius:8, border:"none",
            background: rating?"linear-gradient(135deg,#f59e0b,#f97316)":"#e0e0e0",
            color:rating?"#fff":"#aaa", fontFamily:"'Nunito',sans-serif",
            fontWeight:900, fontSize:14, cursor:rating?"pointer":"default",
          }}>
            {loading?"Submitting…":"Submit Review ✨"}
          </button>
        </>
      )}
      {submitted && (
        <div style={{ textAlign:"center", background:"#f0fdf4", borderRadius:8, padding:"10px 16px", color:"#16a34a", fontWeight:800, fontSize:13, marginTop:8 }}>
          ✅ Thanks for your review!
        </div>
      )}
      {!currentUser && (
        <div style={{ textAlign:"center", color:"#aaa", fontSize:12, fontWeight:700, marginTop:8 }}>
          Login to rate this artist
        </div>
      )}

      {/* Reviews list */}
      {reviews.length > 0 && (
        <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:8 }}>
          {reviews.slice(0,3).map((r,i)=>(
            <div key={i} style={{
              background:"rgba(255,255,255,0.7)", borderRadius:8,
              padding:"10px 12px", border:"1px solid rgba(0,0,0,0.06)",
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontWeight:800, fontSize:12, color:"#333" }}>{r.userName||"User"}</span>
                <span style={{ fontSize:11, color:"#f59e0b" }}>{"★".repeat(r.rating||0)}</span>
              </div>
              {r.review && <div style={{ fontSize:12, color:"#666", fontFamily:"'Caveat',cursive" }}>{r.review}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── MAIN PROFILE ─────────────────────────────────────────────────────────── */
export default function ArtistProfile() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [artist,      setArtist]      = useState(null);
  const [posts,       setPosts]       = useState([]);
  const [imgError,    setImgError]    = useState(false);
  const [lightbox,    setLightbox]    = useState(null);
  const [showChat,    setShowChat]    = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);

  // BUG 2 FIX: reviews + avgRating lifted to parent so RatingSection can update them reactively
  const [reviews,    setReviews]    = useState([]);
  const [avgRating,  setAvgRating]  = useState("5.0");

  let loggedArtist = null, loggedUser = null;
  try { loggedArtist = JSON.parse(localStorage.getItem("artist")||"null"); } catch {}
  try { loggedUser   = JSON.parse(localStorage.getItem("user")  ||"null"); } catch {}
  const currentUser = loggedUser || loggedArtist;
  const isOwner = loggedArtist && getId(loggedArtist) === id;

  useEffect(() => {
    loadArtist();
    loadPosts();
    loadReviews();
    if (!isOwner) axios.post(`${API}/api/users/${id}/view`).catch(()=>{});
  }, [id]);

  const loadArtist = async () => {
    try { const r = await axios.get(`${API}/api/artists/${id}`); if (r.data) { setArtist(r.data); return; } } catch {}
    try {
      const r = await axios.get(`${API}/api/users/all-people`);
      const found = (Array.isArray(r.data)?r.data:[]).find(u=>u._id===id||getId(u)===id);
      if (found) setArtist(found);
    } catch {}
  };

  const loadPosts = async () => {
    try {
      const r = await axios.get(`${API}/api/posts`);
      setPosts((Array.isArray(r.data)?r.data:[]).filter(p=>p.artistId===id));
    } catch {}
  };

  // BUG 2 FIX: centralized review loader — recalculates avgRating from fresh data
  const loadReviews = async () => {
    try {
      const res = await axios.get(`${API}/api/artists/${id}/reviews`);
      const data = Array.isArray(res.data) ? res.data : [];
      setReviews(data);
      if (data.length > 0) {
        const avg = (data.reduce((s, r) => s + (r.rating || 0), 0) / data.length).toFixed(1);
        setAvgRating(avg);
      } else {
        // fall back to artist.rating once artist is loaded (handled below in effect)
        setAvgRating(null); // null = "use artist.rating"
      }
    } catch {}
  };

  // BUG 2 FIX: when artist loads and no reviews yet, seed avgRating from artist.rating
  useEffect(() => {
    if (artist && avgRating === null) {
      setAvgRating((artist.rating || 5).toFixed(1));
    }
  }, [artist, avgRating]);

  // Called by RatingSection after a successful submit
  const handleReviewSubmitted = () => {
    loadReviews();
    loadArtist();
  };

  if (!artist) return (
    <div style={{ background:"#eef2f7", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet"/>
      <div style={{ fontFamily:"'Caveat',cursive", fontSize:24, color:"#9e9e9e" }}>Loading profile…</div>
    </div>
  );

  const accentColor = CAT_COLORS[artist.category] || CAT_COLORS.default;
  const accentBg    = CAT_BG[artist.category]     || CAT_BG.default;
  const icon        = ICONS[artist.category]       || ICONS.default;
  const initials    = artist.name ? artist.name.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2) : "A";
  const stars       = Math.round(Math.min(5, parseFloat(avgRating) || artist.rating || 5));

  // BUG 1 FIX: check both image fields — artist.image (backend field) and artist.profileImage (legacy field)
  const profileImageSrc = artist.image || artist.profileImage || null;
const profileImageSrc = artist.image || artist.profileImage || null;

  // Merge dashboard-uploaded work samples (artist.works) with posts collection
  const works = [
    ...(artist.works || []).map((url, i) => ({ _id: `work-${i}`, media: url, type: "image", title: "Untitled" })),
    ...posts,
  ];
  return (
    <div style={{
      minHeight:"100vh",
      fontFamily:"'Nunito',sans-serif",
      background:"#eef2f7",
      backgroundImage:`
        linear-gradient(rgba(180,200,230,0.35) 1px, transparent 1px),
        linear-gradient(90deg, rgba(180,200,230,0.35) 1px, transparent 1px),
        linear-gradient(rgba(180,200,230,0.12) 1px, transparent 1px),
        linear-gradient(90deg, rgba(180,200,230,0.12) 1px, transparent 1px)
      `,
      backgroundSize:"40px 40px, 40px 40px, 8px 8px, 8px 8px",
      borderLeft:"none",
      position:"relative",
    }}>
      {/* Red margin line */}
      <div style={{
        position:"fixed", left:48, top:0, bottom:0, width:1.5,
        background:"rgba(220,80,80,0.3)", zIndex:0, pointerEvents:"none",
      }}/>
      {/* Blue horizontal line at top */}
      <div style={{
        position:"fixed", left:0, right:0, top:56, height:1.5,
        background:"rgba(100,140,200,0.25)", zIndex:0, pointerEvents:"none",
      }}/>

      <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        * { box-sizing:border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes wiggle { 0%,100%{transform:rotate(-1deg)} 50%{transform:rotate(1deg)} }
        textarea:focus,input:focus { outline:none; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#c5cae9; border-radius:4px; }
        .work-thumb:hover { transform:scale(1.03) rotate(0.5deg) !important; z-index:10 !important; }
        .work-thumb { transition:all 0.22s ease !important; }
      `}</style>

      {/* ── TOP NAV BAR ── */}
      <div style={{
        position:"sticky", top:0, zIndex:200,
        background:"rgba(255,255,255,0.92)", backdropFilter:"blur(12px)",
        borderBottom:"2px solid rgba(180,200,230,0.5)",
        display:"flex", alignItems:"center", gap:12, padding:"10px 20px",
        boxShadow:"0 2px 12px rgba(0,0,0,0.06)",
      }}>
        <button onClick={()=>navigate("/artists")} style={{
          background:accentBg, border:`1.5px solid ${accentColor}33`,
          color:accentColor, width:36, height:36, borderRadius:10,
          fontSize:14, cursor:"pointer", fontWeight:900,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
        }}>←</button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"'Caveat',cursive", fontWeight:700, fontSize:18, color:"#1a1a2e", lineHeight:1 }}>{artist.name}</div>
          <div style={{ fontSize:10, color:"#9e9e9e", fontWeight:700 }}>{icon} {artist.category}{artist.city?` · ${artist.city}`:""}</div>
        </div>
        <button onClick={()=>setShowChat(true)} style={{
          background:"linear-gradient(135deg,#3d5afe,#7c4dff)",
          border:"none", color:"#fff", padding:"8px 14px", borderRadius:20,
          fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:11,
          cursor:"pointer", whiteSpace:"nowrap",
        }}>💬 Chat</button>
        {!isOwner && (
          <button onClick={()=>setShowBooking(true)} style={{
            background:accentColor, border:"none", color:"#fff",
            padding:"8px 14px", borderRadius:20,
            fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:11,
            cursor:"pointer", whiteSpace:"nowrap",
          }}>📅 Book</button>
        )}
        {isOwner && (
          <button onClick={()=>navigate("/artist-dashboard?tab=profile")} style={{
            background:"#f0f2ff", border:"1px solid #e8eaf6", color:"#3d5afe",
            padding:"8px 14px", borderRadius:20,
            fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:11, cursor:"pointer",
          }}>🛠 Edit</button>
        )}
      </div>

      {/* ── PAGE CONTENT ── */}
      <div style={{ maxWidth:800, margin:"0 auto", padding:"28px 20px 80px", position:"relative", zIndex:1 }}>

        {/* ══ SECTION 1: HERO ══ */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:20, marginBottom:28, animation:"fadeUp 0.4s ease" }}>

          {/* Left: name + bio */}
          <div>
            <div style={{
              fontFamily:"'Caveat',cursive", fontWeight:700, fontSize:"clamp(18px,4vw,26px)",
              color:"#1a1a2e", marginBottom:6, lineHeight:1.1,
            }}>
              HEY! I AM
            </div>

            {/* Artist name — colorful letters */}
            <div style={{
              fontFamily:"'Caveat',cursive", fontWeight:700,
              fontSize:"clamp(28px,7vw,48px)",
              lineHeight:1, marginBottom:14,
              display:"flex", flexWrap:"wrap", gap:3, alignItems:"center",
            }}>
              {artist.name?.split("").map((ch, i) => {
                const colors = [accentColor,"#e91e63","#1976d2","#f59e0b","#4caf50","#9c27b0","#ff5722"];
                return ch === " " ? (
                  <span key={i} style={{ width:12 }}/>
                ) : (
                  <span key={i} style={{
                    color:"#fff",
                    background: colors[i % colors.length],
                    padding:"2px 5px", borderRadius:4,
                    display:"inline-block",
                    transform:`rotate(${(i%3===0?-2:i%3===1?0:2)}deg)`,
                  }}>{ch.toUpperCase()}</span>
                );
              })}
              <span style={{ color:accentColor, marginLeft:4 }}>·</span>
            </div>

            {/* Category badge */}
            <div style={{
              display:"inline-flex", alignItems:"center", gap:8,
              background:"#fff", border:`2px solid ${accentColor}`,
              borderRadius:8, padding:"8px 16px", marginBottom:14,
              boxShadow:"3px 3px 0 rgba(0,0,0,0.1)",
            }}>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontFamily:"'Caveat',cursive", fontSize:11, color:"#aaa", fontWeight:700, letterSpacing:1 }}>HELLO I AM</div>
                <div style={{ fontFamily:"'Caveat',cursive", fontWeight:700, fontSize:18, color:accentColor, lineHeight:1 }}>
                  {icon} {artist.category || "Artist"}
                </div>
              </div>
            </div>

            {/* Bio */}
            {artist.bio ? (
              <p style={{ fontFamily:"'Caveat',cursive", fontSize:16, color:"#444", lineHeight:1.6, margin:0, maxWidth:380 }}>
                {artist.bio}
              </p>
            ) : (
              <p style={{ fontFamily:"'Caveat',cursive", fontSize:16, color:"#aaa", lineHeight:1.6, margin:0 }}>
                {artist.city ? `Based in ${artist.city}. ` : ""}
                A passionate {artist.category?.toLowerCase() || "artist"} sharing creativity with the world.
              </p>
            )}

            {/* Stats row */}
            <div style={{ display:"flex", gap:12, marginTop:16, flexWrap:"wrap" }}>
              {[
                // BUG 2 FIX: use live avgRating here too
                { v: avgRating || (artist.rating||5).toFixed(1), l:"Rating", emoji:"⭐" },
{ v:works.length,                                  l:"Works",  emoji:"🎨" },                { v:artist.profileViews||0,                        l:"Views",  emoji:"👁" },
              ].map(({v,l,emoji})=>(
                <div key={l} style={{
                  background:"#fff", borderRadius:12, padding:"10px 16px",
                  boxShadow:"3px 3px 0 rgba(0,0,0,0.08)",
                  border:`1.5px solid rgba(0,0,0,0.06)`, textAlign:"center", minWidth:64,
                }}>
                  <div style={{ fontSize:16, marginBottom:2 }}>{emoji}</div>
                  <div style={{ fontFamily:"'Caveat',cursive", fontWeight:700, fontSize:20, color:accentColor }}>{v}</div>
                  <div style={{ fontSize:9, color:"#aaa", fontWeight:800, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: polaroid photo — BUG 1 FIX: uses profileImageSrc which checks both fields */}
          <div style={{
            flexShrink:0, width:"clamp(130px,30vw,180px)",
            background:"#fff",
            padding:"10px 10px 32px",
            boxShadow:"4px 4px 16px rgba(0,0,0,0.15), -2px -2px 0 rgba(0,0,0,0.04)",
            transform:"rotate(2deg)",
            position:"relative",
            alignSelf:"flex-start",
          }}>
            {/* Paper clip */}
            <div style={{
              position:"absolute", top:-18, right:20, fontSize:28,
              transform:"rotate(15deg)", filter:"drop-shadow(1px 1px 2px rgba(0,0,0,0.2))",
            }}>📎</div>

            <div style={{
              width:"100%", aspectRatio:"1/1", overflow:"hidden",
              background:`linear-gradient(135deg,${accentBg},${accentColor}22)`,
              display:"flex", alignItems:"center", justifyContent:"center",
              borderRadius:2,
            }}>
              {/* BUG 1 FIX: profileImageSrc checks artist.image || artist.profileImage */}
              {profileImageSrc && !imgError ? (
                <img src={profileImageSrc} alt={artist.name}
                  onError={()=>setImgError(true)}
                  style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                />
              ) : (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span style={{ fontSize:42 }}>{icon}</span>
                  <span style={{ fontFamily:"'Caveat',cursive", fontWeight:700, fontSize:24, color:accentColor }}>{initials}</span>
                </div>
              )}
            </div>
            {/* Polaroid label */}
            <div style={{ textAlign:"center", marginTop:8, fontFamily:"'Caveat',cursive", fontWeight:700, fontSize:13, color:"#555" }}>
              {artist.name?.split(" ")[0] || "Artist"}
            </div>

            {/* City sticker */}
            <div style={{
              position:"absolute", bottom:36, right:-10,
              background:accentColor, color:"#fff",
              fontFamily:"'Caveat',cursive", fontWeight:700, fontSize:10,
              padding:"4px 8px", borderRadius:4, transform:"rotate(-4deg)",
              boxShadow:"2px 2px 4px rgba(0,0,0,0.2)", whiteSpace:"nowrap",
            }}>
              {artist.city || "Artist"}
            </div>
          </div>
        </div>

        {/* ══ SECTION 2: INTERESTS + CONTACT ══ */}
        <div style={{
          display:"grid", gridTemplateColumns:"1fr 1fr",
          gap:20, marginBottom:28,
          animation:"fadeUp 0.4s ease 0.1s both",
        }}>

          {/* INTERESTS */}
          <div style={{
            background:"#fff", borderRadius:4, padding:"18px 18px 22px",
            boxShadow:"3px 3px 10px rgba(0,0,0,0.1)", position:"relative",
            clipPath:"polygon(0 0,100% 0,100% 88%,97% 92%,93% 89%,89% 93%,85% 89%,81% 93%,77% 89%,73% 93%,69% 89%,65% 93%,61% 89%,57% 93%,53% 89%,49% 93%,45% 89%,41% 93%,37% 89%,33% 93%,29% 89%,25% 93%,21% 89%,17% 93%,13% 89%,9% 93%,5% 89%,1% 93%,0 89%)",
            paddingBottom:32,
          }}>
            <div style={{
              position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)",
              width:48, height:20, background:"rgba(249,202,36,0.65)", borderRadius:2,
            }}/>
            {[0,1,2].map(i=>(
              <div key={i} style={{
                position:"absolute", left:0, right:0, top:`${38+i*22}px`,
                height:1, background:"rgba(200,80,80,0.12)", pointerEvents:"none",
              }}/>
            ))}
            <div style={{ fontFamily:"'Caveat',cursive", fontWeight:700, fontSize:20, color:"#1a1a2e", marginBottom:10 }}>
              🎯 INTERESTS
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {[
                artist.category || "Art",
                artist.city,
                "Creativity",
                "Performing",
                "Collaboration",
              ].filter(Boolean).map((item, i) => (
                <div key={i} style={{ fontFamily:"'Caveat',cursive", fontSize:16, color:"#444", display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ color:accentColor }}>•</span> {item}
                </div>
              ))}
            </div>
          </div>

          {/* CONTACT */}
          <div style={{
            background:"#e8f5e9", borderRadius:4, padding:"18px 18px 22px",
            boxShadow:"4px 4px 12px rgba(0,0,0,0.12), -1px -1px 0 rgba(0,0,0,0.04)",
            position:"relative",
          }}>
            <div style={{
              position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)",
              width:48, height:20, background:"rgba(100,200,100,0.65)", borderRadius:2,
            }}/>
            <div style={{ fontFamily:"'Caveat',cursive", fontWeight:700, fontSize:20, color:"#1a1a2e", marginBottom:12 }}>
              📬 CONTACT
            </div>

            {artist.price && (
              <div style={{ fontFamily:"'Caveat',cursive", fontSize:15, color:"#444", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ color:accentColor }}>💰</span> From ₹{Number(artist.price).toLocaleString("en-IN")}
              </div>
            )}

            {/* BUG 2 FIX: live star display using avgRating */}
            <div style={{ fontFamily:"'Caveat',cursive", fontSize:15, color:"#444", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ color:"#f59e0b" }}>{"★".repeat(stars)}{"☆".repeat(5-stars)}</span>
              <span style={{ color:"#666" }}>{avgRating || (artist.rating||5).toFixed(1)}/5</span>
            </div>

            {artist.city && (
              <div style={{ fontFamily:"'Caveat',cursive", fontSize:15, color:"#444", marginBottom:10, display:"flex", alignItems:"center", gap:6 }}>
                <span>📍</span> {artist.city}
              </div>
            )}

            <button onClick={()=>setShowChat(true)} style={{
              width:"100%", padding:"11px 14px", borderRadius:10,
              border:"none", background:"linear-gradient(135deg,#3d5afe,#7c4dff)",
              color:"#fff", fontFamily:"'Nunito',sans-serif", fontWeight:900,
              fontSize:13, cursor:"pointer", marginBottom:8,
              boxShadow:"0 4px 12px rgba(61,90,254,0.3)",
            }}>
              💬 Send Message
            </button>

            {!isOwner && (
              <button onClick={()=>setShowBooking(true)} style={{
                width:"100%", padding:"11px 14px", borderRadius:10,
                border:`2px solid ${accentColor}`, background:"transparent",
                color:accentColor, fontFamily:"'Nunito',sans-serif", fontWeight:900,
                fontSize:13, cursor:"pointer",
              }}>
                📅 Book Now
              </button>
            )}

            {bookingDone && (
              <div style={{ marginTop:8, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"8px 12px", color:"#16a34a", fontWeight:800, fontSize:12 }}>
                ✅ Booking sent!
              </div>
            )}
          </div>
        </div>

        {/* ══ SECTION 3: RATINGS ══ */}
        <div style={{ marginBottom:28, animation:"fadeUp 0.4s ease 0.15s both" }}>
          {/* BUG 2 FIX: pass reviews + avgRating as props; onReviewSubmitted re-fetches both */}
          <RatingSection
            artist={artist}
            currentUser={currentUser}
            artistId={id}
            reviews={reviews}
            avgRating={avgRating || (artist.rating||5).toFixed(1)}
            onReviewSubmitted={handleReviewSubmitted}
          />
        </div>

        {/* ══ SECTION 4: WORKS ══ */}
        <div style={{ animation:"fadeUp 0.4s ease 0.2s both" }}>
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <div style={{ fontFamily:"'Caveat',cursive", fontWeight:700, fontSize:"clamp(24px,6vw,36px)", color:"#1a1a2e", letterSpacing:1 }}>
              MY WORKS
            </div>
            <svg viewBox="0 0 200 14" style={{ width:160, marginTop:-4 }}>
              <path d="M0 7 Q25 0 50 7 T100 7 T150 7 T200 7" stroke={accentColor} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            </svg>
          </div>

        {works.length === 0 ? (
            <div style={{
              textAlign:"center", padding:"40px 20px",
              background:"#fff", borderRadius:12,
              boxShadow:"3px 3px 0 rgba(0,0,0,0.06)",
              border:"1.5px dashed rgba(0,0,0,0.1)",
            }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🎭</div>
              <div style={{ fontFamily:"'Caveat',cursive", fontSize:18, color:"#aaa" }}>No works uploaded yet</div>
              {isOwner && (
                <button onClick={()=>navigate("/artist-dashboard")} style={{
                  marginTop:14, background:accentColor, border:"none",
                  color:"#fff", padding:"10px 24px", borderRadius:20,
                  fontFamily:"'Nunito',sans-serif", fontWeight:900, fontSize:13, cursor:"pointer",
                }}>Upload First Work</button>
              )}
            </div>
          ) : (
            <div style={{
              display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",
              gap:12,
            }}>
              {works.map((post, i) => {
                const rotate = (i%5===0?-2:i%5===1?1:i%5===2?-1:i%5===3?2:0);
                return (
                  <div key={post._id||i}
                    className="work-thumb"
                    onClick={()=>setLightbox(post)}
                    style={{
                      background:"#fff", padding:"8px 8px 28px",
                      boxShadow:"3px 3px 12px rgba(0,0,0,0.12)",
                      cursor:"pointer", transform:`rotate(${rotate}deg)`,
                      position:"relative",
                    }}
                  >
                    {/* Pin */}
                    <div style={{
                      position:"absolute", top:-8, left:"50%", transform:"translateX(-50%)",
                      width:14, height:14, borderRadius:"50%",
                      background: TAPES[i%TAPES.length],
                      boxShadow:"0 2px 4px rgba(0,0,0,0.2)", zIndex:2,
                    }}/>
                    <div style={{ width:"100%", aspectRatio:"1/1", overflow:"hidden", background:accentBg }}>
                      {post.type==="video"
                        ? <video src={post.media} style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }} muted/>
                        : <img src={post.media} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }}/>
                      }
                    </div>
                    <div style={{
                      position:"absolute", bottom:4, left:0, right:0,
                      textAlign:"center", fontFamily:"'Caveat',cursive",
                      fontSize:12, color:"#666", padding:"0 4px",
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                    }}>
                      {post.title || `Work ${i+1}`}
                    </div>
                    {post.type==="video" && (
                      <div style={{
                        position:"absolute", top:14, right:8,
                        background:"rgba(0,0,0,0.55)", borderRadius:4,
                        padding:"2px 5px", fontSize:9, color:"#fff", fontWeight:700,
                      }}>▶</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom sticker */}
        <div style={{ textAlign:"right", marginTop:28, animation:"fadeUp 0.4s ease 0.25s both" }}>
          <div style={{
            display:"inline-block",
            background:accentColor, color:"#fff",
            fontFamily:"'Caveat',cursive", fontWeight:700, fontSize:13,
            padding:"8px 16px", borderRadius:8, transform:"rotate(-2deg)",
            boxShadow:"3px 3px 0 rgba(0,0,0,0.15)",
          }}>
            🎨 JUST BE CREATIVE
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showChat && (
        <ChatModal
          artist={artist} currentUser={currentUser}
          artistId={id} onClose={()=>setShowChat(false)}
        />
      )}
      {showBooking && (
        <BookingModal
          artist={artist} currentUser={currentUser}
          onClose={()=>setShowBooking(false)}
          onSuccess={()=>{ setShowBooking(false); setBookingDone(true); }}
        />
      )}
      {lightbox && <Lightbox post={lightbox} onClose={()=>setLightbox(null)}/>}
    </div>
  );
}