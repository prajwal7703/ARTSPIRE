import { createContext, useContext, useEffect, useState } from "react";

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export default function AppProvider({ children }) {
  const [artists] = useState([
    { id: 1, name: "Rahul Singer", genre: "Music", online: true },
    { id: 2, name: "DJ RaveX", genre: "DJ", online: true },
  ]);

  const [bookings, setBookings] = useState(() => {
    return JSON.parse(localStorage.getItem("bookings")) || [];
  });

  const [favorites, setFavorites] = useState(() => {
    return JSON.parse(localStorage.getItem("favorites")) || [];
  });

  useEffect(() => {
    localStorage.setItem("bookings", JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  // 🎯 BOOK ARTIST
  const bookArtist = (booking) => {
    setBookings([
      ...bookings,
      {
        id: Date.now(),
        status: "Pending",
        ...booking,
      },
    ]);
  };

  // 🎯 UPDATE BOOKING STATUS (Artist accepts/rejects)
  const updateBooking = (id, status) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
  };

  // ❤️ FAVORITES
  const toggleFavorite = (artist) => {
    const exists = favorites.find((f) => f.id === artist.id);

    if (exists) {
      setFavorites(favorites.filter((f) => f.id !== artist.id));
    } else {
      setFavorites([...favorites, artist]);
    }
  };

  return (
    <AppContext.Provider
      value={{
        artists,
        bookings,
        favorites,
        bookArtist,
        updateBooking,
        toggleFavorite,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
