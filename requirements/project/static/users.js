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
  const userList = document.getElementById("userList");
  if (!userList) return;
  
  try {
    const response = await fetch("/api/online-users");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    console.log("Online users loaded:", data.users?.length || 0);
    
    if (data.users && Array.isArray(data.users)) {
      await renderUserList(data.users);
    } else {
      // Show empty state instead of loading
      userList.innerHTML = '<li class="chat-header"><strong>Online</strong></li><li style="padding: 8px; color: #95a5a6;">No users online</li>';
    }
  } catch (err) {
    console.error("Error loading online users:", err);
    userList.innerHTML = '<li class="chat-header"><strong>Online</strong></li><li style="padding: 8px; color: #e74c3c;">Error loading users</li>';
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

export async function renderUserList(onlineUsernames) {
  const userList = document.getElementById("userList");
  if (!userList) return;

  try {
    // Get current user to exclude from list
    let currentUsername = null;
    try {
      const meRes = await fetch('/api/me');
      const meData = await meRes.json();
      currentUsername = meData.Username || meData.username;
    } catch (e) {
      console.log('Could not get current user');
    }

    // Get all users to show online/offline status
    const allUsersRes = await fetch('/api/all-users');
    const allUsersData = await allUsersRes.json();
    const allUsers = Array.isArray(allUsersData) ? allUsersData : (allUsersData.users || []);
    
    const onlineSet = new Set(onlineUsernames || []);
    
    // Filter out current user and create user objects
    const users = allUsers
      .filter(username => username !== currentUsername)
      .map(username => ({
        username,
        isOnline: onlineSet.has(username),
        lastMessage: lastMessageTimestamps.get(username.toLowerCase()) || 0,
        unreadCount: unreadMessages.get(username) || 0
      }));

    // Sort by last message timestamp (most recent first), then alphabetically
    users.sort((a, b) => {
      if (a.lastMessage && b.lastMessage) {
        return b.lastMessage - a.lastMessage;
      }
      if (a.lastMessage && !b.lastMessage) return -1;
      if (!a.lastMessage && b.lastMessage) return 1;
      return a.username.localeCompare(b.username);
    });

    // Clear and rebuild list
    userList.innerHTML = '';
    
    // Online users section
    const onlineHeader = document.createElement('li');
    onlineHeader.className = 'chat-header';
    onlineHeader.innerHTML = '<strong>Online</strong>';
    onlineHeader.style.cssText = 'padding: 8px; background: #34495e; color: white; font-weight: bold;';
    userList.appendChild(onlineHeader);

    const onlineUsers = users.filter(u => u.isOnline);
    if (onlineUsers.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = 'No users online';
      empty.style.cssText = 'padding: 8px; color: #95a5a6; font-style: italic;';
      userList.appendChild(empty);
    } else {
      onlineUsers.forEach(user => {
        userList.appendChild(createUserElement(user, true));
      });
    }

    // Offline users section
    const offlineHeader = document.createElement('li');
    offlineHeader.className = 'chat-header';
    offlineHeader.innerHTML = '<strong>Offline</strong>';
    offlineHeader.style.cssText = 'padding: 8px; background: #34495e; color: white; font-weight: bold; margin-top: 10px;';
    userList.appendChild(offlineHeader);

    const offlineUsers = users.filter(u => !u.isOnline);
    if (offlineUsers.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = 'No offline users';
      empty.style.cssText = 'padding: 8px; color: #95a5a6; font-style: italic;';
      userList.appendChild(empty);
    } else {
      offlineUsers.forEach(user => {
        userList.appendChild(createUserElement(user, false));
      });
    }
  } catch (err) {
    console.error('Error rendering user list:', err);
    userList.innerHTML = '<li style="color: #e74c3c; padding: 8px;">Error loading users</li>';
  }
}

function createUserElement(user, isOnline) {
  const li = document.createElement('li');
  li.className = isOnline ? 'online-user' : 'offline-user';
  li.setAttribute('data-username', user.username);
  
  const container = document.createElement('div');
  container.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px; cursor: pointer; transition: background 0.2s;';
  
  const leftSide = document.createElement('div');
  leftSide.style.cssText = 'display: flex; align-items: center; flex: 1;';
  
  // Status dot
  const dot = document.createElement('span');
  dot.style.cssText = `width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; background: ${isOnline ? '#27ae60' : '#95a5a6'};`;
  leftSide.appendChild(dot);
  
  // Username and timestamp
  const userInfo = document.createElement('div');
  userInfo.style.cssText = 'flex: 1;';
  
  const nameEl = document.createElement('div');
  nameEl.textContent = user.username;
  nameEl.style.cssText = `color: ${isOnline ? 'white' : '#bdc3c7'}; font-weight: 500;`;
  userInfo.appendChild(nameEl);
  
  // Last message time
  if (user.lastMessage) {
    const timeEl = document.createElement('small');
    const date = new Date(user.lastMessage);
    timeEl.textContent = date.toLocaleString();
    timeEl.style.cssText = 'color: #95a5a6; font-size: 0.75rem;';
    userInfo.appendChild(timeEl);
  }
  
  leftSide.appendChild(userInfo);
  container.appendChild(leftSide);
  
  // Unread badge
  if (user.unreadCount > 0) {
    const badge = document.createElement('span');
    badge.textContent = user.unreadCount;
    badge.style.cssText = 'background: #e74c3c; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; font-weight: bold;';
    container.appendChild(badge);
  }
  
  li.appendChild(container);
  
  // Click handler - only allow messaging online users
  if (isOnline) {
    li.addEventListener('click', () => {
      loadChatUI(user.username);
    });
    li.addEventListener('mouseenter', () => container.style.background = '#2c3e50');
    li.addEventListener('mouseleave', () => container.style.background = '');
  } else {
    li.style.opacity = '0.6';
    li.title = 'User is offline';
  }
  
  return li;
}

export function startOnlineUsersRefresh() {
  // No polling - rely on real-time WebSocket updates only
  console.log("Real-time mode: No polling needed");
}

export function stopOnlineUsersRefresh() {
  clearOnlineUsersRefreshInterval();
}
