// artspire-frontend/src/pages/Profile.jsx
//
// Real data:
//   GET /api/bookings/user/:userId        -> bookings count + upcoming preview
//   GET /api/chat/conversations/:userId   -> messages count
//   GET /api/requests/mine/:requesterId   -> "My Requests" count
//   PATCH /api/users/:id                  -> used by "Edit Profile" (name/bio/city)
//
// Local-only (not backend-synced):
//   "Saved Artists" reads from localStorage "favorites", written by
//   AppContext.jsx. There's no server-side favorites endpoint in this
//   codebase yet, so this count/list won't be the same on another device
//   or browser. Wire up a real /api/users/:id/favorites route if you want
//   this to be a true saved-artists feature.
//
// Stubs (no backend yet â€” shown honestly, not faked):
//   Payment Methods, Settings, Help & Support
//
// Add this route to App.jsx if it isn't there yet:
//   import Profile from "./pages/Profile";
//   <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Bell,
  ChevronRight,
  Calendar,
  Heart,
  MessageCircle,
  Sparkles,
  UserCog,
  Bookmark,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  Star,
} from "lucide-react";
import { getCurrentAccount, logout } from "../utils/auth";
import BottomNav from "../BottomNav";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

function readFavorites() {
  try {
    return JSON.parse(localStorage.getItem("favorites") || "[]");
  } catch {
    return [];
  }
}

export default function Profile() {
  const navigate = useNavigate();
  const account = getCurrentAccount();
  const accountId = account?._id || account?.id;

  const [bookings, setBookings] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [favorites] = useState(readFavorites());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountId) {
      navigate("/login");
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [bookingsRes, convRes, reqRes] = await Promise.allSettled([
        axios.get(`${API}/api/bookings/user/${accountId}`),
        axios.get(`${API}/api/chat/conversations/${accountId}`),
        axios.get(`${API}/api/requests/mine/${accountId}`),
      ]);
      if (cancelled) return;

      if (bookingsRes.status === "fulfilled") setBookings(bookingsRes.value.data || []);
      if (convRes.status === "fulfilled") setConversations(convRes.value.data || []);
      if (reqRes.status === "fulfilled") setRequests(reqRes.value.data || []);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accountId, navigate]);

  const upcoming = bookings
    .filter((b) => !["confirmed", "cancelled"].includes(b.status))
    .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
    .slice(0, 2);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const stats = [
    { label: "Bookings", value: bookings.length, Icon: Calendar, onClick: () => navigate("/my-bookings") },
    { label: "Saved Artists", value: favorites.length, Icon: Heart, onClick: () => {} },
    { label: "Messages", value: conversations.length, Icon: MessageCircle, onClick: () => navigate("/user-chat") },
    { label: "My Requests", value: requests.length, Icon: Sparkles, onClick: () => navigate("/search") },
  ];

  const menu = [
    { label: "Edit Profile", Icon: UserCog, onClick: () => alert("Hook this up to PATCH /api/users/:id with a form.") },
    { label: "Saved Artists", Icon: Bookmark, onClick: () => {} },
    { label: "Payment Methods", Icon: CreditCard, onClick: () => alert("No backend for payment methods yet.") },
    { label: "Settings", Icon: Settings, onClick: () => alert("No settings backend yet.") },
    { label: "Help & Support", Icon: HelpCircle, onClick: () => alert("No support backend yet.") },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FBF3E7] pb-28">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -top-16 -right-10 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute top-1/3 -left-16 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute bottom-24 -right-16 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200/60 bg-[#FBF3E7]/90 px-5 py-4 backdrop-blur">
          <h1 className="font-serif text-xl font-semibold text-stone-900">Profile</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/activity")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:bg-white/70"
              aria-label="Activity"
            >
              <Bell size={19} strokeWidth={1.8} />
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-600"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Profile card */}
        <div className="mx-5 mt-4 flex items-center gap-4 rounded-3xl border border-stone-200/70 bg-white/90 p-5 shadow-sm">
          <img
            src={account?.profileImage || account?.image || "https://i.pravatar.cc/150"}
            alt={account?.name || "Profile"}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-orange-100"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-lg font-semibold text-stone-900">{account?.name || "Your name"}</p>
            <p className="truncate text-xs text-stone-400">{account?.email}</p>
            {account?.city && <p className="mt-0.5 text-xs text-violet-500">{account.city}</p>}
          </div>
          {account?.rating != null && (
            <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600">
              <Star size={12} className="fill-amber-500 text-amber-500" />
              {Number(account.rating).toFixed(1)}
            </span>
          )}
        </div>

        {/* Stats grid */}
        <div className="mx-5 mt-4 grid grid-cols-4 gap-2">
          {stats.map(({ label, value, Icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-stone-200/70 bg-white/90 py-3.5 shadow-sm"
            >
              <Icon size={17} strokeWidth={1.8} className="text-violet-600" />
              <span className="text-base font-bold text-stone-900">{loading ? "â€“" : value}</span>
              <span className="text-center text-[10px] leading-tight text-stone-400">{label}</span>
            </button>
          ))}
        </div>

        {/* Upcoming bookings */}
        <div className="mx-5 mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-stone-800">Upcoming Bookings</h2>
            <button onClick={() => navigate("/my-bookings")} className="text-xs font-medium text-violet-600">
              View all
            </button>
          </div>

          {loading && <p className="py-6 text-center text-xs text-stone-400">Loadingâ€¦</p>}
          {!loading && upcoming.length === 0 && (
            <p className="rounded-2xl border border-stone-200/70 bg-white/70 py-6 text-center text-xs text-stone-400">
              No upcoming bookings yet.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {upcoming.map((b) => (
              <button
                key={b._id}
                onClick={() => navigate("/my-bookings")}
                className="flex items-center justify-between rounded-2xl border border-stone-200/70 bg-white/90 px-4 py-3 text-left shadow-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-900">{b.eventType}</p>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {b.eventDate} {b.eventTime ? `Â· ${b.eventTime}` : ""}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-stone-400">{b.location}</p>
                </div>
                <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-600">
                  {b.status.replace(/_/g, " ")}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Menu */}
        <div className="mx-5 mt-6 overflow-hidden rounded-2xl border border-stone-200/70 bg-white/90 shadow-sm">
          {menu.map(({ label, Icon, onClick }, i) => (
            <button
              key={label}
              onClick={onClick}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
                i !== menu.length - 1 ? "border-b border-stone-100" : ""
              }`}
            >
              <Icon size={17} strokeWidth={1.8} className="text-stone-500" />
              <span className="flex-1 text-sm text-stone-800">{label}</span>
              <ChevronRight size={16} className="text-stone-300" />
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="mx-5 mt-4 flex w-[calc(100%-2.5rem)] items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 py-3 text-sm font-semibold text-rose-600"
        >
          <LogOut size={16} strokeWidth={2} />
          Logout
        </button>
      </div>

      <BottomNav activeTab="profile" />
    </div>
  );
}