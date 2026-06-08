import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#081120] text-white overflow-hidden">

      {/* HERO SECTION */}
      <div className="relative min-h-screen overflow-hidden">

        {/* VIDEO BACKGROUND */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/artbg.mp4" type="video/mp4" />
        </video>

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 bg-black/50"></div>

        {/* NAVBAR */}
        <div className="absolute top-6 left-0 right-0 z-30 flex justify-center">
          <Navbar />
        </div>

        {/* HERO CONTENT */}
        <div className="relative z-20 min-h-screen flex items-center px-8 md:px-20">

          <div className="max-w-3xl pt-20">

            <h1 className="text-6xl md:text-8xl font-black leading-tight">
              Discover
              <br />
              <span className="text-orange-500">
                Creative Artists
              </span>
              <br />
              Near You
            </h1>

            <p className="text-xl text-slate-200 mt-8 leading-9 max-w-2xl">
              Connect with talented painters,
              photographers, musicians,
              digital artists and creators
              through ArtSpire.
            </p>

            <div className="flex gap-6 mt-10 flex-wrap">

              <button
                onClick={() => navigate("/artists")}
                className="bg-orange-500 hover:bg-orange-600 transition duration-300 px-8 py-4 rounded-full text-lg font-bold shadow-xl"
              >
                Explore Artists
              </button>

              <button
                onClick={() => navigate("/login")}
                className="border-2 border-orange-400 hover:bg-orange-500/20 transition duration-300 px-8 py-4 rounded-full text-lg font-bold"
              >
                Join As Artist
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* FOOTER */}
      <footer className="bg-[#081120] text-white px-8 md:px-16 py-16 border-t border-white/10">

        <div className="grid md:grid-cols-3 gap-10">

          {/* LEFT */}
          <div>

            <div className="flex items-center gap-4">

              <img
                src="/logo.jpeg"
                alt="logo"
                className="w-12 h-12 rounded-full object-cover"
              />

              <h2 className="text-3xl font-bold">
                Art
                <span className="text-orange-500">
                  Spire
                </span>
              </h2>

            </div>

            <p className="text-slate-400 mt-6 leading-8">
              Empowering artists through creativity,
              collaboration and opportunities.
            </p>

          </div>

          {/* QUICK LINKS */}
          <div>

            <h3 className="text-2xl font-bold mb-6">
              Quick Links
            </h3>

            <div className="flex flex-col gap-4 text-slate-300">

              <span onClick={() => navigate("/")} className="cursor-pointer hover:text-orange-400 transition">Home</span>
              <span onClick={() => navigate("/artists")} className="cursor-pointer hover:text-orange-400 transition">Artists</span>
              <span onClick={() => navigate("/login")} className="cursor-pointer hover:text-orange-400 transition">Join As Artist</span>
              <span onClick={() => navigate("/login")} className="cursor-pointer hover:text-orange-400 transition">Login</span>

            </div>

          </div>

          {/* COMMUNITY */}
          <div>

            <h3 className="text-2xl font-bold mb-6">
              Community
            </h3>

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

export default Home;
