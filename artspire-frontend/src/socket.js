import { io } from "socket.io-client";

// Hard-code the backend URL as fallback in case env var is malformed
const BACKEND = "https://artspire-backend-e3us.onrender.com";

const socket = io(BACKEND, {
  transports: ["polling", "websocket"],
  withCredentials: true,
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

socket.on("connect_error", (err) => {
  console.warn("Socket error:", err.message);
});

export default socket;