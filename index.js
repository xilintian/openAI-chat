const OpenAI = require("openai");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const openai = new OpenAI({
  // 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey: "sk-xxx",
  // apiKey: "sk-73901ecb4ae9403d99aa077b76f09931",
  // baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  apiKey: "sk-688907e7a3354eb083ef32df4f57b820",
  baseURL: "https://api.deepseek.com/v1",
});

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    // 设置响应头，支持流式输出
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*"); // 添加CORS支持

    let conversationHistory = [];

    // 添加用户消息到历史记录
    conversationHistory.push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      // model: "qwen-plus",
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        ...conversationHistory,
      ],
      stream: true,
    });

    let fullResponse = "";

    // 确保每次写入后立即刷新缓冲区
    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        const dataToSend = JSON.stringify({ content });
        console.log("Sending to client:", dataToSend);
        res.write(`data: ${dataToSend}\n\n`);
        // 强制刷新缓冲区
        if (res.flush) {
          res.flush();
        }
      }
    }

    // 将完整回复添加到对话历史
    conversationHistory.push({ role: "assistant", content: fullResponse });

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
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
