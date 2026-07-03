// artspire-frontend/src/pages/Home.jsx
//
// Stripped down to an Instagram-style feed: top bar with the brand name,
// then a single column of posts (artist name + avatar, full-width media,
// like/save + share). No hero, no video background, no category rail.
// Bottom nav and the search/post dock are unchanged.
import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { getCurrentAccount, isArtist } from "../utils/auth";
import BottomNav from "../BottomNav";
import socket from "../socket";
import PostRequestModal from "../components/PostRequestModal";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const getActor = () => {
  const account = getCurrentAccount();
  if (!account?._id) return null;
  return {
    id: account._id,
    name: account.name,
    avatar: account.avatar || account.image,
    role: isArtist() ? "artist" : "user",
  };
};

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 8000 }
    );
  });
}

export default function Home() {
  const navigate = useNavigate();
  const actor = getActor();

  const [query, setQuery] = useState("");
  const [toast, setToast] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/posts/feed`, { params: { page: pageNum, limit: 20 } });
      const newPosts = Array.isArray(data?.posts) ? data.posts : [];
      setPosts((prev) => (pageNum === 1 ? newPosts : [...prev, ...newPosts]));
      setHasMore(!!data?.hasMore);
    } catch (e) {
      console.error("Failed to load feed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPage(1); }, [loadPage]);

  useEffect(() => {
    const onApproved = (post) => {
      setPosts((prev) => (prev.some((p) => p._id === post._id) ? prev : [post, ...prev]));
    };
    socket.on("post_approved", onApproved);
    return () => socket.off("post_approved", onApproved);
  }, []);

  useEffect(() => {
    const onDeleted = ({ postId }) => {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    };
    socket.on("post_deleted", onDeleted);
    return () => socket.off("post_deleted", onDeleted);
  }, []);

  useEffect(() => {
    const onConnect = () => {
      axios
        .get(`${API}/api/posts/feed`, { params: { page: 1, limit: 20 } })
        .then(({ data }) => {
          const fresh = Array.isArray(data?.posts) ? data.posts : [];
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p._id));
            const missing = fresh.filter((p) => !existingIds.has(p._id));
            return missing.length ? [...missing, ...prev] : prev;
          });
        })
        .catch(() => {});
    };
    socket.on("connect", onConnect);
    return () => socket.off("connect", onConnect);
  }, []);

  useEffect(() => {
    if (!actor?.id) return;
    socket.emit("join_room", actor.id);
    const onNewRequest = (request) => setToast(`New request near you: "${request.title}"`);
    const onNewResponse = ({ response }) => setToast(`${response.artistName} responded to your request`);
    socket.on("new_request", onNewRequest);
    socket.on("new_request_response", onNewResponse);
    return () => {
      socket.off("new_request", onNewRequest);
      socket.off("new_request_response", onNewResponse);
    };
  }, [actor?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (actor?.role !== "artist") return;
    getLocation()
      .then(({ lat, lng }) => {
        axios.put(`${API}/api/artists/${actor.id}/location`, { lat, lng }).catch(() => {});
      })
      .catch(() => {});
  }, [actor?.id, actor?.role]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPage(next);
  };

  const updatePost = (id, patch) => {
    setPosts((prev) => prev.map((p) => (p._id === id ? { ...p, ...patch } : p)));
  };

  const q = query.trim().toLowerCase();
  const visiblePosts = q
    ? posts.filter(
        (p) =>
          (p.caption || "").toLowerCase().includes(q) ||
          (p.artistName || "").toLowerCase().includes(q)
      )
    : posts;

  return (
    <div style={styles.page}>
      <GlobalStyles />

      {toast && (
        <div style={styles.toast} onClick={() => setToast(null)}>🔔 {toast}</div>
      )}

      {/* ══ Top bar ══ */}
      <div style={styles.topBar}>
        <span style={styles.brandName}>ArtSpire</span>
        <button style={styles.searchIconBtn} onClick={() => navigate("/search")} aria-label="Search">
          <SearchIcon size={20} stroke="#fff" />
        </button>
      </div>

      {/* ══ Feed ══ */}
      <div style={styles.feedCol}>
        {visiblePosts.length === 0 && !loading && (
          <div style={styles.comingSoon}>
            {q ? "No matches found." : "No posts yet."}
          </div>
        )}

        {visiblePosts.map((p) => (
          <FeedPost
            key={p._id}
            post={p}
            actor={actor}
            onUpdate={(patch) => updatePost(p._id, patch)}
          />
        ))}

        {!q && hasMore && (
          <button style={styles.loadMoreBtn} onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>

      {/* ══ Search / post dock ══ */}
      <div style={{ height: 66 }} />
      <div style={styles.searchDock}>
        <SearchIcon size={15} stroke="#8291AC" />
        <input
          style={styles.searchDockInput}
          placeholder="Search for artwork, artists, or a request…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" style={styles.searchDockAction} onClick={() => setShowPostModal(true)} aria-label="Post a request">
          + Post
        </button>
      </div>

      <div style={{ height: 96 }} />
      <BottomNav />

      {showPostModal && <PostRequestModal actor={actor} onClose={() => setShowPostModal(false)} />}
    </div>
  );
}

/* ── save (like) toggle, reuses the existing like endpoint ──────────────── */
function useSaveToggle(post, actor, onUpdate) {
  const saves = post.likes || [];
  const saved = actor ? saves.includes(actor.id) : false;
  const toggleSave = async () => {
    if (!actor) return alert("Log in to save posts.");
    const next = saved ? saves.filter((id) => id !== actor.id) : [...saves, actor.id];
    onUpdate({ likes: next });
    try {
      await axios.post(`${API}/api/posts/${post._id}/like`, { actorId: actor.id });
    } catch {
      onUpdate({ likes: saves });
    }
  };
  return { saved, toggleSave };
}

/* ── one Instagram-style post: header (avatar + name), full media, actions ── */
function FeedPost({ post, actor, onUpdate }) {
  const { saved, toggleSave } = useSaveToggle(post, actor, onUpdate);

  const handleShare = () => {
    const url = `${window.location.origin}/feed`;
    if (navigator.share) {
      navigator.share({ title: post.artistName || "ArtSpire", url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
    }
  };

  return (
    <div style={styles.post}>
      <Link to={`/dashboard/${post.artistId}`} style={styles.postHeader}>
        {post.artistAvatar ? (
          <img src={post.artistAvatar} alt="" style={styles.avatar} />
        ) : (
          <div style={styles.avatarFallback}>{post.artistName?.[0]?.toUpperCase() || "?"}</div>
        )}
        <span style={styles.postName}>{post.artistName || "Unknown artist"}</span>
      </Link>

      <div style={styles.mediaWrap}>
        {post.mediaType === "video" ? (
          <video src={post.mediaUrl} style={styles.media} muted loop playsInline autoPlay />
        ) : (
          <img src={post.mediaUrl} alt={post.caption || "artwork"} style={styles.media} />
        )}
      </div>

      <div style={styles.postActions}>
        <button style={styles.actionBtn} onClick={toggleSave}>
          <HeartIcon size={22} filled={saved} />
        </button>
        <button style={styles.actionBtn} onClick={handleShare}>
          <ShareIcon size={20} />
        </button>
      </div>

      {post.caption && (
        <div style={styles.caption}>
          <span style={styles.captionName}>{post.artistName}</span> {post.caption}
        </div>
      )}
    </div>
  );
}

/* ── icons ────────────────────────────────────────────────────────────── */
function SearchIcon({ size = 18, stroke = "#1a1a1a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function HeartIcon({ size = 22, filled }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#D9662B" : "none"} stroke={filled ? "#D9662B" : "#fff"} strokeWidth="2" strokeLinejoin="round">
      <path d="M12 21s-7.5-4.9-10-9.3C.5 8.4 2 5 5.3 5c2 0 3.4 1.1 4.7 2.7C11.3 6.1 12.7 5 14.7 5 18 5 19.5 8.4 22 11.7 19.5 16.1 12 21 12 21z" />
    </svg>
  );
}
function ShareIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M16 6l-4-4-4 4" /><path d="M12 2v14" />
    </svg>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    `}</style>
  );
}

const INK = "#0B0F1A";
const SURFACE = "#131B2C";
const CLAY = "#D9662B";
const MUTE = "#8291AC";

const styles = {
  page: { fontFamily: "'Inter', sans-serif", background: INK, minHeight: "100vh", color: "#fff" },

  toast: {
    position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 200,
    background: SURFACE, color: "#fff", padding: "10px 18px", borderRadius: 999,
    fontSize: 13, fontWeight: 600, boxShadow: "0 6px 20px rgba(0,0,0,0.4)", cursor: "pointer",
    maxWidth: "88vw", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)",
  },

  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  brandName: { fontWeight: 800, fontSize: 20, color: "#fff" },
  searchIconBtn: { background: "none", border: "none", cursor: "pointer", padding: 6 },

  feedCol: { maxWidth: 480, margin: "0 auto", padding: "0 0 12px" },
  comingSoon: { textAlign: "center", color: MUTE, padding: "60px 20px", fontWeight: 600 },

  post: { borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10 },
  postHeader: { display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", textDecoration: "none" },
  avatar: { width: 34, height: 34, borderRadius: "50%", objectFit: "cover" },
  avatarFallback: {
    width: 34, height: 34, borderRadius: "50%", background: CLAY, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0,
  },
  postName: { fontWeight: 700, fontSize: 14, color: "#fff" },

  mediaWrap: { width: "100%", background: "#1a2233" },
  media: { width: "100%", maxHeight: 560, display: "block", objectFit: "cover" },

  postActions: { display: "flex", gap: 16, padding: "10px 12px 4px" },
  actionBtn: { background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" },

  caption: { padding: "0 12px", fontSize: 13.5, color: "#e5e7eb", lineHeight: 1.4 },
  captionName: { fontWeight: 700, color: "#fff", marginRight: 4 },

  loadMoreBtn: {
    display: "block", margin: "10px auto 0", padding: "11px 28px", borderRadius: 999,
    border: `1px solid ${CLAY}`, background: "transparent", fontWeight: 700, fontSize: 13, color: CLAY, cursor: "pointer",
  },

  searchDock: {
    position: "fixed", bottom: 64, left: 0, right: 0, zIndex: 40,
    display: "flex", alignItems: "center", gap: 10, background: SURFACE,
    borderTop: "1px solid rgba(255,255,255,0.08)", padding: "10px 14px",
  },
  searchDockInput: {
    flex: 1, border: "1px solid rgba(255,255,255,0.12)", outline: "none", borderRadius: 999,
    padding: "9px 14px", fontSize: 13.5, color: "#fff", background: "rgba(255,255,255,0.05)",
  },
  searchDockAction: {
    flexShrink: 0, background: CLAY, color: "#fff", border: "none", borderRadius: 999,
    padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
  },
};