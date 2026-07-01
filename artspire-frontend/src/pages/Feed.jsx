// artspire-frontend/src/pages/Feed.jsx

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import CreatePostModal from "../components/CreatePostModal";
import { getCurrentAccount, isArtist, getToken } from "../utils/auth";
import Navbar from "../Navbar";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";
const fmt = (n) => Number(n).toLocaleString("en-IN");

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

export default function Feed() {
  const actor = getActor();
  const [tab, setTab] = useState("feed");
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewersModalPostId, setViewersModalPostId] = useState(null);
  const [banner, setBanner] = useState(null); // e.g. "Submitted for review"

  const loadPage = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/posts/feed`, { params: { page: pageNum, limit: 10 } });
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

  // Live-append newly approved posts from anyone, so the feed updates in
  // real time the moment admin approves something — no refresh needed.
  useEffect(() => {
    const onApproved = (post) => {
      setPosts((prev) => (prev.some(p => p._id === post._id) ? prev : [post, ...prev]));
    };
    socket.on("post_approved", onApproved);
    return () => socket.off("post_approved", onApproved);
  }, []);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPage(next);
  };

  // A post the artist just created is PENDING — it isn't visible in the
  // public feed yet, so we don't add it to the list. It'll appear live
  // (for everyone, via the "post_approved" socket event above) once an
  // admin approves it.
  const onCreated = () => {
    setCreateOpen(false);
    setBanner("Your post was submitted and is awaiting admin review. It'll appear in the Feed once approved.");
    setTimeout(() => setBanner(null), 6000);
  };

  const reels = posts.filter((p) => p.mediaType === "video");
  const list = tab === "reels" ? reels : posts;

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.header}>
        <h1 style={styles.title}>Portfolio <span style={{ color: "#f97316" }}>Feed</span></h1>
        <div style={styles.tabs}>
          <button style={{ ...styles.tabBtn, ...(tab === "feed" ? styles.tabActive : {}) }} onClick={() => setTab("feed")}>
            Feed
          </button>
          <button style={{ ...styles.tabBtn, ...(tab === "reels" ? styles.tabActive : {}) }} onClick={() => setTab("reels")}>
            Reels
          </button>
        </div>
        {actor?.role === "artist" && (
          <button style={styles.newPostBtn} onClick={() => setCreateOpen(true)}>+ New Post</button>
        )}
      </div>

      {banner && (
        <div style={styles.banner}>
          ⏳ {banner}
        </div>
      )}

      <div style={styles.feedCol}>
        {list.length === 0 && !loading && (
          <div style={styles.empty}>
            <div style={{ fontSize: 40 }}>🖼️</div>
            <div>No {tab === "reels" ? "reels" : "posts"} yet.</div>
            <div style={{ fontSize: 13, opacity: 0.6, marginTop: 6 }}>
              {actor?.role === "artist" ? "Be the first to share your work." : "Check back soon — artists are just getting started."}
            </div>
          </div>
        )}

        {tab === "feed"
          ? list.map((p) => (
              <PostCard
                key={p._id}
                post={p}
                actor={actor}
                onUpdate={(patch) => updateOne(setPosts, p._id, patch)}
                onShowViewers={() => setViewersModalPostId(p._id)}
              />
            ))
          : list.map((p) => <ReelCard key={p._id} post={p} actor={actor} onUpdate={(patch) => updateOne(setPosts, p._id, patch)} />)
        }

        {tab === "feed" && hasMore && (
          <button style={styles.loadMoreBtn} onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>

      {createOpen && actor && (
        <CreatePostModal actor={actor} onClose={() => setCreateOpen(false)} onCreated={onCreated} apiBase={API} />
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

function updateOne(setPosts, id, patch) {
  setPosts((prev) => prev.map((p) => (p._id === id ? { ...p, ...patch } : p)));
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

/* ── Feed post card ─────────────────────────────────────────────────────── */
function PostCard({ post, actor, onUpdate, onShowViewers }) {
  const [commentText, setCommentText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef(null);
  const hasFiredView = useRef(false);

  const likes = post.likes || [];
  const comments = post.comments || [];
  const views = post.views || [];
  const liked = actor ? likes.includes(actor.id) : false;
  const isOwner = actor?.role === "artist" && String(post.artistId) === String(actor.id);

  // Fire a view once, when the card is at least 50% visible for a moment
  useEffect(() => {
    if (!actor || hasFiredView.current) return;
    const el = cardRef.current;
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
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [actor, post._id, onUpdate]);

  const toggleLike = async () => {
    if (!actor) return alert("Log in to like posts.");
    const nextLikes = liked ? likes.filter((id) => id !== actor.id) : [...likes, actor.id];
    onUpdate({ likes: nextLikes });
    try {
      await axios.post(`${API}/api/posts/${post._id}/like`, { actorId: actor.id });
    } catch {
      onUpdate({ likes });
    }
  };

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

  const visibleComments = expanded ? comments : comments.slice(-2);

  return (
    <article ref={cardRef} style={styles.post}>
      <div style={styles.postHead}>
        {post.artistAvatar
          ? <img src={post.artistAvatar} alt="" style={styles.avatar} />
          : <div style={styles.avatarFallback}>{post.artistName?.[0]?.toUpperCase() || "?"}</div>}
        <strong style={{ fontSize: 14 }}>{post.artistName || "Unknown artist"}</strong>
      </div>

      <div style={styles.mediaBox}>
        {post.mediaType === "video"
          ? <video src={post.mediaUrl} controls style={styles.media} />
          : <img src={post.mediaUrl} alt={post.caption} style={styles.media} onDoubleClick={toggleLike} />}
      </div>

      <div style={styles.actionsRow}>
        <button style={styles.iconBtn} onClick={toggleLike}>
          {liked ? "❤️" : "🤍"} {fmt(likes.length)}
        </button>
        <button style={styles.iconBtn} onClick={() => setExpanded((v) => !v)}>
          💬 {fmt(comments.length)}
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

      {comments.length > 2 && !expanded && (
        <button style={styles.viewComments} onClick={() => setExpanded(true)}>
          View all {comments.length} comments
        </button>
      )}
      {visibleComments.map((c, i) => (
        <div key={c._id || i} style={styles.comment}><strong>{c.userName}</strong> {c.text}</div>
      ))}

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
    </article>
  );
}

/* ── Reel card (vertical video) ─────────────────────────────────────────── */
function ReelCard({ post, actor, onUpdate }) {
  const videoRef = useRef(null);
  const likes = post.likes || [];
  const liked = actor ? likes.includes(actor.id) : false;

  const toggleLike = async () => {
    if (!actor) return alert("Log in to like reels.");
    const nextLikes = liked ? likes.filter((id) => id !== actor.id) : [...likes, actor.id];
    onUpdate({ likes: nextLikes });
    try {
      await axios.post(`${API}/api/posts/${post._id}/like`, { actorId: actor.id });
    } catch {
      onUpdate({ likes });
    }
  };

  return (
    <div style={styles.reel}>
      <video ref={videoRef} src={post.mediaUrl} style={styles.reelVideo} controls loop playsInline />
      <div style={styles.reelOverlay}>
        <div>
          <strong style={{ color: "#fff" }}>{post.artistName}</strong>
          <div style={{ color: "#fff", fontSize: 13, marginTop: 2 }}>{post.caption}</div>
        </div>
        <button style={styles.reelLikeBtn} onClick={toggleLike}>
          {liked ? "❤️" : "🤍"}<br /><span style={{ fontSize: 11 }}>{fmt(likes.length)}</span>
        </button>
      </div>
    </div>
  );
}

/* ── styles ────────────────────────────────────────────────────────────── */
const styles = {
  page:        { fontFamily: "'Nunito','Inter',sans-serif", background: "#081120", minHeight: "100vh", paddingBottom: 40, color: "#fff" },
  header:      { display: "flex", alignItems: "center", gap: 16, padding: "130px 20px 20px", flexWrap: "wrap", maxWidth: 520, margin: "0 auto" },
  title:       { fontSize: 24, fontWeight: 900, color: "#fff", margin: 0, flex: 1 },
  tabs:        { display: "flex", gap: 6 },
  tabBtn:      { padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", fontSize: 12, fontWeight: 700, color: "#cbd5e1", cursor: "pointer" },
  tabActive:   { background: "#f97316", color: "#fff", border: "1px solid #f97316" },
  newPostBtn:  { padding: "7px 14px", borderRadius: 8, border: "none", background: "#f97316", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  banner:      { maxWidth: 470, margin: "0 auto 14px", padding: "0 12px" },
  feedCol:     { maxWidth: 470, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, padding: "0 12px" },
  empty:       { textAlign: "center", color: "#94a3b8", padding: "60px 0", fontWeight: 600 },
  post:        { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, overflow: "hidden" },
  postHead:    { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" },
  avatar:      { width: 32, height: 32, borderRadius: "50%", objectFit: "cover" },
  avatarFallback: { width: 32, height: 32, borderRadius: "50%", background: "#f97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 },
  mediaBox:    { width: "100%", aspectRatio: "4/5", background: "rgba(255,255,255,0.04)" },
  media:       { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  actionsRow:  { display: "flex", gap: 16, alignItems: "center", padding: "10px 14px 0", flexWrap: "wrap" },
  iconBtn:     { background: "none", border: "none", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer" },
  viewCount:   { fontSize: 12.5, color: "#94a3b8", fontWeight: 600 },
  seenByBtn:   { marginLeft: "auto", background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 20, padding: "3px 10px", fontSize: 11.5, fontWeight: 700, color: "#f97316", cursor: "pointer" },
  caption:     { padding: "8px 14px 0", fontSize: 13.5, lineHeight: 1.5, color: "#e2e8f0" },
  viewComments:{ display: "block", padding: "4px 14px 0", color: "#94a3b8", fontSize: 13, background: "none", border: "none", cursor: "pointer", textAlign: "left" },
  comment:     { padding: "2px 14px 0", fontSize: 13.5, color: "#e2e8f0" },
  commentForm: { display: "flex", gap: 8, alignItems: "center", padding: "10px 14px 14px", borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 8 },
  commentInput:{ flex: 1, border: "none", outline: "none", fontSize: 13.5, background: "transparent", color: "#fff" },
  postBtn:     { border: "none", background: "none", color: "#f97316", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  loadMoreBtn: { padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", fontWeight: 700, color: "#f97316", cursor: "pointer" },
  reel:        { position: "relative", background: "#000", borderRadius: 14, overflow: "hidden", aspectRatio: "9/16" },
  reelVideo:   { width: "100%", height: "100%", objectFit: "cover" },
  reelOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: 14, background: "linear-gradient(transparent, rgba(0,0,0,.6))" },
  reelLikeBtn: { background: "rgba(255,255,255,.15)", border: "none", borderRadius: 10, padding: "6px 10px", cursor: "pointer", color: "#fff" },
  modalOverlay:{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 },
  modalBox:    { background: "#0f1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, width: "100%", maxWidth: 360, maxHeight: "70vh", display: "flex", flexDirection: "column" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" },
  modalClose:  { background: "none", border: "none", color: "#94a3b8", fontSize: 16, cursor: "pointer" },
  modalBody:   { overflowY: "auto", padding: "8px 16px 16px" },
  viewerRow:   { display: "flex", alignItems: "center", gap: 10, padding: "8px 0" },
  viewerAvatar:{ width: 30, height: 30, borderRadius: "50%", background: "#f97316", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
};