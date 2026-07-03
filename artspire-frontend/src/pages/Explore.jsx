// artspire-frontend/src/pages/Explore.jsx
//
// "Near You" tab — live map of online artists, matching the RAISE REQUEST /
// SEARCH AREA mockup. Real data only: pins come from
//   GET /api/artists/nearby?lat=&lng=&radius=&category=&onlineOnly=true
// tapping a pin opens the booking sheet, which POSTs to /api/bookings.
//
// REQUIRES ON THE BACKEND (if the map looks empty, check these first):
//   1. bookingRoutes mounted in server.js:
//        const bookingRoutes = require("./routes/bookingRoutes");
//        app.use("/api/bookings", bookingRoutes);
//   2. Artist schema has a 2dsphere index:
//        ArtistSchema.index({ location: "2dsphere" });
//   3. Artists actually have `location.coordinates` set AND `locationUpdatedAt`
//      refreshed within the last 20 minutes — otherwise onlineOnly=true
//      returns an empty array (that's correct behavior, not a bug).
//   4. /nearby route patched to accept ?category= and ?onlineOnly= (see
//      artistRoutes.js patch already discussed).
//
// Install once:  npm install leaflet react-leaflet
//
// Adjust the two paths below marked ADJUST-ME if your project structure
// differs from what's assumed here.

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCurrentAccount, isArtist } from "../utils/auth"; // ADJUST-ME if path differs
import BottomNav from "../BottomNav";                          // ADJUST-ME if path differs
import socket from "../socket";                                  // ADJUST-ME if path differs

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const FALLBACK_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bengaluru — used if geolocation is denied

const CATEGORIES = [
  "All",
  "Painter",
  "Sketch Artist",
  "Portrait Artist",
  "Tattoo Artist",
  "Digital Artist",
  "Muralist",
  "Illustrator",
];

const DURATIONS = ["1 hour", "2 hours", "3 hours", "Half day", "Full day"];

const getActor = () => {
  const account = getCurrentAccount();
  if (!account?._id) return null;
  return {
    id: account._id,
    name: account.name,
    email: account.email,
    avatar: account.avatar || account.image,
    role: isArtist() ? "artist" : "user",
  };
};

function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 8000 }
    );
  });
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function boundsToRadiusMeters(bounds, center) {
  const ne = bounds.getNorthEast();
  const R = 6371000;
  const dLat = ((ne.lat - center.lat) * Math.PI) / 180;
  const dLng = ((ne.lng - center.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((center.lat * Math.PI) / 180) * Math.cos((ne.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.max(1000, Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
}

// ── "You" marker: blue arrow + pill label, matches mockup ──────────────
const youIcon = L.divIcon({
  className: "you-pin",
  html: `
    <div class="you-wrap">
      <div class="you-dot">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M12 2 L20 20 L12 16 L4 20 Z"/></svg>
      </div>
      <span class="you-label">You</span>
    </div>
  `,
  iconSize: [46, 46],
  iconAnchor: [23, 23],
});

// ── Artist marker: square artwork/avatar thumbnail card + name, matches mockup ──
function createArtistIcon(artist) {
  const name = escapeHtml(artist.name || "Artist");
  const initial = (artist.name || "?").trim()[0]?.toUpperCase() || "?";
  const thumb = artist.portfolioPreview || artist.avatar || artist.profileImage || artist.image;
  const thumbHtml = thumb
    ? `<img src="${escapeHtml(thumb)}" class="artist-thumb-img" />`
    : `<div class="artist-thumb-fallback">${initial}</div>`;

  const html = `
    <div class="artist-pin-card">
      <div class="artist-thumb-wrap">
        ${thumbHtml}
        <span class="artist-online-dot"></span>
      </div>
      <div class="artist-pin-name">${name}</div>
    </div>
    <div class="pin-tail"></div>
  `;

  return L.divIcon({ html, className: "artist-pin", iconSize: [72, 84], iconAnchor: [36, 84] });
}

function MapWatcher({ onMoved }) {
  useMapEvents({ moveend: (e) => onMoved(e.target) });
  return null;
}

export default function Explore() {
  const navigate = useNavigate();
  const actor = getActor();
  const mapRef = useRef(null);

  const [center, setCenter] = useState(FALLBACK_CENTER);
  const [youLocation, setYouLocation] = useState(null);
  const [locating, setLocating] = useState(true);
  const [category, setCategory] = useState("All");
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [areaQuery, setAreaQuery] = useState("");

  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistDetail, setArtistDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [duration, setDuration] = useState(DURATIONS[1]);
  const [bookLocation, setBookLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  const [bookedToast, setBookedToast] = useState(false);

  // Join both the raw-id room (existing request notifications) and the
  // user_/artist_-prefixed room bookingRoutes.js actually emits to.
  useEffect(() => {
    if (!actor?.id) return;
    socket.emit("join_room", actor.id);
    socket.emit("join_room", actor.role === "artist" ? `artist_${actor.id}` : `user_${actor.id}`);
  }, [actor?.id, actor?.role]);

  const fetchNearby = useCallback(
    async (lat, lng, radius = 25000, cat = category) => {
      setLoading(true);
      setLoadError("");
      try {
        const { data } = await axios.get(`${API}/api/artists/nearby`, {
          params: { lat, lng, radius, category: cat, onlineOnly: true },
        });
        setArtists(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load nearby artists:", e);
        setLoadError(
          e.response?.status === 404
            ? "Nearby endpoint not found — check the backend route is deployed."
            : "Couldn't load nearby artists. Pull to retry."
        );
        setArtists([]);
      } finally {
        setLoading(false);
      }
    },
    [category]
  );

  useEffect(() => {
    getLocation()
      .then(({ lat, lng }) => {
        setYouLocation({ lat, lng });
        setCenter({ lat, lng });
        fetchNearby(lat, lng, 25000, category);
      })
      .catch(() => {
        setCenter(FALLBACK_CENTER);
        fetchNearby(FALLBACK_CENTER.lat, FALLBACK_CENTER.lng, 25000, category);
      })
      .finally(() => setLocating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    const c = mapRef.current ? mapRef.current.getCenter() : center;
    fetchNearby(c.lat, c.lng, 25000, cat);
  };

  const handleMapMoved = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const handleSearchArea = () => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const radius = boundsToRadiusMeters(map.getBounds(), c);
    fetchNearby(c.lat, c.lng, radius, category);
  };

  const handleAreaSearch = async (e) => {
    e.preventDefault();
    const q = areaQuery.trim();
    if (!q || !mapRef.current) return;
    try {
      const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
        params: { q, format: "json", limit: 1 },
      });
      if (data?.[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        mapRef.current.setView([lat, lng], 13, { animate: true });
        fetchNearby(lat, lng, 25000, category);
      }
    } catch (err) {
      console.error("Area search failed:", err);
    }
  };

  // ── RAISE REQUEST: matches the blue button in the mockup. Adjust the
  // destination route to wherever your app's general "post a request" flow
  // actually lives — /post is a placeholder guess.
  const handleRaiseRequest = () => {
    navigate("/post"); // ADJUST-ME to your real "raise a request" route
  };

  const openArtist = async (a) => {
    setSelectedArtist(a);
    setArtistDetail(null);
    setBookError("");
    setEventDate("");
    setEventTime("");
    setDuration(DURATIONS[1]);
    setNotes("");
    setBookLocation("Locating…");
    setLoadingDetail(true);

    try {
      const { data } = await axios.get(`${API}/api/artists/${a._id}`);
      setArtistDetail(data);
    } catch (e) {
      console.error("Failed to load artist profile:", e);
    } finally {
      setLoadingDetail(false);
    }

    const coords = youLocation || center;
    try {
      const { data } = await axios.get("https://nominatim.openstreetmap.org/reverse", {
        params: { lat: coords.lat, lon: coords.lng, format: "json" },
      });
      setBookLocation(data?.display_name || "");
    } catch {
      setBookLocation("");
    }
  };

  const closeSheet = () => {
    setSelectedArtist(null);
    setArtistDetail(null);
  };

  const handleSubmitBooking = async () => {
    if (!actor) return alert("Log in to book an artist.");
    if (!selectedArtist) return;
    if (!eventDate) return setBookError("Pick a date.");
    if (!bookLocation.trim()) return setBookError("Add a location.");

    setBooking(true);
    setBookError("");
    try {
      await axios.post(`${API}/api/bookings`, {
        artistId: selectedArtist._id,
        artistName: selectedArtist.name,
        userId: actor.id,
        userName: actor.name,
        userEmail: actor.email || "",
        eventType:
          artistDetail?.categories?.[0] ||
          (category !== "All" ? category : selectedArtist.categories?.[0] || "Artwork"),
        eventDate,
        eventTime,
        duration,
        location: bookLocation.trim(),
        basePrice: artistDetail?.basePrice || 0,
        notes: notes.trim(),
      });
      closeSheet();
      setBookedToast(true);
      setTimeout(() => setBookedToast(false), 4500);
    } catch (e) {
      console.error("Booking failed:", e);
      setBookError(e.response?.data?.error || "Couldn't send the request. Please try again.");
    } finally {
      setBooking(false);
    }
  };

  return (
    <div style={styles.page}>
      <GlobalStyles />

      {bookedToast && (
        <div style={styles.toast} onClick={() => navigate("/bookings")}>
          ✅ Request sent — tap to view in My Bookings
        </div>
      )}

      {/* ══ Top bar ══ */}
      <div style={styles.topBar}>
        <div style={styles.brandRow}>
          <span style={styles.brandName}>ArtSpire</span>
          <button style={styles.searchIconBtn} onClick={() => navigate("/search")} aria-label="Search">
            <SearchIcon size={16} stroke="#0B0F1A" />
          </button>
        </div>
        <div style={styles.tabRow}>
          <button style={styles.tabBtn} onClick={() => navigate("/")}>For You</button>
          <button style={styles.tabBtn} onClick={() => navigate("/following")}>Following</button>
          <button style={{ ...styles.tabBtn, ...styles.tabBtnActive }}>Near You</button>
        </div>
      </div>

      {/* ══ Search this area bar ══ */}
      <div style={styles.mapWrap}>
        <form style={styles.areaBar} onSubmit={handleAreaSearch}>
          <SearchIcon size={14} stroke="#8291AC" />
          <input
            style={styles.areaInput}
            placeholder="Search near this area"
            value={areaQuery}
            onChange={(e) => setAreaQuery(e.target.value)}
          />
        </form>

        {locating && <div style={styles.mapOverlayMsg}>Finding your location…</div>}
        {!locating && !loading && loadError && <div style={styles.mapOverlayMsg}>{loadError}</div>}
        {!locating && !loading && !loadError && artists.length === 0 && (
          <div style={styles.mapOverlayMsg}>
            No {category !== "All" ? category.toLowerCase() + " " : ""}artists online near here yet.
          </div>
        )}

        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          style={styles.map}
          zoomControl={false}
          attributionControl={false}
          ref={(instance) => {
            if (instance) mapRef.current = instance;
          }}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
          <MapWatcher onMoved={handleMapMoved} />

          {youLocation && <Marker position={[youLocation.lat, youLocation.lng]} icon={youIcon} />}

          {artists
            .filter((a) => a.location?.coordinates?.length === 2)
            .map((a) => (
              <Marker
                key={a._id}
                position={[a.location.coordinates[1], a.location.coordinates[0]]}
                icon={createArtistIcon(a)}
                eventHandlers={{ click: () => openArtist(a) }}
              />
            ))}
        </MapContainer>
      </div>

      {/* ══ Category chips ══ */}
      <div style={styles.chipRow}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            style={{ ...styles.chip, ...(category === cat ? styles.chipActive : {}) }}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ══ RAISE REQUEST / SEARCH AREA — matches mockup ══ */}
      <div style={styles.actionRow}>
        <button style={styles.raiseBtn} onClick={handleRaiseRequest}>
          <RequestIcon /> RAISE REQUEST
        </button>
        <button style={styles.searchAreaBtn} onClick={handleSearchArea} disabled={loading}>
          <SearchIcon size={15} stroke="#fff" /> {loading ? "SEARCHING…" : "SEARCH AREA"}
        </button>
      </div>

      <div style={{ height: 8 }} />
      <BottomNav activeTab="explore" />

      {/* ══ Booking sheet ══ */}
      {selectedArtist && (
        <div style={styles.sheetBackdrop} onClick={closeSheet}>
          <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.sheetHandle} />
            <div style={styles.sheetHead}>
              {selectedArtist.avatar || selectedArtist.profileImage || selectedArtist.image ? (
                <img
                  src={selectedArtist.avatar || selectedArtist.profileImage || selectedArtist.image}
                  alt=""
                  style={styles.sheetAvatar}
                />
              ) : (
                <div style={styles.sheetAvatarFallback}>{(selectedArtist.name || "?")[0]?.toUpperCase()}</div>
              )}
              <div>
                <div style={styles.sheetName}>{selectedArtist.name}</div>
                <div style={styles.sheetMeta}>
                  <span style={styles.onlineDot} /> Online now · {(selectedArtist.categories || []).join(", ") || "Artist"}
                  {artistDetail?.basePrice ? ` · from ₹${Number(artistDetail.basePrice).toLocaleString()}` : ""}
                </div>
              </div>
            </div>

            <div style={styles.sheetBody}>
              <div style={styles.fieldRow}>
                <div style={styles.field}>
                  <label style={styles.label}>Date</label>
                  <input type="date" style={styles.input} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Time</label>
                  <input type="time" style={styles.input} value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
                </div>
              </div>

              <label style={styles.label}>Duration</label>
              <select style={styles.input} value={duration} onChange={(e) => setDuration(e.target.value)}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <label style={styles.label}>Location</label>
              <input
                style={styles.input}
                placeholder="Where should they come?"
                value={bookLocation}
                onChange={(e) => setBookLocation(e.target.value)}
              />

              <label style={styles.label}>Notes (optional)</label>
              <textarea
                style={{ ...styles.input, resize: "none" }}
                rows={3}
                placeholder="e.g. portrait sketch, A4 size, reference photo attached"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              {bookError && <div style={styles.errorBox}>{bookError}</div>}
            </div>

            <button style={styles.bookBtn} onClick={handleSubmitBooking} disabled={booking || loadingDetail}>
              {booking ? "Sending…" : `Request Booking${artistDetail?.basePrice ? ` · from ₹${Number(artistDetail.basePrice).toLocaleString()}` : ""}`}
            </button>
            <button style={styles.viewProfileBtn} onClick={() => navigate(`/dashboard/${selectedArtist._id}`)}>
              View full profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── icons ────────────────────────────────────────────────────────────── */
function SearchIcon({ size = 18, stroke = "#1a1a1a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.4" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function RequestIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M12 12v6M9 15h6" />
    </svg>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      .leaflet-container { background: #EAEDF2; font-family: 'Inter', sans-serif; }

      .you-wrap { display: flex; flex-direction: column; align-items: center; gap: 3px; }
      .you-dot {
        width: 26px; height: 26px; border-radius: 50%;
        background: #2E6BE6; border: 3px solid #fff;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
      }
      .you-label {
        font-size: 10px; font-weight: 700; color: #0B0F1A; background: #fff;
        padding: 1px 6px; border-radius: 999px; box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      }

      .artist-pin { cursor: pointer; }
      .artist-pin-card {
        width: 56px; background: #fff; border-radius: 12px; padding: 4px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.22); border: 1px solid rgba(0,0,0,0.06);
        display: flex; flex-direction: column; align-items: center; text-align: center;
      }
      .artist-thumb-wrap { position: relative; width: 48px; height: 48px; }
      .artist-thumb-img, .artist-thumb-fallback {
        width: 48px; height: 48px; border-radius: 8px; object-fit: cover;
      }
      .artist-thumb-fallback {
        background: #D9662B; color: #fff; font-size: 16px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
      }
      .artist-online-dot {
        position: absolute; bottom: -2px; right: -2px; width: 11px; height: 11px;
        border-radius: 50%; background: #22C55E; border: 2px solid #fff;
      }
      .artist-pin-name {
        font-size: 9px; font-weight: 700; color: #0B0F1A; margin-top: 4px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
      }
      .pin-tail {
        width: 9px; height: 9px; background: #fff; margin: -5px auto 0;
        transform: rotate(45deg); border-right: 1px solid rgba(0,0,0,0.06);
        border-bottom: 1px solid rgba(0,0,0,0.06);
      }
    `}</style>
  );
}

const INK = "#0B0F1A";
const CLAY = "#D9662B";
const BLUE = "#2E6BE6";
const MUTE = "#8291AC";

const styles = {
  page: { fontFamily: "'Inter', sans-serif", background: INK, minHeight: "100vh", color: "#fff" },

  toast: {
    position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 900,
    background: "#131B2C", color: "#fff", padding: "10px 18px", borderRadius: 999,
    fontSize: 13, fontWeight: 600, boxShadow: "0 6px 20px rgba(0,0,0,0.4)", cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.08)", maxWidth: "88vw", textAlign: "center",
  },

  topBar: { padding: "16px 18px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  brandRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  brandName: { fontWeight: 800, fontSize: 20, color: "#fff" },
  searchIconBtn: { background: "#fff", border: "none", cursor: "pointer", padding: 8, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" },
  tabRow: { display: "flex", gap: 22, marginTop: 14 },
  tabBtn: { background: "none", border: "none", padding: 0, paddingBottom: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, color: MUTE },
  tabBtnActive: { color: "#fff", borderBottom: `2px solid ${CLAY}` },

  mapWrap: { position: "relative", width: "100%", height: "44vh", minHeight: 300 },
  map: { width: "100%", height: "100%" },
  areaBar: {
    position: "absolute", top: 12, left: 14, right: 14, zIndex: 500,
    display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 999,
    padding: "10px 16px", boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
  },
  areaInput: { flex: 1, border: "none", outline: "none", fontSize: 13.5, color: "#0B0F1A", background: "transparent" },
  mapOverlayMsg: {
    position: "absolute", top: 66, left: "50%", transform: "translateX(-50%)", zIndex: 500,
    background: "#fff", color: "#0B0F1A", padding: "8px 16px", borderRadius: 999,
    fontSize: 12.5, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", textAlign: "center", maxWidth: "80%",
  },

  chipRow: { display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto" },
  chip: {
    flexShrink: 0, background: "#131B2C", color: MUTE, border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  },
  chipActive: { background: CLAY, color: "#fff", border: `1px solid ${CLAY}` },

  actionRow: { display: "flex", gap: 10, padding: "0 16px 12px" },
  raiseBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: BLUE, color: "#fff", border: "none", borderRadius: 14,
    padding: "13px 10px", fontSize: 12.5, fontWeight: 800, letterSpacing: 0.4, cursor: "pointer",
  },
  searchAreaBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: CLAY, color: "#fff", border: "none", borderRadius: 14,
    padding: "13px 10px", fontSize: 12.5, fontWeight: 800, letterSpacing: 0.4, cursor: "pointer",
  },

  sheetBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 800, display: "flex", alignItems: "flex-end" },
  sheet: {
    width: "100%", maxHeight: "88vh", overflowY: "auto", background: "#131B2C",
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: "10px 18px 26px",
    boxShadow: "0 -8px 24px rgba(0,0,0,0.4)", boxSizing: "border-box",
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 999, background: "rgba(255,255,255,0.2)", margin: "0 auto 16px" },
  sheetHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  sheetAvatar: { width: 50, height: 50, borderRadius: "50%", objectFit: "cover" },
  sheetAvatarFallback: {
    width: 50, height: 50, borderRadius: "50%", background: CLAY, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18,
  },
  sheetName: { fontWeight: 800, fontSize: 16, color: "#fff" },
  sheetMeta: { fontSize: 12, color: MUTE, marginTop: 3, display: "flex", alignItems: "center", gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: "50%", background: "#22C55E", display: "inline-block" },

  sheetBody: { display: "flex", flexDirection: "column", gap: 4 },
  fieldRow: { display: "flex", gap: 10 },
  field: { flex: 1 },
  label: { fontSize: 11, fontWeight: 700, color: MUTE, textTransform: "uppercase", letterSpacing: 0.5, display: "block", margin: "10px 0 5px" },
  input: {
    width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10, color: "#fff", fontSize: 13.5, padding: "10px 12px", outline: "none",
    fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
  },
  errorBox: { background: "rgba(239,68,68,0.12)", color: "#FCA5A5", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, marginTop: 10 },

  bookBtn: {
    width: "100%", background: BLUE, color: "#fff", border: "none", borderRadius: 14,
    padding: "14px", fontSize: 14, fontWeight: 800, cursor: "pointer", marginTop: 16, marginBottom: 8,
  },
  viewProfileBtn: {
    width: "100%", background: "transparent", color: MUTE, border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer",
  },
};