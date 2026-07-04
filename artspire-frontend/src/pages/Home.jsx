import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  Plus,
  Search,
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

  useEffect(() => {
    let cancelled = false;

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
        });
      }
      return out;
    }

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

          if (currentUser?._id || currentUser?.id) {
            const uid = currentUser._id || currentUser.id;
            const likedMap = {};
            feedPosts.forEach((p) => {
              if (Array.isArray(p.likes) && p.likes.includes(uid)) likedMap[p._id] = true;
            });
            setLiked(likedMap);
          }

          window.__feedAuthorsFallback = dedupeAuthors(feedPosts);
        }
      } catch (err) {
        console.error("Feed load error:", err);
        if (!cancelled) setError("Couldn't load posts. Pull down to try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadStories() {
      try {
        setStoriesLoading(true);
        const res = await fetch(`${API_BASE}/api/stories`);
        if (!res.ok) throw new Error("no stories endpoint");
        const data = await res.json();
        if (!cancelled) setStories(data.stories || []);
      } catch (err) {
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
      setLiked((s) => ({ ...s, [post._id]: wasLiked }));
      setPosts((prev) => prev.map((p) => (p._id === post._id ? post : p)));
    }
  };

  const toggleSave = (id) => setSaved((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#132C2C] pb-28">
      {/*
        Add this to your index.html <head> for the fonts used below:
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:ital,wght@0,500;0,700;1,600&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,500&display=swap" rel="stylesheet">
      */}

      {/* Decorative corner washes */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[#7A2331] opacity-60 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-[#0F4B4B] opacity-40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-[#5C1A22] opacity-70 blur-3xl" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-6">
        <button
          aria-label="Home"
          onClick={() => navigate("/")}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-[#C9A227]/70 bg-[#7A2331]/40 text-[#E8CE86] shadow-inner"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          M
        </button>

        <div className="flex flex-col items-center">
          <h1
            className="text-4xl leading-none text-[#D9B65E]"
            style={{ fontFamily: "'Great Vibes', cursive" }}
          >
            Musée
          </h1>
          <p
            className="mt-1 text-[10px] tracking-[0.35em] text-[#D9B65E]/80"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            COLLECT BEAUTY
          </p>
        </div>

        <button
          aria-label="Search"
          onClick={() => navigate("/search")}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-[#C9A227]/70 bg-[#C9A227]/20 text-[#E8CE86]"
        >
          <Search size={19} strokeWidth={1.8} />
        </button>
      </header>

      {isLoggedIn ? (
        <div className="relative z-10 flex justify-end px-5 pt-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-[#D9B65E]/70 transition hover:text-[#D9B65E]"
          >
            <LogOut size={13} strokeWidth={1.8} />
            Logout
          </button>
        </div>
      ) : (
        <div className="relative z-10 flex justify-end px-5 pt-2">
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-1.5 text-xs text-[#D9B65E]/80 transition hover:text-[#D9B65E]"
          >
            <LogIn size={13} strokeWidth={1.8} />
            Login
          </button>
        </div>
      )}

      {/* Stories */}
      <div className="relative z-10 flex gap-4 overflow-x-auto px-5 py-6 [scrollbar-width:none]">
        <div className="flex shrink-0 flex-col items-center gap-2">
          <button
            onClick={() => setCreateOpen(true)}
            className="flex h-32 w-24 items-center justify-center rounded-xl border-2 border-[#C9A227]/70 bg-[#0F4B4B]/60 text-[#D9B65E] shadow-md"
          >
            <Plus size={26} />
          </button>
          <span
            className="text-[11px] text-[#D9B65E]/90"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Your Story
          </span>
        </div>

        {storiesLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex shrink-0 flex-col items-center gap-2">
              <div className="h-32 w-24 animate-pulse rounded-xl bg-[#0F4B4B]/40" />
              <div className="h-2.5 w-14 animate-pulse rounded bg-[#0F4B4B]/40" />
            </div>
          ))}

        {!storiesLoading &&
          stories.map((s) => (
            <div key={s.id} className="flex shrink-0 flex-col items-center gap-2">
              <img
                src={s.avatar}
                alt={s.name}
                className="h-32 w-24 rounded-xl border-2 border-[#C9A227]/70 object-cover shadow-md"
              />
              <span
                className="max-w-[88px] truncate text-[11px] text-[#D9B65E]/90"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {s.name}
              </span>
            </div>
          ))}

        {!storiesLoading && stories.length === 0 && (
          <div
            className="flex shrink-0 items-center text-[11px] text-[#D9B65E]/50"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            No stories yet
          </div>
        )}
      </div>

      {/* Feed states */}
      {loading && (
        <p className="relative z-10 px-5 py-10 text-center text-sm text-[#D9B65E]/60">
          Loading posts…
        </p>
      )}
      {!loading && error && (
        <p className="relative z-10 px-5 py-10 text-center text-sm text-rose-300">{error}</p>
      )}
      {!loading && !error && posts.length === 0 && (
        <p className="relative z-10 px-5 py-10 text-center text-sm text-[#D9B65E]/60">
          No posts yet. Be the first to share your art!
        </p>
      )}

      {/* Feed */}
      <div className="relative z-10 flex flex-col gap-6 px-5">
        {posts.map((post) => (
          <article
            key={post._id}
            className="overflow-hidden rounded-2xl border border-[#C9A227]/30 bg-[#F5EEDF] shadow-xl"
          >
            {/* Author row */}
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex items-center gap-3">
                <img
                  src={post.artistAvatar || "https://i.pravatar.cc/150"}
                  alt={post.artistName}
                  className="h-11 w-11 rounded-md border border-[#7A2331]/40 object-cover"
                />
                <div className="leading-tight">
                  <p
                    className="text-base font-semibold text-[#3B2E24]"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {post.artistName}
                  </p>
                  <p
                    className="text-xs italic text-[#7A2331]/80"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {post.location || timeAgo(post.createdAt)}
                  </p>
                </div>
              </div>
              <button aria-label="More options" className="text-[#C9A227]">
                <MoreHorizontal size={18} />
              </button>
            </div>

            {/* Framed media with caption overlay */}
            <div className="px-4 pt-3">
              <div className="relative rounded-lg border-2 border-[#C9A227]/60 p-1">
                {post.mediaType === "video" ? (
                  <video
                    src={post.mediaUrl}
                    className="aspect-square w-full rounded object-cover"
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    src={post.mediaUrl}
                    alt={post.caption || "Post"}
                    className="aspect-square w-full rounded object-cover"
                  />
                )}

                {post.caption && (
                  <div className="pointer-events-none absolute inset-x-1 bottom-1 rounded-b bg-gradient-to-t from-black/50 to-transparent px-3 pb-2 pt-6">
                    <p
                      className="text-right text-lg italic text-[#F5EEDF]"
                      style={{ fontFamily: "'Great Vibes', cursive", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
                    >
                      {post.caption}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-5">
                <button onClick={() => toggleLike(post)} aria-label="Like" className="flex items-center gap-2">
                  <Heart
                    size={20}
                    strokeWidth={1.8}
                    className={liked[post._id] ? "fill-[#7A2331] text-[#7A2331]" : "text-[#7A2331]/70"}
                  />
                  <span
                    className="text-sm text-[#3B2E24]"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {(post.likes?.length ?? 0).toLocaleString()}
                  </span>
                </button>
                <button aria-label="Comment" className="flex items-center gap-2">
                  <MessageCircle size={19} strokeWidth={1.8} className="fill-[#0F4B4B]/15 text-[#0F4B4B]" />
                  <span
                    className="text-sm text-[#3B2E24]"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {post.comments?.length ?? 0}
                  </span>
                </button>
              </div>
              <button onClick={() => toggleSave(post._id)} aria-label="Save">
                <Bookmark
                  size={19}
                  strokeWidth={1.8}
                  className={saved[post._id] ? "fill-[#7A2331] text-[#7A2331]" : "text-[#7A2331]/70"}
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