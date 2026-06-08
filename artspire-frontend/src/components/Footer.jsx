import {

  Instagram,
  Mail,
  Phone,
  MapPin,

} from "lucide-react";



export default function Footer() {

  return (

    <div

      style={{

        background: "#020617",

        borderTop:
          "1px solid rgba(255,255,255,0.08)",

        padding: "60px",

        color: "white",

        marginTop: "80px",

      }}

    >

      <div

        style={{

          display: "grid",

          gridTemplateColumns:
            "repeat(auto-fit,minmax(250px,1fr))",

          gap: "40px",

        }}

      >

        {/* BRAND */}

        <div>

          <div

            style={{

              display: "flex",

              alignItems: "center",

              gap: "15px",

              marginBottom: "20px",

            }}

          >

            <img

              src="/logo.jpg"

              alt="logo"

              style={{

                width: "60px",

                height: "60px",

                borderRadius: "50%",

              }}

            />



            <h2>ArtSpire</h2>

          </div>



          <p
            style={{
              color: "#cbd5e1",
              lineHeight: "1.8",
            }}
          >

            Discover and connect with
            talented local artists,
            creators and performers.

          </p>

        </div>




        {/* QUICK LINKS */}

        <div>

          <h3
            style={{
              marginBottom: "20px",
            }}
          >

            Quick Links

          </h3>



          <p style={linkStyle}>
            Home
          </p>

          <p style={linkStyle}>
            Artists
          </p>

          <p style={linkStyle}>
            Bookings
          </p>

          <p style={linkStyle}>
            Chat
          </p>

        </div>




        {/* CONTACT */}

        <div>

          <h3
            style={{
              marginBottom: "20px",
            }}
          >

            Contact

          </h3>



          <div style={contactStyle}>

            <Mail size={18} />

            artspire@gmail.com

          </div>



          <div style={contactStyle}>

            <Phone size={18} />

            +91 9876543210

          </div>



          <div style={contactStyle}>

            <MapPin size={18} />

            Bangalore, India

          </div>

        </div>




        {/* SOCIAL */}

        <div>

          <h3
            style={{
              marginBottom: "20px",
            }}
          >

            Community

          </h3>



          <a

            href="https://www.instagram.com/artistsconnect.arts?igsh=NmppdGpibXFpcTVh"

            target="_blank"

            style={{

              textDecoration: "none",

              color: "white",

            }}

          >

            <div style={contactStyle}>

              <Instagram size={20} />

              @artistsconnect.arts

            </div>

          </a>

        </div>

      </div>




      {/* BOTTOM */}

      <div

        style={{

          borderTop:
            "1px solid rgba(255,255,255,0.08)",

          marginTop: "40px",

          paddingTop: "25px",

          textAlign: "center",

          color: "#94a3b8",

        }}

      >

        © 2026 ArtSpire.
        All Rights Reserved.

      </div>

    </div>

  );

}



const linkStyle = {

  color: "#cbd5e1",

  marginBottom: "12px",

  cursor: "pointer",

};



const contactStyle = {

  display: "flex",

  alignItems: "center",

  gap: "12px",

  marginBottom: "15px",

  color: "#cbd5e1",

};
