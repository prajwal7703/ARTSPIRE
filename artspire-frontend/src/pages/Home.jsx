import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Plus,
  LogIn,
  LogOut,
} from "lucide-react";
import BottomNav from "../components/BottomNav";
import CreateSheet from "../components/CreateSheet";

// Adjust this if your env var / dev proxy setup is different
const API_BASE = import.meta.env.VITE_API_URL || "";

// TODO: replace with a real stories endpoint when you have one
const STORIES = [
  { id: "s1", name: "@sketchify", avatar: "https://i.pravatar.cc/150?img=47", ring: "ring-pink-400" },
  { id: "s2", name: "@color.swirl", avatar: "https://i.pravatar.cc/150?img=32", ring: "ring-orange-400" },
  { id: "s3", name: "@art_by_me", avatar: "https://i.pravatar.cc/150?img=13", ring: "ring-stone-300" },
  { id: "s4", name: "@creative.vi", avatar: "https://i.pravatar.cc/150?img=25", ring: "ring-rose-400" },
];

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
          setPosts(data.posts || []);

          // seed "liked" state from server data if we know who's viewing
          if (currentUser?._id || currentUser?.id) {
            const uid = currentUser._id || currentUser.id;
            const likedMap = {};
            (data.posts || []).forEach((p) => {
              if (Array.isArray(p.likes) && p.likes.includes(uid)) likedMap[p._id] = true;
            });
            setLiked(likedMap);
          }
        }
      } catch (err) {
        console.error("Feed load error:", err);
        if (!cancelled) setError("Couldn't load posts. Pull down to try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFeed();
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
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-stone-900">
          ArtSpire
        </h1>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-full border border-stone-200 px-3.5 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            >
              <LogOut size={16} strokeWidth={1.8} />
              Logout
            </button>
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

        {STORIES.map((s) => (
          <div key={s.id} className="flex shrink-0 flex-col items-center gap-1.5">
            <img
              src={s.avatar}
              alt={s.name}
              className={`h-14 w-14 rounded-full object-cover ring-2 ring-offset-2 ring-offset-[#FBF7F2] ${s.ring}`}
            />
            <span className="max-w-[64px] truncate text-[11px] text-stone-500">{s.name}</span>
          </div>
        ))}
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
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <img
                  src={post.artistAvatar || "https://i.pravatar.cc/150"}
                  alt={post.artistName}
                  className="h-9 w-9 rounded-full object-cover"
                />
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-stone-900">{post.artistName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                {timeAgo(post.createdAt)}
                <button aria-label="More options">
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>

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

            <div className="flex items-center justify-between px-4 pt-3">
              <div className="flex items-center gap-4">
                <button onClick={() => toggleLike(post)} aria-label="Like">
                  <Heart
                    size={23}
                    strokeWidth={1.8}
                    className={liked[post._id] ? "fill-rose-500 text-rose-500" : "text-stone-700"}
                  />
                </button>
                <button aria-label="Comment">
                  <MessageCircle size={22} strokeWidth={1.8} className="text-stone-700" />
                </button>
                <button aria-label="Share">
                  <Send size={21} strokeWidth={1.8} className="text-stone-700" />
                </button>
              </div>
              <button onClick={() => toggleSave(post._id)} aria-label="Save">
                <Bookmark
                  size={21}
                  strokeWidth={1.8}
                  className={saved[post._id] ? "fill-stone-800 text-stone-800" : "text-stone-700"}
                />
              </button>
            </div>

            <div className="px-4 pb-4 pt-2 text-sm">
              <p className="font-semibold text-stone-900">
                {(post.likes?.length ?? 0).toLocaleString()} likes
              </p>
              {post.caption && (
                <p className="mt-0.5 text-stone-700">
                  <span className="font-semibold text-stone-900">{post.artistName}</span>{" "}
                  {post.caption}
                </p>
              )}
              {(post.comments?.length ?? 0) > 0 && (
                <p className="mt-1 text-stone-400">
                  View all {post.comments.length} comments
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      <BottomNav onCreateClick={() => setCreateOpen(true)} />
      {createOpen && <CreateSheet onClose={() => setCreateOpen(false)} />}
    </div>
  );
}