import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, ArrowLeft, Settings, X } from "lucide-react";
import BookingModal from "../components/BookingModal";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

// Statuses that count as an active/confirmed engagement â€” the nav only
// switches from "Book" to "Chat" once the artist has actually confirmed.
const CONFIRMED_STATUSES = ["confirmed"];

function getId(obj) {
  if (!obj) return undefined;
  const raw = obj._id;
  if (!raw) return undefined;
  if (typeof raw === "object" && raw.$oid) return raw.$oid;
  return String(raw);
}

/* â”€â”€ LIGHTBOX â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Lightbox({ post, onClose }) {
  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/85 backdrop-blur-md" onClick={onClose}>
      <button className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white">
        <X size={18} />
      </button>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl">
        {post.type === "video" ? (
          <video src={post.media} controls className="max-h-[85vh] max-w-[85vw]" />
        ) : (
          <img src={post.media} alt="" className="block max-h-[85vh] max-w-[85vw] object-contain" />
        )}
        {post.title && <div className="bg-black/70 px-4 py-2.5 text-sm font-medium text-white">{post.title}</div>}
      </div>
    </div>
  );
}

/* â”€â”€ MAIN PROFILE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function ArtistProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [artist, setArtist] = useState(null);
  const [posts, setPosts] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);

  // Live booking status between the logged-in user and this artist â€” drives
  // whether the nav shows "Book" or "Chat".
  const [bookingStatus, setBookingStatus] = useState(null);

  let loggedArtist = null, loggedUser = null;
  try { loggedArtist = JSON.parse(localStorage.getItem("artist") || "null"); } catch {}
  try { loggedUser = JSON.parse(localStorage.getItem("user") || "null"); } catch {}
  const currentUser = loggedUser || loggedArtist;
  const isOwner = loggedArtist && getId(loggedArtist) === id;
  const myId = getId(currentUser);

  const hasConfirmedBooking = CONFIRMED_STATUSES.includes(bookingStatus);

  useEffect(() => {
    loadArtist();
    loadPosts();
    if (!isOwner) axios.post(`${API}/api/users/${id}/view`).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadArtist = async () => {
    try {
      const r = await axios.get(`${API}/api/artists/${id}`);
      if (r.data) { setArtist(r.data); return; }
    } catch {}
    try {
      const r = await axios.get(`${API}/api/users/all-people`);
      const found = (Array.isArray(r.data) ? r.data : []).find((u) => u._id === id || getId(u) === id);
      if (found) setArtist(found);
    } catch {}
  };

  const loadPosts = async () => {
    try {
      const r = await axios.get(`${API}/api/posts/feed`);
      setPosts((Array.isArray(r.data) ? r.data : []).filter((p) => p.artistId === id));
    } catch {}
  };

  // Finds the most recent booking this user has with this artist, so we
  // know whether to show "Book" or "Chat" in the nav.
  const checkBookingStatus = async () => {
    if (!myId || isOwner) return;
    try {
      const r = await axios.get(`${API}/api/bookings/user/${myId}`);
      const mine = (Array.isArray(r.data) ? r.data : []).filter((b) => String(b.artistId) === String(id));
      const latest = mine.sort(
        (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
      )[0];
      setBookingStatus(latest?.status || null);
    } catch (e) {
      console.error("Failed to check booking status:", e);
    }
  };

  useEffect(() => { checkBookingStatus(); }, [myId, id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live updates: poll while on the page, and also listen for the same
  // socket event the artist dashboard emits on confirmation.
  useEffect(() => {
    if (!myId || isOwner) return;
    const iv = setInterval(checkBookingStatus, 8000);

    const onConfirmed = ({ artistId: confirmedArtistId }) => {
      if (!confirmedArtistId || String(confirmedArtistId) === String(id)) checkBookingStatus();
    };
    socket.emit("join_user_room", myId);
    socket.on("booking_confirmed", onConfirmed);

    return () => {
      clearInterval(iv);
      socket.off("booking_confirmed", onConfirmed);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, id, isOwner]);

  if (!artist) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBF3E7]">
        <p className="text-sm text-stone-400">Loading profileâ€¦</p>
      </div>
    );
  }

  const initials = artist.name ? artist.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "A";
  const profileImageSrc = artist.image || artist.profileImage || null;

  // Merge dashboard-uploaded work samples (artist.works) with the posts collection
  const works = [
    ...(artist.works || []).map((url, i) => ({ _id: `work-${i}`, media: url, type: "image", title: "" })),
    ...posts,
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FBF3E7] pb-16">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -top-16 -right-10 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute top-1/3 -left-16 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute bottom-24 -right-16 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200/60 bg-[#FBF3E7]/90 px-4 py-3.5 backdrop-blur">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-stone-600 shadow-sm"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-base font-semibold text-stone-900">{artist.name}</p>
            <p className="truncate text-xs text-stone-400">
              {artist.category}{artist.city ? ` Â· ${artist.city}` : ""}
            </p>
          </div>

          {isOwner && (
            <button
              onClick={() => navigate("/artist-dashboard?tab=profile")}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-semibold text-violet-600"
            >
              <Settings size={13} /> Edit
            </button>
          )}

          {!isOwner && hasConfirmedBooking && (
            <button
              onClick={() => navigate(`/chat/${id}`)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 px-4 py-1.5 text-xs font-semibold text-white"
            >
              <MessageCircle size={13} /> Chat
            </button>
          )}
          {!isOwner && !hasConfirmedBooking && (
            <button
              onClick={() => setShowBooking(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white"
            >
              ðŸ“… Book
            </button>
          )}
        </header>

        {/* Hero card */}
        <div className="mx-5 mt-4 flex items-center gap-4 rounded-3xl border border-stone-200/70 bg-white/90 p-5 shadow-sm">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-orange-100">
            {profileImageSrc ? (
              <img src={profileImageSrc} alt={artist.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-violet-100 font-serif text-xl font-semibold text-violet-600">
                {initials}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-lg font-semibold text-stone-900">{artist.name}</p>
            <span className="mt-1 inline-block rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-600">
              {artist.category || "Artist"}
            </span>
            {artist.city && <p className="mt-1 text-xs text-stone-400">ðŸ“ {artist.city}</p>}
          </div>
        </div>

        {/* Bio */}
        <div className="mx-5 mt-3 rounded-2xl border border-stone-200/70 bg-white/70 p-4">
          <p className="text-sm leading-relaxed text-stone-600">
            {artist.bio || `${artist.city ? `Based in ${artist.city}. ` : ""}A passionate ${
              artist.category?.toLowerCase() || "artist"
            } sharing creativity with the world.`}
          </p>
        </div>

        {bookingDone && (
          <div className="mx-5 mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-600">
            âœ… Booking request sent! You'll get a chat option here once {artist.name?.split(" ")[0]} confirms.
          </div>
        )}

        {/* Works */}
        <div className="mx-5 mt-6">
          <h2 className="mb-3 font-serif text-base font-semibold text-stone-800">Works</h2>

          {works.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 py-10 text-center">
              <p className="text-2xl">ðŸŽ­</p>
              <p className="mt-2 text-sm text-stone-400">No works uploaded yet</p>
              {isOwner && (
                <button
                  onClick={() => navigate("/artist-dashboard")}
                  className="mt-3 rounded-full bg-violet-600 px-5 py-2 text-xs font-semibold text-white"
                >
                  Upload First Work
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {works.map((post, i) => (
                <button
                  key={post._id || i}
                  onClick={() => setLightbox(post)}
                  className="relative aspect-square overflow-hidden rounded-md bg-stone-200"
                >
                  {post.type === "video" ? (
                    <video src={post.media} className="h-full w-full object-cover" muted />
                  ) : (
                    <img src={post.media} alt="" className="h-full w-full object-cover" />
                  )}
                  {post.type === "video" && (
                    <span className="absolute right-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      â–¶
                    </span>
                  )}
                  {typeof post.likes?.length === "number" && (
                    <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      <Heart size={10} fill="#fff" /> {post.likes.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showBooking && (
        <BookingModal
          artist={artist}
          currentUser={currentUser}
          onClose={() => setShowBooking(false)}
          onSuccess={() => {
            setShowBooking(false);
            setBookingDone(true);
            checkBookingStatus();
          }}
        />
      )}
      {lightbox && <Lightbox post={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}