// artspire-frontend/src/pages/Home.jsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { getCurrentAccount, isArtist } from "../utils/auth";
import BottomNav from "../BottomNav";
import socket from "../socket";
import PostRequestModal from "../components/PostRequestModal";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

// Looping hero video — served from public/artbg.mp4, same as your old homepage.
const HERO_VIDEO_URL = "/artbg.mp4";

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

// Wraps the browser geolocation callback API in a promise so we can await it.
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
  const [locating, setLocating] = useState(false);
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

  // Live-append newly approved posts the moment admin approves something.
  useEffect(() => {
    const onApproved = (post) => {
      setPosts((prev) => (prev.some((p) => p._id === post._id) ? prev : [post, ...prev]));
    };
    socket.on("post_approved", onApproved);
    return () => socket.off("post_approved", onApproved);
  }, []);

  // Live-remove posts an artist deletes.
  useEffect(() => {
    const onDeleted = ({ postId }) => {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    };
    socket.on("post_deleted", onDeleted);
    return () => socket.off("post_deleted", onDeleted);
  }, []);

  // Re-sync page 1 on reconnect (e.g. backend cold-start), merging so
  // "Load more" results aren't lost.
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

  // ── Live request notifications: join a personal room so artists get
  // pushed "new request near you" instantly, and requesters get pushed
  // "an artist responded" instantly. No polling needed.
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

  // Artists silently share a fresh location fix so they show up in nearby
  // request matching.
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

  // Live geolocation lookup — asks the browser for the user's real coordinates,
  // then sends them to the Artists page to sort/filter by distance.
  const handleNearYou = () => {
    if (!navigator.geolocation) {
      navigate("/artists");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        navigate(`/artists?lat=${latitude}&lng=${longitude}&near=true`);
      },
      () => {
        setLocating(false);
        navigate("/artists");
      },
      { timeout: 6000 }
    );
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
        <div style={styles.toast} onClick={() => setToast(null)}>
          🔔 {toast}
        </div>
      )}

      {/* ══ Top bar ══ */}
      <div style={styles.topBar}>
        <div style={styles.brand}>
          <span style={styles.brandMark}>A</span>
          <span style={styles.brandName}>ArtSpire</span>
        </div>
        {/* Search icon now takes you to the dedicated Search/Discover page
            (hero + Post & Find), instead of toggling an inline search bar. */}
        <button
          style={styles.searchIconBtn}
          onClick={() => navigate("/search")}
          aria-label="Search"
        >
          <SearchIcon size={18} stroke="#1a1a1a" />
        </button>
      </div>

      {/* ══ Section label ══ */}
      <div style={styles.tabsRow}>
        <span style={{ ...styles.tabBtn, ...styles.tabBtnActive }}>For You</span>
      </div>

      {/* ══ Hero banner ══ */}
      <div style={styles.hero}>
        <video style={styles.heroMedia} src={HERO_VIDEO_URL} autoPlay loop muted playsInline />
        <div style={styles.heroOverlay} />
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            Discover
            <br />
            <span style={{ color: "#f97316" }}>Creative Artists</span>
            <br />
            Near You
          </h1>
          <div style={styles.heroBtnRow}>
            <button style={styles.heroBtn} onClick={() => navigate("/artists")}>
              Explore Artists
            </button>
            <button style={styles.heroBtn} onClick={() => navigate("/artist-register")}>
              Join As Artist
            </button>
            <button style={styles.heroBtn} onClick={handleNearYou} disabled={locating}>
              {locating ? "Locating…" : "Near You"}
            </button>
          </div>
        </div>
      </div>

      {/* ══ Live feed grid — real posts artists have made, pulled from the API ══ */}
      <div style={styles.feedCol}>
        {visiblePosts.length === 0 && !loading && (
          <div style={styles.comingSoon}>
            <div style={{ fontSize: 34 }}>🖼️</div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>
              {q ? "No matches found." : "No posts yet."}
            </div>
            <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>
              {q ? "Try a different search term." : "New work from artists will show up here as soon as it's approved."}
            </div>
          </div>
        )}

        <div className="discover-grid">
          {visiblePosts.map((p) => (
            <DiscoverCard
              key={p._id}
              post={p}
              actor={actor}
              onUpdate={(patch) => updatePost(p._id, patch)}
              onOpen={() => navigate("/feed")}
            />
          ))}
        </div>

        {!q && hasMore && (
          <button style={styles.loadMoreBtn} onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>

      {/* ══ Fixed search-and-post bar, sits above the bottom nav.
          This filters the posts already loaded on this page — separate
          from the top-right icon, which jumps to the dedicated /search page. ══ */}
      <div style={{ height: 66 }} />
      <div style={styles.searchDock}>
        <SearchIcon size={16} stroke="#6b7280" />
        <input
          style={styles.searchDockInput}
          placeholder="Search for artwork, artists, or a request…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" style={styles.searchDockAction} onClick={() => setShowPostModal(true)} aria-label="Post a request">
          <PlusIcon />
        </button>
      </div>

      <div style={{ height: 96 }} />
      <BottomNav />

      {showPostModal && (
        <PostRequestModal actor={actor} onClose={() => setShowPostModal(false)} />
      )}
    </div>
  );
}

/* ── save (like) toggle, reuses the existing like endpoint ──────────────── */
function useSaveToggle(post, actor, onUpdate) {
  const saves = post.likes || [];
  const saved = actor ? saves.includes(actor.id) : false;
  const toggleSave = async (e) => {
    e?.stopPropagation();
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

/* ── card matching the mockup: avatar/name/Save strip, media, share/more ── */
function DiscoverCard({ post, actor, onUpdate, onOpen }) {
  const { saved, toggleSave } = useSaveToggle(post, actor, onUpdate);

  const handleShare = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/feed`;
    if (navigator.share) {
      navigator.share({ title: post.artistName || "ArtSpire", url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
    }
  };

  return (
    <div className="discover-card" onClick={onOpen}>
      <div style={styles.cardTopRow}>
        <Link
          to={`/dashboard/${post.artistId}`}
          style={styles.cardArtist}
          onClick={(e) => e.stopPropagation()}
        >
          {post.artistAvatar ? (
            <img src={post.artistAvatar} alt="" style={styles.cardAvatar} />
          ) : (
            <div style={styles.cardAvatarFallback}>{post.artistName?.[0]?.toUpperCase() || "?"}</div>
          )}
          <span style={styles.cardArtistName}>{post.artistName || "Unknown artist"}</span>
        </Link>
        <button
          style={{ ...styles.saveBtn, ...(saved ? styles.saveBtnActive : {}) }}
          onClick={toggleSave}
        >
          <BookmarkIcon size={11} filled={saved} />
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      <div style={styles.cardMediaWrap}>
        {post.mediaType === "video" ? (
          <video src={post.mediaUrl} style={styles.cardMedia} muted loop playsInline autoPlay />
        ) : (
          <img src={post.mediaUrl} alt={post.caption || "artwork"} style={styles.cardMedia} />
        )}
      </div>

      <div style={styles.cardBottomRow}>
        <button style={styles.cardActionBtn} onClick={handleShare}>
          <ShareIcon size={13} /> Share
        </button>
        <button style={styles.cardActionBtn} onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          <DotsIcon size={13} /> More
        </button>
      </div>
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
function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function BookmarkIcon({ size = 12, filled }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#f97316" : "none"} stroke={filled ? "#f97316" : "#1a1a1a"} strokeWidth="2" strokeLinejoin="round">
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
    </svg>
  );
}
function ShareIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M16 6l-4-4-4 4" /><path d="M12 2v14" />
    </svg>
  );
}
function DotsIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#4b5563">
      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
    </svg>
  );
}

/* ── global CSS: masonry grid ─────────────────────────────────────────── */
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,600&display=swap');

      .discover-grid {
        column-count: 2;
        column-gap: 12px;
        width: 100%;
      }
      @media (min-width: 560px) { .discover-grid { column-count: 3; } }
      @media (min-width: 860px) { .discover-grid { column-count: 4; } }
      @media (min-width: 1180px) { .discover-grid { column-count: 5; } }

      .discover-card {
        break-inside: avoid;
        margin-bottom: 12px;
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(0,0,0,0.25);
      }
    `}</style>
  );
}

const styles = {
  page: { fontFamily: "'Nunito','Inter',sans-serif", background: "#081120", minHeight: "100vh", color: "#fff" },

  toast: {
    position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 200,
    background: "#111827", color: "#fff", padding: "10px 18px", borderRadius: 999,
    fontSize: 13, fontWeight: 700, boxShadow: "0 6px 20px rgba(0,0,0,0.4)", cursor: "pointer",
    maxWidth: "88vw", textAlign: "center",
  },

  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 18px 4px", background: "#fff",
  },
  brand: { display: "flex", alignItems: "center", gap: 8 },
  brandMark: {
    width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#f97316,#ec4899)",
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14,
  },
  brandName: { fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic", fontWeight: 700, fontSize: 19, color: "#1a1a1a" },
  searchIconBtn: { background: "none", border: "none", cursor: "pointer", padding: 6 },

  tabsRow: { display: "flex", gap: 22, padding: "6px 18px 14px", background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.06)" },
  tabBtn: { background: "none", border: "none", padding: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#9ca3af", cursor: "pointer", borderBottom: "2px solid transparent" },
  tabBtnActive: { color: "#1a1a1a", borderBottom: "2px solid #1a1a1a" },

  hero: {
    position: "relative", margin: 0, borderRadius: 0, overflow: "hidden",
    minHeight: 340, display: "flex", alignItems: "flex-end",
  },
  heroMedia: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" },
  heroOverlay: { position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.15))" },
  heroContent: { position: "relative", padding: "18px 18px 20px", width: "100%" },
  heroTitle: { margin: 0, fontSize: 26, fontWeight: 900, lineHeight: 1.15, color: "#fff" },
  heroBtnRow: { display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" },
  heroBtn: { background: "#f97316", color: "#fff", border: "none", borderRadius: 999, padding: "9px 18px", fontWeight: 800, fontSize: 12.5, cursor: "pointer" },

  feedCol: { maxWidth: 1400, margin: "0 auto", padding: "18px 12px 0" },
  comingSoon: { textAlign: "center", color: "#94a3b8", padding: "50px 20px", fontWeight: 600 },

  cardTopRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 8px 6px", gap: 6 },
  cardArtist: { display: "flex", alignItems: "center", gap: 6, minWidth: 0, textDecoration: "none" },
  cardAvatar: { width: 20, height: 20, borderRadius: "50%", objectFit: "cover" },
  cardAvatarFallback: { width: 20, height: 20, borderRadius: "50%", background: "#f97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 },
  cardArtistName: { fontSize: 11.5, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  saveBtn: {
    display: "flex", alignItems: "center", gap: 4, background: "#fff7ed", border: "1px solid #fed7aa",
    borderRadius: 999, padding: "3px 9px", fontSize: 10.5, fontWeight: 800, color: "#ea580c", cursor: "pointer", flexShrink: 0,
  },
  saveBtnActive: { background: "#f97316", border: "1px solid #f97316", color: "#fff" },

  cardMediaWrap: { width: "100%", background: "#e5e0d5" },
  cardMedia: { width: "100%", display: "block", objectFit: "cover" },

  cardBottomRow: { display: "flex", gap: 14, padding: "8px 10px 10px" },
  cardActionBtn: { display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", fontSize: 11, fontWeight: 700, color: "#4b5563", cursor: "pointer", padding: 0 },

  loadMoreBtn: { display: "block", margin: "6px auto 0", padding: "10px 26px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", fontWeight: 700, color: "#f97316", cursor: "pointer" },

  searchDock: {
    position: "fixed", bottom: 64, left: 0, right: 0, zIndex: 40,
    display: "flex", alignItems: "center", gap: 8, background: "#0f1a2e",
    borderTop: "1px solid rgba(255,255,255,0.08)", padding: "10px 14px",
  },
  searchDockInput: { flex: 1, border: "1px solid rgba(255,255,255,0.12)", outline: "none", borderRadius: 999, padding: "9px 14px", fontSize: 13.5, color: "#fff", background: "rgba(255,255,255,0.06)" },
  searchDockAction: { width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#f97316,#ec4899)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 },
};