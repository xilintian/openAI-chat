const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
});

const chatSchema = new mongoose.Schema({
  conversationHistory: [messageSchema],
});

const Chat = mongoose.model("Chat", chatSchema);

module.exports = Chat;
