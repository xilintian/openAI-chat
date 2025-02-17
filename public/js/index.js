const baseURL = "http://localhost:3000";
// const baseURL = "http://192.168.121.109:3000";

document.addEventListener("DOMContentLoaded", function () {
  const messageForm = document.getElementById("message-form");
  const messageInput = document.getElementById("message-input");
  const chatMessages = document.getElementById("chat-messages");
  const submitBtn = document.getElementById("submit-btn");
  const clearBtn = document.getElementById("clear-btn");

  window.onload = function () {
    getHistoryConversation();
  };

  async function getHistoryConversation() {
    try {
      const response = await fetch(`${baseURL}/chat/history`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const chats = await response.json();

      chats.forEach((chat) => {
        chat.conversationHistory.forEach((message) => {
          const role = message.role === "assistant" ? "bot" : "user";
          addMessage(message.content, role);
        });
      });
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  }

  messageForm.onsubmit = async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    // 禁用输入和发送按钮
    messageInput.disabled = true;
    submitBtn.disabled = true;

    // 显示用户消息
    addMessage(message, "user");
    messageInput.value = "";

    // 创建机器人回复的消息框
    const botMessageDiv = document.createElement("div");
    botMessageDiv.className = "message bot-message typing";
    chatMessages.appendChild(botMessageDiv);

    // 添加光标
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    botMessageDiv.appendChild(cursor);

    try {
      const response = await fetch(`${baseURL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botResponse = "";
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          // 如果流结束了，就退出循环
          if (done) {
            console.log("Stream complete");
            break;
          }

          // 确保有值才处理
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");

            // 保留最后一个不完整的行
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.trim() === "") continue;
              if (!line.startsWith("data: ")) continue;

              const data = line.slice(6).trim();

              if (data === "[DONE]") {
                botMessageDiv.classList.remove("typing");
                cursor.remove();
                continue;
              }

              try {
                const parsedData = JSON.parse(data);
                if (parsedData.content) {
                  botResponse += parsedData.content;
                  botMessageDiv.innerHTML = marked.parse(botResponse); // 使用marked库解析Markdown
                  // botMessageDiv.textContent = botResponse;
                  botMessageDiv.appendChild(cursor);
                  chatMessages.scrollTop = chatMessages.scrollHeight;
                }
              } catch (e) {
                console.error("JSON解析错误:", e, "Raw data:", data);
              }
            }
          }
        }

        // 处理最后可能残留的数据
        if (buffer.trim()) {
          const finalText = decoder.decode(); // 完成流的解码
          if (finalText) {
            buffer += finalText;
            const lines = buffer.split("\n");

            for (const line of lines) {
              if (line.trim() === "" || !line.startsWith("data: ")) continue;

              const data = line.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsedData = JSON.parse(data);
                if (parsedData.content) {
                  botResponse += parsedData.content;
                  // botMessageDiv.textContent = botResponse;
                  botMessageDiv.innerHTML = marked.parse(botResponse); // 使用marked库解析Markdown
                }
              } catch (e) {
                console.error("最终解析错误:", e, "Raw data:", data);
              }
            }
          }
        }
      } catch (streamError) {
        console.error("Stream processing error:", streamError);
        throw streamError;
      }

      console.log(botMessageDiv.innerHTML);
    } catch (error) {
      console.error("Error:", error);
      botMessageDiv.textContent = "抱歉，发生错误。";
      botMessageDiv.classList.remove("typing");
      cursor.remove();
    } finally {
      messageInput.disabled = false;
      submitBtn.disabled = false;
      messageInput.focus();
    }
  };

  function addMessage(text, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;
    // messageDiv.textContent = text;
    messageDiv.innerHTML = marked.parse(text); // 使用marked库解析Markdown
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function alertWithPromise(message) {
    return new Promise((resolve) => {
      alert(message);
      resolve();
    });
  }

  clearBtn.onclick = async () => {
    chatMessages.innerHTML = "";
    // return;
    try {
      await alertWithPromise("确定要清空历史记录吗？");
      const response = await fetch(`${baseURL}/chat/history`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      chatMessages.innerHTML = "";
      console.log("历史记录已清空");
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };
});
