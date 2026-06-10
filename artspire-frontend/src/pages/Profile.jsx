import Navbar from "../Navbar";

export default function Profile() {
  let user = null;
  try { user = JSON.parse(localStorage.getItem("user")); } catch {}

  return (
    <>
      <Navbar />
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px",
        }}
      >
        <div
          style={{
            background: "#0f172a",
            width: "450px",
            padding: "40px",
            borderRadius: "24px",
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {/* PROFILE IMAGE */}
          <img
            src={user?.photo || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
            alt="profile"
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              objectFit: "cover",
              marginBottom: "20px",
            }}
          />

          {/* NAME */}
          <h1 style={{ fontSize: "32px" }}>
            {user?.name}
          </h1>

          {/* EMAIL */}
          <p style={{ color: "#94a3b8", marginTop: "10px" }}>
            {user?.email}
          </p>

          {/* ROLE */}
          <div
            style={{
              marginTop: "20px",
              display: "inline-block",
              padding: "8px 18px",
              background: "#06b6d4",
              borderRadius: "20px",
            }}
          >
            {user?.role}
          </div>

          {/* BIO */}
          <div style={{ marginTop: "40px" }}>
            <h3>About</h3>
            <p style={{ color: "#94a3b8", marginTop: "10px", lineHeight: 1.7 }}>
              Welcome to ArtSpire. This is your creative profile where artists and users can
              showcase their work and connect with others.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
