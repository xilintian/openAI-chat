require('dotenv').config();
const OpenAI = require("openai");

const openai = new OpenAI({
  // 若没有配置环境变量，请用百炼API Key将下行替换为：apiKey: "sk-xxx",
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  // baseURL: "https://api.deepseek.com/v1",
});

module.exports = openai;
