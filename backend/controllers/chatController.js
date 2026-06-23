const Message = require("../models/Message");
const User    = require("../models/User");

// ── POST /api/chat/send ───────────────────────────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, message, mediaUrl, mediaType, senderRole } = req.body;
    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "senderId and receiverId required" });
    }
    const newMessage = new Message({
      senderId,
      receiverId,
      message:    message || "",
      mediaUrl:   mediaUrl  || null,
      mediaType:  mediaType || null,
      senderRole: senderRole || "user",
    });
    await newMessage.save();

    const io = req.app.get("io");
    if (io) {
      // Emit to BOTH parties so both sides update in real time
      io.to(receiverId).emit("receive_message", newMessage);
      io.to(senderId).emit("receive_message", newMessage);
    }

    res.json({ success: true, message: newMessage });
  } catch (err) {
    console.error("sendMessage error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/chat/:senderId/:receiverId ───────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error("getMessages error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/chat/conversations/:userId ───────────────────────────────────────
// Works for BOTH artists and regular users.
// Returns conversations with the correct name key:
//   - If the caller is a USER  → other party is an artist → returns { artistId, artistName, artistImage, ... }
//   - If the caller is ARTIST  → other party is a user    → returns { userId,   userName,   userImage,   ... }
// The frontend decides which key to use based on who it is.
// We return BOTH sets of keys so both UserChat and ArtistDashboard ChatTab work.
exports.getConversations = async (req, res) => {
  try {
    const { userId } = req.params;

    const allMsgs = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: -1 });

    // Build one entry per unique conversation partner (latest message wins)
    const convMap = {};
    for (const msg of allMsgs) {
      const otherId = msg.senderId.toString() === userId.toString()
        ? msg.receiverId.toString()
        : msg.senderId.toString();

      if (!convMap[otherId]) {
        convMap[otherId] = {
          otherId,
          lastMessage: msg.message,
          lastTime:    msg.createdAt,
          // Don't accumulate unread here — we always return 0 and let
          // the client track it via socket. Returning stale DB counts
          // was what made it look like only 1 message was unread.
          unread: 0,
        };
      }
    }

    // Lazy-load Artist model (avoid circular require issues)
    const Artist = (() => {
      try { return require("../models/Artist"); } catch { return null; }
    })();

    const conversations = await Promise.all(
      Object.values(convMap).map(async (conv) => {
        let name  = "Unknown";
        let image = null;
        let role  = "user"; // what role is the OTHER person

        try {
          // Try User first
          const u = await User.findById(conv.otherId).select("name profileImage image");
          if (u) {
            name  = u.name || "Unknown";
            image = u.profileImage || u.image || null;
            role  = "user";
          } else if (Artist) {
            // Fall back to Artist
            const a = await Artist.findById(conv.otherId).select("name profileImage image");
            if (a) {
              name  = a.name || "Unknown";
              image = a.profileImage || a.image || null;
              role  = "artist";
            }
          }
        } catch (e) {
          console.error("Name lookup failed for", conv.otherId, e.message);
        }

        // Return BOTH naming conventions so UserChat and ArtistDashboard
        // both work without backend changes:
        //   UserChat        reads: artistId, artistName, artistImage
        //   ArtistDashboard reads: userId,   userName,   userImage
        return {
          // generic
          otherId:     conv.otherId,
          lastMessage: conv.lastMessage,
          lastTime:    conv.lastTime,
          unread:      conv.unread,
          otherRole:   role,
          // user-side keys (UserChat.jsx)
          artistId:    conv.otherId,
          artistName:  role === "artist" ? name : null,
          artistImage: role === "artist" ? image : null,
          // artist-side keys (ArtistDashboard ChatTab)
          userId:      conv.otherId,
          userName:    name,
userImage:   image,
        };
      })
    );

    // Sort newest first
    conversations.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
    res.json(conversations);
  } catch (err) {
    console.error("getConversations error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};