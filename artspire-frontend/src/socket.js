import { io } from "socket.io-client";

// Hard-code the backend URL as fallback in case env var is malformed
const BACKEND = "https://artspire-backend-qv5b.onrender.com";

const socket = io(BACKEND, {
  transports: ["polling", "websocket"],
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,   // never give up — Render cold starts can take 30-60s+
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,      // back off up to 10s between tries, but keep retrying forever
  timeout: 20000,                   // give a cold-starting server room to respond before erroring
});

socket.on("connect_error", (err) => {
  console.warn("Socket error:", err.message);
});

socket.on("connect", () => {
  console.log("Socket connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.warn("Socket disconnected:", reason);
});

export default socket;