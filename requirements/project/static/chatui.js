import { 
  setCurrentUser, 
  setCurrentChatUserID,
  setCurrentChatUser,
  setIntentionalSocketClose,
  unreadMessages,
  setMessagesLoaded,
  setHasMoreMessages,
  currentChatUserID,
  isLoadingMessages, 
  hasMoreMessages,
  currentSocket,
  setCurrentSocket,
  clearUnreadMessages
} from "./chatState.js";
import { sendMessage, loadChatHistory } from "./messages.js";
import { setupWebSocket } from "./websocket.js";
import { addSystemMessage, initializeMessageTimestamps, loadMoreMessages } from "./messages.js";
import { startOnlineUsersRefresh, loadOnlineUsers, stopOnlineUsersRefresh } from "./users.js";

// Export currentUser for backward compatibility
export { currentUser, currentSocket } from "./chatState.js";

export async function loadCurrentUser() {
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

// Call this only once on module load
loadCurrentUser();

export function updateUserNotificationBadge(username, count) {
  // Update badge in user list
  const userListItems = document.querySelectorAll(`[data-username="${username}"]`);
  userListItems.forEach(item => {
    let badge = item.querySelector('.notification-badge, .unread-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notification-badge';
        item.appendChild(badge);
      }
      badge.textContent = count;
    } else if (badge) {
      badge.remove();
    }
  });
}

export function setupEventListeners() {
  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }

  const msgInput = document.getElementById("msg");
  if (msgInput) {
    msgInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });
  }

  const backBtn = document.getElementById("backToForum");
if (backBtn) {
  backBtn.addEventListener("click", async () => {
    if (currentSocket) {
      setIntentionalSocketClose(true);
      currentSocket.close();
      setCurrentSocket(null);
    }
    setCurrentChatUser(null);
    window.currentChatUser = null;
      
      const chatContainer = document.querySelector('.chat-container');
      if (chatContainer) chatContainer.remove();
      const chatStyles = document.querySelector('style[data-chat-styles]');
      if (chatStyles) chatStyles.remove();
      
      [".main-content", ".pagination", ".footer"].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) el.style.display = "";
      });
      
      startOnlineUsersRefresh();
      
      try {
        const { showPage } = await import("./main.js");
        const res = await fetch("/api/me");
        const user = await res.json();
        await showPage("home", user);
        sessionStorage.setItem("currentPage", "home");
      } catch (err) {
        console.error("Error navigating back to forum:", err);
      }
    });
  }

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMoreMessages);
  }

  const messagesDiv = document.getElementById("messages");
  if (messagesDiv) {
    const debouncedTopLoader = debounce(() => {
      if (messagesDiv.scrollTop === 0 && hasMoreMessages && !isLoadingMessages) {
        loadMoreMessages();
      }
    }, 250);
    messagesDiv.addEventListener("scroll", debouncedTopLoader);
  }
}

export async function setupPrivateChat(targetUser) {
 stopOnlineUsersRefresh();
  
  if (unreadMessages.has(targetUser)) {
    clearUnreadMessages(targetUser);
    updateUserNotificationBadge(targetUser, 0);
  }
  
  // Set globally for websocket access
  setCurrentChatUser(targetUser);
  window.currentChatUser = targetUser;  // ADD THIS LINE
  
  const chatTitle = document.getElementById("chatTitle");
  if (chatTitle) {
    chatTitle.textContent = `Chat with ${targetUser}`;
  }
  
  try {
    const response = await fetch(`/api/user-by-username?username=${encodeURIComponent(targetUser)}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const userData = await response.json();
    setCurrentChatUserID(userData.id);
  } catch (err) {
    console.error("Error getting user ID:", err);
    addSystemMessage("Error: Could not find user or chat not available yet");
    setCurrentChatUserID(null);
  }

  setMessagesLoaded(0);
  setHasMoreMessages(true);
  
  const messagesDiv = document.getElementById("messages");
  if (messagesDiv) {
    const systemMessages = messagesDiv.querySelectorAll(".message.system");
    messagesDiv.innerHTML = "";
    systemMessages.forEach(msg => messagesDiv.appendChild(msg));
  }

  if (currentChatUserID) {
    await loadChatHistory();
  }

  setupWebSocket(targetUser);
  
  const chatInput = document.querySelector(".chat-input");
  if (chatInput) {
    chatInput.style.display = "flex";
  }
}

export function debounce(fn, wait) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

let lastRecentChatsLoad = 0;
const RECENT_CHATS_COOLDOWN = 5000;

export async function loadRecentChats() {
  const now = Date.now();
  if (now - lastRecentChatsLoad < RECENT_CHATS_COOLDOWN) {
    return;
  }
  lastRecentChatsLoad = now;
  
  try {
    const response = await fetch("/api/recent-chats");
    
    if (response.status === 404) {
      console.log("Recent chats endpoint not available yet");
      return;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
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
      
      const recentHeader = document.createElement("li");
      recentHeader.innerHTML = "<strong>Recent Chats:</strong>";
      recentHeader.className = "chat-header";
      userList.appendChild(recentHeader);
      
      data.recent_chats.forEach((chat) => {
        const li = document.createElement("li");
        li.className = "recent-chat-user";
        li.setAttribute("data-username", chat.username);
        
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
            if (currentSocket) {
              setIntentionalSocketClose(true);
              currentSocket.close();
              setCurrentSocket(null);
            }
            
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
  }
}

function addChatStyles() {
  if (document.querySelector('style[data-chat-styles]')) {
    return;
  }
  
  const style = document.createElement('style');
  style.setAttribute('data-chat-styles', 'true');
  style.textContent = `
    .chat-container {
      display: flex;
      height: 100vh;
      width: 100%;
    }
    .chat-main {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .chat-header {
      padding: 1rem;
      background: #2c3e50;
      color: white;
      border-bottom: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      background: white;
    }
    .chat-input {
      display: flex;
      padding: 1rem;
      border-top: 1px solid #ddd;
      gap: 0.5rem;
      background: white;
    }
    .chat-input input {
      flex: 1;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .chat-input button {
      background: #27ae60;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      cursor: pointer;
    }
    .chat-sidebar {
      width: 300px;
      background: #34495e;
      color: white;
      border-left: 2px solid #2c3e50;
      padding: 1rem;
      overflow-y: auto;
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
      text-align: right;
    }
  `;
  document.head.appendChild(style);
}

export async function loadChatUI(targetUser = null) {
  const elementsToHide = [
    ".main-content",
    ".pagination",
    ".footer",
    ".header",
    ".mobileHeader"
  ];
  elementsToHide.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) element.style.display = "none";
  });
  
  const prevChat = document.querySelector('.chat-container');
  if (prevChat) prevChat.remove();

  const chatContainer = document.createElement("div");
  chatContainer.className = "chat-container";
  chatContainer.id = "chat-container";

  const chatMain = document.createElement("div");
  chatMain.className = "chat-main";
  chatMain.innerHTML = `
    <div class="chat-header">
      <h2 id="chatTitle">Real-Time Forum Chat</h2>
      <button id="backToForum" class="back-btn">← Back to Forum</button>
    </div>
    <div id="messages" class="chat-messages">
      <div class="message system">Welcome to the chat!</div>
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
    <ul class="user-list" id="userList">
      <li class="chat-header"><strong>Connected:</strong></li>
      <li><em>Loading users...</em></li>
    </ul>
  `;

  chatContainer.append(chatMain, chatSidebar);
  document.body.append(chatContainer);

  addChatStyles();

  let user = { Username: "Anonymous" };
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
      user = { Username: normalized.Username, Initial: normalized.Initial, ID: normalized.ID };
    }
  } catch (err) {
    console.error("Error fetching user state:", err);
  }
  
  setCurrentUser(user);

  await initializeMessageTimestamps();
  setupEventListeners();

  if (targetUser) {
    await setupPrivateChat(targetUser);
  } else {
    setupWebSocket(null);
    await loadOnlineUsers();
    startOnlineUsersRefresh();
  }

  if (targetUser) {
    const msgInput = document.getElementById("msg");
    if (msgInput) msgInput.focus();
  }
}