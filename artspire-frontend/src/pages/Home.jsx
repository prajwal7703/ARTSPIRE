import { useNavigate, useLocation } from "react-router-dom";
import { Image, Eye, Layers, User, Brush } from "lucide-react";

// Reskinned to match the Musée aesthetic. Assumes the same calling
// convention as before: <BottomNav onCreateClick={() => ...} />
// Adjust the routes below if your app uses different paths.
export default function BottomNav({ onCreateClick }) {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { key: "gallery", label: "Gallery", icon: Image, path: "/" },
    { key: "discover", label: "Discover", icon: Eye, path: "/discover" },
    { key: "collections", label: "Collections", icon: Layers, path: "/collections" },
    { key: "profile", label: "Profile", icon: User, path: "/profile" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#C9A227]/30 bg-gradient-to-t from-[#3B0F14] via-[#3B0F14] to-[#3B0F14]/95 px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      <div className="relative mx-auto flex max-w-md items-center justify-between">
        {items.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1"
            >
              <Icon
                size={20}
                strokeWidth={1.6}
                className={isActive ? "text-[#E8CE86]" : "text-[#D9B65E]/60"}
              />
              <span
                className={`text-[10px] ${isActive ? "text-[#E8CE86]" : "text-[#D9B65E]/60"}`}
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Center create button */}
        <button
          onClick={onCreateClick}
          aria-label="Create"
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#3B0F14] bg-gradient-to-b from-[#E8CE86] to-[#C9A227] text-[#3B0F14] shadow-lg"
        >
          <Brush size={24} strokeWidth={1.8} />
        </button>

        {/* Spacer to balance the layout around the absolutely-positioned center button */}
        <div className="w-6" />

        {items.slice(2).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center gap-1"
            >
              <Icon
                size={20}
                strokeWidth={1.6}
                className={isActive ? "text-[#E8CE86]" : "text-[#D9B65E]/60"}
              />
              <span
                className={`text-[10px] ${isActive ? "text-[#E8CE86]" : "text-[#D9B65E]/60"}`}
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
