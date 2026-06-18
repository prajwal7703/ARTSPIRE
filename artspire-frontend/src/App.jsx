import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import LandingPage       from "./pages/LandingPage";
import DiscoverPage      from "./pages/DiscoverPage";
import ArtistProfilePage from "./pages/ArtistProfilePage";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Main pages ── */}
        <Route path="/"                  element={<Home />} />
        <Route path="/login"             element={<UserLogin />} />
        <Route path="/register"          element={<Register />} />

        {/* ── Artists ── */}
        <Route path="/artists"           element={<Artists />} />
        <Route path="/artist/:id"        element={<ArtistProfile />} />
        <Route path="/artist-dashboard"  element={<ArtistDashboard />} />
        <Route path="/artist-register"   element={<ArtistRegister />} />
        <Route path="/artist-login"      element={<ArtistLogin />} />

        {/* ── Forgot / Reset password ── */}
        <Route path="/forgot-password"   element={<ForgotPassword />} />
        <Route path="/reset-password"    element={<ResetPassword />} />

        {/* ── Chat ── */}
        <Route path="/chat/:id"          element={<Chat />} />
        <Route path="/"                    element={<LandingPage />} />
        <Route path="/discover"            element={<DiscoverPage />} />
        <Route path="/artist-profile/:id"  element={<ArtistProfilePage />} />
        {/* ── Aliases ── */}
        <Route path="/become-artist"     element={<ArtistRegister />} />
        <Route path="/explore"           element={<Artists />} />
        <Route path="/about"             element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
