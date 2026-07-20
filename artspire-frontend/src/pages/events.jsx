import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Star,
} from "lucide-react";

// Same fallback pattern as Home.jsx / socket.js
const API_BASE = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

// Same background image used on Home — keep in sync if you change it there.
const BG_IMAGE_SRC = "/artspire-bg.jpeg";

const F_LOGO   = { fontFamily: "'Playfair Display', Georgia, serif" };
const F_META   = { fontFamily: "'Nunito', sans-serif" };
const F_TITLE  = { fontFamily: "'Playfair Display', Georgia, serif" };
const F_TAB    = { fontFamily: "'Nunito', sans-serif", fontWeight: 700 };

const TABS = ["Upcoming", "Past"];

function formatDateBadge(dateStr) {
  if (!dateStr) return { day: "--", month: "" };
  const d = new Date(dateStr);
  return {
    day: d.getDate(),
    month: d.toLocaleString(undefined, { month: "short" }).toUpperCase(),
  };
}

function formatDateLine(startStr, endStr) {
  if (!startStr) return "";
  const start = new Date(startStr);
  const opts = { weekday: "short", hour: "numeric", minute: "2-digit" };
  let line = start.toLocaleString(undefined, opts);
  if (endStr) {
    const end = new Date(endStr);
    line += ` – ${end.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  return line;
}

export default function Events() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("Upcoming");
  const [events, setEvents] = useState([]);
  const [interested, setInterested] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || localStorage.getItem("artist") || "null");
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      try {
        setLoading(true);
        setError("");
        // Expects a backend route like: GET /api/events?scope=upcoming|past
        const scope = tab === "Upcoming" ? "upcoming" : "past";
        const res = await fetch(`${API_BASE}/api/events?scope=${scope}`);
        if (!res.ok) throw new Error("Failed to load events");
        const data = await res.json();
        if (cancelled) return;

        const list = data.events || data || [];
        setEvents(list);

        const uid = currentUser?._id || currentUser?.id;
        if (uid) {
          const map = {};
          list.forEach((e) => {
            if (Array.isArray(e.interested) && e.interested.includes(uid)) map[e._id] = true;
          });
          setInterested(map);
        }
      } catch (err) {
        console.error("Events load error:", err);
        if (!cancelled) setError("Couldn't load events. Pull down to try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const toggleInterested = async (event) => {
    const uid = currentUser?._id || currentUser?.id;
    if (!uid) {
      navigate("/login");
      return;
    }

    const was = Boolean(interested[event._id]);
    setInterested((s) => ({ ...s, [event._id]: !was }));
    setEvents((prev) =>
      prev.map((e) =>
        e._id === event._id
          ? { ...e, interestedCount: (e.interestedCount || 0) + (was ? -1 : 1) }
          : e
      )
    );

    try {
      const res = await fetch(`${API_BASE}/api/events/${event._id}/interested`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: uid }),
      });
      if (!res.ok) throw new Error("Interested toggle failed");
    } catch (err) {
      console.error("Interested error:", err);
      // roll back on failure
      setInterested((s) => ({ ...s, [event._id]: was }));
      setEvents((prev) =>
        prev.map((e) =>
          e._id === event._id
            ? { ...e, interestedCount: (e.interestedCount || 0) + (was ? 1 : -1) }
            : e
        )
      );
    }
  };

  return (
    <div className="min-h-screen w-full bg-stone-200 flex justify-center">
      {/* Same phone-width column as Home.jsx, so this page matches on
          mobile and laptop instead of stretching wide. */}
      <div className="relative w-full max-w-[480px] min-h-screen overflow-x-hidden bg-[#FBF3E7] pb-10 shadow-2xl">
        {/* Background image, constrained to this column, same as Home */}
        <div className="pointer-events-none fixed inset-y-0 left-1/2 z-0 w-full max-w-[480px] -translate-x-1/2 overflow-hidden">
          {BG_IMAGE_SRC && (
            <>
              <img src={BG_IMAGE_SRC} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[#FBF3E7]/15" />
            </>
          )}
          <Star className="absolute top-24 right-10 h-4 w-4 text-stone-300" strokeWidth={1.5} />
          <Star className="absolute bottom-40 right-6 h-3 w-3 text-stone-300" strokeWidth={1.5} />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <header className="glass sticky top-0 z-30 flex items-center justify-between border-b border-white/30 px-5 py-4">
            <button
              aria-label="Back"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-stone-500 transition hover:bg-white/20"
            >
              <ArrowLeft size={20} strokeWidth={1.8} />
            </button>
            <h1 style={F_LOGO} className="text-xl italic tracking-tight text-stone-900">
              Events
            </h1>
            <div className="w-9" aria-hidden="true" />
          </header>

          {/* Upcoming / Past tabs */}
          <div className="flex gap-2 px-5 pt-5">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={F_TAB}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  tab === t
                    ? "bg-violet-600 text-white shadow-md shadow-violet-200/50"
                    : "glass text-stone-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* States */}
          {loading && (
            <p style={F_META} className="px-5 py-10 text-center text-sm text-stone-400">
              Loading events…
            </p>
          )}
          {!loading && error && (
            <p style={F_META} className="px-5 py-10 text-center text-sm text-rose-500">
              {error}
            </p>
          )}
          {!loading && !error && events.length === 0 && (
            <p style={F_META} className="px-5 py-10 text-center text-sm text-stone-400">
              No {tab.toLowerCase()} events right now.
            </p>
          )}

          {/* Event list */}
          <div className="flex flex-col gap-5 px-5 py-5">
            {events.map((event) => {
              const badge = formatDateBadge(event.startDate);
              return (
                <article key={event._id} className="glass-strong overflow-hidden rounded-3xl">
                  <div className="relative">
                    <img
                      src={event.coverImage || "https://placehold.co/600x300?text=Event"}
                      alt={event.title}
                      className="h-40 w-full object-cover"
                    />
                    <div className="glass-strong absolute left-3 top-3 flex w-12 flex-col items-center rounded-xl px-2 py-1 leading-none">
                      <span style={F_TITLE} className="text-lg font-bold text-violet-700">
                        {badge.day}
                      </span>
                      <span style={F_META} className="text-[10px] font-semibold uppercase text-stone-500">
                        {badge.month}
                      </span>
                    </div>
                  </div>

                  <div className="px-4 py-3.5">
                    <p style={F_TITLE} className="text-[17px] font-semibold text-stone-900">
                      {event.title}
                    </p>

                    <div className="mt-1.5 flex items-center gap-1.5 text-stone-500">
                      <Calendar size={14} strokeWidth={1.8} />
                      <span style={F_META} className="text-xs">
                        {formatDateLine(event.startDate, event.endDate)}
                      </span>
                    </div>

                    {event.location && (
                      <div className="mt-1 flex items-center gap-1.5 text-stone-500">
                        <MapPin size={14} strokeWidth={1.8} />
                        <span style={F_META} className="text-xs">{event.location}</span>
                      </div>
                    )}

                    {event.description && (
                      <p style={F_META} className="mt-2 text-sm text-stone-600">
                        {event.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-stone-500">
                        <Users size={15} strokeWidth={1.8} />
                        <span style={F_META} className="text-xs">
                          {(event.interestedCount || 0).toLocaleString()} interested
                        </span>
                      </div>
                      <button
                        onClick={() => toggleInterested(event)}
                        style={F_META}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                          interested[event._id]
                            ? "bg-violet-600 text-white"
                            : "glass text-violet-700"
                        }`}
                      >
                        {interested[event._id] ? "Interested" : "I'm interested"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}