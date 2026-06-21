const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const dotenv   = require("dotenv");
const http     = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app    = express();
const server = http.createServer(app);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origin.endsWith(".vercel.app") || origin.includes("localhost")) return cb(null, true);
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json());
app.use("/uploads", express.static("uploads"));

const authRoutes         = require("./routes/authRoutes");
const chatRoutes         = require("./routes/chatRoutes");
const uploadRoutes       = require("./routes/uploadRoutes");
const artistRoutes       = require("./routes/artistRoutes");
const postRoutes         = require("./routes/postRoutes");
const userRoutes         = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const bookingRoutes      = require("./routes/bookingRoutes");
const withdrawalRoutes   = require("./routes/withdrawalRoutes");
const adminRoutes        = require("./routes/adminRoutes");

let groupRoutes;
try { groupRoutes = require("./routes/groups"); } catch {}

if (groupRoutes) app.use("/api/groups", groupRoutes);
app.use("/api/auth",          authRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/chat",          chatRoutes);
app.use("/api/artists",       artistRoutes);
app.use("/api/upload",        uploadRoutes);
app.use("/api/posts",         postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/bookings",      bookingRoutes);
app.use("/api/withdrawals",   withdrawalRoutes);
app.use("/api/admin",         adminRoutes);

app.get("/", (req, res) => res.send("ArtSpire Backend Running"));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("Mongo Error:", err));

const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origin.endsWith(".vercel.app") || origin.includes("localhost")) return cb(null, true);
      return cb(new Error("Not allowed"));
    },
    credentials: true,
  },
  transports:    ["polling", "websocket"],
  allowUpgrades: true,
  pingTimeout:   60000,
  pingInterval:  25000,
});

app.set("io", io);

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.on("join_room", (userId) => {
    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    io.emit("user_online", userId);
  });

  socket.on("join_artist_room", (artistId) => {
    socket.join(`artist_${artistId}`);
  });

  socket.on("join_user_room", (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on("send_message", (data) => {
    io.to(data.receiverId).emit("receive_message", data);
  });

  socket.on("send_group_message", (data) => {
    io.to(data.groupId).emit("receive_group_message", data);
  });

  socket.on("disconnect", () => {
    for (const [userId, sockId] of onlineUsers.entries()) {
      if (sockId === socket.id) {
        onlineUsers.delete(userId);
        io.emit("user_offline", userId);
        break;
      }
    }
    console.log("Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
