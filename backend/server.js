const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "https://artspire-lake.vercel.app",
  /https:\/\/artspire-.*\.vercel\.app$/
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

const authRoutes         = require("./routes/authRoutes");
const chatRoutes         = require("./routes/chatRoutes");
const uploadRoutes       = require("./routes/uploadRoutes");
const artistRoutes       = require("./routes/artistRoutes");
const postRoutes         = require("./routes/postRoutes");
const userRoutes         = require("./routes/userRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

app.use("/api/users",         userRoutes);
app.use("/api/auth",          authRoutes);
app.use("/api/chat",          chatRoutes);
app.use("/api/artists",       artistRoutes);
app.use("/api/upload",        uploadRoutes);
app.use("/api/posts",         postRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => res.send("ArtSpire Backend Running"));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("Mongo Error:", err));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);
  socket.on("join_room", (id) => socket.join(id));
  socket.on("send_message", (data) => io.to(data.receiverId).emit("receive_message", data));
  socket.on("disconnect", () => console.log("User Disconnected"));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("Server running on port " + PORT));
