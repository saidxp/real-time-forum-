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
    
    // Always render user list, even if no online users
    await renderUserList(data.users || []);
  } catch (err) {
    console.error("Error loading online users:", err);
    // Still try to show all users even if online users API fails
    await renderUserList([]);
  }
}

export function updateOnlineUsers(usernames) {
  if (!Array.isArray(usernames)) {
    console.error("Invalid usernames array:", usernames);
    return;
  }
  
  console.log("Updating online users:", usernames);
  
  const userList = document.getElementById("userList");
  if (!userList) {
    renderUserList(usernames);
    return;
  }
  
  const onlineSet = new Set(usernames);
  
  // Smooth status updates for existing users
  const existingUsers = userList.querySelectorAll('[data-username]');
  const usersToMove = [];
  
  existingUsers.forEach(userEl => {
    const username = userEl.getAttribute('data-username');
    const isOnline = onlineSet.has(username);
    const wasOnline = userEl.getAttribute('data-online') === 'true';
    
    if (isOnline !== wasOnline) {
      // Add smooth transition
      userEl.style.transition = 'all 0.4s ease';
      
      userEl.setAttribute('data-online', isOnline ? 'true' : 'false');
      userEl.className = isOnline ? 'online-user' : 'offline-user';
      
      // Update visual elements with smooth transitions
      const dot = userEl.querySelector('.status-dot');
      const statusEl = userEl.querySelector('small');
      const container = userEl.querySelector('div');
      const nameEl = userEl.querySelector('div > div');
      
      if (dot) {
        dot.style.transition = 'all 0.4s ease';
        dot.style.background = isOnline ? '#27ae60' : '#e74c3c';
        dot.style.borderColor = isOnline ? '#2ecc71' : '#c0392b';
      }
      if (statusEl) {
        statusEl.style.transition = 'color 0.4s ease';
        statusEl.textContent = isOnline ? 'Online' : 'Offline';
        statusEl.style.color = isOnline ? '#2ecc71' : '#e74c3c';
      }
      if (container) {
        container.style.transition = 'opacity 0.4s ease';
        container.style.opacity = isOnline ? '1' : '0.6';
      }
      if (nameEl) {
        nameEl.style.transition = 'color 0.4s ease, font-weight 0.4s ease';
        nameEl.style.color = isOnline ? '#ffffff' : '#7f8c8d';
        nameEl.style.fontWeight = isOnline ? '600' : '400';
      }
      
      // Queue user for section movement
      usersToMove.push({ element: userEl, isOnline, username });
    }
  });
  
  // Move users to correct sections after animation
  if (usersToMove.length > 0) {
    setTimeout(() => {
      usersToMove.forEach(({ element, isOnline }) => {
        const onlineHeader = userList.querySelector('.chat-header');
        const offlineHeader = userList.querySelector('.chat-header:last-of-type');
        
        if (isOnline && onlineHeader) {
          // Find insertion point in online section
          let insertAfter = onlineHeader;
          const onlineUsers = userList.querySelectorAll('.online-user');
          if (onlineUsers.length > 0) {
            insertAfter = onlineUsers[onlineUsers.length - 1];
          }
          insertAfter.insertAdjacentElement('afterend', element);
        } else if (!isOnline && offlineHeader) {
          // Insert at beginning of offline section
          offlineHeader.insertAdjacentElement('afterend', element);
        }
      });
    }, 200);
  }
  
  // If no existing users, do full render
  if (existingUsers.length === 0) {
    renderUserList(usernames);
  }
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
  li.setAttribute('data-online', isOnline ? 'true' : 'false');
  
  const container = document.createElement('div');
  container.style.cssText = `display: flex; align-items: center; justify-content: space-between; padding: 8px; cursor: pointer; transition: all 0.3s ease; ${!isOnline ? 'opacity: 0.6;' : ''}`;
  
  const leftSide = document.createElement('div');
  leftSide.style.cssText = 'display: flex; align-items: center; flex: 1;';
  
  // Status dot with proper colors
  const dot = document.createElement('span');
  dot.className = 'status-dot';
  dot.style.cssText = `width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; background: ${isOnline ? '#27ae60' : '#e74c3c'}; border: 2px solid ${isOnline ? '#2ecc71' : '#c0392b'};`;
  leftSide.appendChild(dot);
  
  // Username with proper styling
  const userInfo = document.createElement('div');
  userInfo.style.cssText = 'flex: 1;';
  
  const nameEl = document.createElement('div');
  nameEl.textContent = user.username;
  nameEl.style.cssText = `color: ${isOnline ? '#ffffff' : '#7f8c8d'}; font-weight: ${isOnline ? '600' : '400'}; font-size: 14px;`;
  userInfo.appendChild(nameEl);
  
  // Status text
  const statusEl = document.createElement('small');
  statusEl.textContent = isOnline ? 'Online' : 'Offline';
  statusEl.style.cssText = `color: ${isOnline ? '#2ecc71' : '#e74c3c'}; font-size: 11px; font-weight: 500;`;
  userInfo.appendChild(statusEl);
  
  // Last message time
  if (user.lastMessage) {
    const timeEl = document.createElement('small');
    const date = new Date(user.lastMessage);
    timeEl.textContent = date.toLocaleString();
    timeEl.style.cssText = 'color: #95a5a6; font-size: 10px; display: block; margin-top: 2px;';
    userInfo.appendChild(timeEl);
  }
  
  leftSide.appendChild(userInfo);
  container.appendChild(leftSide);
  
  // Unread badge
  if (user.unreadCount > 0) {
    const badge = document.createElement('span');
    badge.textContent = user.unreadCount;
    badge.style.cssText = 'background: #e74c3c; color: white; padding: 3px 7px; border-radius: 12px; font-size: 11px; font-weight: bold; min-width: 18px; text-align: center;';
    container.appendChild(badge);
  }
  
  li.appendChild(container);
  
  // Click handler - allow chat with both online and offline users
  li.addEventListener('click', () => {
    loadChatUI(user.username);
    if (!isOnline) {
      // Show notification that user is offline but chat is still possible
      const notification = document.createElement('div');
      notification.textContent = `${user.username} is offline - messages will be delivered when they come online`;
      notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #f39c12; color: white; padding: 10px 15px; border-radius: 5px; z-index: 10000; font-size: 12px;';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 4000);
    }
  });
  
  // Hover effects for all users
  li.addEventListener('mouseenter', () => container.style.background = isOnline ? '#2c3e50' : '#34495e');
  li.addEventListener('mouseleave', () => container.style.background = '');
  
  return li;
}

export function startOnlineUsersRefresh() {
  // No polling - rely on real-time WebSocket updates only
  console.log("Real-time mode: No polling needed");
}

export function stopOnlineUsersRefresh() {
  clearOnlineUsersRefreshInterval();
}
