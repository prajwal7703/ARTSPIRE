// artspire-frontend/src/pages/Activity.jsx
//
// Real data only:
//   GET /api/notifications/:accountId          list (works for user OR artist ids)
//   PUT /api/notifications/:accountId/read-all mark everything read
//   PUT /api/notifications/:id/read            mark one read
//
// NOTE: your Notification model only stores { type, fromName, message, read,
// createdAt } â€” there's no "booking" or "message" bucket, and unread message
// counts aren't tracked server-side (chatController.js always returns
// unread: 0 by design, tracked live via socket instead). So instead of fake
// tabs with no data behind them, this page has All / Unread tabs (both real)
// plus a per-type icon so it still reads like an activity feed.
//
// Add this route to App.jsx if it isn't there yet:
//   import Activity from "./pages/Activity";
//   <Route path="/activity" element={<RequireAuth><Activity /></RequireAuth>} />

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Bell, Heart, MessageSquare, Wallet, Sparkles, Star, CheckCheck } from "lucide-react";
import { getCurrentAccount } from "../utils/auth";
import BottomNav from "../BottomNav";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function iconFor(type) {
  switch (type) {
    case "like":
      return { Icon: Heart, bg: "bg-rose-100", fg: "text-rose-500" };
    case "request":
    case "request_response":
      return { Icon: Sparkles, bg: "bg-violet-100", fg: "text-violet-600" };
    case "withdrawal_request":
      return { Icon: Wallet, bg: "bg-amber-100", fg: "text-amber-600" };
    case "review":
      return { Icon: Star, bg: "bg-emerald-100", fg: "text-emerald-600" };
    case "message":
      return { Icon: MessageSquare, bg: "bg-sky-100", fg: "text-sky-600" };
    default:
      return { Icon: Bell, bg: "bg-stone-100", fg: "text-stone-500" };
  }
}

export default function Activity() {
  const navigate = useNavigate();
  const account = getCurrentAccount();
  const accountId = account?._id || account?.id;

  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all"); // "all" | "unread"
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!accountId) {
      navigate("/login");
      return;
    }
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");
        const { data } = await axios.get(`${API}/api/notifications/${accountId}`);
        if (!cancelled) setNotifs(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load notifications:", e);
        if (!cancelled) setError("Couldn't load notifications.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accountId, navigate]);

  const unreadCount = useMemo(() => notifs.filter((n) => !n.read).length, [notifs]);
  const visible = useMemo(() => (tab === "unread" ? notifs.filter((n) => !n.read) : notifs), [notifs, tab]);

  const markOneRead = async (n) => {
    if (n.read) return;
    setNotifs((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
    try {
      await axios.put(`${API}/api/notifications/${n._id}/read`);
    } catch (e) {
      console.error("Mark read failed:", e);
      setNotifs((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: false } : x)));
    }
  };

  const markAllRead = async () => {
    if (!accountId || unreadCount === 0) return;
    setMarkingAll(true);
    const prevState = notifs;
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await axios.put(`${API}/api/notifications/${accountId}/read-all`);
    } catch (e) {
      console.error("Mark all read failed:", e);
      setNotifs(prevState);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FBF3E7] pb-28">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -top-16 -right-10 h-64 w-64 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute top-1/3 -left-16 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
      </div>

      <div className="relative z-10">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200/60 bg-[#FBF3E7]/90 px-5 py-4 backdrop-blur">
          <h1 className="font-serif text-xl font-semibold text-stone-900">Activity</h1>
          <button
            onClick={markAllRead}
            disabled={markingAll || unreadCount === 0}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-600 disabled:text-stone-300"
          >
            <CheckCheck size={15} strokeWidth={2} />
            Mark all read
          </button>
        </header>

        <div className="flex gap-2 px-5 py-4">
          <button
            onClick={() => setTab("all")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              tab === "all" ? "bg-violet-600 text-white" : "bg-white text-stone-500 border border-stone-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTab("unread")}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              tab === "unread" ? "bg-violet-600 text-white" : "bg-white text-stone-500 border border-stone-200"
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span
                className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  tab === "unread" ? "bg-white/25 text-white" : "bg-violet-100 text-violet-600"
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {loading && <p className="px-5 py-10 text-center text-sm text-stone-400">Loading activityâ€¦</p>}
        {!loading && error && <p className="px-5 py-10 text-center text-sm text-rose-500">{error}</p>}
        {!loading && !error && visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <Bell size={28} className="text-stone-300" strokeWidth={1.5} />
            <p className="text-sm text-stone-400">
              {tab === "unread" ? "You're all caught up." : "No activity yet."}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2 px-5">
          {visible.map((n) => {
            const { Icon, bg, fg } = iconFor(n.type);
            return (
              <button
                key={n._id}
                onClick={() => markOneRead(n)}
                className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  n.read ? "border-stone-200/70 bg-white/70" : "border-violet-200 bg-white shadow-sm"
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
                  <Icon size={17} strokeWidth={2} className={fg} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-stone-800">
                    <span className="font-semibold">{n.fromName || "Someone"}</span>{" "}
                    {n.message?.startsWith(n.fromName) ? n.message.slice((n.fromName || "").length).trim() : n.message}
                  </span>
                  <span className="mt-0.5 block text-xs text-stone-400">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />}
              </button>
            );
          })}
        </div>
      </div>

      <BottomNav activeTab="activity" />
    </div>
  );
}