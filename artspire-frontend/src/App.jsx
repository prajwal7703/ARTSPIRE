import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getToken, getArtist } from "./utils/auth";

import Home            from "./pages/Home";
import Register        from "./pages/Register";
import Artists         from "./pages/Artists";
import ArtistProfile   from "./pages/ArtistProfile";
import ArtistDashboard from "./pages/ArtistDashboard";
import ArtistRegister  from "./pages/ArtistRegister";
import Chat            from "./pages/chat";
import UserLogin       from "./pages/UserLogin";
import ArtistLogin     from "./pages/ArtistLogin";
import ForgotPassword  from "./pages/ForgotPassword";
import ResetPassword   from "./pages/ResetPassword";
import DiscoverPage    from "./pages/DiscoverPage";

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
        <Route path="/"                  element={<Home />} />
        <Route path="/artists"           element={<Artists />} />
        <Route path="/explore"           element={<Artists />} />
        <Route path="/discover"          element={<DiscoverPage />} />
        <Route path="/artist/:id"        element={<ArtistProfile />} />
        <Route path="/artist-profile/:id" element={<ArtistProfile />} />
        <Route path="/forgot-password"   element={<ForgotPassword />} />
        <Route path="/reset-password"    element={<ResetPassword />} />

        {/* Auth — redirect away if already logged in as artist */}
        <Route path="/login"         element={<RedirectIfArtist to="/"><UserLogin /></RedirectIfArtist>} />
        <Route path="/register"      element={<RedirectIfArtist to="/"><Register /></RedirectIfArtist>} />
        <Route path="/artist-login"  element={<RedirectIfArtist to="/artist-dashboard"><ArtistLogin /></RedirectIfArtist>} />

        {/* Artist register — redirect to dashboard if already an artist */}
        <Route path="/artist-register" element={<RedirectIfArtist to="/artist-dashboard"><ArtistRegister /></RedirectIfArtist>} />
        <Route path="/become-artist"   element={<RedirectIfArtist to="/artist-dashboard"><ArtistRegister /></RedirectIfArtist>} />

        {/* Protected — artist only */}
        <Route path="/artist-dashboard" element={<RequireArtist><ArtistDashboard /></RequireArtist>} />

        {/* Protected — any logged-in user */}
        <Route path="/chat/:id" element={<RequireAuth><Chat /></RequireAuth>} />

        {/* Fallback */}
        <Route path="/about" element={<Home />} />
        <Route path="*"      element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;