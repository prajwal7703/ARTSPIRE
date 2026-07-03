// artspire-frontend/src/pages/Explore.jsx
//
// "Near You" tab: a real, live map (Leaflet + free CARTO dark tiles — no
// Google Maps key/billing needed) showing nearby posts as pins, a pulsing
// "You are here" marker from geolocation, and Airbnb/Zillow-style search:
// panning the map reveals a "Search this area" button instead of silently
// refetching underneath you. "Raise Request" opens your existing
// PostRequestModal. Matches the Home.jsx dark theme tokens.
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
// and point the compass icon in BottomNav at "/explore".

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

// Free, no-API-key dark tiles that match the app's theme
const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
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

const youIcon = L.divIcon({
  className: "you-pin",
  html: `<div class="you-dot"><div class="you-pulse"></div></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
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
        <span class="pin-save">Save</span>
      </div>
      ${thumbHtml}
    </div>
    <div class="pin-tail"></div>
  `;

  return L.divIcon({
    html,
    className: "post-pin",
    iconSize: [118, 150],
    iconAnchor: [59, 150],
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

  const recenterOnMe = () => {
    if (!youLocation || !mapRef.current) return;
    mapRef.current.setView([youLocation.lat, youLocation.lng], 14, { animate: true });
    fetchNearby(youLocation.lat, youLocation.lng);
  };

  return (
    <div style={styles.page}>
      <GlobalStyles />

      <div style={styles.topBar}>
        <span style={styles.brandName}>ArtSpire</span>
        <span style={styles.tabLabel}>Near You</span>
      </div>

      <div style={styles.mapWrap}>
        {locating && (
          <div style={styles.mapOverlayMsg}>Finding your location…</div>
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

      <div style={styles.actionRow}>
        <button style={styles.raiseBtn} onClick={() => setShowRequestModal(true)}>
          <RequestIcon /> RAISE REQUEST
        </button>
        <button style={styles.searchBtn} onClick={handleSearchArea} disabled={loading}>
          <SearchIcon size={16} stroke="#fff" /> {loading ? "SEARCHING…" : "SEARCH AREA"}
        </button>
      </div>

      <div style={{ height: 96 }} />
      <BottomNav />

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
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      .leaflet-container { background: #0B0F1A; font-family: 'Inter', sans-serif; }

      .you-dot {
        width: 16px; height: 16px; border-radius: 50%;
        background: #3B82F6; border: 2px solid #fff;
        box-shadow: 0 0 0 3px rgba(59,130,246,0.35);
        position: relative;
      }
      .you-pulse {
        position: absolute; inset: -10px; border-radius: 50%;
        background: rgba(59,130,246,0.35);
        animation: youPulse 1.8s ease-out infinite;
      }
      @keyframes youPulse {
        0% { transform: scale(0.4); opacity: 0.8; }
        100% { transform: scale(1.6); opacity: 0; }
      }

      .post-pin { cursor: pointer; }
      .pin-card {
        width: 108px; background: #131B2C; border-radius: 12px; padding: 6px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.08);
      }
      .pin-card-head { display: flex; align-items: center; gap: 5px; padding: 2px 2px 5px; }
      .pin-avatar, .pin-avatar-fallback {
        width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0; object-fit: cover;
      }
      .pin-avatar-fallback {
        background: #D9662B; color: #fff; font-size: 9px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
      }
      .pin-name {
        font-size: 10px; font-weight: 700; color: #fff; flex: 1;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .pin-save {
        font-size: 8px; font-weight: 700; color: #D9662B; border: 1px solid #D9662B;
        border-radius: 999px; padding: 1px 5px; flex-shrink: 0;
      }
      .pin-thumb, .pin-thumb-empty {
        width: 100%; height: 82px; border-radius: 8px; object-fit: cover; display: block;
        background: #1a2233;
      }
      .pin-tail {
        width: 10px; height: 10px; background: #131B2C; margin: -5px auto 0;
        transform: rotate(45deg); border-right: 1px solid rgba(255,255,255,0.08);
        border-bottom: 1px solid rgba(255,255,255,0.08);
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

  topBar: {
    display: "flex", alignItems: "baseline", justifyContent: "space-between",
    padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  brandName: { fontWeight: 800, fontSize: 20, color: "#fff" },
  tabLabel: { fontWeight: 700, fontSize: 13, color: CLAY },

  mapWrap: { position: "relative", width: "100%", height: "calc(100vh - 260px)", minHeight: 380 },
  map: { width: "100%", height: "100%" },
  mapOverlayMsg: {
    position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 500,
    background: SURFACE, color: "#fff", padding: "8px 16px", borderRadius: 999,
    fontSize: 12.5, fontWeight: 600, border: "1px solid rgba(255,255,255,0.1)",
  },
  recenterBtn: {
    position: "absolute", right: 14, bottom: 14, zIndex: 500,
    width: 38, height: 38, borderRadius: "50%", background: SURFACE,
    border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer",
  },
  searchAreaFloating: {
    position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 500,
    background: "#fff", color: "#0B0F1A", border: "none", borderRadius: 999,
    padding: "9px 18px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 6px 16px rgba(0,0,0,0.4)",
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