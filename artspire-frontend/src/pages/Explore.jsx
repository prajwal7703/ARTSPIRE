// artspire-frontend/src/pages/Explore.jsx
//
// "Near You" tab: pick a category, see which artists in that category are
// online near you on a real map, tap a pin to open a booking sheet, submit
// a real Booking (pending_approval) straight into your existing negotiate
// → pay → confirm pipeline in bookingRoutes.js / BookingPageMobile.jsx.
//
// Install once:  npm install leaflet react-leaflet
//
// Requires the /nearby patch in artistRoutes-nearby-patch.js (adds
// ?category= and ?onlineOnly= filtering — nothing else about that route
// changes, response shape is untouched).
//
// Wire it up in your router, e.g.:
//   <Route path="/explore" element={<Explore />} />
// and point the map icon in BottomNav + the "Find Nearby Artists" card on
// your home page at "/explore" — right now nothing links to it, which is
// why the map isn't showing up on your deployed site.
//
// IMPORTANT socket fix included here: your server's `join_room` handler
// joins whatever room name it's given, but bookingRoutes.js emits to
// `artist_${id}` / `user_${id}` while the rest of the app (Home.jsx) only
// joins the raw id. This page joins BOTH the raw id room (existing request
// notifications keep working) and the `user_${id}` room (so booking_offer /
// booking_confirmed / booking_cancelled actually reach this user). Ideally
// this join belongs somewhere app-wide (a layout/App.jsx effect) rather
// than just this page — flagging that, not fixing it here since it's out
// of this file's scope.

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCurrentAccount, isArtist } from "../utils/auth";
import BottomNav from "../BottomNav";
import socket from "../socket";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const FALLBACK_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bengaluru — used if geolocation is denied

// Edit this list to match the categories your artists actually pick at signup
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
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

function createArtistIcon(artist) {
  const name = escapeHtml(artist.name || "Artist");
  const initial = (artist.name || "?").trim()[0]?.toUpperCase() || "?";
  const avatarHtml = artist.avatar
    ? `<img src="${escapeHtml(artist.avatar)}" class="artist-avatar" />`
    : `<div class="artist-avatar-fallback">${initial}</div>`;
  const category = escapeHtml(artist.categories?.[0] || "Artist");

  const html = `
    <div class="artist-pin-card">
      <div class="artist-pin-avatar-wrap">
        ${avatarHtml}
        <span class="artist-online-dot"></span>
      </div>
      <div class="artist-pin-name">${name}</div>
      <div class="artist-pin-cat">${category}</div>
    </div>
    <div class="pin-tail"></div>
  `;

  return L.divIcon({ html, className: "artist-pin", iconSize: [86, 92], iconAnchor: [43, 92] });
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
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [areaQuery, setAreaQuery] = useState("");

  const [selectedArtist, setSelectedArtist] = useState(null); // summary from the pin
  const [artistDetail, setArtistDetail] = useState(null);     // full profile, incl. basePrice
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

  const fetchNearby = useCallback(async (lat, lng, radius = 25000, cat = category) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/artists/nearby`, {
        params: { lat, lng, radius, category: cat, onlineOnly: true },
      });
      setArtists(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load nearby artists:", e);
    } finally {
      setLoading(false);
      setShowSearchArea(false);
    }
  }, [category]);

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
    setShowSearchArea(true);
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

  const recenterOnMe = () => {
    if (!youLocation || !mapRef.current) return;
    mapRef.current.setView([youLocation.lat, youLocation.lng], 14, { animate: true });
    fetchNearby(youLocation.lat, youLocation.lng, 25000, category);
  };

  // ── tap a pin: load full profile, prefill the booking sheet ────────────
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

    // best-effort reverse geocode of the user's current position as a
    // starting point for the "location" field — editable either way
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
        eventType: artistDetail?.categories?.[0] || category !== "All" ? category : (selectedArtist.categories?.[0] || "Artwork"),
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
            <SearchIcon size={18} stroke="#0B0F1A" />
          </button>
        </div>
        <div style={styles.tabRow}>
          <button style={styles.tabBtn} onClick={() => navigate("/")}>For You</button>
          <button style={styles.tabBtn} onClick={() => navigate("/following")}>Following</button>
          <button style={{ ...styles.tabBtn, ...styles.tabBtnActive }}>Near You</button>
        </div>
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

      {/* ══ Map ══ */}
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
        {!locating && !loading && artists.length === 0 && (
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

        <button style={styles.recenterBtn} onClick={recenterOnMe} aria-label="Recenter on me">
          <LocateIcon />
        </button>

        {showSearchArea && (
          <button style={styles.searchAreaFloating} onClick={handleSearchArea}>
            {loading ? "Searching…" : "Search this area"}
          </button>
        )}
      </div>

      <div style={{ height: 96 }} />
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
                {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function LocateIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#0B0F1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
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
        width: 68px; background: #fff; border-radius: 14px; padding: 6px 4px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.2); border: 1px solid rgba(0,0,0,0.06);
        display: flex; flex-direction: column; align-items: center; text-align: center;
      }
      .artist-pin-avatar-wrap { position: relative; }
      .artist-avatar, .artist-avatar-fallback {
        width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid #D9662B;
      }
      .artist-avatar-fallback {
        background: #D9662B; color: #fff; font-size: 15px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
      }
      .artist-online-dot {
        position: absolute; bottom: -1px; right: -1px; width: 10px; height: 10px;
        border-radius: 50%; background: #22C55E; border: 2px solid #fff;
      }
      .artist-pin-name {
        font-size: 9.5px; font-weight: 800; color: #0B0F1A; margin-top: 4px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
      }
      .artist-pin-cat { font-size: 8px; font-weight: 600; color: #8291AC; margin-top: 1px; }
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

  chipRow: { display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  chip: {
    flexShrink: 0, background: "#131B2C", color: MUTE, border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  },
  chipActive: { background: CLAY, color: "#fff", border: `1px solid ${CLAY}` },

  mapWrap: { position: "relative", width: "100%", height: "calc(100vh - 320px)", minHeight: 340 },
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
  recenterBtn: {
    position: "absolute", right: 14, bottom: 14, zIndex: 500,
    width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  },
  searchAreaFloating: {
    position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", zIndex: 500,
    background: CLAY, color: "#fff", border: "none", borderRadius: 999,
    padding: "10px 20px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
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