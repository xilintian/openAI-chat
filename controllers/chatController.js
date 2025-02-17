const mongoose = require("mongoose");
const openai = require("../config/openai");
const Chat = require("../models/Chat");

const getHistory = async (req, res) => {
  try {
    const chats = await Chat.find();
    res.json(chats);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "服务器错误" });
  }
};

const clearHistory = async (req, res) => {
  try {
    await Chat.deleteMany({});
    res.status(200).json({ message: "历史记录已清空" });
  } catch (error) {
    console.error("Error clearing history::", error);
    res.status(500).json({ error: "服务器错误" });
  }
};

const postMessage = async (req, res) => {
  try {
    const { message } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    let conversationHistory = [];

    conversationHistory.push({
      _id: new mongoose.Types.ObjectId().toString(),
      role: "user",
      content: message,
    });

    const completion = await openai.chat.completions.create({
      model: "qwen-plus",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        ...conversationHistory,
      ],
      stream: true,
    });

    let fullResponse = "";

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        const dataToSend = JSON.stringify({ content });
        console.log("Sending to client:", dataToSend);
        res.write(`data: ${dataToSend}\n\n`);
        if (res.flush) {
          res.flush();
        }
      }
    }

    conversationHistory.push({
      _id: new mongoose.Types.ObjectId().toString(),
      role: "assistant",
      content: fullResponse,
    });

    console.log("Conversation history:", conversationHistory);

    const chat = new Chat({ conversationHistory });
    await chat.save();

    if (conversationHistory.length > 10) {
      conversationHistory = conversationHistory.slice(-10);
    }

    res.write("data: [DONE]\n\n");
    if (res.flush) {
      res.flush();
    }
    res.end();
  } catch (error) {
    console.error("Error:", error);
    res.write(`data: ${JSON.stringify({ error: "服务器错误" })}\n\n`);
    res.end();
  }
};

module.exports = {
  getHistory,
  clearHistory,
  postMessage,
};
