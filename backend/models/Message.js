const mongoose = require("mongoose");
<Route path="/groups" element={<GroupChat />} />
const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    message: {
      type: String,
      default: "",
    },
  },

  {
    timestamps: true,
  }
);

module.exports =
mongoose.model("Message", messageSchema);