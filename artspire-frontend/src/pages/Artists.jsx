import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import socket from "../socket";

const PALETTES = {
  Singer:       { a: "#ff4d6d", b: "#c9184a", c: "#590d22" },
  Dancer:       { a: "#7209b7", b: "#f72585", c: "#3a0ca3" },
  Musician:     { a: "#0096c7", b: "#48cae4", c: "#03045e" },
  Painter:      { a: "#f4a261", b: "#e76f51", c: "#264653" },
  Photographer: { a: "#2d6a4f", b: "#74c69d", c: "#081c15" },
  Actor:        { a: "#ffd60a", b: "#f48c06", c: "#370617" },
  Comedian:     { a: "#06d6a0", b: "#118ab2", c: "#073b4c" },
  default:      { a: "#9d4edd", b: "#c77dff", c: "#10002b" },
};

const CATEGORY_ICONS = {
  Singer: "??", Dancer: "??", Musician: "??", Painter: "???",
  Photographer: "??", Actor: "??", Comedian: "??", default: "?",
};

function getId(artist) {
  if (!artist) return undefined;
  const raw = artist._id;
  if (!raw) return undefined;
  if (typeof raw === "object" && raw.$oid) return raw.$oid;
  return String(raw);
}

const CATEGORIES = ["All", "Singer", "Dancer", "Musician", "Painter", "Photographer", "Actor", "Comedian"];

function SkeletonCard() {
  return (
    <div style={{ borderRadius: "20px", overflow: "hidden", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", aspectRatio: "3/4" }}>
      <div style={{ width: "100%", height: "60%", background: "rgba(255,255,255,0.06)", animation: "shimmer 1.4s infinite" }} />
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ height: "16px", width: "60%", borderRadius: "6px", background: "rgba(255,255,255,0.07)" }} />
        <div style={{ height: "11px", width: "40%", borderRadius: "6px", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ height: "11px", width: "80%", borderRadius: "6px", background: "rgba(255,255,255,0.04)" }} />
      </div>
    </div>
  );
}

function ArtistCard({ artist, idx }) {
  const [hov, setHov] = useState(false);
  const p = PALETTES[artist.category] || PALETTES.default;
  const icon = CATEGORY_ICONS[artist.category] || CATEGORY_ICONS.default;
  const artistId = getId(artist);
  if (!artistId) return null;

  return (
    <Link to={`/artist/${artistId}`} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          position: "relative", borderRadius: "20px", overflow: "hidden", aspectRatio: "3/4",
          background: "#0d0d1a", border: `1px solid ${hov ? p.a + "66" : "rgba(255,255,255,0.08)"}`,
          transform: hov ? "translateY(-8px) scale(1.02)" : "translateY(0) scale(1)",
          transition: "all 0.35s cubic-bezier(0.34,1.4,0.64,1)",
          boxShadow: hov ? `0 24px 60px rgba(0,0,0,0.7), 0 0 40px ${p.a}33` : "0 8px 32px rgba(0,0,0,0.5)",
          cursor: "pointer", animation: "rise 0.5s ease both", animationDelay: `${idx * 0.07}s`,
        }}
      >
        {artist.profileImage ? (
          <img src={artist.profileImage} alt={artist.name} style={{
            position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover",
            transform: hov ? "scale(1.08)" : "scale(1)", transition: "transform 0.5s ease",
          }} />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(ellipse at 40% 30%, ${p.a}cc 0%, ${p.b}66 50%, ${p.c} 100%)`,
          }}>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "64px", opacity: 0.25 }}>{icon}</div>
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.95) 100%)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: `linear-gradient(to top, ${p.c}ee, transparent)`, opacity: 0.7 }} />
        <div style={{ position: "absolute", top: "12px", left: "12px", right: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 4 }}>
          <span style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)", color: "#fff", fontSize: "8px", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "2px", padding: "5px 10px", borderRadius: "6px", border: "0.5px solid rgba(255,255,255,0.15)" }}>
            {icon} {artist.category || "Artist"}
          </span>
          {artist.postCount > 0 && (
            <span style={{ background: `linear-gradient(135deg, ${p.a}, ${p.b})`, color: "#fff", fontSize: "8px", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "1.5px", padding: "5px 10px", borderRadius: "6px" }}>
              {artist.postCount} WORKS
            </span>
          )}
        </div>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: hov ? 1 : 0, transition: "opacity 0.25s ease", zIndex: 4 }}>
          <div style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "2px", fontSize: "13px", padding: "10px 24px", borderRadius: "30px" }}>
            VIEW PROFILE ?
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 16px 18px", zIndex: 3 }}>
          {artist.city && (
            <div style={{ marginBottom: "6px" }}>
              <span style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", color: "rgba(255,255,255,0.8)", fontSize: "9px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", letterSpacing: "0.5px", fontFamily: "sans-serif" }}>
                ?? {artist.city}
              </span>
            </div>
          )}
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "22px", color: "#fff", letterSpacing: "1.5px", lineHeight: 1.05, textShadow: "0 2px 12px rgba(0,0,0,0.9)", marginBottom: "5px" }}>
            {artist.name}
          </div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)", lineHeight: 1.5, fontFamily: "sans-serif", fontWeight: 500, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {artist.bio || `${artist.category || "Artist"} · Available for bookings`}
          </div>
          <div style={{ marginTop: "10px", height: "2px", borderRadius: "2px", background: `linear-gradient(90deg, ${p.a}, ${p.b}44)`, transform: hov ? "scaleX(1)" : "scaleX(0.4)", transformOrigin: "left", transition: "transform 0.35s ease" }} />
        </div>
      </div>
    </Link>
  );
}

export default function Artists() {
  const navigate = useNavigate();
  const [artists, setArtists]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [search, setSearch]     = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const [artRes, postRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/api/artists/only-artists`),
          axios.get(`${import.meta.env.VITE_API_URL}/api/posts`),
        ]);
        const posts = postRes.data;
        const enriched = artRes.data
          .map(a => {
            const id = getId(a);
            return {
              ...a,
              _id: id,
              postCount: posts.filter(p => p.artistId === id).length,
              profileImage: a.profileImage || posts.find(p => p.artistId === id && p.type === "image")?.media || null,
            };
          })
          .filter(a => a._id)
          .sort((a, b) => b.postCount - a.postCount);
        setArtists(enriched);
      } catch (err) {
        console.log(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = artists.filter(a => {
    const matchCat = activeCategory === "All" || a.category === activeCategory;
    const matchSearch = !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.city?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ position: "relative", minHeight: "100vh", color: "white", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes rise { from { opacity:0; transform:translateY(24px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes shimmer { 0% { opacity:0.5; } 50% { opacity:1; } 100% { opacity:0.5; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .cat-pill:hover { background: rgba(255,255,255,0.15) !important; color: #fff !important; }
        .search-input:focus { outline: none; border-color: rgba(255,255,255,0.4) !important; box-shadow: 0 0 0 3px rgba(255,255,255,0.06); }
      `}</style>
      <video autoPlay loop muted playsInline style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}>
        <source src="/artbg.mp4" type="video/mp4" />
      </video>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.68)", backdropFilter: "blur(2px)", zIndex: 1, pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 100 }}><Navbar /></div>
      <div style={{ position: "relative", zIndex: 10, padding: "140px 48px 80px" }}>
        <div style={{ marginBottom: "40px", animation: "fadeUp 0.5s ease" }}>
          <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontFamily: "'Nunito', sans-serif", fontSize: "13px", fontWeight: 700, cursor: "pointer", marginBottom: "16px", padding: 0 }}>? Home</button>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "11px", letterSpacing: "6px", color: "rgba(255,255,255,0.3)", marginBottom: "8px" }}>DISCOVER</div>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(48px, 7vw, 80px)", margin: 0, letterSpacing: "2px", lineHeight: 0.95, color: "#fff" }}>
            FEATURED<br /><span style={{ WebkitTextStroke: "1px rgba(255,255,255,0.4)", color: "transparent" }}>ARTISTS</span>
          </h1>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.35)", marginTop: "12px", fontWeight: 600 }}>
            {loading ? "Loading artists…" : error ? "Failed to load." : `${filtered.length} of ${artists.length} artists`}
          </div>
        </div>
        <div style={{ marginBottom: "36px", display: "flex", flexDirection: "column", gap: "16px", animation: "fadeUp 0.5s ease 0.1s both" }}>
          <div style={{ position: "relative", maxWidth: "400px" }}>
            <span style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", pointerEvents: "none" }}>??</span>
            <input className="search-input" placeholder="Search by name or city…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: "100%", padding: "13px 16px 13px 44px", borderRadius: "40px", border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.07)", backdropFilter: "blur(12px)", color: "#fff", fontFamily: "'Nunito', sans-serif", fontSize: "14px", fontWeight: 600, boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }} />
            {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>?</button>}
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat;
              const p = PALETTES[cat] || PALETTES.default;
              return (
                <button key={cat} className="cat-pill" onClick={() => setActiveCategory(cat)}
                  style={{ padding: "8px 18px", borderRadius: "30px", border: "1px solid", borderColor: isActive ? p.a : "rgba(255,255,255,0.15)", background: isActive ? `linear-gradient(135deg, ${p.a}33, ${p.b}22)` : "rgba(255,255,255,0.06)", color: isActive ? "#fff" : "rgba(255,255,255,0.55)", fontFamily: "'Nunito', sans-serif", fontWeight: 700, fontSize: "12px", cursor: "pointer", transition: "all 0.2s ease", backdropFilter: "blur(8px)" }}>
                  {cat !== "All" && (CATEGORY_ICONS[cat] || "?") + " "}{cat}
                </button>
              );
            })}
          </div>
        </div>
        {error ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.4)", fontFamily: "'Nunito', sans-serif", fontSize: "16px", fontWeight: 600 }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>??</div>Failed to load artists. Check your backend.
          </div>
        ) : filtered.length === 0 && !loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.4)", fontFamily: "'Nunito', sans-serif", fontSize: "16px", fontWeight: 600 }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>??</div>No artists found for "{search || activeCategory}"
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "20px" }}>
            {loading ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />) : filtered.map((artist, i) => <ArtistCard key={artist._id} artist={artist} idx={i} />)}
          </div>
        )}
        {!loading && !error && artists.length > 0 && (
          <div style={{ marginTop: "60px", padding: "24px 32px", borderRadius: "20px", background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "40px", flexWrap: "wrap", justifyContent: "center", animation: "fadeUp 0.5s ease 0.3s both" }}>
            {[
              { label: "Total Artists", value: artists.length },
              { label: "Categories", value: [...new Set(artists.map(a => a.category).filter(Boolean))].length },
              { label: "Total Works", value: artists.reduce((s, a) => s + (a.postCount || 0), 0) },
              { label: "Cities", value: [...new Set(artists.map(a => a.city).filter(Boolean))].length },
            ].map(({ label, value }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", color: "#fff", letterSpacing: "1px" }}>{value}</div>
                <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
