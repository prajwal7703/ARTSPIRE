// artspire-frontend/src/pages/Explore.jsx
//
// "Near You" map — matches the Explore Artists mockup (purple pill filters,
// avatar pins with distance badges, Nearby Artists list below the map).
// Real data only: pins + list come from
//   GET /api/artists/nearby?lat=&lng=&radius=&category=&onlineOnly=true
// tapping a pin opens the booking sheet, which POSTs to /api/bookings.
// "View Profile" in the list navigates to /dashboard/:artistId.
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
//   4. /nearby route accepts ?category= and ?onlineOnly=.
//
// Install once:  npm install leaflet react-leaflet
//
// Paths marked ADJUST-ME assume your project structure — fix if it differs.

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  "All Categories",
  "Painter",
  "Sketch Artist",
  "Portrait Artist",
  "Tattoo Artist",
  "Digital Artist",
  "Muralist",
  "Illustrator",
];

const DISTANCES = [
  { label: "All Distance", km: 25 },
  { label: "Within 1 km", km: 1 },
  { label: "Within 3 km", km: 3 },
  { label: "Within 5 km", km: 5 },
  { label: "Within 10 km", km: 10 },
  { label: "Within 50 km", km: 50 },
];

const DURATIONS = ["1 hour", "2 hours", "3 hours", "Half day", "Full day"];

const PIN_RINGS = ["#EC4899", "#14B8A6", "#F59E0B", "#8B5CF6"]; // cycled per artist

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

// Haversine — straight-line km between two lat/lng points, used for the
// distance badges on pins and in the Nearby Artists list.
function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// ── "You" marker: purple dot with a soft pulse ring, matches mockup ─────
const youIcon = L.divIcon({
  className: "you-pin",
  html: `<div class="you-pulse"><div class="you-dot"></div></div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// ── Artist marker: round avatar with colored ring + distance pill below ──
function createArtistIcon(artist, ringColor, km) {
  const thumb = artist.portfolioPreview || artist.avatar || artist.profileImage || artist.image;
  const initial = (artist.name || "?").trim()[0]?.toUpperCase() || "?";
  const thumbHtml = thumb
    ? `<img src="${escapeHtml(thumb)}" class="pin-avatar-img" />`
    : `<div class="pin-avatar-fallback" style="background:${ringColor}">${initial}</div>`;
  const kmLabel = km != null ? `${km.toFixed(1)} km` : "";

  const html = `
    <div class="pin-wrap">
      <div class="pin-avatar-ring" style="border-color:${ringColor}">
        ${thumbHtml}
      </div>
      <div class="pin-badge">${kmLabel}</div>
    </div>
  `;

  return L.divIcon({ html, className: "artist-pin", iconSize: [64, 74], iconAnchor: [32, 40] });
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

  const [category, setCategory] = useState("All Categories");
  const [distanceKmFilter, setDistanceKmFilter] = useState(25);

  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

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

  useEffect(() => {
    if (!actor?.id) return;
    socket.emit("join_room", actor.id);
    socket.emit("join_room", actor.role === "artist" ? `artist_${actor.id}` : `user_${actor.id}`);
  }, [actor?.id, actor?.role]);

  const fetchNearby = useCallback(async (lat, lng, radiusMeters, cat) => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await axios.get(`${API}/api/artists/nearby`, {
        params: {
          lat,
          lng,
          radius: radiusMeters,
          category: cat === "All Categories" ? "All" : cat,
          onlineOnly: true,
        },
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
  }, []);

  useEffect(() => {
    getLocation()
      .then(({ lat, lng }) => {
        setYouLocation({ lat, lng });
        setCenter({ lat, lng });
        fetchNearby(lat, lng, distanceKmFilter * 1000, category);
      })
      .catch(() => {
        setCenter(FALLBACK_CENTER);
        fetchNearby(FALLBACK_CENTER.lat, FALLBACK_CENTER.lng, distanceKmFilter * 1000, category);
      })
      .finally(() => setLocating(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    const c = mapRef.current ? mapRef.current.getCenter() : center;
    fetchNearby(c.lat, c.lng, distanceKmFilter * 1000, cat);
  };

  const handleDistanceChange = (km) => {
    setDistanceKmFilter(km);
    const c = mapRef.current ? mapRef.current.getCenter() : center;
    fetchNearby(c.lat, c.lng, km * 1000, category);
    if (mapRef.current) {
      const zoom = km <= 1 ? 15 : km <= 5 ? 13 : km <= 10 ? 12 : 11;
      mapRef.current.setView([c.lat, c.lng], zoom, { animate: true });
    }
  };

  const handleRecenter = () => {
    if (!youLocation || !mapRef.current) return;
    mapRef.current.setView([youLocation.lat, youLocation.lng], 14, { animate: true });
    fetchNearby(youLocation.lat, youLocation.lng, distanceKmFilter * 1000, category);
  };

  const handleMapMoved = useCallback((map) => {
    mapRef.current = map;
  }, []);

  // ── Nearby Artists list — same data as the pins, sorted closest-first ───
  const nearbyList = useMemo(() => {
    const origin = youLocation || center;
    return artists
      .filter((a) => a.location?.coordinates?.length === 2)
      .map((a) => ({
        ...a,
        km: distanceKm(origin, { lat: a.location.coordinates[1], lng: a.location.coordinates[0] }),
      }))
      .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
  }, [artists, youLocation, center]);

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
          (category !== "All Categories" ? category : selectedArtist.categories?.[0] || "Artwork"),
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
          Request sent — tap to view in My Bookings
        </div>
      )}

      {/* ══ Header ══ */}
      <div style={styles.topBar}>
        <h1 style={styles.title}>Explore Artists</h1>
        <div style={styles.topBarIcons}>
          <button style={styles.iconBtn} onClick={() => navigate("/search")} aria-label="Search">
            <SearchIcon size={17} stroke="#1F2937" />
          </button>
          <button style={styles.iconBtn} onClick={handleRecenter} aria-label="Filter">
            <FilterIcon size={17} stroke="#1F2937" />
          </button>
        </div>
      </div>

      {/* ══ Filter row ══ */}
      <div style={styles.filterRow}>
        <button style={styles.nearYouChip} onClick={handleRecenter}>
          <PinIcon size={13} /> Near You
        </button>

        <select
          style={styles.filterSelect}
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          style={styles.filterSelect}
          value={distanceKmFilter}
          onChange={(e) => handleDistanceChange(Number(e.target.value))}
        >
          {DISTANCES.map((d) => (
            <option key={d.label} value={d.km}>{d.label}</option>
          ))}
        </select>
      </div>

      {/* ══ Map ══ */}
      <div style={styles.mapWrap}>
        {locating && <div style={styles.mapOverlayMsg}>Finding your location…</div>}
        {!locating && !loading && loadError && <div style={styles.mapOverlayMsg}>{loadError}</div>}
        {!locating && !loading && !loadError && artists.length === 0 && (
          <div style={styles.mapOverlayMsg}>
            No {category !== "All Categories" ? category.toLowerCase() + " " : ""}artists online near here yet.
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

          {nearbyList.map((a, i) => (
            <Marker
              key={a._id}
              position={[a.location.coordinates[1], a.location.coordinates[0]]}
              icon={createArtistIcon(a, PIN_RINGS[i % PIN_RINGS.length], a.km)}
              eventHandlers={{ click: () => openArtist(a) }}
            />
          ))}
        </MapContainer>
      </div>

      {/* ══ Nearby Artists list ══ */}
      <div style={styles.listSection}>
        <h2 style={styles.listHeading}>Nearby Artists</h2>

        {loading && (
          <p style={styles.listMsg}>Loading artists…</p>
        )}
        {!loading && nearbyList.length === 0 && !loadError && (
          <p style={styles.listMsg}>No artists online nearby right now.</p>
        )}

        {nearbyList.map((a) => (
          <div key={a._id} style={styles.artistRow} onClick={() => openArtist(a)}>
            {a.avatar || a.profileImage || a.image ? (
              <img src={a.avatar || a.profileImage || a.image} alt="" style={styles.rowAvatar} />
            ) : (
              <div style={styles.rowAvatarFallback}>{(a.name || "?")[0]?.toUpperCase()}</div>
            )}

            <div style={styles.rowInfo}>
              <p style={styles.rowName}>{a.name}</p>
              <p style={styles.rowMeta}>
                <span style={styles.onlineDot} />
                {a.km != null ? `${a.km.toFixed(1)} km away` : "Nearby"}
              </p>
            </div>

            <button
              style={styles.viewProfileBtn}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/dashboard/${a._id}`);
              }}
            >
              View Profile
            </button>
          </div>
        ))}
      </div>

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
            <button style={styles.viewProfileBtnFull} onClick={() => navigate(`/dashboard/${selectedArtist._id}`)}>
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function FilterIcon({ size = 18, stroke = "#1a1a1a" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}
function PinIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff" stroke="none">
      <path d="M12 2C7.6 2 4 5.6 4 10c0 5.8 8 12 8 12s8-6.2 8-12c0-4.4-3.6-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
    </svg>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      .leaflet-container { background: #EAEAF3; font-family: 'Inter', sans-serif; }

      .you-pulse {
        width: 40px; height: 40px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        position: relative;
      }
      .you-pulse::before {
        content: ''; position: absolute; inset: 0; border-radius: 50%;
        background: rgba(124,58,237,0.25); animation: pulseRing 2s ease-out infinite;
      }
      .you-dot {
        width: 14px; height: 14px; border-radius: 50%;
        background: #7C3AED; border: 3px solid #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3); z-index: 1;
      }
      @keyframes pulseRing {
        0% { transform: scale(0.5); opacity: 0.7; }
        100% { transform: scale(2.2); opacity: 0; }
      }

      .artist-pin { cursor: pointer; }
      .pin-wrap { display: flex; flex-direction: column; align-items: center; gap: 3px; }
      .pin-avatar-ring {
        width: 46px; height: 46px; border-radius: 50%; border: 3px solid;
        background: #fff; padding: 2px; box-shadow: 0 3px 10px rgba(0,0,0,0.25);
        display: flex; align-items: center; justify-content: center;
      }
      .pin-avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
      .pin-avatar-fallback {
        width: 100%; height: 100%; border-radius: 50%; color: #fff;
        display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700;
      }
      .pin-badge {
        font-size: 10px; font-weight: 700; color: #4C1D95; background: #fff;
        padding: 2px 7px; border-radius: 999px; box-shadow: 0 2px 6px rgba(0,0,0,0.18);
        white-space: nowrap;
      }
    `}</style>
  );
}

const PURPLE = "#7C3AED";
const PURPLE_DARK = "#6D28D9";
const CREAM = "#FBF7F2";
const INK = "#1F2937";
const MUTE = "#6B7280";
const GREEN = "#22C55E";

const styles = {
  page: { fontFamily: "'Inter', sans-serif", background: CREAM, minHeight: "100vh", color: INK, paddingBottom: 8 },

  toast: {
    position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 900,
    background: "#1F2937", color: "#fff", padding: "10px 18px", borderRadius: 999,
    fontSize: 13, fontWeight: 600, boxShadow: "0 6px 20px rgba(0,0,0,0.25)", cursor: "pointer",
    maxWidth: "88vw", textAlign: "center",
  },

  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 18px 10px" },
  title: { fontSize: 21, fontWeight: 800, color: INK, margin: 0 },
  topBarIcons: { display: "flex", gap: 8 },
  iconBtn: {
    background: "#fff", border: "1px solid #ECEAF5", cursor: "pointer", width: 34, height: 34,
    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
  },

  filterRow: { display: "flex", gap: 8, padding: "4px 16px 12px", overflowX: "auto" },
  nearYouChip: {
    flexShrink: 0, display: "flex", alignItems: "center", gap: 5, background: PURPLE, color: "#fff",
    border: "none", borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
  },
  filterSelect: {
    flexShrink: 0, background: "#fff", color: INK, border: "1px solid #ECEAF5", borderRadius: 999,
    padding: "8px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Inter', sans-serif",
  },

  mapWrap: { position: "relative", width: "100%", height: "40vh", minHeight: 280, margin: "0 16px", borderRadius: 20, overflow: "hidden" },
  map: { width: "100%", height: "100%" },
  mapOverlayMsg: {
    position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 500,
    background: "#fff", color: INK, padding: "8px 16px", borderRadius: 999,
    fontSize: 12.5, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", textAlign: "center", maxWidth: "85%",
  },

  listSection: { padding: "18px 16px 4px" },
  listHeading: { fontSize: 15, fontWeight: 800, color: INK, margin: "0 0 12px" },
  listMsg: { fontSize: 13, color: MUTE, padding: "8px 0" },

  artistRow: {
    display: "flex", alignItems: "center", gap: 12, background: "#fff", borderRadius: 14,
    padding: "10px 12px", marginBottom: 10, border: "1px solid #F1EFE8", cursor: "pointer",
  },
  rowAvatar: { width: 42, height: 42, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  rowAvatarFallback: {
    width: 42, height: 42, borderRadius: "50%", background: PURPLE, color: "#fff", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15,
  },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { fontWeight: 700, fontSize: 14, color: INK, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  rowMeta: { fontSize: 12, color: MUTE, margin: "2px 0 0", display: "flex", alignItems: "center", gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: "50%", background: GREEN, display: "inline-block", flexShrink: 0 },
  viewProfileBtn: {
    flexShrink: 0, background: "#fff", color: PURPLE, border: `1.5px solid ${PURPLE}`, borderRadius: 999,
    padding: "7px 13px", fontSize: 11.5, fontWeight: 700, cursor: "pointer",
  },

  sheetBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 800, display: "flex", alignItems: "flex-end" },
  sheet: {
    width: "100%", maxHeight: "88vh", overflowY: "auto", background: "#fff",
    borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: "10px 18px 26px",
    boxShadow: "0 -8px 24px rgba(0,0,0,0.2)", boxSizing: "border-box",
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 999, background: "#E5E3DC", margin: "0 auto 16px" },
  sheetHead: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  sheetAvatar: { width: 50, height: 50, borderRadius: "50%", objectFit: "cover" },
  sheetAvatarFallback: {
    width: 50, height: 50, borderRadius: "50%", background: PURPLE, color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18,
  },
  sheetName: { fontWeight: 800, fontSize: 16, color: INK },
  sheetMeta: { fontSize: 12, color: MUTE, marginTop: 3, display: "flex", alignItems: "center", gap: 5 },

  sheetBody: { display: "flex", flexDirection: "column", gap: 4 },
  fieldRow: { display: "flex", gap: 10 },
  field: { flex: 1 },
  label: { fontSize: 11, fontWeight: 700, color: MUTE, textTransform: "uppercase", letterSpacing: 0.5, display: "block", margin: "10px 0 5px" },
  input: {
    width: "100%", background: "#FAF9F6", border: "1px solid #ECEAF5",
    borderRadius: 10, color: INK, fontSize: 13.5, padding: "10px 12px", outline: "none",
    fontFamily: "'Inter', sans-serif", boxSizing: "border-box",
  },
  errorBox: { background: "#FEECEC", color: "#B91C1C", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 600, marginTop: 10 },

  bookBtn: {
    width: "100%", background: PURPLE, color: "#fff", border: "none", borderRadius: 14,
    padding: "14px", fontSize: 14, fontWeight: 800, cursor: "pointer", marginTop: 16, marginBottom: 8,
  },
  viewProfileBtnFull: {
    width: "100%", background: "transparent", color: MUTE, border: "1px solid #ECEAF5",
    borderRadius: 14, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer",
  },
};