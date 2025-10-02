import { 
  setCurrentSocket, 
  setIntentionalSocketClose,
  currentSocket,
  currentUser,
  intentionalSocketClose,
  lastMessageTimestamps,
  updateLastMessageTimestamp,
  incrementUnreadMessages
} from "./chatState.js";
import { addSystemMessage, addChatMessage } from "./messages.js";
import { loadOnlineUsers, renderUserList, updateOnlineUsers, stopOnlineUsersRefresh, startOnlineUsersRefresh, onMessageReceived } from "./users.js";
import { updateUserNotificationBadge, loadChatUI } from "./chatui.js";

// CRITICAL: Make onMessageReceived available synchronously
let cachedOnMessageReceived = null;
import('./users.js').then(module => {
  cachedOnMessageReceived = module.onMessageReceived;
}).catch(() => {});

function showBrowserNotification(username, message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`New message from ${username}`, {
        body: message.substring(0, 100),
        icon: '/static/svg/chat.svg',
        tag: 'chat-notification'
      });
    } catch (err) {
      console.log('Browser notification failed:', err);
    }
  }
}

function showInAppNotification(username, message) {
  const notification = document.createElement('div');
  notification.className = 'chat-notification';
  notification.innerHTML = `
    <div class="chat-notification-content">
      <div class="chat-notification-header">
        <strong>${escapeHtml(username)}</strong>
        <button class="chat-notification-close">×</button>
      </div>
      <div class="chat-notification-message">${escapeHtml(message.substring(0, 100))}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  const closeBtn = notification.querySelector('.chat-notification-close');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  });
  
  notification.addEventListener('click', () => {
    loadChatUI(username);
    notification.remove();
  });
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

function playNotificationSound() {
  try {
    const audio = new Audio('/static/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(err => console.log('Could not play sound:', err));
  } catch (err) {
    console.log('Notification sound failed:', err);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimeout = null;

export function setupWebSocket(targetUser) {
  // Clear any pending reconnection
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (currentSocket) {
    setIntentionalSocketClose(true);
    currentSocket.close();
    setCurrentSocket(null);
  }

  // Validate user data before creating socket
  if (!currentUser || !currentUser.Username) {
    console.error("Cannot setup WebSocket: No user data available");
    addSystemMessage("Error: User not authenticated. Please refresh the page.");
    return;
  }

  const scheme = location.protocol === "https:" ? "wss" : "ws";
  const socketUrl = targetUser
    ? `${scheme}://${location.host}/room?user1=${currentUser.Username}&user2=${targetUser}&username=${currentUser.Username}`
    : `${scheme}://${location.host}/room?room=global&username=${currentUser.Username}`;

  console.log("Connecting to WebSocket:", socketUrl);
  console.log("Current user:", currentUser);

  let socket;
  try {
    socket = new WebSocket(socketUrl);
  } catch (err) {
    console.error("Failed to create WebSocket:", err);
    addSystemMessage("Failed to create connection. Please check your connection.");
    return;
  }

  setCurrentSocket(socket);

  socket.onopen = () => {
    console.log("WebSocket connected successfully");
    addSystemMessage("Connected to server");
    reconnectAttempts = 0;

    if (!targetUser) {
      stopOnlineUsersRefresh();
      loadOnlineUsers();
    }
  };

  socket.onclose = (event) => {
    console.log("WebSocket disconnected", event.code, event.reason);
    
    if (!intentionalSocketClose) {
      addSystemMessage("Disconnected from server");
      
      // Attempt to reconnect if not intentional
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
        console.log(`Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms...`);
        
        addSystemMessage(`Reconnecting in ${delay/1000}s... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        
        reconnectTimeout = setTimeout(() => {
          setupWebSocket(targetUser);
        }, delay);
      } else {
        addSystemMessage("Connection failed. Please refresh the page to reconnect.");
      }
    }
    
    setIntentionalSocketClose(false);

    if (!targetUser) {
      startOnlineUsersRefresh();
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
    
    // More detailed error message based on readyState
    if (socket.readyState === WebSocket.CONNECTING) {
      console.error("Connection failed - server may not be running or wrong URL");
      addSystemMessage("Cannot connect to chat server. Please check if the server is running.");
    } else if (socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED) {
      console.error("Connection closed unexpectedly");
      addSystemMessage("Connection error occurred");
    } else {
      addSystemMessage("Connection error occurred");
    }
  };

  socket.onmessage = async (event) => {
    const msg = event.data.trim();
    if (!msg) return;

    let data;
    try {
      data = JSON.parse(msg);
    } catch (err) {
      console.warn("Non-JSON message received, ignoring:", msg);
      return;
    }

    console.log("WebSocket message received:", data);

    try {
      // Handle user list updates - ALWAYS (even in private chat)
      if (data.type === "users") {
        console.log("Updating online users immediately:", data.list);
        updateOnlineUsers(data.list || []);
        return;
      }

      if (data.type === "message") {
        const messageUsername = data.name;
        const isOwnMessage = currentUser && messageUsername === currentUser.Username;
        const currentChatUser = window.currentChatUser || null;

        // CRITICAL: Update timestamp FIRST, BEFORE anything else
        if (!isOwnMessage) {
          updateLastMessageTimestamp(messageUsername, Date.now());
        } else if (isOwnMessage && targetUser) {
          updateLastMessageTimestamp(targetUser, Date.now());
        }

        // INSTANT re-sort - synchronous, no await
        if (!targetUser && !isOwnMessage && cachedOnMessageReceived) {
          cachedOnMessageReceived(messageUsername);
        }

        // Handle unread messages and notifications
        if (!isOwnMessage && currentChatUser !== messageUsername) {
          incrementUnreadMessages(messageUsername);
          const currentUnread = window.unreadMessages?.get(messageUsername) || 0;
          updateUserNotificationBadge(messageUsername, currentUnread);

          // Update floating island (async, non-blocking)
          import('./ChatIsland.js').then(({ incrementUnreadCount, updateFloatingIsland }) => {
            incrementUnreadCount(messageUsername);
            const onUserSelect = (username) => loadChatUI(username);
            updateFloatingIsland(onUserSelect);
          }).catch(err => console.log("ChatIsland not available:", err));

          showBrowserNotification(messageUsername, data.message);
          showInAppNotification(messageUsername, data.message);
          playNotificationSound();
        }

        // Add message to chat UI last
        addChatMessage(data.name, data.message);
        return;
      }

      // Handle user joined/left - ALWAYS UPDATE (even in private chat)
      if (data.type === "user_joined" || data.type === "user_left") {
        console.log(`User ${data.type}:`, data.username);
        loadOnlineUsers();
        return;
      }
    } catch (err) {
      console.error("Error processing WebSocket message:", err);
    }
  };
}