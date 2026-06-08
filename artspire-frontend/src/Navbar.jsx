import { Link } from "react-router-dom";

export default function Navbar() {
  const user =
    JSON.parse(localStorage.getItem("user")) ||
    JSON.parse(localStorage.getItem("artist"));

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("artist");
    window.location.href = "/";
  };

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-6 py-5">
      <div className="max-w-7xl mx-auto bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-8 py-4 flex items-center justify-between">

        {/* LOGO */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo.jpeg"
            alt="logo"
            className="w-12 h-12 rounded-full object-cover border-2 border-orange-400"
          />

          <h1 className="text-4xl font-black text-white">
            Art<span className="text-orange-500">Spire</span>
          </h1>
        </Link>

        {/* CENTER LINKS */}
        <div className="hidden md:flex items-center gap-12 text-white font-medium text-lg">
          <Link
            to="/artist-register"
            className="hover:text-orange-400 transition"
          >
            Become Artist
          </Link>

          <Link
            to="/"
            className="hover:text-orange-400 transition"
          >
            Home
          </Link>

          <Link
            to="/artists"
            className="hover:text-orange-400 transition"
          >
            Artists
          </Link>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4">
          {!user ? (
            <>
              <Link to="/login">
                <button className="px-6 py-2 rounded-full border border-white/30 text-white hover:bg-white/10 transition">
                  Login
                </button>
              </Link>

              <Link to="/login">
                <button className="px-6 py-2 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition">
                  Register
                </button>
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full">
                <img
                  src={
                    user.photo ||
                    "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                  }
                  alt="profile"
                  className="w-10 h-10 rounded-full object-cover"
                />

                <div>
                  <p className="text-sm text-gray-300">
                    Welcome
                  </p>

                  <p className="text-orange-400 font-bold">
                    {user.name}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="px-5 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold transition"
              >
                Logout
              </button>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}
