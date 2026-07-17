import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Palette,
  Send,
  Bookmark,
  MoreHorizontal,
  Plus,
  Search,
  Bell,
  LogIn,
  LogOut,
  Home as HomeIcon,
  Compass,
  User,
  Star,
} from "lucide-react";

// Falls back to your live Render backend if VITE_API_URL isn't set —
// matches the same fallback pattern already used in src/socket.js
const API_BASE = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const CATEGORY_CHIPS = ["For You", "Watercolor", "Illustration", "Portraits", "Landscapes"];

// ── PASTE YOUR VIDEO FILE PATH HERE ─────────────────────────────────────
// 1. Drop your video file into: artspire-frontend/public/
// 2. Put its filename below (must start with "/"), e.g. "/home-bg.mp4"
// Leave as null to keep the plain watercolor-blob background instead.
const BG_VIDEO_SRC = "/back.mp4";

// Each chip gets a visually distinct shape instead of all five looking
// identical — cycles through this list by index.
const CHIP_SHAPES = [
  "rounded-t-full rounded-b-2xl",              // arch
  "rounded-2xl",                                // soft square
  "rounded-full",                                // circle
  "rounded-tl-3xl rounded-br-3xl rounded-tr-md rounded-bl-md", // diagonal cut
  "rounded-b-full rounded-t-2xl",               // inverted arch
];

// Maps a chip label to the substrings we look for inside an artist's
// `categories` array (e.g. an artist with categories ["Portrait Artist"]
// should match the "Portraits" chip).
const CATEGORY_MATCH = {
  Watercolor: ["watercolor", "water colour", "watercolour"],
  Illustration: ["illustrat"],
  Portraits: ["portrait"],
  Landscapes: ["landscape"],
};

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

  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // artistId -> lowercased categories array, used to power the filter chips
  const [artistCategoryMap, setArtistCategoryMap] = useState({});
  const [activeChip, setActiveChip] = useState("For You");

  // ── Auth state — same pattern as your existing utils/auth.js ──────────
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || localStorage.getItem("artist") || "null");
    } catch {
      return null;
    }
  })();
  const isLoggedIn = Boolean(localStorage.getItem("token"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("artist");
    navigate("/login");
  };

  // ── Load real feed + artist categories ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${API_BASE}/api/posts/feed?page=1&limit=20`);
        if (!res.ok) throw new Error("Failed to load feed");
        const data = await res.json();
        if (cancelled) return;

        const feedPosts = data.posts || [];
        setPosts(feedPosts);

        const uid = currentUser?._id || currentUser?.id;
        if (uid) {
          const likedMap = {};
          feedPosts.forEach((p) => {
            if (Array.isArray(p.likes) && p.likes.includes(uid)) likedMap[p._id] = true;
          });
          setLiked(likedMap);
        }
      } catch (err) {
        console.error("Feed load error:", err);
        if (!cancelled) setError("Couldn't load posts. Pull down to try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadArtistCategories() {
      try {
        const res = await fetch(`${API_BASE}/api/artists/only-artists`);
        if (!res.ok) throw new Error("Failed to load artists");
        const artists = await res.json();
        if (cancelled) return;
        const map = {};
        artists.forEach((a) => {
          map[a._id] = (a.categories || []).map((c) => String(c).toLowerCase());
        });
        setArtistCategoryMap(map);
      } catch (err) {
        // Non-fatal — chips just won't be able to filter, "For You" still works
        console.error("Artist categories load error:", err);
      }
    }

    loadFeed();
    loadArtistCategories();
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

  // ── Filtered posts, driven by real artist category data ─────────────────
  const filteredPosts = useMemo(() => {
    if (activeChip === "For You") return posts;
    const needles = CATEGORY_MATCH[activeChip] || [];
    return posts.filter((p) => {
      const cats = artistCategoryMap[p.artistId] || [];
      return cats.some((c) => needles.some((n) => c.includes(n)));
    });
  }, [posts, activeChip, artistCategoryMap]);

  // ── Cover image per chip — first matching post's image, real data ───────
  const chipCover = (label) => {
    if (label === "For You") return posts[0]?.mediaUrl || null;
    const needles = CATEGORY_MATCH[label] || [];
    const match = posts.find((p) => {
      const cats = artistCategoryMap[p.artistId] || [];
      return cats.some((c) => needles.some((n) => c.includes(n)));
    });
    return match?.mediaUrl || null;
  };

  return (
    // NOTE: no bg color here anymore — a solid background on this wrapper
    // was painting over the fixed video layer. Keep this transparent.
    <div className="relative min-h-screen overflow-x-hidden pb-28">
      {/* ── Video background, fully visible, sits behind everything ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {BG_VIDEO_SRC && (
          <>
            <video
              src={BG_VIDEO_SRC}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Very light wash, just enough to keep icons/text readable —
                tweak this opacity (try 10–25) to taste */}
            <div className="absolute inset-0 bg-[#FBF3E7]/15" />
          </>
        )}
        <div className="absolute -top-16 -right-10 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute top-1/3 -left-16 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute bottom-24 -right-16 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-sky-100/50 blur-3xl" />
        <Star className="absolute top-24 right-10 h-4 w-4 text-stone-300" strokeWidth={1.5} />
        <Star className="absolute top-48 left-8 h-3 w-3 text-stone-300" strokeWidth={1.5} />
        <Star className="absolute bottom-40 right-6 h-3 w-3 text-stone-300" strokeWidth={1.5} />
      </div>

      <div className="relative z-10">
        {/* Header — glass instead of near-solid cream */}
        <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-white/30 px-5 py-4">
          <button
            aria-label="Search"
            onClick={() => navigate("/search")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-white/20"
          >
            <Search size={20} strokeWidth={1.8} />
          </button>

          <div className="flex flex-col items-center leading-none">
            <h1 className="font-serif text-2xl italic tracking-tight text-stone-900">
              Art<span className="text-violet-600">Spire</span>
            </h1>
            <span className="mt-0.5 flex items-center gap-1 text-[11px] text-stone-500">
              Inspire Today <Star size={10} className="fill-stone-400 text-stone-400" />
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <button
                  aria-label="Notifications"
                  onClick={() => navigate("/activity")}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-white/20"
                >
                  <Bell size={20} strokeWidth={1.8} />
                </button>
                <button
                  onClick={handleLogout}
                  aria-label="Logout"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-white/20"
                >
                  <LogOut size={18} strokeWidth={1.8} />
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="flex items-center gap-1.5 rounded-full bg-violet-600/90 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-violet-700"
              >
                <LogIn size={16} strokeWidth={1.8} />
                Login
              </button>
            )}
          </div>
        </header>

        {/* Category chips — glass instead of solid white/gradient fill */}
        <div className="flex gap-4 overflow-x-auto px-5 py-5 [scrollbar-width:none]">
          {CATEGORY_CHIPS.map((label, i) => {
            const active = activeChip === label;
            const cover = chipCover(label);
            const shape = CHIP_SHAPES[i % CHIP_SHAPES.length];
            return (
              <button
                key={label}
                onClick={() => setActiveChip(label)}
                className="flex shrink-0 flex-col items-center gap-1.5"
              >
                <div
                  className={`relative h-16 w-14 overflow-hidden border transition ${shape} ${
                    active
                      ? "glass border-violet-300/60 shadow-md shadow-violet-200/40"
                      : "glass"
                  }`}
                >
                  {cover ? (
                    <img src={cover} alt={label} className="h-full w-full object-cover" />
                  ) : (
                    // no solid fallback fill — let the glass + background show through
                    <div className="h-full w-full" />
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    active ? "bg-violet-100/70 font-semibold text-violet-700" : "text-stone-500"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feed states */}
        {loading && <p className="px-5 py-10 text-center text-sm text-stone-400">Loading posts…</p>}
        {!loading && error && <p className="px-5 py-10 text-center text-sm text-rose-500">{error}</p>}
        {!loading && !error && filteredPosts.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-stone-400">
            {activeChip === "For You" ? "No posts yet. Be the first to share your art!" : `No ${activeChip.toLowerCase()} posts yet.`}
          </p>
        )}

        {/* Feed */}
        <div className="flex flex-col gap-5 px-5">
          {filteredPosts.map((post) => (
            <article
              key={post._id}
              className="glass-strong overflow-hidden rounded-3xl"
            >
              {/* Author row */}
              <div className="flex items-center justify-between px-4 pt-3.5">
                <div className="flex items-center gap-3">
                  <img
                    src={post.artistAvatar || "https://i.pravatar.cc/150"}
                    alt={post.artistName}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-orange-100/70"
                  />
                  <div className="leading-tight">
                    <p className="font-serif text-[15px] font-semibold text-stone-900">{post.artistName}</p>
                    <p className="text-xs text-violet-600">
                      {(artistCategoryMap[post.artistId] || [])[0] || "Artist"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-stone-500">
                  <span className="text-xs">{timeAgo(post.createdAt)}</span>
                  <button aria-label="More options">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              </div>

              {post.caption && (
                <p className="px-4 pb-3 pt-2 text-sm text-stone-700">{post.caption}</p>
              )}

              {post.mediaType === "video" ? (
                <video src={post.mediaUrl} className="aspect-square w-full object-cover" controls playsInline />
              ) : (
                <img src={post.mediaUrl} alt={post.caption || "Post"} className="aspect-square w-full object-cover" />
              )}

              {/* Footer — heart / palette (comments) / bookmark / send */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-5">
                  <button onClick={() => toggleLike(post)} aria-label="Like" className="flex items-center gap-1.5">
                    <Heart
                      size={21}
                      strokeWidth={1.8}
                      className={liked[post._id] ? "fill-rose-500 text-rose-500" : "text-stone-700"}
                    />
                    <span className="text-sm text-stone-600">{(post.likes?.length ?? 0).toLocaleString()}</span>
                  </button>
                  <button aria-label="Comments" className="flex items-center gap-1.5">
                    <Palette size={20} strokeWidth={1.8} className="text-stone-700" />
                    <span className="text-sm text-stone-600">{post.comments?.length ?? 0}</span>
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleSave(post._id)} aria-label="Save">
                    <Bookmark
                      size={19}
                      strokeWidth={1.8}
                      className={saved[post._id] ? "fill-stone-800 text-stone-800" : "text-stone-700"}
                    />
                  </button>
                  <button aria-label="Share">
                    <Send size={19} strokeWidth={1.8} className="text-stone-700" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <HomeBottomNav />
    </div>
  );
}

/**
 * Self-contained bottom nav matching the mockup's soft-colored circular
 * icons. Swap this out for your real src/BottomNav.jsx once its import
 * path is fixed — Home.jsx currently expects it at "../components/BottomNav"
 * but the file lives at src/BottomNav.jsx.
 */
function HomeBottomNav() {
  const navigate = useNavigate();

  const tabs = [
    { key: "home", label: "Home", icon: HomeIcon, path: "/", bg: "bg-violet-100/70", fg: "text-violet-600" },
    { key: "explore", label: "Explore", icon: Compass, path: "/explore", bg: "bg-teal-100/70", fg: "text-teal-600" },
    { key: "activity", label: "Activity", icon: Bell, path: "/activity", bg: "bg-amber-100/70", fg: "text-amber-600" },
    { key: "profile", label: "Profile", icon: User, path: "/profile", bg: "bg-stone-200/70", fg: "text-stone-600" },
  ];

  return (
    <nav className="glass-strong fixed bottom-0 left-0 right-0 z-40 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3">
      <div className="mx-auto flex max-w-md items-center justify-between">
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => navigate(tab.path)} className="flex flex-col items-center gap-1">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tab.bg}`}>
                <Icon size={18} strokeWidth={2} className={tab.fg} />
              </span>
              <span className="text-[11px] text-stone-500">{tab.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => alert("Hook this up to your real CreateSheet / upload modal")}
          aria-label="Create"
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-300/60 transition active:scale-95"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {tabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => navigate(tab.path)} className="flex flex-col items-center gap-1">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tab.bg}`}>
                <Icon size={18} strokeWidth={2} className={tab.fg} />
              </span>
              <span className="text-[11px] text-stone-500">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}