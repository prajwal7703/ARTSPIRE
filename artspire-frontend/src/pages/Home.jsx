// artspire-frontend/src/pages/Home.jsx
//
// Design system:
//   Ink      #0B0F1A   overlay tone on top of video
//   Surface  #131B2C   dock / glass panels
//   Paper    #F6F1E7   card mats (warm ivory, not stark white)
//   Clay     #D9662B   primary accent (burnt terracotta)
//   Mute     #8291AC   secondary text on dark
//   Charcoal #2B2420   text on paper
//   Display  Fraunces (italic)   — brand + gallery labels
//   Body     Inter                — UI text
//
// The video is now a fixed full-page background (not just a hero strip) —
// everything scrolls over it. Cards stay opaque (paper mat) for legibility;
// everything else is glassy/transparent so the video shows through.
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { getCurrentAccount, isArtist } from "../utils/auth";
import BottomNav from "../BottomNav";
import socket from "../socket";
import PostRequestModal from "../components/PostRequestModal";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";
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

function firstCategory(post) {
  if (Array.isArray(post.categories) && post.categories.length) return post.categories[0];
  if (typeof post.categories === "string" && post.categories.trim()) {
    return post.categories.split(",")[0].trim();
  }
  return post.category || "Art";
}

export default function Home() {
  const navigate = useNavigate();
  const actor = getActor();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
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

  const handleNearYou = () => {
    if (!navigator.geolocation) { navigate("/artists"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        navigate(`/artists?lat=${latitude}&lng=${longitude}&near=true`);
      },
      () => { setLocating(false); navigate("/artists"); },
      { timeout: 6000 }
    );
  };

  const categories = useMemo(() => {
    const set = new Set();
    posts.forEach((p) => set.add(firstCategory(p)));
    return ["All", ...Array.from(set).slice(0, 8)];
  }, [posts]);

  const q = query.trim().toLowerCase();
  const visiblePosts = posts.filter((p) => {
    const matchesQuery = q
      ? (p.caption || "").toLowerCase().includes(q) || (p.artistName || "").toLowerCase().includes(q)
      : true;
    const matchesCategory = activeCategory === "All" || firstCategory(p) === activeCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div style={styles.page}>
      <GlobalStyles />

      {/* ══ Fixed full-page video background ══ */}
      <video style={styles.bgVideo} src={HERO_VIDEO_URL} autoPlay loop muted playsInline />
      <div style={styles.bgOverlay} />

      {/* ══ Everything below scrolls over the video ══ */}
      <div style={styles.content}>
        {toast && (
          <div style={styles.toast} onClick={() => setToast(null)}>🔔 {toast}</div>
        )}

        {/* ══ Top bar — glassy, over the video ══ */}
        <div style={styles.topBar}>
          <div style={styles.brand}>
            <span style={styles.brandMark}>A</span>
            <span style={styles.brandName}>ArtSpire</span>
          </div>
          <button style={styles.searchIconBtn} onClick={() => navigate("/search")} aria-label="Search">
            <SearchIcon size={17} stroke="#fff" />
          </button>
        </div>

        {/* ══ Hero content ══ */}
        <div style={styles.hero}>
          <h1 style={styles.heroTitle}>
            Discover
            <br />
            <span style={styles.heroTitleAccent}>Creative Artists</span>
            <br />
            Near You
          </h1>

          <div style={styles.heroActions}>
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

        {/* ══ Category rail ══ */}
        <div style={styles.railWrap}>
          <div className="category-rail">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  ...styles.railChip,
                  ...(activeCategory === cat ? styles.railChipActive : {}),
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ══ Gallery wall ══ */}
        <div style={styles.feedCol}>
          {visiblePosts.length === 0 && !loading && (
            <div style={styles.comingSoon}>
              <div style={{ fontSize: 32 }}>🖼️</div>
              <div style={styles.comingSoonTitle}>
                {q || activeCategory !== "All" ? "Nothing here yet." : "Nothing posted yet."}
              </div>
              <div style={styles.comingSoonSub}>
                {q || activeCategory !== "All"
                  ? "Try a different search or category."
                  : "New posts from artists show up here as soon as they're approved."}
              </div>
            </div>
          )}

          <div className="gallery-grid">
            {visiblePosts.map((p) => (
              <GalleryCard
                key={p._id}
                post={p}
                actor={actor}
                onUpdate={(patch) => updatePost(p._id, patch)}
                onOpen={() => navigate("/feed")}
              />
            ))}
          </div>

          {!q && activeCategory === "All" && hasMore && (
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

/* ── artwork "matted" like a framed print, museum-label plate underneath ── */
function GalleryCard({ post, actor, onUpdate, onOpen }) {
  const { saved, toggleSave } = useSaveToggle(post, actor, onUpdate);
  const category = firstCategory(post);

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
    <div className="gallery-card" onClick={onOpen}>
      <div style={styles.mat}>
        <div style={styles.mediaWrap}>
          {post.mediaType === "video" ? (
            <video src={post.mediaUrl} style={styles.media} muted loop playsInline autoPlay />
          ) : (
            <img src={post.mediaUrl} alt={post.caption || "artwork"} style={styles.media} />
          )}
          <button
            style={{ ...styles.bookmarkBtn, ...(saved ? styles.bookmarkBtnActive : {}) }}
            onClick={toggleSave}
            aria-label={saved ? "Saved" : "Save"}
          >
            <BookmarkIcon size={13} filled={saved} />
          </button>
        </div>

        <div style={styles.plate}>
          <span style={styles.plateEyebrow}>{category}</span>
          <Link
            to={`/dashboard/${post.artistId}`}
            style={styles.plateArtistRow}
            onClick={(e) => e.stopPropagation()}
          >
            {post.artistAvatar ? (
              <img src={post.artistAvatar} alt="" style={styles.plateAvatar} />
            ) : (
              <div style={styles.plateAvatarFallback}>{post.artistName?.[0]?.toUpperCase() || "?"}</div>
            )}
            <span style={styles.plateArtistName}>{post.artistName || "Unknown artist"}</span>
          </Link>
          <button style={styles.plateShare} onClick={handleShare}>
            <ShareIcon size={12} /> Share
          </button>
        </div>
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
function BookmarkIcon({ size = 12, filled }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#D9662B" : "rgba(255,255,255,0.9)"} stroke={filled ? "#D9662B" : "#2B2420"} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
    </svg>
  );
}
function ShareIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#8291AC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M16 6l-4-4-4 4" /><path d="M12 2v14" />
    </svg>
  );
}

/* ── global CSS: fonts, masonry grid, category rail scroll ───────────────── */
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;1,500;1,600&family=Inter:wght@400;500;600;700;800&display=swap');

      .gallery-grid {
        column-count: 2;
        column-gap: 14px;
        width: 100%;
      }
      @media (min-width: 560px) { .gallery-grid { column-count: 3; } }
      @media (min-width: 860px) { .gallery-grid { column-count: 4; } }
      @media (min-width: 1180px) { .gallery-grid { column-count: 5; } }

      .gallery-card {
        break-inside: avoid;
        margin-bottom: 14px;
        cursor: pointer;
      }

      .category-rail {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding: 0 18px 2px;
        scrollbar-width: none;
      }
      .category-rail::-webkit-scrollbar { display: none; }
    `}</style>
  );
}

const CLAY = "#D9662B";
const SURFACE = "#131B2C";
const PAPER = "#F6F1E7";
const MUTE = "#8291AC";
const CHARCOAL = "#2B2420";

const styles = {
  page: { fontFamily: "'Inter', sans-serif", minHeight: "100vh", color: "#fff", position: "relative" },

  // Fixed, full-viewport video sits behind everything and never scrolls.
  bgVideo: {
    position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0,
  },
  bgOverlay: {
    position: "fixed", inset: 0, zIndex: 1,
    background: "linear-gradient(180deg, rgba(11,15,26,0.55) 0%, rgba(11,15,26,0.75) 40%, rgba(11,15,26,0.94) 78%, #0B0F1A 100%)",
  },

  content: { position: "relative", zIndex: 2, minHeight: "100vh" },

  toast: {
    position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 200,
    background: SURFACE, color: "#fff", padding: "10px 18px", borderRadius: 999,
    fontSize: 13, fontWeight: 600, boxShadow: "0 6px 20px rgba(0,0,0,0.4)", cursor: "pointer",
    maxWidth: "88vw", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)",
  },

  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 18px 0",
  },
  brand: { display: "flex", alignItems: "center", gap: 8 },
  brandMark: {
    width: 26, height: 26, borderRadius: 7, background: CLAY,
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, fontSize: 13, fontFamily: "'Fraunces', serif", fontStyle: "italic",
  },
  brandName: { fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 19, color: "#fff" },
  searchIconBtn: {
    background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%",
    width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  },

  hero: { padding: "48px 18px 26px" },
  heroTitle: { margin: 0, fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 32, lineHeight: 1.18, color: "#fff" },
  heroTitleAccent: { color: CLAY, fontStyle: "italic" },

  heroActions: { display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" },
  heroBtn: {
    background: CLAY, color: "#fff", border: "none", borderRadius: 999, padding: "10px 20px",
    fontWeight: 700, fontSize: 13, cursor: "pointer",
  },

  railWrap: { paddingTop: 6, paddingBottom: 4 },
  railChip: {
    flex: "0 0 auto", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 999, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, color: MUTE, cursor: "pointer",
    whiteSpace: "nowrap",
  },
  railChipActive: { background: CLAY, borderColor: CLAY, color: "#fff" },

  feedCol: { maxWidth: 1400, margin: "0 auto", padding: "18px 12px 0" },
  comingSoon: { textAlign: "center", color: MUTE, padding: "60px 20px" },
  comingSoonTitle: { fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 18, color: "#fff", marginTop: 10 },
  comingSoonSub: { fontSize: 13, marginTop: 6 },

  mat: { background: PAPER, borderRadius: 14, padding: 8, boxShadow: "0 4px 18px rgba(0,0,0,0.35)" },
  mediaWrap: { position: "relative", width: "100%", borderRadius: 8, overflow: "hidden", background: "#E4DCC8" },
  media: { width: "100%", display: "block", objectFit: "cover" },
  bookmarkBtn: {
    position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%",
    background: "rgba(11,15,26,0.35)", border: "none", display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", backdropFilter: "blur(3px)",
  },
  bookmarkBtnActive: { background: "rgba(255,255,255,0.9)" },

  plate: { padding: "9px 4px 2px" },
  plateEyebrow: {
    display: "block", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
    color: "#A9885F", marginBottom: 5,
  },
  plateArtistRow: { display: "flex", alignItems: "center", gap: 6, textDecoration: "none", minWidth: 0 },
  plateAvatar: { width: 18, height: 18, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  plateAvatarFallback: {
    width: 18, height: 18, borderRadius: "50%", background: CLAY, color: "#fff", display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: 8.5, fontWeight: 700, flexShrink: 0,
  },
  plateArtistName: {
    fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 600, fontSize: 13, color: CHARCOAL,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  plateShare: {
    display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", marginTop: 7,
    fontSize: 10.5, fontWeight: 600, color: "#8291AC", cursor: "pointer", padding: 0,
  },

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