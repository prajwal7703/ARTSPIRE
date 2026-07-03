import { Home, Compass, Plus, Bell, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export default function BottomNav({ onCreateClick }) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { key: "home", label: "Home", icon: Home, path: "/" },
    { key: "explore", label: "Explore", icon: Compass, path: "/explore" },
    { key: "create", label: "", icon: Plus, path: null },
    { key: "activity", label: "Activity", icon: Bell, path: "/activity" },
    { key: "profile", label: "Profile", icon: User, path: "/profile" },
  ];

  const isActive = (path) =>
    path && (location.pathname === path || (path !== "/" && location.pathname.startsWith(path)));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-stone-100 bg-white/95 backdrop-blur px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto flex max-w-md items-center justify-between">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          if (tab.key === "create") {
            return (
              <button
                key={tab.key}
                onClick={onCreateClick}
                aria-label="Create"
                className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-300/60 transition-transform active:scale-95"
              >
                <Icon size={26} strokeWidth={2.5} />
              </button>
            );
          }

          const active = isActive(tab.path);
          return (
            <button
              key={tab.key}
              onClick={() => tab.path && navigate(tab.path)}
              className="flex flex-col items-center gap-1 px-3 py-1 text-stone-400"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? "text-violet-600" : "text-stone-400"}
              />
              <span className={`text-[11px] ${active ? "font-medium text-violet-600" : "text-stone-400"}`}>
                {tab.label}
              </span>
              {active && <span className="h-1 w-1 rounded-full bg-violet-600" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
