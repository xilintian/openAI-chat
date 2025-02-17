const express = require("express");
const { getHistory, clearHistory, postMessage } = require("../controllers/chatController");

const router = express.Router();

// 获取历史对话记录的接口
router.get("/history", getHistory);

router.delete("/history", clearHistory);

router.post("/", postMessage);

module.exports = router;
