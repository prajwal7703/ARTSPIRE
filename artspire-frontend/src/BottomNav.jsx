// artspire-frontend/src/BottomNav.jsx
import { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  const handleAddClick = () => {
    // Opens camera on mobile (capture="environment") or gallery/file picker as fallback
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Hand the picked file off to your create/upload page.
    // Adjust "/create" to whatever route you use for composing a post.
    navigate("/create", { state: { file } });
    e.target.value = ""; // reset so picking the same file again still fires onChange
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        style={styles.hiddenInput}
        onChange={handleFileChange}
      />

      <nav style={styles.nav}>
        <NavIcon
          active={isActive("/") || isActive("/home")}
          onClick={() => navigate("/")}
          label="Home"
        >
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
        </NavIcon>

        <NavIcon
          active={isActive("/explore")}
          onClick={() => navigate("/explore")}
          label="Explore"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="m14.5 9.5-2 5-5 2 2-5z" />
        </NavIcon>

        {/* Center "Add Post" button, raised like Instagram */}
        <button style={styles.addBtn} onClick={handleAddClick} aria-label="Add post">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        <NavIcon
          active={isActive("/notifications")}
          onClick={() => navigate("/notifications")}
          label="Activity"
        >
          <path d="M12 21s-7-4.35-9.5-8.5C.5 8.5 3 5 6.5 5 9 5 11 6.7 12 8c1-1.3 3-3 5.5-3 3.5 0 6 3.5 4 7.5C19 16.65 12 21 12 21z" />
        </NavIcon>

        <NavIcon
          active={isActive("/profile")}
          onClick={() => navigate("/profile")}
          label="Profile"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6.5 8-6.5s8 2.5 8 6.5" />
        </NavIcon>
      </nav>
    </>
  );
}

function NavIcon({ active, onClick, label, children }) {
  return (
    <button style={styles.iconBtn} onClick={onClick} aria-label={label}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke={active ? "#fff" : "#8a8f98"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}

const styles = {
  nav: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    background: "#0b1424",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    padding: "0 8px",
    zIndex: 50,
  },
  iconBtn: {
    background: "transparent",
    border: "none",
    padding: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#f97316,#ec4899)",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    marginTop: -18, // raises it above the bar, Instagram-style
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
  },
  hiddenInput: { display: "none" },
};