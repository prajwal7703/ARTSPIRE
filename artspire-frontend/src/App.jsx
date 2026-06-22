// artspire-frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getToken, getArtist } from "./utils/auth";

import Home                   from "./pages/Home";
import Register                from "./pages/Register";
import Artists                 from "./pages/Artists";
import ArtistProfile           from "./pages/ArtistProfile";
import ArtistDashboard         from "./pages/ArtistDashboard";
import ArtistRegister          from "./pages/ArtistRegister";
import ArtistBookingDashboard  from "./pages/ArtistBookingDashboard";  // ✅ NEW
import Chat                    from "./pages/chat";
import UserLogin               from "./pages/UserLogin";
import ArtistLogin             from "./pages/ArtistLogin";
import ForgotPassword          from "./pages/ForgotPassword";
import ResetPassword           from "./pages/ResetPassword";
import DiscoverPage            from "./pages/DiscoverPage";
import UserDashboard           from "./pages/UserDashboard";            // ✅ NEW
import UserChat                from "./pages/UserChat";             // ✅ ADD THIS

// ── Guards ────────────────────────────────────────────────────────────────────

/** Any logged-in user (user or artist) */
function RequireAuth({ children }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

/** Only artists */
function RequireArtist({ children }) {
  const token  = getToken();
  const artist = getArtist();
  if (!token || !artist) return <Navigate to="/artist-login" replace />;
  return children;
}

/** Redirect already-logged-in artists away from login/register pages */
function RedirectIfArtist({ children, to = "/artist-dashboard" }) {
  const token  = getToken();
  const artist = getArtist();
  if (token && artist) return <Navigate to={to} replace />;
  return children;
}

// ─────────────────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"                   element={<Home />} />
        <Route path="/artists"            element={<Artists />} />
        <Route path="/explore"            element={<Artists />} />
        <Route path="/discover"           element={<DiscoverPage />} />
        <Route path="/artist/:id"         element={<ArtistProfile />} />
        <Route path="/artist-profile/:id" element={<ArtistProfile />} />
        <Route path="/forgot-password"    element={<ForgotPassword />} />
        <Route path="/reset-password"     element={<ResetPassword />} />

        {/* Auth — redirect away if already logged in as artist */}
        <Route path="/login"
          element={<RedirectIfArtist to="/"><UserLogin /></RedirectIfArtist>}
        />
        <Route path="/register"
          element={<RedirectIfArtist to="/"><Register /></RedirectIfArtist>}
        />
        <Route path="/artist-login"
          element={<RedirectIfArtist to="/artist-dashboard?tab=profile"><ArtistLogin /></RedirectIfArtist>}
        />

        {/* Artist register */}
        <Route path="/artist-register"
          element={<RedirectIfArtist to="/artist-dashboard?tab=profile"><ArtistRegister /></RedirectIfArtist>}
        />
        <Route path="/become-artist"
          element={<RedirectIfArtist to="/artist-dashboard?tab=profile"><ArtistRegister /></RedirectIfArtist>}
        />

        {/* ── Protected — artist only ── */}
        <Route path="/artist-dashboard"
          element={<RequireArtist><ArtistDashboard /></RequireArtist>}
        />
        {/* ✅ NEW — artist booking management */}
        <Route path="/artist/bookings"
          element={<RequireArtist><ArtistBookingDashboard /></RequireArtist>}
        />

        {/* ── Protected — any logged-in user ── */}
        <Route path="/chat/:id"
          element={<RequireAuth><Chat /></RequireAuth>}
        />
        {/* ✅ NEW — user booking tracking dashboard */}
        <Route path="/my-bookings"
          element={<RequireAuth><UserDashboard /></RequireAuth>}
        />
        <Route path="/user-chat"          {/* ✅ ADD THIS */}
          element={<RequireAuth><UserChat /></RequireAuth>}
        />
        {/* Fallback */}
        <Route path="/about" element={<Home />} />
        <Route path="*"      element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
