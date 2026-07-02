// artspire-frontend/src/pages/Feed.jsx

import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { getCurrentAccount, isArtist, getToken } from "../utils/auth";
import Navbar from "../Navbar";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";
const fmt = (n) => Number(n).toLocaleString("en-IN");

// Where an artist's name/avatar should link to.
// Currently set to their dashboard — change this one line if that ever needs to be a public profile instead.
const artistLink = (artistId) => `/dashboard/${artistId}`;

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

/* ═══════════════════════════════════════════════════════════════════════
   FeedGrid — reusable masonry grid of posts. Used standalone on the Home
   page (with a search box + custom empty hint) and embedded in the full
   Feed page below.
   ═══════════════════════════════════════════════════════════════════════ */
export function FeedGrid({ searchQuery = "", emptyHint = "" }) {
  const actor = getActor();
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [viewersModalPostId, setViewersModalPostId] = useState(null);
  const [openPostId, setOpenPostId] = useState(null);

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

  // Live-append newly approved posts (of any media type) so the grid
  // updates in real time the moment admin approves something.
  useEffect(() => {
    const onApproved = (post) => {
      setPosts((prev) => (prev.some(p => p._id === post._id) ? prev : [post, ...prev]));
    };
    socket.on("post_approved", onApproved);
    return () => socket.off("post_approved", onApproved);
  }, []);

  // If an artist deletes one of their own approved posts, remove it live
  // from everyone's grid too.
  useEffect(() => {
    const onDeleted = ({ postId }) => {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    };
    socket.on("post_deleted", onDeleted);
    return () => socket.off("post_deleted", onDeleted);
  }, []);

  // If the socket drops (e.g. backend cold-starts on Render) and reconnects,
  // silently re-fetch page 1 so anything approved while disconnected still
  // shows up. Merge rather than replace so "Load more" results aren't lost.
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

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPage(next);
  };

  const updatePost = (id, patch) => {
    setPosts((prev) => prev.map((p) => (p._id === id ? { ...p, ...patch } : p)));
  };

  const q = searchQuery.trim().toLowerCase();
  const visiblePosts = q
    ? posts.filter((p) =>
        (p.caption || "").toLowerCase().includes(q) ||
        (p.artistName || "").toLowerCase().includes(q)
      )
    : posts;

  const openPost = visiblePosts.find((p) => p._id === openPostId) || null;

  return (
    <div>
      <MasonryStyles />

      {visiblePosts.length === 0 && !loading && (
        <div style={styles.empty}>
          <div style={{ fontSize: 40 }}>🖼️</div>
          <div>{q ? "No matches found." : "No posts yet."}</div>
          <div style={{ fontSize: 13, opacity: 0.6, marginTop: 6 }}>
            {q
              ? "Try a different search term."
              : emptyHint || (actor?.role === "artist"
                  ? "Submit work samples from your Dashboard to have them appear here."
                  : "Check back soon — artists are just getting started.")}
          </div>
        </div>
      )}

      <div className="pin-grid">
        {visiblePosts.map((p) => (
          <PinCard
            key={p._id}
            post={p}
            actor={actor}
            onUpdate={(patch) => updatePost(p._id, patch)}
            onOpen={() => setOpenPostId(p._id)}
          />
        ))}
      </div>

      {!q && hasMore && (
        <button style={styles.loadMoreBtn} onClick={loadMore} disabled={loading}>
          {loading ? "Loading…" : "Load more"}
        </button>
      )}

      {openPost && (
        <PinModal
          post={openPost}
          actor={actor}
          onUpdate={(patch) => updatePost(openPost._id, patch)}
          onClose={() => setOpenPostId(null)}
          onShowViewers={() => { setViewersModalPostId(openPost._id); }}
        />
      )}

      {viewersModalPostId && (
        <ViewersModal
          postId={viewersModalPostId}
          artistId={actor?.id}
          onClose={() => setViewersModalPostId(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Feed — the standalone /feed page. Wraps FeedGrid with the Navbar and
   page header.
   ═══════════════════════════════════════════════════════════════════════ */
export default function Feed() {
  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.header}>
        <h1 style={styles.title}>Portfolio <span style={{ color: "#f97316" }}>Feed</span></h1>
      </div>

      <div style={styles.feedCol}>
        <FeedGrid />
      </div>
    </div>
  );
}

/* ── fires a view once a post has been visible for a moment ─────────────── */
function useViewTracking(post, actor, onUpdate, elRef) {
  const hasFiredView = useRef(false);
  useEffect(() => {
    if (!actor || hasFiredView.current) return;
    const el = elRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasFiredView.current) {
            hasFiredView.current = true;
            axios
              .post(`${API}/api/posts/${post._id}/view`, {
                userId: actor.id,
                userName: actor.name,
                userRole: actor.role,
              })
              .then(({ data }) => {
                if (typeof data?.viewCount === "number") {
                  onUpdate({ views: Array.from({ length: data.viewCount }) }); // just for count display
                }
              })
              .catch(() => {});
            observer.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [actor, post._id, onUpdate, elRef]);
}

/* ── shared like handler ─────────────────────────────────────────────────── */
function useLikeToggle(post, actor, onUpdate) {
  const likes = post.likes || [];
  const liked = actor ? likes.includes(actor.id) : false;
  const toggleLike = async (e) => {
    e?.stopPropagation();
    if (!actor) return alert("Log in to like posts.");
    const nextLikes = liked ? likes.filter((id) => id !== actor.id) : [...likes, actor.id];
    onUpdate({ likes: nextLikes });
    try {
      await axios.post(`${API}/api/posts/${post._id}/like`, { actorId: actor.id });
    } catch {
      onUpdate({ likes });
    }
  };
  return { liked, likes, toggleLike };
}

/* ── Pinterest-style grid card ───────────────────────────────────────────── */
function PinCard({ post, actor, onUpdate, onOpen }) {
  const cardRef = useRef(null);
  const [hovering, setHovering] = useState(false);
  const { liked, likes, toggleLike } = useLikeToggle(post, actor, onUpdate);
  useViewTracking(post, actor, onUpdate, cardRef);

  const comments = post.comments || [];
  const views = post.views || [];
  const isOwner = actor?.role === "artist" && String(post.artistId) === String(actor.id);

  return (
    <div
      ref={cardRef}
      className="pin"
      onClick={onOpen}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {post.mediaType === "video" ? (
        <video
          src={post.mediaUrl}
          style={styles.pinMedia}
          muted
          loop
          playsInline
          autoPlay={hovering}
        />
      ) : (
        <img src={post.mediaUrl} alt={post.caption} style={styles.pinMedia} />
      )}

      {post.mediaType === "video" && !hovering && (
        <div style={styles.playBadge}>▶</div>
      )}

      <div style={{ ...styles.pinOverlay, opacity: hovering ? 1 : 0 }}>
        <div style={styles.pinOverlayTop}>
          <button style={styles.pinLikeBtn} onClick={toggleLike}>
            {liked ? "❤️" : "🤍"} {fmt(likes.length)}
          </button>
          {isOwner && (
            <button
              style={styles.pinSeenBtn}
              onClick={(e) => { e.stopPropagation(); onOpen(); }}
            >
              👁 {fmt(views.length)}
            </button>
          )}
        </div>

        <Link
          to={artistLink(post.artistId)}
          onClick={(e) => e.stopPropagation()}
          style={styles.pinArtistStrip}
        >
          {post.artistAvatar
            ? <img src={post.artistAvatar} alt="" style={styles.pinAvatar} />
            : <div style={styles.pinAvatarFallback}>{post.artistName?.[0]?.toUpperCase() || "?"}</div>}
          <span style={styles.pinArtistName}>{post.artistName || "Unknown artist"}</span>
          <span style={styles.pinCommentCount}>💬 {fmt(comments.length)}</span>
        </Link>
      </div>
    </div>
  );
}

/* ── Full pin detail modal (Pinterest-style expand) ──────────────────────── */
function PinModal({ post, actor, onUpdate, onClose, onShowViewers }) {
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);
  const { liked, likes, toggleLike } = useLikeToggle(post, actor, onUpdate);

  const comments = post.comments || [];
  const views = post.views || [];
  const isOwner = actor?.role === "artist" && String(post.artistId) === String(actor.id);

  const submitComment = async (e) => {
    e.preventDefault();
    if (!actor) return alert("Log in to comment.");
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/api/posts/${post._id}/comment`, {
        userId: actor.id, userName: actor.name, userRole: actor.role, text: commentText.trim(),
      });
      onUpdate({ comments: [...comments, data] });
      setCommentText("");
    } catch {
      alert("Couldn't post comment, try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.pinModalOverlay} onClick={onClose}>
      <div style={styles.pinModalBox} onClick={(e) => e.stopPropagation()}>
        <button style={styles.pinModalClose} onClick={onClose}>✕</button>

        <div style={styles.pinModalMedia}>
          {post.mediaType === "video"
            ? <video src={post.mediaUrl} controls autoPlay style={styles.pinModalMediaEl} />
            : <img src={post.mediaUrl} alt={post.caption} style={styles.pinModalMediaEl} />}
        </div>

        <div style={styles.pinModalSide}>
          <Link to={artistLink(post.artistId)} style={styles.postHead}>
            {post.artistAvatar
              ? <img src={post.artistAvatar} alt="" style={styles.avatar} />
              : <div style={styles.avatarFallback}>{post.artistName?.[0]?.toUpperCase() || "?"}</div>}
            <strong style={{ fontSize: 14, color: "#fff" }}>{post.artistName || "Unknown artist"}</strong>
          </Link>

          <div style={styles.actionsRow}>
            <button style={styles.iconBtn} onClick={toggleLike}>
              {liked ? "❤️" : "🤍"} {fmt(likes.length)}
            </button>
            <span style={styles.viewCount}>👁 {fmt(views.length)}</span>
            {isOwner && (
              <button style={styles.seenByBtn} onClick={onShowViewers}>
                Seen by {fmt(views.length)}
              </button>
            )}
          </div>

          {post.caption && (
            <div style={styles.caption}><strong>{post.artistName}</strong> {post.caption}</div>
          )}

          <div style={styles.commentsScroll}>
            {comments.map((c, i) => (
              <div key={c._id || i} style={styles.comment}><strong>{c.userName}</strong> {c.text}</div>
            ))}
            {comments.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: 13, padding: "8px 0" }}>No comments yet.</div>
            )}
          </div>

          <form style={styles.commentForm} onSubmit={submitComment}>
            <input
              style={styles.commentInput}
              placeholder={actor ? "Add a comment…" : "Log in to comment"}
              value={commentText}
              disabled={!actor || busy}
              onChange={(e) => setCommentText(e.target.value)}
            />
            {commentText.trim() && <button type="submit" style={styles.postBtn} disabled={busy}>Post</button>}
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Viewers modal (artist-only, shows who saw a post) ─────────────────── */
function ViewersModal({ postId, artistId, onClose }) {
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/api/posts/${postId}/views`, { params: { artistId } })
      .then(({ data }) => setViews(Array.isArray(data?.views) ? data.views : []))
      .catch(() => setError("Couldn't load viewers."))
      .finally(() => setLoading(false));
  }, [postId, artistId]);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <strong>Seen by</strong>
          <button style={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div style={styles.modalBody}>
          {loading && <div style={{ color: "#94a3b8", padding: "20px 0", textAlign: "center" }}>Loading…</div>}
          {error && <div style={{ color: "#f87171", padding: "20px 0", textAlign: "center" }}>{error}</div>}
          {!loading && !error && views.length === 0 && (
            <div style={{ color: "#94a3b8", padding: "20px 0", textAlign: "center" }}>No views yet.</div>
          )}
          {views
            .slice()
            .sort((a, b) => new Date(b.viewedAt) - new Date(a.viewedAt))
            .map((v, i) => (
              <div key={v.userId + i} style={styles.viewerRow}>
                <div style={styles.viewerAvatar}>{v.userName?.[0]?.toUpperCase() || "?"}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{v.userName || "Unknown"}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{v.userRole === "artist" ? "Artist" : "User"}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ── masonry grid CSS (column-based, responsive down to mobile) ─────────── */
function MasonryStyles() {
  return (
    <style>{`
      .pin-grid {
        column-count: 2;
        column-gap: 10px;
        width: 100%;
      }
      @media (min-width: 560px) {
        .pin-grid { column-count: 3; column-gap: 12px; }
      }
      @media (min-width: 860px) {
        .pin-grid { column-count: 4; }
      }
      @media (min-width: 1180px) {
        .pin-grid { column-count: 5; }
      }
      .pin {
        break-inside: avoid;
        -webkit-column-break-inside: avoid;
        margin-bottom: 10px;
        border-radius: 16px;
        overflow: hidden;
        position: relative;
        cursor: pointer;
        background: rgba(255,255,255,0.04);
      }
      @media (min-width: 560px) {
        .pin { margin-bottom: 12px; }
      }
    `}</style>
  );
}

/* ── styles ────────────────────────────────────────────────────────────── */
const styles = {
  page:        { fontFamily: "'Nunito','Inter',sans-serif", background: "#081120", minHeight: "100vh", paddingBottom: 40, color: "#fff" },
  header:      { padding: "130px 20px 16px", maxWidth: 1400, margin: "0 auto" },
  title:       { fontSize: 24, fontWeight: 900, color: "#fff", margin: 0 },
  feedCol:     { maxWidth: 1400, margin: "0 auto", padding: "0 12px", display: "flex", flexDirection: "column", gap: 16 },
  empty:       { textAlign: "center", color: "#94a3b8", padding: "60px 0", fontWeight: 600 },

  pinMedia:    { width: "100%", display: "block", objectFit: "cover" },
  playBadge:   { position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.55)", color: "#fff", width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 },
  pinOverlay:  { position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 10, background: "linear-gradient(to bottom, rgba(0,0,0,.45), transparent 30%, transparent 65%, rgba(0,0,0,.65))", transition: "opacity .15s ease" },
  pinOverlayTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  pinLikeBtn:  { background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: "pointer" },
  pinSeenBtn:  { background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 20, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#f97316", cursor: "pointer" },
  pinArtistStrip: { display: "flex", alignItems: "center", gap: 6, textDecoration: "none" },
  pinAvatar:   { width: 22, height: 22, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.5)" },
  pinAvatarFallback: { width: 22, height: 22, borderRadius: "50%", background: "#f97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 },
  pinArtistName: { fontSize: 12.5, fontWeight: 700, color: "#fff", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  pinCommentCount: { fontSize: 11.5, color: "#e2e8f0" },

  pinModalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 12 },
  pinModalBox: { background: "#0f1a2e", borderRadius: 16, width: "100%", maxWidth: 900, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" },
  pinModalClose: { position: "absolute", top: 10, right: 10, zIndex: 2, background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 30, height: 30, borderRadius: "50%", cursor: "pointer", fontSize: 15 },
  pinModalMedia: { background: "#000", maxHeight: "45vh", display: "flex", alignItems: "center", justifyContent: "center" },
  pinModalMediaEl: { width: "100%", maxHeight: "45vh", objectFit: "contain" },
  pinModalSide: { display: "flex", flexDirection: "column", padding: "14px 16px", overflow: "hidden", flex: 1, minHeight: 0 },
  commentsScroll: { flex: 1, overflowY: "auto", margin: "8px 0", minHeight: 40 },

  post:        { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, overflow: "hidden" },
  postHead:    { display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 6 },
  avatar:      { width: 32, height: 32, borderRadius: "50%", objectFit: "cover" },
  avatarFallback: { width: 32, height: 32, borderRadius: "50%", background: "#f97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 },
  actionsRow:  { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" },
  iconBtn:     { background: "none", border: "none", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" },
  viewCount:   { fontSize: 12.5, color: "#94a3b8", fontWeight: 600 },
  seenByBtn:   { marginLeft: "auto", background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", fontSize: 11.5, fontWeight: 700, color: "#f97316", cursor: "pointer" },
  caption:     { fontSize: 13.5, lineHeight: 1.5, color: "#e2e8f0", padding: "8px 0 0" },
  comment:     { fontSize: 13.5, color: "#e2e8f0", padding: "3px 0" },
  commentForm: { display: "flex", gap: 8, alignItems: "center", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.1)" },
  commentInput:{ flex: 1, border: "none", outline: "none", fontSize: 13.5, background: "transparent", color: "#fff" },
  postBtn:     { border: "none", background: "none", color: "#f97316", fontWeight: 700, fontSize: 13, cursor: "pointer" },

  loadMoreBtn: { padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", fontWeight: 700, color: "#f97316", cursor: "pointer" },

  modalOverlay:{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16 },
  modalBox:    { background: "#0f1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, width: "100%", maxWidth: 360, maxHeight: "70vh", display: "flex", flexDirection: "column" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  modalClose:  { background: "none", border: "none", color: "#94a3b8", fontSize: 16, cursor: "pointer" },
  modalBody:   { overflowY: "auto", padding: "8px 16px 16px" },
  viewerRow:   { display: "flex", alignItems: "center", gap: 10, padding: "8px 0" },
  viewerAvatar:{ width: 30, height: 30, borderRadius: "50%", background: "#f97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
};