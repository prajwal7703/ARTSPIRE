import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {

  const navigate = useNavigate();

  const storedUser =
    localStorage.getItem("user");

  const user =
    storedUser
      ? JSON.parse(storedUser)
      : null;



  const handleLogout = () => {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    navigate("/login");

  };



  return (

    <div

      style={{

        background: "#020617",

        padding: "20px 60px",

        display: "flex",

        justifyContent: "space-between",

        alignItems: "center",

        borderBottom:
          "1px solid rgba(255,255,255,0.1)",

      }}

    >

      {/* LOGO */}

      <Link
        to="/"
        style={{
          textDecoration: "none",
          color: "white",
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "15px",
          }}
        >

          <img

            src="/logo.jpg"

            alt="logo"

            style={{

              width: "55px",

              height: "55px",

              borderRadius: "50%",

            }}

          />



          <h2>ArtSpire</h2>

        </div>

      </Link>




      {/* LINKS */}

      <div
        style={{
          display: "flex",
          gap: "20px",
          alignItems: "center",
        }}
      >

        <Link
          to="/"
          style={linkStyle}
        >

          Home

        </Link>



        <Link
          to="/artists"
          style={linkStyle}
        >

          Artists

        </Link>



        {

          user ? (

            <button

              onClick={handleLogout}

              style={buttonStyle}

            >

              Logout

            </button>

          ) : (

            <Link to="/login">

              <button style={buttonStyle}>

                Login

              </button>

            </Link>

          )

        }

      </div>

    </div>

  );

}



const linkStyle = {

  color: "white",

  textDecoration: "none",

};



const buttonStyle = {

  background: "#f97316",

  border: "none",

  color: "white",

  padding: "10px 20px",

  borderRadius: "10px",

  cursor: "pointer",

};
