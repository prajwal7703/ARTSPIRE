import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";

function Home() {
  const navigate = useNavigate();

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
      `}</style>

      {/* HERO */}
      <div className="relative min-h-screen overflow-hidden">
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
          <source src="/artbg.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute top-0 left-0 right-0 z-30">
          <Navbar />
        </div>

        <div className="relative z-20 min-h-screen flex items-center hero-content px-8 md:px-20">
          <div className="max-w-3xl pt-24 md:pt-20">
            <h1 className="hero-title font-black leading-tight" style={{ fontSize:"clamp(44px, 8vw, 88px)" }}>
              Discover<br />
              <span className="text-orange-500">Creative Artists</span><br />
              Near You
            </h1>

            <p className="hero-desc text-slate-200 mt-8 leading-8 max-w-2xl" style={{ fontSize:"clamp(15px, 2.5vw, 20px)" }}>
              Connect with talented painters, photographers, musicians, digital artists and creators through ArtSpire.
            </p>

            <div className="hero-btns flex gap-6 mt-10 flex-wrap">
              <button onClick={() => navigate("/artists")} className="hero-btn bg-orange-500 hover:bg-orange-600 transition duration-300 px-8 py-4 rounded-full text-lg font-bold shadow-xl">
                Explore Artists
              </button>
              <button onClick={() => navigate("/artist-register")} className="hero-btn border-2 border-orange-400 hover:bg-orange-500/20 transition duration-300 px-8 py-4 rounded-full text-lg font-bold">
                Join As Artist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{ background:"rgba(255,255,255,0.04)", borderTop:"1px solid rgba(255,255,255,0.08)", borderBottom:"1px solid rgba(255,255,255,0.08)", padding:"24px 20px" }}>
        <div style={{ maxWidth:"800px", margin:"0 auto", display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))", gap:"16px", textAlign:"center" }}>
          {[
            { value:"500+", label:"Artists" },
            { value:"50+", label:"Cities" },
            { value:"10K+", label:"Connections" },
            { value:"Free", label:"To Join" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:"32px", color:"#f97316", letterSpacing:"1px" }}>{value}</div>
              <div style={{ fontSize:"12px", color:"rgba(255,255,255,0.5)", fontWeight:600, textTransform:"uppercase", letterSpacing:"1px" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="footer-wrap bg-[#081120] text-white px-8 md:px-16 py-16 border-t border-white/10">
        <div className="footer-grid grid md:grid-cols-3 gap-10">

          {/* LEFT */}
          <div>
            <div className="flex items-center gap-4">
              <img src="/logo.jpeg" alt="logo" className="w-12 h-12 rounded-full object-cover" />
              <h2 className="text-3xl font-bold">Art<span className="text-orange-500">Spire</span></h2>
            </div>
            <p className="text-slate-400 mt-6 leading-8">Empowering artists through creativity, collaboration and opportunities.</p>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h3 className="text-2xl font-bold mb-6">Quick Links</h3>
            <div className="flex flex-col gap-4 text-slate-300">
              <span onClick={() => navigate("/")} className="cursor-pointer hover:text-orange-400 transition">Home</span>
              <span onClick={() => navigate("/artists")} className="cursor-pointer hover:text-orange-400 transition">Artists</span>
              <span onClick={() => navigate("/artist-register")} className="cursor-pointer hover:text-orange-400 transition">Join As Artist</span>
              <span onClick={() => navigate("/login")} className="cursor-pointer hover:text-orange-400 transition">Login</span>
            </div>
          </div>

          {/* COMMUNITY */}
          <div>
            <h3 className="text-2xl font-bold mb-6">Community</h3>
            <div className="flex flex-col gap-4 text-slate-300 leading-8">
              <a href="https://instagram.com/artistsconnect.arts" target="_blank" rel="noreferrer" className="hover:text-orange-400 transition">
                📸 Instagram: @artistsconnect.arts
              </a>
              <a href="mailto:artistsconnect.arts@gmail.com" className="hover:text-orange-400 transition">
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

export default Home;