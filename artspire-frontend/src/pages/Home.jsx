import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../Navbar";

const API = import.meta.env.VITE_API_URL || "https://artspire-backend-qv5b.onrender.com";

export default function Home() {
  const navigate = useNavigate();

  /* ── Real-time stats ── */
  const [stats, setStats] = useState({
    artists:     null,
    cities:      null,
    connections: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const [artRes, postRes] = await Promise.all([
          axios.get(`${API}/api/artists/only-artists`),
          axios.get(`${API}/api/posts`),
        ]);
        const artists = Array.isArray(artRes.data)  ? artRes.data  : [];
        const posts   = Array.isArray(postRes.data) ? postRes.data : [];

        const uniqueCities = new Set(
          artists.map(a => a.city).filter(Boolean)
        ).size;

        setStats({
          artists:     artists.length,
          cities:      uniqueCities,
          connections: posts.length,   // posts ≈ interactions / connections
        });
      } catch (err) {
        console.error("Stats fetch failed:", err);
        /* keep nulls — will show fallback labels */
      }
    })();
  }, []);

  const fmt = n =>
    n === null ? "…"
    : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K+`
    : `${n}+`;

  const STATS = [
    { value: fmt(stats.artists),     label: "Artists" },
    { value: fmt(stats.cities),      label: "Cities" },
    { value: fmt(stats.connections), label: "Connections" },
    { value: "Free",                 label: "To Join" },
  ];

  return (
    <div className="bg-[#081120] text-white overflow-hidden">
      <style>{`
        @media (max-width: 768px) {
          .hero-title { font-size: 48px !important; }
          .hero-desc  { font-size: 16px !important; margin-top: 20px !important; }
          .hero-btns  { gap: 12px !important; margin-top: 24px !important; }
          .hero-btn   { padding: 12px 24px !important; font-size: 15px !important; }
          .hero-content { padding: 0 20px !important; }
          .footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .footer-wrap { padding: 40px 20px !important; }
        }
        @keyframes statPop {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stat-item { animation: statPop 0.5s ease both; }
      `}</style>

      {/* ══════════════ HERO ══════════════ */}
      <div className="relative min-h-screen overflow-hidden">

        {/* VIDEO BACKGROUND — looping, muted, full-cover */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 0 }}
        >
          <source src="/artbg.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay so text stays readable */}
        <div className="absolute inset-0 bg-black/55" style={{ zIndex: 1 }} />

        {/* Navbar */}
        <div className="absolute top-0 left-0 right-0" style={{ zIndex: 30 }}>
          <Navbar />
        </div>

        {/* Hero content */}
        <div
          className="relative min-h-screen flex items-center hero-content px-8 md:px-20"
          style={{ zIndex: 20 }}
        >
          <div className="max-w-3xl pt-24 md:pt-20">
            <h1
              className="hero-title font-black leading-tight"
              style={{ fontSize: "clamp(44px, 8vw, 88px)" }}
            >
              Discover<br />
              <span className="text-orange-500">Creative Artists</span><br />
              Near You
            </h1>

            <p
              className="hero-desc text-slate-200 mt-8 leading-8 max-w-2xl"
              style={{ fontSize: "clamp(15px, 2.5vw, 20px)" }}
            >
              Connect with talented painters, photographers, musicians, digital
              artists and creators through ArtSpire.
            </p>

            <div className="hero-btns flex gap-6 mt-10 flex-wrap">
              <button
                onClick={() => navigate("/artists")}
                className="hero-btn bg-orange-500 hover:bg-orange-600 transition duration-300 px-8 py-4 rounded-full text-lg font-bold shadow-xl"
              >
                Explore Artists
              </button>
              <button
                onClick={() => navigate("/artist-register")}
                className="hero-btn border-2 border-orange-400 hover:bg-orange-500/20 transition duration-300 px-8 py-4 rounded-full text-lg font-bold"
              >
                Join As Artist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════ STATS BAR (real-time) ══════════════ */}
      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "24px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 860,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 16,
            textAlign: "center",
          }}
        >
          {STATS.map(({ value, label }, i) => (
            <div
              key={label}
              className="stat-item"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div
                style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 34,
                  color: "#f97316",
                  letterSpacing: 1,
                  lineHeight: 1.1,
                  transition: "all 0.4s ease",
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.45)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  marginTop: 4,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer className="footer-wrap bg-[#081120] text-white px-8 md:px-16 py-16 border-t border-white/10">
        <div className="footer-grid grid md:grid-cols-3 gap-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-4">
              <img
                src="/logo.jpeg"
                alt="logo"
                className="w-12 h-12 rounded-full object-cover"
              />
              <h2 className="text-3xl font-bold">
                Art<span className="text-orange-500">Spire</span>
              </h2>
            </div>
            <p className="text-slate-400 mt-6 leading-8">
              Empowering artists through creativity, collaboration and opportunities.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-2xl font-bold mb-6">Quick Links</h3>
            <div className="flex flex-col gap-4 text-slate-300">
              {[
                { label: "Home",          path: "/" },
                { label: "Artists",       path: "/artists" },
                { label: "Join As Artist",path: "/artist-register" },
                { label: "Login",         path: "/login" },
              ].map(({ label, path }) => (
                <span
                  key={label}
                  onClick={() => navigate(path)}
                  className="cursor-pointer hover:text-orange-400 transition"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-2xl font-bold mb-6">Community</h3>
            <div className="flex flex-col gap-4 text-slate-300 leading-8">
              <a
                href="https://instagram.com/artistsconnect.arts"
                target="_blank"
                rel="noreferrer"
                className="hover:text-orange-400 transition"
              >
                📸 Instagram: @artistsconnect.arts
              </a>
              <a
                href="mailto:artistsconnect.arts@gmail.com"
                className="hover:text-orange-400 transition"
              >
                📧 artistsconnect.arts@gmail.com
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 text-center text-slate-400">
          © 2026 ArtSpire. All rights reserved.
        </div>
      </footer>
    </div>
  );
}