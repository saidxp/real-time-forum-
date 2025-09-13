async function loadCurrentUser() {
  try {
    const response = await fetch("/api/me");
    const data = await response.json();
    const el = document.getElementById("currentUser");
    if (el) el.textContent = `Logged in as: ${data.username}`;
  } catch (err) {
    console.error("Error loading current user:", err);
  }
}

loadCurrentUser();

export async function loadChatUI(targetUser = null) {
  // Clean up existing content
  const existingElements = [
    ".main-content", 
    ".pagination", 
    ".footer",
    ".chat-container"
  ];
  existingElements.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) element.remove();
  });

  // Chat container + sidebar
  const chatContainer = document.createElement("div");
  chatContainer.className = "chat-container";

  const chatMain = document.createElement("div");
  chatMain.className = "chat-main";
  chatMain.innerHTML = `
    <div class="chat-header">
      <h2>Real-Time Forum Chat</h2>
      <button id="backToForum" class="back-btn">← Back to Forum</button>
    </div>
    <div id="messages" class="chat-messages">
      <div class="message system">Welcome to the chat! 🎉</div>
    </div>
    <div class="chat-input">
      <input id="msg" type="text" placeholder="Type a message..." />
      <button id="sendBtn">Send</button>
    </div>
  `;

  const chatSidebar = document.createElement("div");
  chatSidebar.className = "chat-sidebar";
  chatSidebar.innerHTML = `
    <h3>Online Users</h3>
    <ul class="user-list" id="userList"></ul>
  `;

  chatContainer.append(chatMain, chatSidebar);
  document.body.append(chatContainer);

  addChatStyles();

  // ======= Fetch current user =======
  let currentUser = { Username: "Anonymous" };
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    if (data.authenticated) {
      currentUser = { Username: data.Username, Initial: data.Initial };
    }
  } catch (err) {
    console.error("Error fetching user state:", err);
  }

  // ======= WebSocket Setup =======
  let socketUrl;
  if (targetUser) {
    socketUrl = `ws://${location.host}/room?user1=${currentUser.Username}&user2=${targetUser}&username=${currentUser.Username}`;
  } else {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room") || "general";
    socketUrl = `ws://${location.host}/room?room=${room}&username=${currentUser.Username}`;
  }

  const socket = new WebSocket(socketUrl);

  socket.onopen = () => addSystemMessage("Connected to server");
  socket.onclose = () => addSystemMessage("Disconnected from server");
  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    addSystemMessage("Connection error occurred");
  };
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "users") {
        loadOnlineUsers();
      } else if (data.type === "message") {
        addChatMessage(data.name, data.message);
      }
    } catch (err) {
      console.error("Invalid JSON received:", event.data);
    }
  };

  function addChatMessage(username, message) {
    const msgContainer = document.createElement("div");
    msgContainer.classList.add("message-container");
    if (username === currentUser.Username) {
      msgContainer.classList.add("own-message");
    }
    msgContainer.innerHTML = `
      <div class="username">${username}</div>
      <div class="message">${escapeHtml(message)}</div>
      <div class="timestamp">${new Date().toLocaleTimeString()}</div>
    `;
    const messagesDiv = document.getElementById("messages");
    messagesDiv.appendChild(msgContainer);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function addSystemMessage(message) {
    const msgContainer = document.createElement("div");
    msgContainer.classList.add("message", "system");
    msgContainer.textContent = message;
    const messagesDiv = document.getElementById("messages");
    messagesDiv.appendChild(msgContainer);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function sendMessage() {
    const input = document.getElementById("msg");
    const message = input.value.trim();
    if (message !== "") {
      const payload = {
        type: "message",
        name: currentUser.Username,
        message: message
      };
      socket.send(JSON.stringify(payload));
      input.value = "";
    }
  }

  // Event listeners
  document.getElementById("sendBtn").addEventListener("click", sendMessage);
  document.getElementById("msg").addEventListener("keypress", (event) => {
    if (event.key === "Enter") sendMessage();
  });
  document.getElementById("backToForum").addEventListener("click", async () => {
    socket.close();
    const res = await fetch("/api/me");
    const user = await res.json();
    const { showPage } = await import("./main.js");
    await showPage("home", user);
    sessionStorage.setItem("currentPage", "home");
  });

  document.getElementById("msg").focus();
}

async function loadOnlineUsers() {
  try {
    const response = await fetch("/api/online-users");
    const data = await response.json();
    const userList = document.getElementById("userList");
    userList.innerHTML = "";

    if (data.users && data.users.length > 0) {
      data.users.forEach((username) => {
        const li = document.createElement("li");
        li.className = "online-user";
        li.setAttribute("data-username", username);
        li.innerHTML = `<span class="status-dot"></span>${username}`;
        li.addEventListener("click", () => {
          import("./main.js").then(({ startPrivateChat }) => {
            startPrivateChat(username);
          });
        });
        userList.appendChild(li);
      });
    } else {
      userList.innerHTML = `<li><em>No other users online</em></li>`;
    }
  } catch (err) {
    console.error("Error loading online users:", err);
    const userList = document.getElementById("userList");
    if (userList) {
      userList.innerHTML = `<li><em>Error loading online users</em></li>`;
    }
  }
}

// function addChatStyles() {
//   const styles = `/* same styles you had, unchanged */`;
//   const styleSheet = document.createElement("style");
//   styleSheet.textContent = styles;
//   document.head.appendChild(styleSheet);
// }

function addChatStyles() {
  const styles = `
    .chat-container {
      display: flex;
      height: 100vh;
      font-family: Arial, sans-serif;
    }
    
    .chat-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      background: #f5f5f5;
    }
    
    .chat-header {
      background: #2c3e50;
      color: white;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .chat-header h2 {
      margin: 0;
    }
    
    .back-btn {
      background: #3498db;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    .back-btn:hover {
      background: #2980b9;
    }
    
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      background: white;
    }
    
    .message-container {
      margin-bottom: 1rem;
      padding: 0.5rem;
      border-radius: 8px;
      background: #ecf0f1;
      max-width: 70%;
    }
    
    .message-container.own-message {
      margin-left: auto;
      background: #3498db;
      color: white;
    }
    
    .username {
      font-weight: bold;
      font-size: 0.9rem;
      margin-bottom: 0.25rem;
    }
    
    .message {
      word-wrap: break-word;
    }
    
    .timestamp {
      font-size: 0.8rem;
      opacity: 0.7;
      margin-top: 0.25rem;
    }
    
    .message.system {
      background: #f39c12;
      color: white;
      text-align: center;
      border-radius: 4px;
      padding: 0.5rem;
      margin: 0.5rem 0;
      max-width: 100%;
    }
    
    .chat-input {
      display: flex;
      padding: 1rem;
      background: white;
      border-top: 1px solid #ddd;
    }
    
    .chat-input input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-right: 0.5rem;
    }
    
    .chat-input button {
      background: #27ae60;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    .chat-input button:hover {
      background: #229954;
    }
    
    .chat-sidebar {
      width: 250px;
      background: #34495e;
      color: white;
      padding: 1rem;
    }
    
    .chat-sidebar h3 {
      margin-top: 0;
      text-align: center;
      border-bottom: 1px solid #5d6d7e;
      padding-bottom: 0.5rem;
    }
    
    .user-list {
      list-style: none;
      padding: 0;
    }
    
    .user-list li {
      padding: 0.5rem;
      margin: 0.25rem 0;
      border-radius: 4px;
      background: #2c3e50;
      display: flex;
      align-items: center;
    }
    
    .user-status {
      width: 8px;
      height: 8px;
      background: #27ae60;
      border-radius: 50%;
      margin-right: 0.5rem;
    }
    
    .user-name {
      font-size: 0.9rem;
    }
    
    @media (max-width: 768px) {
      .chat-container {
        flex-direction: column;
      }
      
      .chat-sidebar {
        width: 100%;
        height: auto;
        max-height: 200px;
        overflow-y: auto;
      }
      
      .message-container {
        max-width: 90%;
      }
    }
  `;
  
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}