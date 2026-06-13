const Message = require('../models/Message');

exports.sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, message, mediaUrl, mediaType } = req.body;
    if (!senderId || !receiverId) {
      return res.status(400).json({ message: 'senderId and receiverId required' });
    }
    const newMessage = new Message({
      senderId, receiverId,
      message: message || '',
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
    });
    await newMessage.save();
    res.json({ success: true, message: newMessage });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

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
    console.error('Get messages error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};