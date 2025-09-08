export function loadChatUI() {
  const heder = document.querySelector(".main-content");
  const pagination = document.querySelector(".pagination");
  const footer = document.querySelector(".footer");

  if (heder) heder.remove();
  if (pagination) pagination.remove();
  if (footer) footer.remove();

  const chatContainer = document.createElement("div");
  chatContainer.className = "chat-container";

  const chatMain = document.createElement("div");
  
  chatMain.className = "chat-main";
  chatMain.innerHTML = `
    <div class="chat-header"> real time forume chat </div>
    <div id="messages" class="chat-messages">
      <div class="message system">Welcome to the chat!</div>
    </div>
    <div class="chat-input">
      <input id="msg" type="text" placeholder="Type a message..." />
      <button id="sendBtn">Send</button>
    </div>
  `;

  const chatSidebar = document.createElement("div");
  chatSidebar.className = "chat-sidebar";
  chatSidebar.innerHTML = `
    <h3>Connected</h3>
    <ul class="user-list" id="userList">
      <li class="online">zaki</li>
            <li class="online">said</li>

      
    </ul>
  `;

  chatContainer.append(chatMain, chatSidebar);

  document.body.append(chatContainer);

const params = new URLSearchParams(window.location.search);
const room = params.get("room") || "general"; 

const socket = new WebSocket(`ws://${location.host}/room?room=${room}`);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      const msgContainer = document.createElement("div");
      msgContainer.classList.add("message-container");

      const usernameDiv = document.createElement("div");
      usernameDiv.classList.add("username");
      usernameDiv.textContent = data.name || "Anonymous";

      const messageDiv = document.createElement("div");
      messageDiv.classList.add("message");
      messageDiv.textContent = data.message;

      msgContainer.appendChild(usernameDiv);
      msgContainer.appendChild(messageDiv);

      document.getElementById("messages").appendChild(msgContainer);

      const messagesDiv = document.getElementById("messages");
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (err) {
      console.error("Invalid JSON received:", event.data);
    }
  };

  function sendMessage() {
    const input = document.getElementById("msg");
    if (input.value.trim() !== "") {
      const payload = {
        name: "Me",
        message: input.value,
      };
      socket.send(JSON.stringify(payload));
      input.value = "";
    }
  }

  document.getElementById("sendBtn").addEventListener("click", sendMessage);
  document.getElementById("msg").addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  });
}
