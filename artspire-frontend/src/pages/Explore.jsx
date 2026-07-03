// artspire-frontend/src/pages/Explore.jsx
//
// "Near You" tab, matching the light Pinterest-style map mockup: tab row
// (For You / Following / Near You), a floating "Search near this area" bar
// over a real light-mode map (Leaflet + free CARTO Positron tiles — no
// Google Maps key/billing needed), white post-card pins with a Save badge,
// a "You" location marker, and Raise Request / Search Area buttons at the
// bottom. Raise Request opens your existing PostRequestModal.
//
// Install once:  npm install leaflet react-leaflet
//
// Backend contract assumed (adjust to match your API):
//   GET  /api/posts/nearby?lat=&lng=&radiusKm=   -> { posts: [...] }
//   Each post shape reuses your feed post: _id, artistId, artistName,
//   artistAvatar, mediaUrl, mediaType, caption, lat, lng
//
// Wire it up in your router, e.g.:
//   <Route path="/explore" element={<Explore />} />
// and point the compass/search icon in BottomNav at "/explore".

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCurrentAccount, isArtist } from "../utils/auth";
import BottomNav from "../BottomNav";
import PostRequestModal from "../components/PostRequestModal";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

// Free, no-API-key light tiles ("Positron") — matches the mockup's light map
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const FALLBACK_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bengaluru — used if geolocation is denied

const getActor = () => {
  const account = getCurrentAccount();
  if (!account?._id) return null;
  return {
    id: account._id,
    name: account.name,
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

// crude km-per-degree conversion to turn map bounds into a search radius
function boundsToRadiusKm(bounds, center) {
  const ne = bounds.getNorthEast();
  const R = 6371;
  const dLat = ((ne.lat - center.lat) * Math.PI) / 180;
  const dLng = ((ne.lng - center.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((center.lat * Math.PI) / 180) * Math.cos((ne.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.max(1, Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
}

// "You" marker: blue circle with an upward heading arrow, like the mockup
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

function createPostIcon(post) {
  const name = escapeHtml(post.artistName || "Unknown artist");
  const initial = (post.artistName || "?").trim()[0]?.toUpperCase() || "?";
  const avatarHtml = post.artistAvatar
    ? `<img src="${escapeHtml(post.artistAvatar)}" class="pin-avatar" />`
    : `<div class="pin-avatar-fallback">${initial}</div>`;
  const thumbHtml = post.mediaUrl
    ? `<img src="${escapeHtml(post.mediaUrl)}" class="pin-thumb" />`
    : `<div class="pin-thumb pin-thumb-empty"></div>`;

  const html = `
    <div class="pin-card">
      <div class="pin-card-head">
        ${avatarHtml}
        <span class="pin-name">${name}</span>
        <span class="pin-save">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff"><path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4-7 4V3a1 1 0 0 1 1-1z"/></svg>
          Save
        </span>
      </div>
      ${thumbHtml}
    </div>
    <div class="pin-tail"></div>
  `;

  return L.divIcon({
    html,
    className: "post-pin",
    iconSize: [110, 138],
    iconAnchor: [55, 138],
  });
}

/* ── listens for pan/zoom end so we can show the "Search this area" pill ── */
function MapWatcher({ onMoved }) {
  useMapEvents({
    moveend: (e) => onMoved(e.target),
  });
  return null;
}

export default function Explore() {
  const navigate = useNavigate();
  const actor = getActor();
  const mapRef = useRef(null);

  const [center, setCenter] = useState(FALLBACK_CENTER);
  const [youLocation, setYouLocation] = useState(null);
  const [locating, setLocating] = useState(true);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [areaQuery, setAreaQuery] = useState("");

  const fetchNearby = useCallback(async (lat, lng, radiusKm = 8) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/posts/nearby`, {
        params: { lat, lng, radiusKm },
      });
      setPosts(Array.isArray(data?.posts) ? data.posts : []);
    } catch (e) {
      console.error("Failed to load nearby posts:", e);
    } finally {
      setLoading(false);
      setShowSearchArea(false);
    }
  }, []);

  // initial geolocation
  useEffect(() => {
    getLocation()
      .then(({ lat, lng }) => {
        setYouLocation({ lat, lng });
        setCenter({ lat, lng });
        fetchNearby(lat, lng);
      })
      .catch(() => {
        setCenter(FALLBACK_CENTER);
        fetchNearby(FALLBACK_CENTER.lat, FALLBACK_CENTER.lng);
      })
      .finally(() => setLocating(false));
  }, [fetchNearby]);

  const handleMapMoved = useCallback((map) => {
    mapRef.current = map;
    setShowSearchArea(true);
  }, []);

  const handleSearchArea = () => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    const radiusKm = boundsToRadiusKm(map.getBounds(), c);
    fetchNearby(c.lat, c.lng, radiusKm);
  };

  // "Search near this area" text box: geocode via OSM Nominatim (free, no key)
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
        fetchNearby(lat, lng);
      }
    } catch (err) {
      console.error("Area search failed:", err);
    }
  };

  const recenterOnMe = () => {
    if (!youLocation || !mapRef.current) return;
    mapRef.current.setView([youLocation.lat, youLocation.lng], 14, { animate: true });
    fetchNearby(youLocation.lat, youLocation.lng);
  };

  return (
    <div style={styles.page}>
      <GlobalStyles />

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

          {youLocation && (
            <Marker position={[youLocation.lat, youLocation.lng]} icon={youIcon} />
          )}

          {posts
            .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
            .map((p) => (
              <Marker
                key={p._id}
                position={[p.lat, p.lng]}
                icon={createPostIcon(p)}
                eventHandlers={{
                  click: () => navigate(`/dashboard/${p.artistId}`),
                }}
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

      {/* ══ Action row ══ */}
      <div style={styles.actionRow}>
        <button style={styles.raiseBtn} onClick={() => setShowRequestModal(true)}>
          <RequestIcon /> RAISE REQUEST
        </button>
        <button style={styles.searchBtn} onClick={handleSearchArea} disabled={loading}>
          <SearchIcon size={16} stroke="#fff" /> {loading ? "SEARCHING…" : "SEARCH AREA"}
        </button>
      </div>

      <div style={{ height: 96 }} />
      <BottomNav activeTab="explore" />

      {showRequestModal && (
        <PostRequestModal actor={actor} onClose={() => setShowRequestModal(false)} />
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
function RequestIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" /><path d="M12 18v-6" /><path d="M9 15h6" />
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

      .post-pin { cursor: pointer; }
      .pin-card {
        width: 100px; background: #fff; border-radius: 12px; padding: 5px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.18); border: 1px solid rgba(0,0,0,0.06);
      }
      .pin-card-head { display: flex; align-items: center; gap: 4px; padding: 2px 2px 5px; }
      .pin-avatar, .pin-avatar-fallback {
        width: 15px; height: 15px; border-radius: 50%; flex-shrink: 0; object-fit: cover;
      }
      .pin-avatar-fallback {
        background: #D9662B; color: #fff; font-size: 8px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
      }
      .pin-name {
        font-size: 9px; font-weight: 700; color: #0B0F1A; flex: 1;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .pin-save {
        display: flex; align-items: center; gap: 2px;
        font-size: 7.5px; font-weight: 700; color: #fff; background: #D9662B;
        border-radius: 999px; padding: 2px 6px; flex-shrink: 0;
      }
      .pin-thumb, .pin-thumb-empty {
        width: 100%; height: 76px; border-radius: 8px; object-fit: cover; display: block;
        background: #EAEDF2;
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
const SURFACE = "#131B2C";
const CLAY = "#D9662B";
const BLUE = "#2E6BE6";
const MUTE = "#8291AC";

const styles = {
  page: { fontFamily: "'Inter', sans-serif", background: INK, minHeight: "100vh", color: "#fff" },

  topBar: { padding: "16px 18px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  brandRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  brandName: { fontWeight: 800, fontSize: 20, color: "#fff" },
  searchIconBtn: {
    background: "#fff", border: "none", cursor: "pointer", padding: 8,
    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
  },
  tabRow: { display: "flex", gap: 22, marginTop: 14 },
  tabBtn: {
    background: "none", border: "none", padding: 0, paddingBottom: 8, cursor: "pointer",
    fontSize: 14, fontWeight: 600, color: MUTE,
  },
  tabBtnActive: { color: "#fff", borderBottom: `2px solid ${CLAY}` },

  mapWrap: { position: "relative", width: "100%", height: "calc(100vh - 260px)", minHeight: 380 },
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
    fontSize: 12.5, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
  },
  recenterBtn: {
    position: "absolute", right: 14, bottom: 14, zIndex: 500,
    width: 40, height: 40, borderRadius: "50%", background: "#fff",
    border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.25)", display: "flex",
    alignItems: "center", justifyContent: "center", cursor: "pointer",
  },
  searchAreaFloating: {
    position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", zIndex: 500,
    background: CLAY, color: "#fff", border: "none", borderRadius: 999,
    padding: "10px 20px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
  },

  actionRow: { display: "flex", gap: 10, padding: "14px 16px 0" },
  raiseBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: BLUE, color: "#fff", border: "none", borderRadius: 14,
    padding: "13px 10px", fontSize: 13, fontWeight: 800, letterSpacing: 0.3, cursor: "pointer",
  },
  searchBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    background: CLAY, color: "#fff", border: "none", borderRadius: 14,
    padding: "13px 10px", fontSize: 13, fontWeight: 800, letterSpacing: 0.3, cursor: "pointer",
  },
};