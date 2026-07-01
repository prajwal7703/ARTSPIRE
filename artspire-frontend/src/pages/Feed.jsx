// artspire-frontend/src/pages/Feed.jsx
// A NEW public page: anyone can browse, only logged-in artists/users can like & comment.
// Add to App.jsx:  <Route path="/feed" element={<Feed />} />
// Link it from your main navbar (e.g. next to "Browse Artists").

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import CreatePostModal from "../components/CreatePostModal";
import { getCurrentAccount, isArtist, getToken } from "../utils/auth";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";
const fmt = (n) => Number(n).toLocaleString("en-IN");

// pulls from your real auth.js instead of reading localStorage directly
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
  const [tab, setTab] = useState("feed"); // "feed" | "reels"
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

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

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPage(next);
  };

  const onCreated = (post) => {
    setPosts((prev) => [post, ...prev]);
    setCreateOpen(false);
  };

  const reels = posts.filter((p) => p.mediaType === "video");
  const list = tab === "reels" ? reels : posts;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Portfolio Feed</h1>
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

      <div style={styles.feedCol}>
        {list.length === 0 && !loading && (
          <div style={styles.empty}>
            <div style={{ fontSize: 40 }}>🖼️</div>
            <div>No {tab === "reels" ? "reels" : "posts"} yet.</div>
          </div>
        )}

        {tab === "feed"
          ? list.map((p) => <PostCard key={p._id} post={p} actor={actor} onUpdate={(patch) => updateOne(setPosts, p._id, patch)} />)
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
    </div>
  );
}

function updateOne(setPosts, id, patch) {
  setPosts((prev) => prev.map((p) => (p._id === id ? { ...p, ...patch } : p)));
}

/* ── Feed post card ─────────────────────────────────────────────────────── */
function PostCard({ post, actor, onUpdate }) {
  const [commentText, setCommentText] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const likes = post.likes || [];
  const comments = post.comments || [];
  const liked = actor ? likes.includes(actor.id) : false;

  const toggleLike = async () => {
    if (!actor) return alert("Log in to like posts.");
    // optimistic update
    const nextLikes = liked ? likes.filter((id) => id !== actor.id) : [...likes, actor.id];
    onUpdate({ likes: nextLikes });
    try {
      await axios.post(`${API}/api/posts/${post._id}/like`, { actorId: actor.id });
    } catch {
      onUpdate({ likes }); // revert on failure
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
    <article style={styles.post}>
      <div style={styles.postHead}>
        {post.artistAvatar
          ? <img src={post.artistAvatar} alt="" style={styles.avatar} />
          : <div style={styles.avatarFallback}>{post.artistName?.[0]?.toUpperCase()}</div>}
        <strong style={{ fontSize: 14 }}>{post.artistName}</strong>
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

/* ── styles (kept consistent with ArtistBookingDashboard.jsx) ─────────────── */
const styles = {
  page:        { fontFamily: "'Nunito','Inter',sans-serif", background: "#f8fafc", minHeight: "100vh", paddingBottom: 40 },
  header:      { display: "flex", alignItems: "center", gap: 16, padding: "20px", flexWrap: "wrap", maxWidth: 520, margin: "0 auto" },
  title:       { fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0, flex: 1 },
  tabs:        { display: "flex", gap: 6 },
  tabBtn:      { padding: "6px 14px", borderRadius: 20, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, fontWeight: 700, color: "#64748b", cursor: "pointer" },
  tabActive:   { background: "#1e3a8a", color: "#fff", border: "1px solid #1e3a8a" },
  newPostBtn:  { padding: "7px 14px", borderRadius: 8, border: "none", background: "#1e3a8a", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  feedCol:     { maxWidth: 470, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16, padding: "0 12px" },
  empty:       { textAlign: "center", color: "#94a3b8", padding: "60px 0", fontWeight: 600 },
  post:        { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" },
  postHead:    { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" },
  avatar:      { width: 32, height: 32, borderRadius: "50%", objectFit: "cover" },
  avatarFallback: { width: 32, height: 32, borderRadius: "50%", background: "#1e3a8a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 },
  mediaBox:    { width: "100%", aspectRatio: "4/5", background: "#f1f5f9" },
  media:       { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  actionsRow:  { display: "flex", gap: 16, padding: "10px 14px 0" },
  iconBtn:     { background: "none", border: "none", fontSize: 14, fontWeight: 700, color: "#0f172a", cursor: "pointer" },
  caption:     { padding: "8px 14px 0", fontSize: 13.5, lineHeight: 1.5, color: "#0f172a" },
  viewComments:{ display: "block", padding: "4px 14px 0", color: "#94a3b8", fontSize: 13, background: "none", border: "none", cursor: "pointer", textAlign: "left" },
  comment:     { padding: "2px 14px 0", fontSize: 13.5, color: "#0f172a" },
  commentForm: { display: "flex", gap: 8, alignItems: "center", padding: "10px 14px 14px", borderTop: "1px solid #f1f5f9", marginTop: 8 },
  commentInput:{ flex: 1, border: "none", outline: "none", fontSize: 13.5, background: "transparent" },
  postBtn:     { border: "none", background: "none", color: "#1e3a8a", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  loadMoreBtn: { padding: "10px 0", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 700, color: "#1e3a8a", cursor: "pointer" },
  reel:        { position: "relative", background: "#000", borderRadius: 14, overflow: "hidden", aspectRatio: "9/16" },
  reelVideo:   { width: "100%", height: "100%", objectFit: "cover" },
  reelOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: 14, background: "linear-gradient(transparent, rgba(0,0,0,.6))" },
  reelLikeBtn: { background: "rgba(255,255,255,.15)", border: "none", borderRadius: 10, padding: "6px 10px", cursor: "pointer", color: "#fff" },
};