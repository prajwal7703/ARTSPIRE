// ─────────────────────────────────────────────────────────────────────────────
// YOUR CURRENT LAST LINE IS:
//   export { ArtistBookingDashboard, EditProfileTab, PostsTab, ReviewsTab, EarningsTab };
//
// REPLACE THAT ONE LINE with everything below this comment.
// Do not change anything else in the file.
// ─────────────────────────────────────────────────────────────────────────────

export { ArtistBookingDashboard, EditProfileTab, PostsTab, ReviewsTab, EarningsTab };

/* ─── MAIN PAGE — default export used by App.jsx ────────────────────────── */
export default function ArtistDashboard() {
  const navigate = useNavigate();
  const artist   = getArtist();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState("bookings");

  useEffect(() => {
    if (!artist?._id) navigate("/artist-login", { replace: true });
  }, []);

  if (!artist?._id) return null;

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Nunito',sans-serif", background:"#f8fafc", overflow:"hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── Sidebar — desktop only ── */}
      {!isMobile && (
        <aside style={{ width:220, background:"#fff", borderRight:"1px solid #e2e8f0", display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ padding:"22px 18px 0" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, color:"#1e3a8a", letterSpacing:2, marginBottom:20 }}>ArtSpire</div>
            <div style={{ display:"flex", alignItems:"center", gap:10, paddingBottom:16, borderBottom:"1px solid #f1f5f9", marginBottom:8 }}>
              {artist.profileImage
                ? <img src={artist.profileImage} alt="" style={{ width:38, height:38, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                : <div style={{ width:38, height:38, borderRadius:"50%", background:"#dbeafe", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:"#1e3a8a", flexShrink:0 }}>
                    {artist.name?.[0]}
                  </div>
              }
              <div>
                <div style={{ fontWeight:800, fontSize:13, color:"#1e293b", fontFamily:"'Nunito',sans-serif" }}>{artist.name}</div>
                <div style={{ fontSize:11, color:"#94a3b8", fontFamily:"'Nunito',sans-serif" }}>{artist.category}</div>
              </div>
            </div>
          </div>

          <nav style={{ padding:"8px 10px", flex:1 }}>
            {TABS.map(item => (
              <button key={item.id} onClick={() => setTab(item.id)} style={{
                display:"flex", alignItems:"center", gap:10, width:"100%",
                padding:"10px 12px", borderRadius:10, border:"none",
                fontSize:13, fontFamily:"'Nunito',sans-serif", cursor:"pointer",
                marginBottom:2, textAlign:"left",
                background: tab===item.id ? "#eff6ff" : "transparent",
                color:      tab===item.id ? "#1e3a8a" : "#64748b",
                fontWeight: tab===item.id ? 800 : 600,
              }}>
                <span style={{ fontSize:16 }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div style={{ padding:"10px 10px 20px" }}>
            <button onClick={() => navigate("/")} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px", borderRadius:10, border:"none", fontSize:13, fontFamily:"'Nunito',sans-serif", cursor:"pointer", color:"#64748b", background:"transparent", fontWeight:600 }}>
              🏠 Home
            </button>
            <button
              onClick={() => {
                ["token","artist","user"].forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
                navigate("/", { replace:true });
              }}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 12px", borderRadius:10, border:"none", fontSize:13, fontFamily:"'Nunito',sans-serif", cursor:"pointer", color:"#ef4444", background:"transparent", fontWeight:600 }}
            >
              🚪 Logout
            </button>
          </div>
        </aside>
      )}

      {/* ── Main content ── */}
      <main style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", paddingBottom: isMobile ? 64 : 0 }}>

        {/* Mobile top header */}
        {isMobile && (
          <div style={{ padding:"14px 16px", background:"#fff", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10 }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, color:"#1e3a8a", letterSpacing:1 }}>ArtSpire</div>
            <div style={{ fontWeight:800, fontSize:13, color:"#1e293b", fontFamily:"'Nunito',sans-serif" }}>{artist.name}</div>
          </div>
        )}

        <div style={{ flex:1, padding: tab==="bookings" ? 0 : "0 20px", height:"100%", overflow:"hidden", display:"flex", flexDirection:"column" }}>
          {tab === "bookings" && <ArtistBookingDashboard artistId={artist._id} />}
          {tab === "profile"  && <div style={{ overflowY:"auto", flex:1 }}><EditProfileTab  artistId={artist._id} /></div>}
          {tab === "posts"    && <div style={{ overflowY:"auto", flex:1 }}><PostsTab        artistId={artist._id} /></div>}
          {tab === "reviews"  && <div style={{ overflowY:"auto", flex:1 }}><ReviewsTab      artistId={artist._id} /></div>}
          {tab === "earnings" && <div style={{ overflowY:"auto", flex:1 }}><EarningsTab     artistId={artist._id} /></div>}
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      {isMobile && (
        <nav style={{ position:"fixed", bottom:0, left:0, right:0, background:"#fff", borderTop:"1px solid #e2e8f0", display:"flex", zIndex:20 }}>
          {TABS.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{ flex:1, padding:"10px 4px 8px", border:"none", background:"transparent", display:"flex", flexDirection:"column", alignItems:"center", gap:3, cursor:"pointer" }}>
              <span style={{ fontSize:18 }}>{item.icon}</span>
              <span style={{ fontSize:10, fontFamily:"'Nunito',sans-serif", fontWeight:700, color: tab===item.id ? "#1e3a8a" : "#94a3b8" }}>{item.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}