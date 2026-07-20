import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Palette,
  Send,
  Bookmark,
  MoreHorizontal,
  Plus,
  Bell,
  LogIn,
  LogOut,
  Home as HomeIcon,
  Compass,
  User,
  Star,
  Calendar,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const CATEGORY_CHIPS = ["For You", "Watercolor", "Illustration", "Portraits", "Landscapes"];

const BG_IMAGE_SRC = "/artspire-bg.jpeg";

const CHIP_SHAPES = [
  "rounded-t-full rounded-b-2xl",
  "rounded-2xl",
  "rounded-full",
  "rounded-tl-3xl rounded-br-3xl rounded-tr-md rounded-bl-md",
  "rounded-b-full rounded-t-2xl",
];

const CATEGORY_MATCH = {
  Watercolor: ["watercolor", "water colour", "watercolour"],
  Illustration: ["illustrat"],
  Portraits: ["portrait"],
  Landscapes: ["landscape"],
};

const F_LOGO        = { fontFamily: "'Playfair Display', Georgia, serif" };
const F_TAGLINE      = { fontFamily: "'Caveat', cursive" };
const F_CHIP_LABEL   = { fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em" };
const F_ARTIST_NAME  = { fontFamily: "'Playfair Display', Georgia, serif" };
const F_META         = { fontFamily: "'Nunito', sans-serif" };
const F_CAPTION      = { fontFamily: "'Nunito', sans-serif" };
const F_NAV_LABEL    = { fontFamily: "'Nunito', sans-serif", fontWeight: 700 };

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

function FontImports() {
  return (
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,600&family=Caveat:wght@600&family=Bebas+Neue&family=Nunito:wght@400;600;700;800&display=swap"
      rel="stylesheet"
    />
  );
}

export default function Home() {
  const navigate = useNavigate();

  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [artistCategoryMap, setArtistCategoryMap] = useState({});
  const [activeChip, setActiveChip] = useState("For You");

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

  const filteredPosts = useMemo(() => {
    if (activeChip === "For You") return posts;
    const needles = CATEGORY_MATCH[activeChip] || [];
    return posts.filter((p) => {
      const cats = artistCategoryMap[p.artistId] || [];
      return cats.some((c) => needles.some((n) => c.includes(n)));
    });
  }, [posts, activeChip, artistCategoryMap]);

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
    <div className="min-h-screen w-full bg-stone-200 flex justify-center">
      <div className="relative w-full max-w-[480px] min-h-screen overflow-x-hidden bg-[#FBF3E7] pb-28 shadow-2xl">
      <FontImports />

      <div className="pointer-events-none fixed inset-y-0 left-1/2 z-0 w-full max-w-[480px] -translate-x-1/2 overflow-hidden">
        {BG_IMAGE_SRC && (
          <>
            <img
              src={BG_IMAGE_SRC}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
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
        <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-white/30 px-5 py-4">
          <button
            aria-label="Events"
            onClick={() => navigate("/events")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-white/20"
          >
            <Calendar size={20} strokeWidth={1.8} />
          </button>

          <div className="flex flex-col items-center leading-none">
            <h1 style={F_LOGO} className="text-2xl italic tracking-tight text-stone-900">
              Art<span className="text-violet-600">Spire</span>
            </h1>
            <span style={F_TAGLINE} className="mt-0.5 flex items-center gap-1 text-base leading-none text-stone-600">
              Inspire Today <Star size={11} className="fill-stone-400 text-stone-400" />
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
                style={F_META}
                className="flex items-center gap-1.5 rounded-full bg-violet-600/90 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur transition hover:bg-violet-700"
              >
                <LogIn size={16} strokeWidth={1.8} />
                Login
              </button>
            )}
          </div>
        </header>

        <div data-tour="chips" className="flex gap-4 overflow-x-auto px-5 py-5 [scrollbar-width:none]">
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
                    <div className="h-full w-full" />
                  )}
                </div>
                <span
                  style={F_CHIP_LABEL}
                  className={`rounded-full px-2 py-0.5 text-[11px] uppercase ${
                    active ? "bg-violet-100/70 font-semibold text-violet-700" : "text-stone-500"
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {loading && <p style={F_META} className="px-5 py-10 text-center text-sm text-stone-400">Loading posts…</p>}
        {!loading && error && <p style={F_META} className="px-5 py-10 text-center text-sm text-rose-500">{error}</p>}
        {!loading && !error && filteredPosts.length === 0 && (
          <p style={F_META} className="px-5 py-10 text-center text-sm text-stone-400">
            {activeChip === "For You" ? "No posts yet. Be the first to share your art!" : `No ${activeChip.toLowerCase()} posts yet.`}
          </p>
        )}

        <div data-tour="feed" className="flex flex-col gap-5 px-5">
          {filteredPosts.map((post) => (
            <article
              key={post._id}
              className="glass-strong overflow-hidden rounded-3xl"
            >
              <div className="flex items-center justify-between px-4 pt-3.5">
                <div className="flex items-center gap-3">
                  <img
                    src={post.artistAvatar || "https://i.pravatar.cc/150"}
                    alt={post.artistName}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-orange-100/70"
                  />
                  <div className="leading-tight">
                    <p style={F_ARTIST_NAME} className="text-[16px] font-semibold text-stone-900">{post.artistName}</p>
                    <p style={F_META} className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                      {(artistCategoryMap[post.artistId] || [])[0] || "Artist"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-stone-500">
                  <span style={F_META} className="text-xs">{timeAgo(post.createdAt)}</span>
                  <button aria-label="More options">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              </div>

              {post.caption && (
                <p style={F_CAPTION} className="px-4 pb-3 pt-2 text-sm text-stone-700">{post.caption}</p>
              )}

              {post.mediaType === "video" ? (
                <video src={post.mediaUrl} className="aspect-square w-full object-cover" controls playsInline />
              ) : (
                <img src={post.mediaUrl} alt={post.caption || "Post"} className="aspect-square w-full object-cover" />
              )}

              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => toggleLike(post)}
                    aria-label="Like"
                    className="flex items-center gap-1.5"
                    {...(filteredPosts[0]?._id === post._id ? { "data-tour": "like" } : {})}
                  >
                    <Heart
                      size={21}
                      strokeWidth={1.8}
                      className={liked[post._id] ? "fill-rose-500 text-rose-500" : "text-stone-700"}
                    />
                    <span style={F_META} className="text-sm text-stone-600">{(post.likes?.length ?? 0).toLocaleString()}</span>
                  </button>
                  <button aria-label="Comments" className="flex items-center gap-1.5">
                    <Palette size={20} strokeWidth={1.8} className="text-stone-700" />
                    <span style={F_META} className="text-sm text-stone-600">{post.comments?.length ?? 0}</span>
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
    </div>
  );
}

function HomeBottomNav() {
  const navigate = useNavigate();

  const tabs = [
    { key: "home", label: "Home", icon: HomeIcon, path: "/", bg: "bg-violet-100/70", fg: "text-violet-600" },
    { key: "explore", label: "Explore", icon: Compass, path: "/explore", bg: "bg-teal-100/70", fg: "text-teal-600" },
    { key: "activity", label: "Activity", icon: Bell, path: "/activity", bg: "bg-amber-100/70", fg: "text-amber-600" },
    { key: "profile", label: "Profile", icon: User, path: "/profile", bg: "bg-stone-200/70", fg: "text-stone-600" },
  ];

  return (
    <nav className="glass-strong fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3">
      <div className="mx-auto flex max-w-md items-center justify-between">
        {tabs.slice(0, 2).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              data-tour={tab.key === "explore" ? "explore" : undefined}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-1"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tab.bg}`}>
                <Icon size={18} strokeWidth={2} className={tab.fg} />
              </span>
              <span style={F_NAV_LABEL} className="text-[11px] text-stone-500">{tab.label}</span>
            </button>
          );
        })}

        <button
          data-tour="create"
          onClick={() => alert("Hook this up to your real CreateSheet / upload modal")}
          aria-label="Create"
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-300/60 transition active:scale-95"
        >
          <Plus size={26} strokeWidth={2.5} />
        </button>

        {tabs.slice(2).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              data-tour={tab.key === "profile" ? "profile" : undefined}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-1"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tab.bg}`}>
                <Icon size={18} strokeWidth={2} className={tab.fg} />
              </span>
              <span style={F_NAV_LABEL} className="text-[11px] text-stone-500">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}