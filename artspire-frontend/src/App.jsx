import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import Artists from "./pages/Artists";
import ArtistProfile from "./pages/ArtistProfile";
import ArtistDashboard from "./pages/ArtistDashboard";

import ArtistRegister from "./pages/ArtistRegister";

import Chat from "./pages/chat";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Main pages ── */}
        <Route path="/"                element={<Home />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />

        {/* ── Artists ── */}
        <Route path="/artists"         element={<Artists />} />
        <Route path="/artist/:id"      element={<ArtistProfile />} />
        <Route path="/artist-dashboard" element={<ArtistDashboard />} />
        <Route path="/artist-register" element={<ArtistRegister />} />

        {/* ── Chat ── */}
        <Route path="/chat/:id"        element={<Chat />} />

        {/* ── Aliases ── */}
        <Route path="/become-artist"   element={<ArtistRegister />} />
        <Route path="/explore"         element={<Artists />} />
        <Route path="/about"           element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
