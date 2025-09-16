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

// Global variables for chat state
let currentChatUser = null;
let currentChatUserID = null;
let messagesLoaded = 0;
let isLoadingMessages = false;
let hasMoreMessages = true;
let currentSocket = null;

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
      <h2 id="chatTitle">Real-Time Forum Chat</h2>
      <button id="backToForum" class="back-btn">← Back to Forum</button>
    </div>
    <div id="messages" class="chat-messages">
      <div class="message system">Welcome to the chat! 🎉</div>
      <div id="loadMoreBtn" class="load-more-btn" style="display: none;">Load More Messages</div>
    </div>
    <div class="chat-input" ${targetUser ? '' : 'style="display: none;"'}>
      <input id="msg" type="text" placeholder="Type a message..." />
      <button id="sendBtn">Send</button>
    </div>
  `;

  const chatSidebar = document.createElement("div");
  chatSidebar.className = "chat-sidebar";
  chatSidebar.innerHTML = `
    <h3>Users</h3>
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
      currentUser = { Username: data.Username, Initial: data.Initial, ID: data.ID };
    }
  } catch (err) {
    console.error("Error fetching user state:", err);
  }

  // Set up event listeners first
  setupEventListeners(currentUser);

  // If targetUser is specified, set up private chat
  if (targetUser) {
    await setupPrivateChat(targetUser, currentUser);
  } else {
    // Load online users for selection
    await loadOnlineUsers();
  }

  if (targetUser) {
    const msgInput = document.getElementById("msg");
    if (msgInput) msgInput.focus();
  }
}

function setupEventListeners(currentUser) {
  // Send button listener
  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }

  // Enter key listener
  const msgInput = document.getElementById("msg");
  if (msgInput) {
    msgInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") sendMessage();
    });
  }

  // Back to forum listener
  const backBtn = document.getElementById("backToForum");
  if (backBtn) {
    backBtn.addEventListener("click", async () => {
      if (currentSocket) {
        currentSocket.close();
        currentSocket = null;
      }
      try {
        const res = await fetch("/api/me");
        const user = await res.json();
        const { showPage } = await import("./main.js");
        await showPage("home", user);
        sessionStorage.setItem("currentPage", "home");
      } catch (err) {
        console.error("Error navigating back to forum:", err);
      }
    });
  }

  // Load more messages button
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMoreMessages);
  }

  // Auto-scroll detection for loading more messages
  const messagesDiv = document.getElementById("messages");
  if (messagesDiv) {
    messagesDiv.addEventListener("scroll", () => {
      if (messagesDiv.scrollTop === 0 && hasMoreMessages && !isLoadingMessages) {
        loadMoreMessages();
      }
    });
  }
}

async function setupPrivateChat(targetUser, currentUser) {
  currentChatUser = targetUser;
  const chatTitle = document.getElementById("chatTitle");
  if (chatTitle) {
    chatTitle.textContent = `Chat with ${targetUser}`;
  }
  
  // Get target user ID
  try {
    const response = await fetch(`/api/user-by-username?username=${encodeURIComponent(targetUser)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const userData = await response.json();
    currentChatUserID = userData.id;
  } catch (err) {
    console.error("Error getting user ID:", err);
    addSystemMessage("Error: Could not find user or chat not available yet");
    currentChatUserID = null;
    // Still allow chat via WebSocket, but without DB history
  }

  // Reset message state
  messagesLoaded = 0;
  hasMoreMessages = true;
  
  // Clear messages except system message
  const messagesDiv = document.getElementById("messages");
  if (messagesDiv) {
    const systemMessages = messagesDiv.querySelectorAll(".message.system");
    messagesDiv.innerHTML = "";
    systemMessages.forEach(msg => messagesDiv.appendChild(msg));
  }

  // Load chat history if we have user ID
  if (currentChatUserID) {
    await loadChatHistory();
  }

  // Set up WebSocket connection
  setupWebSocket(currentUser, targetUser);
  
  // Show chat input
  const chatInput = document.querySelector(".chat-input");
  if (chatInput) {
    chatInput.style.display = "flex";
  }
}

async function loadChatHistory() {
  if (!currentChatUserID || isLoadingMessages) return;
  
  isLoadingMessages = true;
  
  try {
    const response = await fetch(
      `/api/chat-messages?other_user_id=${currentChatUserID}&limit=10&offset=${messagesLoaded}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.messages && data.messages.length > 0) {
      const messagesDiv = document.getElementById("messages");
      if (!messagesDiv) {
        console.error("Messages div not found");
        return;
      }
      
      const scrollHeightBefore = messagesDiv.scrollHeight;
      
      // Add messages at the top (they come in chronological order)
      data.messages.forEach(msg => {
        addChatMessageToHistory(msg.sender_name, msg.message, new Date(msg.created_at));
      });
      
      // Maintain scroll position when loading older messages
      if (messagesLoaded > 0) {
        const scrollHeightAfter = messagesDiv.scrollHeight;
        messagesDiv.scrollTop = scrollHeightAfter - scrollHeightBefore;
      } else {
        // First load - scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
      
      messagesLoaded += data.messages.length;
      hasMoreMessages = data.hasMore;
      
      // Show/hide load more button
      const loadMoreBtn = document.getElementById("loadMoreBtn");
      if (loadMoreBtn) {
        if (hasMoreMessages) {
          loadMoreBtn.style.display = "block";
        } else {
          loadMoreBtn.style.display = "none";
        }
      }
    } else {
      hasMoreMessages = false;
      const loadMoreBtn = document.getElementById("loadMoreBtn");
      if (loadMoreBtn) {
        loadMoreBtn.style.display = "none";
      }
    }
  } catch (err) {
    console.error("Error loading chat history:", err);
    addSystemMessage("Chat history not available yet");
    hasMoreMessages = false;
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    if (loadMoreBtn) {
      loadMoreBtn.style.display = "none";
    }
  }
  
  isLoadingMessages = false;
}

async function loadMoreMessages() {
  await loadChatHistory();
}

function setupWebSocket(currentUser, targetUser) {
  if (currentSocket) {
    currentSocket.close();
  }
  
  const socketUrl = `ws://${location.host}/room?user1=${encodeURIComponent(currentUser.Username)}&user2=${encodeURIComponent(targetUser)}&username=${encodeURIComponent(currentUser.Username)}`;
  currentSocket = new WebSocket(socketUrl);

  currentSocket.onopen = () => {
    console.log("WebSocket connected");
    addSystemMessage("Connected to server");
  };
  
  currentSocket.onclose = () => {
    console.log("WebSocket disconnected");
    addSystemMessage("Disconnected from server");
  };
  
  currentSocket.onerror = (error) => {
    console.error("WebSocket error:", error);
    addSystemMessage("Connection error occurred");
  };
  
  currentSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "users") {
        console.log("Users update:", data.list);
      } else if (data.type === "message") {
        addChatMessage(data.name, data.message);
      }
    } catch (err) {
      console.error("Invalid JSON received:", event.data);
    }
  };
}

async function addChatMessageToHistory(username, message, timestamp) {
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    const currentUsername = data.Username;
    
    const msgContainer = document.createElement("div");
    msgContainer.classList.add("message-container");
    if (username === currentUsername) {
      msgContainer.classList.add("own-message");
    }
    msgContainer.innerHTML = `
      <div class="username">${escapeHtml(username)}</div>
      <div class="message">${escapeHtml(message)}</div>
      <div class="timestamp">${timestamp.toLocaleString()}</div>
    `;
    
    // Insert after load more button or at the beginning
    const messagesDiv = document.getElementById("messages");
    if (!messagesDiv) return;
    
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    if (loadMoreBtn && loadMoreBtn.style.display !== "none") {
      messagesDiv.insertBefore(msgContainer, loadMoreBtn.nextSibling);
    } else {
      const firstMessage = messagesDiv.querySelector(".message-container");
      if (firstMessage) {
        messagesDiv.insertBefore(msgContainer, firstMessage);
      } else {
        messagesDiv.appendChild(msgContainer);
      }
    }
  } catch (err) {
    console.error("Error adding message to history:", err);
  }
}

async function addChatMessage(username, message) {
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    const currentUsername = data.Username;
    
    const msgContainer = document.createElement("div");
    msgContainer.classList.add("message-container");
    if (username === currentUsername) {
      msgContainer.classList.add("own-message");
    }
    msgContainer.innerHTML = `
      <div class="username">${escapeHtml(username)}</div>
      <div class="message">${escapeHtml(message)}</div>
      <div class="timestamp">${new Date().toLocaleTimeString()}</div>
    `;
    
    const messagesDiv = document.getElementById("messages");
    if (messagesDiv) {
      messagesDiv.appendChild(msgContainer);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  } catch (err) {
    console.error("Error adding chat message:", err);
  }
}

function addSystemMessage(message) {
  const msgContainer = document.createElement("div");
  msgContainer.classList.add("message", "system");
  msgContainer.textContent = message;
  
  const messagesDiv = document.getElementById("messages");
  if (messagesDiv) {
    messagesDiv.appendChild(msgContainer);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function sendMessage() {
  const input = document.getElementById("msg");
  if (!input) {
    console.error("Message input not found");
    return;
  }
  
  const message = input.value.trim();
  if (message !== "" && currentSocket && currentSocket.readyState === WebSocket.OPEN) {
    fetch("/api/me")
      .then(r => r.json())
      .then(data => {
        const payload = {
          type: "message",
          name: data.Username,
          message: message
        };
        console.log("Sending message:", payload);
        currentSocket.send(JSON.stringify(payload));
        input.value = "";
      })
      .catch(err => {
        console.error("Error sending message:", err);
        addSystemMessage("Failed to send message");
      });
  } else {
    if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
      addSystemMessage("Connection not ready. Please wait and try again.");
    }
  }
}

async function loadOnlineUsers() {
  try {
    const response = await fetch("/api/online-users");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const userList = document.getElementById("userList");
    if (!userList) {
      console.error("User list element not found");
      return;
    }
    
    userList.innerHTML = "";

    if (data.users && data.users.length > 0) {
      data.users.forEach((username) => {
        const li = document.createElement("li");
        li.className = "online-user";
        li.setAttribute("data-username", username);
        li.innerHTML = `<span class="status-dot"></span>${escapeHtml(username)}`;
        li.addEventListener("click", async () => {
          try {
            // Close current socket if exists
            if (currentSocket) {
              currentSocket.close();
              currentSocket = null;
            }
            
            // Setup private chat with clicked user
            const res = await fetch("/api/me");
            const currentUser = await res.json();
            await setupPrivateChat(username, currentUser);
          } catch (err) {
            console.error("Error setting up private chat:", err);
            addSystemMessage("Failed to start chat with " + username);
          }
        });
        userList.appendChild(li);
      });
    } else {
      userList.innerHTML = `<li><em>No other users online</em></li>`;
    }

    // Try to load recent chats if endpoint is available
    await loadRecentChats();
  } catch (err) {
    console.error("Error loading online users:", err);
    const userList = document.getElementById("userList");
    if (userList) {
      userList.innerHTML = `<li><em>Error loading users</em></li>`;
    }
  }
}

async function loadRecentChats() {
  try {
    const response = await fetch("/api/recent-chats");
    
    // Check if the endpoint exists
    if (response.status === 404) {
      console.log("Recent chats endpoint not available yet");
      return;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.log("Recent chats endpoint not returning JSON yet");
      return;
    }
    
    const data = await response.json();
    
    if (data.recent_chats && data.recent_chats.length > 0) {
      const userList = document.getElementById("userList");
      if (!userList) {
        console.error("User list element not found");
        return;
      }
      
      // Add recent chats section
      const recentHeader = document.createElement("li");
      recentHeader.innerHTML = "<strong>Recent Chats:</strong>";
      recentHeader.className = "chat-header";
      userList.appendChild(recentHeader);
      
      data.recent_chats.forEach((chat) => {
        const li = document.createElement("li");
        li.className = "recent-chat-user";
        li.setAttribute("data-username", chat.username);
        
        const unreadBadge = chat.unread_count > 0 ? 
          `<span class="unread-badge">${chat.unread_count}</span>` : '';
        
        li.innerHTML = `
          <span class="chat-dot"></span>
          ${escapeHtml(chat.username)}
          ${unreadBadge}
          <small class="last-message-time">
            ${new Date(chat.last_message_time).toLocaleDateString()}
          </small>
        `;
        
        li.addEventListener("click", async () => {
          try {
            // Close current socket if exists
            if (currentSocket) {
              currentSocket.close();
              currentSocket = null;
            }
            
            // Setup private chat with clicked user
            const res = await fetch("/api/me");
            const currentUser = await res.json();
            await setupPrivateChat(chat.username, currentUser);
          } catch (err) {
            console.error("Error setting up private chat:", err);
            addSystemMessage("Failed to start chat with " + chat.username);
          }
        });
        
        userList.appendChild(li);
      });
    }
  } catch (err) {
    console.error("Error loading recent chats:", err);
    // Don't show error to user since this is an optional feature
  }
}

function addChatStyles() {
  // Remove existing chat styles
  const existingStyle = document.querySelector('style[data-chat-styles]');
  if (existingStyle) {
    existingStyle.remove();
  }
  
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
    
    .load-more-btn {
      background: #3498db;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      margin: 10px auto;
      display: block;
      transition: background 0.3s;
    }
    
    .load-more-btn:hover {
      background: #2980b9;
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
      width: 300px;
      background: #34495e;
      color: white;
      padding: 1rem;
      overflow-y: auto;
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
      cursor: pointer;
      transition: background 0.3s;
    }
    
    .user-list li:hover {
      background: #1abc9c;
    }
    
    .user-list li.chat-header {
      background: #34495e;
      cursor: default;
      margin-top: 1rem;
    }
    
    .user-list li.chat-header:hover {
      background: #34495e;
    }
    
    .status-dot, .chat-dot {
      width: 8px;
      height: 8px;
      background: #27ae60;
      border-radius: 50%;
      margin-right: 0.5rem;
    }
    
    .chat-dot {
      background: #e74c3c;
    }
    
    .unread-badge {
      background: #e74c3c;
      color: white;
      border-radius: 50%;
      padding: 2px 6px;
      font-size: 0.7rem;
      margin-left: auto;
      min-width: 16px;
      text-align: center;
    }
    
    .last-message-time {
      display: block;
      opacity: 0.7;
      font-size: 0.7rem;
      margin-left: 0.5rem;
    }
    
    .recent-chat-user {
      flex-direction: column;
      align-items: flex-start !important;
    }
    
    .recent-chat-user > div:first-child {
      display: flex;
      align-items: center;
      width: 100%;
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
  styleSheet.setAttribute('data-chat-styles', 'true');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}