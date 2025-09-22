async function loadCurrentUser() {
  try {
    const response = await fetch("/api/me");
    const data = await response.json();
    const username = data.Username || data.username || "Anonymous";
    const el = document.getElementById("currentUser");
    if (el) el.textContent = `Logged in as: ${username}`;
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
let currentUser = null;
let intentionalSocketClose = false;

function setupEventListeners() {
  // Send button listener
  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }

  // Enter key listener
  const msgInput = document.getElementById("msg");
  if (msgInput) {
    msgInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });
  }

  // Back to forum listener
  const backBtn = document.getElementById("backToForum");
  if (backBtn) {
    backBtn.addEventListener("click", async () => {
  if (currentSocket) {
    intentionalSocketClose = true;
    currentSocket.close();
    currentSocket = null;
  }
  currentChatUser = null;
  
  // Remove chat container and styles
  const chatContainer = document.querySelector('.chat-container');
  if (chatContainer) chatContainer.remove();
  const chatStyles = document.querySelector('style[data-chat-styles]');
  if (chatStyles) chatStyles.remove();
  
  // Restore hidden forum elements
  [".main-content", ".pagination", ".footer"].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.style.display = "";
  });
  
  // Restart online users refresh when going back to user selection
  startOnlineUsersRefresh();
  
  try {
    const { showPage } = await import("./main.js");
    await showPage("home", currentUser);
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
      const nearBottom = messagesDiv.scrollTop + messagesDiv.clientHeight >= messagesDiv.scrollHeight - 5;
      if (nearBottom && hasMoreMessages && !isLoadingMessages) {
        loadMoreMessages();
      }
    });
  }
}

async function setupPrivateChat(targetUser) {
  // Stop periodic refresh when entering private chat
  stopOnlineUsersRefresh();
  
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
  setupWebSocket(targetUser);
  
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
      
      // Display newest first
      const newestFirst = (data.messages || []).slice().reverse();
      newestFirst.forEach(msg => {
        addChatMessageToHistory(msg.sender_name, msg.message, new Date(msg.created_at));
      });

      // First load - stay at the top (newest visible)
      if (messagesLoaded === 0) {
        messagesDiv.scrollTop = 0;
      }
      
      messagesLoaded += data.messages.length;
      hasMoreMessages = Boolean(data.hasMore);
      
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

function setupWebSocket(targetUser) {
  if (currentSocket) {
    intentionalSocketClose = true;
    currentSocket.close();
  }
  
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  let socketUrl;
  if (targetUser) {
    socketUrl = `${scheme}://${location.host}/room?user1=${encodeURIComponent(currentUser.Username)}&user2=${encodeURIComponent(targetUser)}&username=${encodeURIComponent(currentUser.Username)}`;
  } else {
    socketUrl = `${scheme}://${location.host}/room?room=global&username=${encodeURIComponent(currentUser.Username)}`;
  }
  currentSocket = new WebSocket(socketUrl);

  currentSocket.onopen = () => {
    console.log("WebSocket connected");
    addSystemMessage("Connected to server");
    
    // Pause fallback refresh while socket is open; do one initial fetch
    if (!targetUser) {
      stopOnlineUsersRefresh();
      loadOnlineUsers();
    }
  };
  
  currentSocket.onclose = () => {
    console.log("WebSocket disconnected");
    if (!intentionalSocketClose) {
      addSystemMessage("Disconnected from server");
    }
    intentionalSocketClose = false;
    if (!targetUser) {
      startOnlineUsersRefresh();
    }
  };
  
  currentSocket.onerror = (error) => {
    console.error("WebSocket error:", error);
    addSystemMessage("Connection error occurred");
  };
  
  currentSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("WebSocket message received:", data);
      
      if (data.type === "users") {
        // In lobby, refresh from API to reflect globally online users; ignore in private chat
        if (!targetUser) {
          loadOnlineUsers();
        }
      } else if (data.type === "message") {
        addChatMessage(data.name, data.message);
      } else if (data.type === "user_joined" || data.type === "user_left") {
        // Refresh online users when someone joins/leaves
        if (!targetUser) {
          loadOnlineUsers();
        }
      }
    } catch (err) {
      console.error("Invalid JSON received:", event.data);
    }
  };
}
function renderUserList(allUsers, onlineUsers) {
  const userList = document.getElementById("userList");
  if (!userList) {
    console.error("User list element not found");
    return;
  }

  // Reset list; recent chats will be appended later by loadRecentChats()
  userList.innerHTML = '';

  const onlineSet = new Set(onlineUsers || []);
  const all = (allUsers || []).filter(u => !(currentUser && u === currentUser.Username));
  const connected = all.filter(u => onlineSet.has(u));
  const disconnected = all.filter(u => !onlineSet.has(u));

  // Connected section
  const connectedHeader = document.createElement('li');
  connectedHeader.className = 'chat-header';
  connectedHeader.innerHTML = '<strong>Connected:</strong>';
  userList.appendChild(connectedHeader);

  if (connected.length > 0) {
    connected.forEach((username) => {
      const li = document.createElement("li");
      li.className = "online-user";
      li.setAttribute("data-username", username);
      const dot = document.createElement('span');
      dot.className = 'status-dot online';
      li.appendChild(dot);
      const nameNode = document.createTextNode(username);
      li.appendChild(nameNode);
      li.addEventListener("click", async () => {
        try {
          if (currentSocket) {
            intentionalSocketClose = true;
            currentSocket.close();
            currentSocket = null;
          }
          await setupPrivateChat(username);
        } catch (err) {
          console.error("Error setting up private chat:", err);
          addSystemMessage("Failed to start chat with " + username);
        }
      });
      userList.appendChild(li);
    });
  } else {
    const empty = document.createElement('li');
    empty.innerHTML = '<em>No users online</em>';
    userList.appendChild(empty);
  }

  // Disconnected section
  const disconnectedHeader = document.createElement('li');
  disconnectedHeader.className = 'chat-header';
  disconnectedHeader.innerHTML = '<strong>Disconnected:</strong>';
  userList.appendChild(disconnectedHeader);

  if (disconnected.length > 0) {
    disconnected.forEach((username) => {
      const li = document.createElement("li");
      li.className = "online-user";
      li.setAttribute("data-username", username);
      const dot = document.createElement('span');
      dot.className = 'status-dot offline';
      li.appendChild(dot);
      const nameNode = document.createTextNode(username);
      li.appendChild(nameNode);
      li.addEventListener("click", async () => {
        try {
          if (currentSocket) {
            intentionalSocketClose = true;
            currentSocket.close();
            currentSocket = null;
          }
          await setupPrivateChat(username);
        } catch (err) {
          console.error("Error setting up private chat:", err);
          addSystemMessage("Failed to start chat with " + username);
        }
      });
      userList.appendChild(li);
    });
  } else {
    const empty = document.createElement('li');
    empty.innerHTML = '<em>No users offline</em>';
    userList.appendChild(empty);
  }
}

function updateOnlineUsers(users) {
  const userList = document.getElementById("userList");
  if (!userList) {
    console.error("User list element not found");
    return;
  }

  userList.innerHTML = '';

  // Connected section only (fallback when /api/all-users is not available)
  const connectedHeader = document.createElement('li');
  connectedHeader.className = 'chat-header';
  connectedHeader.innerHTML = '<strong>Connected:</strong>';
  userList.appendChild(connectedHeader);

  if (users && users.length > 0) {
    users.forEach((username) => {
      if (currentUser && username === currentUser.Username) return;
      const li = document.createElement("li");
      li.className = "online-user";
      li.setAttribute("data-username", username);
      const dot = document.createElement('span');
      dot.className = 'status-dot online';
      li.appendChild(dot);
      const nameNode = document.createTextNode(escapeHtml(username));
      li.appendChild(nameNode);
      li.addEventListener("click", async () => {
        try {
          if (currentSocket) {
            intentionalSocketClose = true;
            currentSocket.close();
            currentSocket = null;
          }
          await setupPrivateChat(username);
        } catch (err) {
          console.error("Error setting up private chat:", err);
          addSystemMessage("Failed to start chat with " + username);
        }
      });
      userList.appendChild(li);
    });
  } else {
    const empty = document.createElement('li');
    empty.innerHTML = '<em>No users online</em>';
    userList.appendChild(empty);
  }

  const disconnectedHeader = document.createElement('li');
  disconnectedHeader.className = 'chat-header';
  disconnectedHeader.innerHTML = '<strong>Disconnected:</strong>';
  userList.appendChild(disconnectedHeader);
  const placeholder = document.createElement('li');
  placeholder.innerHTML = '<em>Disconnected users require the /api/all-users endpoint</em>';
  userList.appendChild(placeholder);
}

async function addChatMessageToHistory(username, message, timestamp) {
  try {
    // Use the global currentUser instead of fetching again
    const currentUsername = currentUser ? currentUser.Username : "Anonymous";
    
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
    
    // Append messages so the first appended (newest) stays on top overall
    const messagesDiv = document.getElementById("messages");
    if (!messagesDiv) return;

    messagesDiv.appendChild(msgContainer);

    // Ensure load more button is at the bottom
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    if (loadMoreBtn) {
      messagesDiv.appendChild(loadMoreBtn);
    }
  } catch (err) {
    console.error("Error adding message to history:", err);
  }
}

async function addChatMessage(username, message) {
  try {
    // Use the global currentUser instead of fetching again
    const currentUsername = currentUser ? currentUser.Username : "Anonymous";
    
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
    // Use the global currentUser instead of fetching again
    if (currentUser && currentUser.Username) {
      const payload = {
        type: "message",
        name: currentUser.Username,
        message: message
      };
      console.log("Sending message:", payload);
      currentSocket.send(JSON.stringify(payload));
      input.value = "";
    } else {
      console.error("Current user not available");
      addSystemMessage("Failed to send message - user not available");
    }
  } else {
    if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
      addSystemMessage("Connection not ready. Please wait and try again.");
    }
  }
}
async function loadOnlineUsers() {
  try {
    const onlineRes = await fetch("/api/online-users");
    if (!onlineRes.ok) {
      throw new Error(`HTTP ${onlineRes.status}`);
    }
    const onlineData = await onlineRes.json();
    const online = onlineData.users || [];

    // Try to get all users; if unavailable, fallback to online-only rendering
    let allUsers = null;
    try {
      const allRes = await fetch("/api/all-users");
      if (allRes.ok) {
        const allData = await allRes.json();
        // Normalization: support {users: []} or []
        allUsers = Array.isArray(allData) ? allData : (allData.users || []);
      }
    } catch (e) {
      // ignore
    }

    if (allUsers && allUsers.length) {
      renderUserList(allUsers, online);
    } else {
      updateOnlineUsers(online);
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
        
        // Build content safely using DOM APIs
        const dot = document.createElement("span");
        dot.className = "chat-dot";
        li.appendChild(dot);
        
        const nameNode = document.createTextNode(chat.username || "");
        li.appendChild(nameNode);
        
        const unreadCount = Number(chat.unread_count) || 0;
        if (unreadCount > 0) {
          const badge = document.createElement("span");
          badge.className = "unread-badge";
          badge.textContent = String(unreadCount);
          li.appendChild(badge);
        }
        
        const timeEl = document.createElement("small");
        timeEl.className = "last-message-time";
        timeEl.textContent = new Date(chat.last_message_time).toLocaleDateString();
        li.appendChild(timeEl);
        
        li.addEventListener("click", async () => {
          try {
            // Close current socket if exists
            if (currentSocket) {
              intentionalSocketClose = true;
              currentSocket.close();
              currentSocket = null;
            }
            
            // Setup private chat with clicked user
            await setupPrivateChat(chat.username);
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
let onlineUsersRefreshInterval = null;

function startOnlineUsersRefresh() {
  // Clear existing interval
  if (onlineUsersRefreshInterval) {
    clearInterval(onlineUsersRefreshInterval);
  }
  
  // Refresh online users every 30 seconds as fallback
  onlineUsersRefreshInterval = setInterval(() => {
    if (!currentChatUser) { // Only refresh if we're in the user selection view
      loadOnlineUsers();
    }
  }, 30000);
}

function stopOnlineUsersRefresh() {
  if (onlineUsersRefreshInterval) {
    clearInterval(onlineUsersRefreshInterval);
    onlineUsersRefreshInterval = null;
  }
}

export async function loadChatUI(targetUser = null) {
  // Prepare layout: hide forum pieces and remove any existing chat container
  const elementsToHide = [
    ".main-content",
    ".pagination",
    ".footer"
  ];
  elementsToHide.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) element.style.display = "none";
  });
  const prevChat = document.querySelector('.chat-container');
  if (prevChat) prevChat.remove();

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
  // Set the global currentUser variable
  currentUser = { Username: "Anonymous" }; // Default value
  try {
    const res = await fetch("/api/me");
    const data = await res.json();
    const normalized = {
      Username: data.Username || data.username || "Anonymous",
      Initial: data.Initial || data.initial || "",
      ID: data.ID || data.id || null,
      authenticated: Boolean(data.authenticated ?? data.Authenticated)
    };
    if (normalized.authenticated) {
      currentUser = { Username: normalized.Username, Initial: normalized.Initial, ID: normalized.ID };
    }
  } catch (err) {
    console.error("Error fetching user state:", err);
  }

  // Set up event listeners first
  setupEventListeners();

  // If we're not in a private chat, start the refresh interval
  if (!targetUser) {
    startOnlineUsersRefresh();
  }

  // If targetUser is specified, set up private chat
  if (targetUser) {
    await setupPrivateChat(targetUser);
  } else {
    // Load online users for selection
    await loadOnlineUsers();
    // Open lobby websocket to receive real-time presence updates
    setupWebSocket(null);
  }

  if (targetUser) {
    const msgInput = document.getElementById("msg");
    if (msgInput) msgInput.focus();
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
      border-radius: 50%;
      margin-right: 0.5rem;
      background: #95a5a6; /* neutral by default */
    }

    .status-dot.online { background: #27ae60; }
    .status-dot.offline { background: #e74c3c; }
    
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