// artspire-frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { getToken, getArtist } from "./utils/auth";
import Explore from "./pages/Explore";
import Entry from "./pages/Entry";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Artists from "./pages/Artists";
import ArtistProfile from "./pages/ArtistProfile";
import ArtistDashboard from "./pages/ArtistDashboard";
import ArtistRegister from "./pages/ArtistRegister";
import ArtistBookingDashboard from "./pages/ArtistBookingDashboard";
import Chat from "./pages/chat";
import UserLogin from "./pages/UserLogin";
import ArtistLogin from "./pages/ArtistLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DiscoverPage from "./pages/DiscoverPage";
import SearchLanding from "./pages/SearchLanding";
import UserDashboard from "./pages/UserDashboard";
import BookingPage from "./pages/BookingPage";
import Feed from "./pages/Feed";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import Activity from "./pages/Activity";

// -- Guards ----------------------------------------------------------------

/** Any logged-in user (user or artist) */
function RequireAuth({ children }) {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

/** Only artists */
function RequireArtist({ children }) {
  const token = getToken();
  const artist = getArtist();

  if (!token || !artist) {
    return <Navigate to="/artist-login" replace />;
  }

  return children;
}

/** Redirect already-logged-in artists away from login/register pages */
function RedirectIfArtist({ children, to = "/artist-dashboard" }) {
  const token = getToken();
  const artist = getArtist();

  if (token && artist) {
    return <Navigate to={to} replace />;
  }

  return children;
}

// --------------------------------------------------------------------------

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/" element={<Entry />} />
        <Route path="/search" element={<SearchLanding />} />
        <Route path="/artists" element={<Artists />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/artist/:id" element={<ArtistProfile />} />
        <Route path="/artist-profile/:id" element={<ArtistProfile />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/feed" element={<Feed />} />

        {/* Admin — gated by its own password check inside AdminDashboard,
            reachable either directly or via UserLogin redirecting here
            when the admin email is used to sign in. */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* User Login/Register */}
        <Route
          path="/login"
          element={
            <RedirectIfArtist to="/">
              <UserLogin />
            </RedirectIfArtist>
          }
        />

        <Route
          path="/register"
          element={
            <RedirectIfArtist to="/">
              <Register />
            </RedirectIfArtist>
          }
        />

        {/* Artist Login/Register */}
        <Route
          path="/artist-login"
          element={
            <RedirectIfArtist to="/artist-dashboard?tab=profile">
              <ArtistLogin />
            </RedirectIfArtist>
          }
        />

        <Route
          path="/artist-register"
          element={
            <RedirectIfArtist to="/artist-dashboard?tab=profile">
              <ArtistRegister />
            </RedirectIfArtist>
          }
        />

        <Route
          path="/become-artist"
          element={
            <RedirectIfArtist to="/artist-dashboard?tab=profile">
              <ArtistRegister />
            </RedirectIfArtist>
          }
        />

        {/* Artist-only routes */}
        <Route
          path="/artist-dashboard"
          element={
            <RequireArtist>
              <ArtistDashboard />
            </RequireArtist>
          }
        />

        <Route
          path="/artist/bookings"
          element={
            <RequireArtist>
              <ArtistBookingDashboard />
            </RequireArtist>
          }
        />

        {/* â”€â”€ Chat â€” consolidated single implementation, real-data booking-gated.
            /chat            -> conversation list only
            /chat/:artistId  -> list + auto-opens (or starts) that thread
            /user-chat       -> old link, kept working, same component â”€â”€ */}
        <Route
          path="/chat"
          element={
            <RequireAuth>
              <Chat />
            </RequireAuth>
          }
        />
        <Route
          path="/chat/:artistId"
          element={
            <RequireAuth>
              <Chat />
            </RequireAuth>
          }
        />
        <Route
          path="/user-chat"
          element={
            <RequireAuth>
              <Chat />
            </RequireAuth>
          }
        />

        <Route
          path="/my-bookings"
          element={
            <RequireAuth>
              <BookingPage />
            </RequireAuth>
          }
        />

        {/* Profile overview + Activity/Notifications */}
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />

        <Route
          path="/activity"
          element={
            <RequireAuth>
              <Activity />
            </RequireAuth>
          }
        />

        {/* Misc */}
        <Route path="/about" element={<Home />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;