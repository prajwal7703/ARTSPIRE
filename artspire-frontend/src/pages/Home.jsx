import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Plus, MessageSquare } from "lucide-react";
import BottomNav from "../components/BottomNav";
import CreateSheet from "../components/CreateSheet";

// TODO: replace with GET /api/posts/feed
const STORIES = [
  { id: "s1", name: "@sketchify", avatar: "https://i.pravatar.cc/150?img=47", ring: "ring-pink-400" },
  { id: "s2", name: "@color.swirl", avatar: "https://i.pravatar.cc/150?img=32", ring: "ring-orange-400" },
  { id: "s3", name: "@art_by_me", avatar: "https://i.pravatar.cc/150?img=13", ring: "ring-stone-300" },
  { id: "s4", name: "@creative.vi", avatar: "https://i.pravatar.cc/150?img=25", ring: "ring-rose-400" },
];

const POSTS = [
  {
    id: "p1",
    name: "Ananya Sharma",
    handle: "@ananyaartz",
    time: "2h",
    avatar: "https://i.pravatar.cc/150?img=47",
    image:
      "https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1200&auto=format&fit=crop",
    likes: "1.2K",
    comments: 56,
    caption: "Bloom where you are planted 🌸",
    tags: ["#artspire", "#digitalart", "#bloom"],
  },
  {
    id: "p2",
    name: "Harshit Verma",
    handle: "@sketchfolio",
    time: "4h",
    avatar: "https://i.pravatar.cc/150?img=12",
    image:
      "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?q=80&w=1200&auto=format&fit=crop",
    likes: "842",
    comments: 31,
    caption: "Three hours, one fineliner, no regrets ✏️",
    tags: ["#architecture", "#pencilsketch"],
  },
];

export default function Home() {
  const [createOpen, setCreateOpen] = useState(false);
  const [liked, setLiked] = useState({});
  const [saved, setSaved] = useState({});

  const toggleLike = (id) => setLiked((s) => ({ ...s, [id]: !s[id] }));
  const toggleSave = (id) => setSaved((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="min-h-screen bg-[#FBF7F2] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-100 bg-[#FBF7F2]/95 px-5 py-4 backdrop-blur">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-stone-900">
          ArtSpire
        </h1>
        <div className="flex items-center gap-4">
          <button aria-label="Likes">
            <Heart size={22} className="text-stone-700" strokeWidth={1.8} />
          </button>
          <button aria-label="Messages" className="relative">
            <MessageSquare size={22} className="text-stone-700" strokeWidth={1.8} />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-violet-600 ring-2 ring-[#FBF7F2]" />
          </button>
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

      {/* Feed */}
      <div className="flex flex-col gap-6 px-5">
        {POSTS.map((post) => (
          <article
            key={post.id}
            className="overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm shadow-stone-200/50"
          >
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <img src={post.avatar} alt={post.name} className="h-9 w-9 rounded-full object-cover" />
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-stone-900">{post.name}</p>
                  <p className="text-xs text-stone-400">{post.handle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                {post.time}
                <button aria-label="More options">
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>

            <img src={post.image} alt={post.caption} className="aspect-square w-full object-cover" />

            <div className="flex items-center justify-between px-4 pt-3">
              <div className="flex items-center gap-4">
                <button onClick={() => toggleLike(post.id)} aria-label="Like">
                  <Heart
                    size={23}
                    strokeWidth={1.8}
                    className={liked[post.id] ? "fill-rose-500 text-rose-500" : "text-stone-700"}
                  />
                </button>
                <button aria-label="Comment">
                  <MessageCircle size={22} strokeWidth={1.8} className="text-stone-700" />
                </button>
                <button aria-label="Share">
                  <Send size={21} strokeWidth={1.8} className="text-stone-700" />
                </button>
              </div>
              <button onClick={() => toggleSave(post.id)} aria-label="Save">
                <Bookmark
                  size={21}
                  strokeWidth={1.8}
                  className={saved[post.id] ? "fill-stone-800 text-stone-800" : "text-stone-700"}
                />
              </button>
            </div>

            <div className="px-4 pb-4 pt-2 text-sm">
              <p className="font-semibold text-stone-900">{post.likes} likes</p>
              <p className="mt-0.5 text-stone-700">
                <span className="font-semibold text-stone-900">{post.name}</span>{" "}
                {post.caption}
              </p>
              <p className="mt-0.5 text-violet-600">{post.tags.join("  ")}</p>
              {post.comments > 0 && (
                <p className="mt-1 text-stone-400">View all {post.comments} comments</p>
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