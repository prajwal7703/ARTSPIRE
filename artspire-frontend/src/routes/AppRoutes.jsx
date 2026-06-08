
import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Artists from "../pages/Artists";
import ArtistProfile from "../pages/ArtistProfile";
import Login from "../pages/Login";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/artists" element={<Artists />} />
      <Route path="/artist-profile" element={<ArtistProfile />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}
