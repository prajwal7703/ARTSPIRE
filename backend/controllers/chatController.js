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

    // Emit via socket so the other side gets it in real time
    const io = req.app.get("io");
    if (io) {
      io.to(receiverId).emit("receive_message", newMessage);
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
exports.getConversations = async (req, res) => {
  try {
    const { userId } = req.params;

    const allMsgs = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: -1 });

    const convMap = {};
    for (const msg of allMsgs) {
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!convMap[otherId]) {
        convMap[otherId] = {
          userId:      otherId,
          lastMessage: msg.message,
          lastTime:    msg.createdAt,
          unread:      msg.senderId !== userId ? 1 : 0,
        };
      } else {
        if (msg.senderId !== userId) convMap[otherId].unread += 1;
      }
    }

    const Artist = (() => { try { return require("../models/Artist"); } catch { return null; } })();

    const conversations = await Promise.all(
      Object.values(convMap).map(async (conv) => {
        let name  = "Unknown";
        let image = null;
        try {
          const u = await User.findById(conv.userId).select("name profileImage image");
          if (u) { name = u.name; image = u.profileImage || u.image || null; }
          else if (Artist) {
            const a = await Artist.findById(conv.userId).select("name profileImage image");
            if (a) { name = a.name; image = a.profileImage || a.image || null; }
          }
        } catch {}
        return { ...conv, userName: name, userImage: image };
      })
    );

    conversations.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
    res.json(conversations);
  } catch (err) {
    console.error("getConversations error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};