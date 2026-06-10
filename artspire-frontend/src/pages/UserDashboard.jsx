import { useEffect, useState } from "react";
import axios from "axios";
import socket from "../socket";
import Navbar from "../Navbar";

export default function UserDashboard() {
  const [bookings, setBookings] = useState([]);
  const [notification, setNotification] = useState("");

  useEffect(() => {
    fetchBookings();
    socket.on("booking_notification", (data) => {
      setNotification(data.message);
      fetchBookings();
    });
    return () => socket.off("booking_notification");
  }, []);

  // FETCH BOOKINGS
  const fetchBookings = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/bookings`);
      setBookings(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      <Navbar />
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          padding: "40px",
        }}
      >
        <h1
          style={{
            fontSize: "42px",
            marginBottom: "30px",
          }}
        >
          My Bookings
        </h1>

        {/* NOTIFICATION */}
        {notification && (
          <div
            style={{
              background: "#06b6d4",
              padding: "16px",
              borderRadius: "12px",
              marginBottom: "20px",
              fontWeight: "bold",
            }}
          >
            {notification}
          </div>
        )}

        {/* BOOKINGS */}
        <div
          style={{
            display: "grid",
            gap: "20px",
          }}
        >
          {bookings.map((booking) => (
            <div
              key={booking._id}
              style={{
                background: "#0f172a",
                padding: "25px",
                borderRadius: "18px",
              }}
            >
              <h2>{booking.eventType}</h2>
              <p>Date: {booking.eventDate}</p>
              <p>Status: {booking.status}</p>
              <p>{booking.message}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

