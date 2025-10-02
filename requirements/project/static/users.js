import {
  lastMessageTimestamps,
  unreadMessages,
  setOnlineUsersRefreshInterval,
  clearOnlineUsersRefreshInterval,
  refreshAllTimestampsInDOM
} from "./chatState.js";
import { loadChatUI } from "./chatui.js";

let sortPending = false;
let sortTimeout = null;

// OPTIMIZED: Batch sorting to avoid excessive re-renders
export function triggerUserListSort() {
  if (sortPending) return;
  
  sortPending = true;
  
  // Cancel any pending sort
  if (sortTimeout) {
    clearTimeout(sortTimeout);
  }
  
  // Use requestAnimationFrame for smooth UI updates
  sortTimeout = setTimeout(() => {
    requestAnimationFrame(() => {
      sortUserList();
      sortPending = false;
    });
  }, 50); // Small delay to batch multiple updates
}

// OPTIMIZED: Faster sorting algorithm
function sortUserList() {
  const userList = document.getElementById("userList");
  if (!userList) return;

  const items = Array.from(userList.querySelectorAll(".online-user, .recent-chat-user"));
  if (items.length === 0) return;

  console.log("Sorting user list with", items.length, "users");

  // Sort by timestamp (most recent first)
  items.sort((a, b) => {
    const usernameA = a.getAttribute("data-username");
    const usernameB = b.getAttribute("data-username");
    
    if (!usernameA || !usernameB) return 0;
    
    const timeA = lastMessageTimestamps.get(usernameA.toLowerCase()) || 0;
    const timeB = lastMessageTimestamps.get(usernameB.toLowerCase()) || 0;
    
    return timeB - timeA; // Most recent first
  });

  // Efficient DOM manipulation: use DocumentFragment
  const fragment = document.createDocumentFragment();
  const headers = Array.from(userList.querySelectorAll(".chat-header"));
  
  // Re-add headers first
  headers.forEach(header => fragment.appendChild(header));
  
  // Add sorted items
  items.forEach(item => fragment.appendChild(item));
  
  // Clear and re-append in one operation
  userList.innerHTML = "";
  userList.appendChild(fragment);
  
  // Refresh timestamps in DOM after re-ordering
  refreshAllTimestampsInDOM();
}

// Called when a message is received to trigger re-sort
export function onMessageReceived(username) {
  if (!username || username === '_history_loaded_' || username === '_timestamps_initialized_') {
    triggerUserListSort();
    return;
  }
  
  console.log("Message received from:", username, "- triggering sort");
  triggerUserListSort();
}

export async function loadOnlineUsers() {
  try {
    const response = await fetch("/api/online-users");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Online users loaded:", data.users?.length || 0);
    
    if (data.users && Array.isArray(data.users)) {
      await renderUserList(data.users);
    }
  } catch (err) {
    console.error("Error loading online users:", err);
  }
}

export function updateOnlineUsers(usernames) {
  if (!Array.isArray(usernames)) {
    console.error("Invalid usernames array:", usernames);
    return;
  }
  
  console.log("Updating online users:", usernames);
  renderUserList(usernames);
}

export async function renderUserList(usernames) {
  const userList = document.getElementById("userList");
  if (!userList) {
    console.error("User list element not found");
    return;
  }

  // Clear existing users (keep headers)
  const existingHeaders = Array.from(userList.querySelectorAll(".chat-header"));
  userList.innerHTML = "";
  existingHeaders.forEach(header => userList.appendChild(header));

  if (!usernames || usernames.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No users online";
    li.style.color = "#95a5a6";
    userList.appendChild(li);
    return;
  }

  // Create user elements
  const userElements = usernames.map(username => {
    const li = document.createElement("li");
    li.className = "online-user";
    li.setAttribute("data-username", username);
    
    // Online indicator
    const dot = document.createElement("span");
    dot.className = "online-dot";
    dot.style.cssText = 'display: inline-block; width: 8px; height: 8px; background: #27ae60; border-radius: 50%; margin-right: 8px;';
    li.appendChild(dot);
    
    // Username
    const nameSpan = document.createElement("span");
    nameSpan.textContent = username;
    li.appendChild(nameSpan);
    
    // Unread badge
    const unreadCount = unreadMessages.get(username) || 0;
    if (unreadCount > 0) {
      const badge = document.createElement("span");
      badge.className = "unread-badge";
      badge.textContent = String(unreadCount);
      badge.style.cssText = 'background: #e74c3c; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; margin-left: 8px;';
      li.appendChild(badge);
    }
    
    // Timestamp (will be populated by refreshAllTimestampsInDOM)
    const timestamp = lastMessageTimestamps.get(username.toLowerCase());
    if (timestamp) {
      const timeEl = document.createElement("small");
      timeEl.className = "last-message-indicator";
      timeEl.style.cssText = 'display: block; color: #95a5a6; font-size: 0.75rem; margin-top: 2px;';
      const date = new Date(timestamp);
      timeEl.textContent = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      li.appendChild(timeEl);
      li.setAttribute('data-last-message-time', timestamp);
    }
    
    // Click handler
    li.addEventListener("click", () => {
      console.log("User clicked:", username);
      loadChatUI(username);
    });
    
    li.style.cssText = 'padding: 10px; cursor: pointer; border-bottom: 1px solid #2c3e50; transition: background 0.2s;';
    li.addEventListener('mouseenter', () => li.style.background = '#2c3e50');
    li.addEventListener('mouseleave', () => li.style.background = '');
    
    return li;
  });

  // Append all users
  userElements.forEach(el => userList.appendChild(el));
  
  // Trigger immediate sort
  triggerUserListSort();
}

export function startOnlineUsersRefresh() {
  console.log("Starting online users refresh interval");
  clearOnlineUsersRefreshInterval();
  
  const interval = setInterval(() => {
    loadOnlineUsers();
  }, 10000); // Every 10 seconds
  
  setOnlineUsersRefreshInterval(interval);
}

export function stopOnlineUsersRefresh() {
  console.log("Stopping online users refresh interval");
  clearOnlineUsersRefreshInterval();
}
