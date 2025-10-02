import { currentUser, currentSocket, setHasMoreMessages, currentChatUserID, isLoadingMessages, setIsLoadingMessages, messagesLoaded, lastMessageTimestamps, updateLastMessageTimestamp, incrementMessagesLoaded } from "./chatState.js";

// Cache the onMessageReceived function for synchronous access
let cachedOnMessageReceived = null;
import('./users.js').then(module => {
  cachedOnMessageReceived = module.onMessageReceived;
}).catch(() => {});

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export async function addChatMessageToHistory(username, message, timestamp, prepend = false) {
  try {
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
    
    const messagesDiv = document.getElementById("messages");
    if (!messagesDiv) return;

    if (prepend) {
      const firstMessage = messagesDiv.querySelector(".message-container");
      if (firstMessage) {
        messagesDiv.insertBefore(msgContainer, firstMessage);
      } else {
        messagesDiv.appendChild(msgContainer);
      }
    } else {
      messagesDiv.appendChild(msgContainer);
    }

    const loadMoreBtn = document.getElementById("loadMoreBtn");
    if (loadMoreBtn) {
      messagesDiv.insertBefore(loadMoreBtn, messagesDiv.firstChild);
    }
  } catch (err) {
    console.error("Error adding message to history:", err);
  }
}

export function addSystemMessage(message) {
  const msgContainer = document.createElement("div");
  msgContainer.classList.add("message", "system");
  msgContainer.textContent = message;
  
  const messagesDiv = document.getElementById("messages");
  if (messagesDiv) {
    messagesDiv.appendChild(msgContainer);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

export function sendMessage() {
  const input = document.getElementById("msg");
  if (!input) {
    console.error("Message input not found");
    return;
  }
  
  const message = input.value.trim();
  if (message !== "" && currentSocket && currentSocket.readyState === WebSocket.OPEN) {
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

export async function loadChatHistory() {
  if (!currentChatUserID || isLoadingMessages) return;
  
  setIsLoadingMessages(true);
  
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

      // Update timestamps FIRST for all messages
      let needsResort = false;
      data.messages.forEach(msg => {
        if (msg.sender_name && msg.sender_name !== (currentUser ? currentUser.Username : "")) {
          const msgTime = new Date(msg.created_at).getTime();
          const existingTime = lastMessageTimestamps.get(msg.sender_name) || 0;
          if (msgTime > existingTime) {
            updateLastMessageTimestamp(msg.sender_name, msgTime);
            needsResort = true;
          }
        }
      });

      // Trigger INSTANT re-sort BEFORE rendering messages
      if (needsResort && cachedOnMessageReceived) {
        cachedOnMessageReceived('_history_loaded_');
      }

      if (messagesLoaded === 0) {
        (data.messages || []).forEach(msg => {
          addChatMessageToHistory(msg.sender_name, msg.message, new Date(msg.created_at), false);
        });
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      } else {
        (data.messages || []).forEach(msg => {
          addChatMessageToHistory(msg.sender_name, msg.message, new Date(msg.created_at), true);
        });
        const scrollHeightAfter = messagesDiv.scrollHeight;
        messagesDiv.scrollTop = scrollHeightAfter - scrollHeightBefore;
      }
      
      incrementMessagesLoaded(data.messages.length);
      setHasMoreMessages(Boolean(data.hasMore));
      
      const loadMoreBtn = document.getElementById("loadMoreBtn");
      if (loadMoreBtn) {
        if (data.hasMore) {
          loadMoreBtn.style.display = "block";
        } else {
          loadMoreBtn.style.display = "none";
        }
      }
    } else {
      setHasMoreMessages(false);
      const loadMoreBtn = document.getElementById("loadMoreBtn");
      if (loadMoreBtn) {
        loadMoreBtn.style.display = "none";
      }
    }
  } catch (err) {
    console.error("Error loading chat history:", err);
    addSystemMessage("Chat history not available yet");
    setHasMoreMessages(false);
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    if (loadMoreBtn) {
      loadMoreBtn.style.display = "none";
    }
  }
  
  setIsLoadingMessages(false);
}

export async function loadMoreMessages() {
  await loadChatHistory();
}

export async function initializeMessageTimestamps() {
  if (!currentUser) {
    console.log("No current user, skipping timestamp initialization");
    return;
  }
  
  console.log("Initializing message timestamps for user:", currentUser.Username);
  
  try {
    const response = await fetch('/api/recent-chats');
    if (response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (data.recent_chats && data.recent_chats.length > 0) {
          console.log("Loading initial timestamps from recent chats:", data.recent_chats.length, "users");
          
          // Update all timestamps FIRST
          data.recent_chats.forEach(chat => {
            if (chat.username && chat.last_message_time) {
              const timestamp = new Date(chat.last_message_time).getTime();
              updateLastMessageTimestamp(chat.username, timestamp);
              console.log(`Set timestamp for ${chat.username}: ${new Date(timestamp).toLocaleString()}`);
            }
          });
          console.log("Total timestamps loaded:", lastMessageTimestamps.size);
          
          // Trigger SINGLE INSTANT sort after all timestamps loaded
          if (cachedOnMessageReceived) {
            cachedOnMessageReceived('_timestamps_initialized_');
          }
        } else {
          console.log("No recent chats found");
        }
      }
    } else {
      console.log("Recent chats endpoint returned status:", response.status);
    }
  } catch (err) {
    console.log("Could not load initial message timestamps, using real-time tracking only:", err);
  }
}

export function debugTimestamps() {
  console.log("=== Current Timestamps ===");
  lastMessageTimestamps.forEach((timestamp, username) => {
    console.log(`${username}: ${new Date(timestamp).toLocaleString()}`);
  });
  console.log("========================");
}

export async function addChatMessage(username, message) {
  try {
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