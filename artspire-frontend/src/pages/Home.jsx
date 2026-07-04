import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Plus,
  Search,
  Bell,
  LogIn,
  LogOut,
} from "lucide-react";
import BottomNav from "../components/BottomNav";
import CreateSheet from "../components/CreateSheet";

// Adjust this if your env var / dev proxy setup is different
const API_BASE = import.meta.env.VITE_API_URL || "";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Home() {
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(true);

  // ── Auth state (adjust to match however you actually store the session) ──
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();
  const isLoggedIn = Boolean(localStorage.getItem("token"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  // ── Load real feed data ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE}/api/posts/feed?page=1&limit=10`);
        if (!res.ok) throw new Error("Failed to load feed");
        const data = await res.json();
        if (!cancelled) {
          const feedPosts = data.posts || [];
          setPosts(feedPosts);

          // seed "liked" state from server data if we know who's viewing
          if (currentUser?._id || currentUser?.id) {
            const uid = currentUser._id || currentUser.id;
            const likedMap = {};
            feedPosts.forEach((p) => {
              if (Array.isArray(p.likes) && p.likes.includes(uid)) likedMap[p._id] = true;
            });
            setLiked(likedMap);
          }

          // Fallback stories: derive from distinct authors in the real feed,
          // used only if /api/stories isn't available yet (see loadStories below).
          window.__feedAuthorsFallback = dedupeAuthors(feedPosts);
        }
      } catch (err) {
        console.error("Feed load error:", err);
        if (!cancelled) setError("Couldn't load posts. Pull down to try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    function dedupeAuthors(feedPosts) {
      const seen = new Set();
      const out = [];
      for (const p of feedPosts) {
        const key = p.artistId || p.artistName;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push({
          id: p.artistId || p._id,
          name: p.artistName,
          avatar: p.artistAvatar,
          hasStory: true,
        });
      }
      return out;
    }

    // ── Load real stories, falling back to feed authors if the endpoint
    // doesn't exist yet on the backend ─────────────────────────────────────
    async function loadStories() {
      try {
        setStoriesLoading(true);
        const res = await fetch(`${API_BASE}/api/stories`);
        if (!res.ok) throw new Error("no stories endpoint");
        const data = await res.json();
        if (!cancelled) setStories(data.stories || []);
      } catch (err) {
        // Backend doesn't have a stories endpoint yet — fall back to
        // real authors pulled from the feed instead of fake placeholder data.
        if (!cancelled) setStories(window.__feedAuthorsFallback || []);
      } finally {
        if (!cancelled) setStoriesLoading(false);
      }
    }

    loadFeed().then(loadStories);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLike = async (post) => {
    const uid = currentUser?._id || currentUser?.id;
    if (!uid) {
      navigate("/login");
      return;
    }

    const wasLiked = Boolean(liked[post._id]);
    // optimistic update
    setLiked((s) => ({ ...s, [post._id]: !wasLiked }));
    setPosts((prev) =>
      prev.map((p) => {
        if (p._id !== post._id) return p;
        const likes = wasLiked ? p.likes.filter((id) => id !== uid) : [...p.likes, uid];
        return { ...p, likes };
      })
    );

    try {
      const res = await fetch(`${API_BASE}/api/posts/${post._id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: uid }),
      });
      if (!res.ok) throw new Error("Like failed");
      const data = await res.json();
      setPosts((prev) => prev.map((p) => (p._id === post._id ? { ...p, likes: data.likes } : p)));
    } catch (err) {
      console.error("Like error:", err);
      // revert on failure
      setLiked((s) => ({ ...s, [post._id]: wasLiked }));
      setPosts((prev) => prev.map((p) => (p._id === post._id ? post : p)));
    }
  };

  const toggleSave = (id) => setSaved((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="min-h-screen bg-[#FBF7F2] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-100 bg-[#FBF7F2]/95 px-5 py-4 backdrop-blur">
        <button
          aria-label="Search"
          onClick={() => navigate("/search")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100"
        >
          <Search size={20} strokeWidth={1.8} />
        </button>

        <h1 className="font-serif text-xl font-semibold tracking-tight text-stone-900">
          ArtSpire
        </h1>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <button
                aria-label="Notifications"
                onClick={() => navigate("/notifications")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100"
              >
                <Bell size={20} strokeWidth={1.8} />
              </button>
              <button
                onClick={handleLogout}
                aria-label="Logout"
                className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100"
              >
                <LogOut size={18} strokeWidth={1.8} />
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-1.5 rounded-full bg-violet-600 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-violet-700"
            >
              <LogIn size={16} strokeWidth={1.8} />
              Login
            </button>
          )}
        </div>
      </header>

      {/* Stories */}
      <div className="flex gap-4 overflow-x-auto px-5 py-4 [scrollbar-width:none]">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-600 ring-1 ring-dashed ring-violet-300"
          >
            <Plus size={22} />
          </button>
          <span className="text-[11px] text-stone-500">Your Story</span>
        </div>

        {storiesLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
              <div className="h-14 w-14 animate-pulse rounded-full bg-stone-200" />
              <div className="h-2.5 w-10 animate-pulse rounded bg-stone-200" />
            </div>
          ))}

        {!storiesLoading &&
          stories.map((s) => (
            <div key={s.id} className="flex shrink-0 flex-col items-center gap-1.5">
              <img
                src={s.avatar}
                alt={s.name}
                className="h-14 w-14 rounded-full object-cover ring-2 ring-offset-2 ring-offset-[#FBF7F2] ring-violet-300"
              />
              <span className="max-w-[64px] truncate text-[11px] text-stone-500">{s.name}</span>
            </div>
          ))}

        {!storiesLoading && stories.length === 0 && (
          <div className="flex shrink-0 items-center text-[11px] text-stone-400">
            No stories yet
          </div>
        )}
      </div>

      {/* Feed states */}
      {loading && (
        <p className="px-5 py-10 text-center text-sm text-stone-400">Loading posts…</p>
      )}
      {!loading && error && (
        <p className="px-5 py-10 text-center text-sm text-rose-500">{error}</p>
      )}
      {!loading && !error && posts.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-stone-400">
          No posts yet. Be the first to share your art!
        </p>
      )}

      {/* Feed */}
      <div className="flex flex-col gap-6 px-5">
        {posts.map((post) => (
          <article
            key={post._id}
            className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm shadow-stone-200/50"
          >
            {/* Author row */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <img
                  src={post.artistAvatar || "https://i.pravatar.cc/150"}
                  alt={post.artistName}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-stone-900">{post.artistName}</p>
                  <p className="text-xs text-stone-400">{timeAgo(post.createdAt)}</p>
                </div>
              </div>
              <button aria-label="More options" className="text-stone-400">
                <MoreHorizontal size={18} />
              </button>
            </div>

            {/* Caption sits above the media */}
            {post.caption && (
              <p className="px-4 pb-3 text-sm text-stone-700">{post.caption}</p>
            )}

            {post.mediaType === "video" ? (
              <video
                src={post.mediaUrl}
                className="aspect-square w-full object-cover"
                controls
                playsInline
              />
            ) : (
              <img
                src={post.mediaUrl}
                alt={post.caption || "Post"}
                className="aspect-square w-full object-cover"
              />
            )}

            {/* Inline like / comment / share counts + save */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-5">
                <button onClick={() => toggleLike(post)} aria-label="Like" className="flex items-center gap-1.5">
                  <Heart
                    size={22}
                    strokeWidth={1.8}
                    className={liked[post._id] ? "fill-rose-500 text-rose-500" : "text-stone-700"}
                  />
                  <span className="text-sm text-stone-600">{(post.likes?.length ?? 0).toLocaleString()}</span>
                </button>
                <button aria-label="Comment" className="flex items-center gap-1.5">
                  <MessageCircle size={21} strokeWidth={1.8} className="text-stone-700" />
                  <span className="text-sm text-stone-600">{post.comments?.length ?? 0}</span>
                </button>
                <button aria-label="Share" className="flex items-center gap-1.5">
                  <Send size={20} strokeWidth={1.8} className="text-stone-700" />
                  <span className="text-sm text-stone-600">{post.shares?.length ?? 0}</span>
                </button>
              </div>
              <button onClick={() => toggleSave(post._id)} aria-label="Save">
                <Bookmark
                  size={20}
                  strokeWidth={1.8}
                  className={saved[post._id] ? "fill-stone-800 text-stone-800" : "text-stone-700"}
                />
              </button>
            </div>
          </article>
        ))}
      </div>

      <BottomNav onCreateClick={() => setCreateOpen(true)} />
      {createOpen && <CreateSheet onClose={() => setCreateOpen(false)} />}
    </div>
  );
}