import { unreadMessages, lastMessageTimestamps, currentUser, currentSocket, setOnlineUsersRefreshInterval, clearOnlineUsersRefreshInterval, setIntentionalSocketClose, setCurrentSocket } from "./chatState.js";
import { setupPrivateChat, loadRecentChats } from "./chatui.js";
import { addSystemMessage } from "./messages.js";

let lastAllUsersFetch = 0;
let cachedAllUsers = null;
let cachedOnlineUsers = []; // Cache online users list

async function fetchAllUsersThrottled() {
  const now = Date.now();
  if (now - lastAllUsersFetch < 60000 && cachedAllUsers) {
    return cachedAllUsers;
  }
  lastAllUsersFetch = now;

  try {
    const res = await fetch("/api/all-users");
    if (res.ok) {
      const data = await res.json();
      cachedAllUsers = Array.isArray(data) ? data : data.users || [];
      return cachedAllUsers;
    }
  } catch (err) {
    console.error("Error fetching all users:", err);
  }
  return cachedAllUsers || null;
}

let isRendering = false;
let renderQueue = null;

function sortUsersByLastMessage(users) {
  return users.sort((a, b) => {
    const timestampA = lastMessageTimestamps.get(a) || 0;
    const timestampB = lastMessageTimestamps.get(b) || 0;
    
    // Both have timestamps - sort by most recent
    if (timestampA && timestampB) {
      return timestampB - timestampA;
    }
    // Only A has timestamp - A comes first
    if (timestampA && !timestampB) return -1;
    // Only B has timestamp - B comes first
    if (!timestampA && timestampB) return 1;
    
    // Neither has timestamp - alphabetical order
    return a.localeCompare(b);
  });
}

export async function renderUserList(allUsers, onlineUsers) {
  if (isRendering) {
    console.log("Queueing render request");
    renderQueue = { allUsers, onlineUsers };
    return;
  }
  
  isRendering = true;
  
  try {
    const userList = document.getElementById("userList");
    if (!userList) {
      console.error("User list element not found");
      return;
    }

    // Cache the online users list
    cachedOnlineUsers = onlineUsers || [];

    const onlineSet = new Set(cachedOnlineUsers);
    const all = (allUsers || []).filter(u => !(currentUser && u === currentUser.Username));
    let connected = all.filter(u => onlineSet.has(u));
    let disconnected = all.filter(u => !onlineSet.has(u));

    // Sort both lists by last message timestamp
    connected = sortUsersByLastMessage(connected);
    disconnected = sortUsersByLastMessage(disconnected);

    userList.innerHTML = '';

    const connectedHeader = document.createElement('li');
    connectedHeader.className = 'chat-header';
    connectedHeader.innerHTML = '<strong>Connected:</strong>';
    userList.appendChild(connectedHeader);

    if (connected.length > 0) {
      connected.forEach((username) => {
        const li = createUserListItem(username, true);
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

    if (disconnected.length > 0) {
      disconnected.forEach((username) => {
        const li = createUserListItem(username, false);
        userList.appendChild(li);
      });
    } else {
      const empty = document.createElement('li');
      empty.innerHTML = '<em>No users offline</em>';
      userList.appendChild(empty);
    }
  } finally {
    isRendering = false;
    
    if (renderQueue) {
      const { allUsers: qAllUsers, onlineUsers: qOnlineUsers } = renderQueue;
      renderQueue = null;
      // Immediate synchronous call for real-time updates
      renderUserList(qAllUsers, qOnlineUsers);
    }
  }
}

function createUserListItem(username, isOnline) {
  const li = document.createElement("li");
  li.className = "online-user";
  li.setAttribute("data-username", username);
  
  const dot = document.createElement('span');
  dot.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
  li.appendChild(dot);
  
  const nameNode = document.createTextNode(username);
  li.appendChild(nameNode);
  
  const unreadCount = unreadMessages.get(username) || 0;
  if (unreadCount > 0) {
    const badge = document.createElement('span');
    badge.className = 'notification-badge';
    badge.textContent = unreadCount;
    li.appendChild(badge);
  }
  
  const lastMsgTime = lastMessageTimestamps.get(username);
  if (lastMsgTime) {
    const timeEl = document.createElement('small');
    timeEl.className = 'last-message-indicator';
    timeEl.textContent = new Date(lastMsgTime).toLocaleTimeString();
    li.appendChild(timeEl);
  }
  
  li.addEventListener("click", async () => {
    try {
      if (currentSocket) {
        setIntentionalSocketClose(true);
        currentSocket.close();
        setCurrentSocket(null);
      }
      await setupPrivateChat(username);
    } catch (err) {
      console.error("Error setting up private chat:", err);
      addSystemMessage("Failed to start chat with " + username);
    }
  });
  
  return li;
}

export function updateOnlineUsers(users) {
  console.log("updateOnlineUsers called with:", users);
  
  // Update cached online users immediately
  cachedOnlineUsers = users || [];
  
  fetchAllUsersThrottled().then(allUsers => {
    if (allUsers && allUsers.length > 0) {
      renderUserList(allUsers, users);
    } else {
      const userList = document.getElementById("userList");
      if (!userList) return;

      let sortedUsers = (users || []).filter(username => 
        !(currentUser && username === currentUser.Username)
      );

      sortedUsers = sortUsersByLastMessage(sortedUsers);

      const userItems = userList.querySelectorAll('.online-user, li:not(.chat-header)');
      userItems.forEach(item => {
        if (!item.classList.contains('chat-header')) {
          item.remove();
        }
      });
      
      let connectedHeader = Array.from(userList.querySelectorAll('.chat-header'))
        .find(h => h.textContent.includes('Connected'));
      
      if (!connectedHeader) {
        connectedHeader = document.createElement('li');
        connectedHeader.className = 'chat-header';
        connectedHeader.innerHTML = '<strong>Connected:</strong>';
        userList.insertBefore(connectedHeader, userList.firstChild);
      }

      if (sortedUsers.length > 0) {
        sortedUsers.forEach(username => {
          const li = createUserListItem(username, true);
          userList.insertBefore(li, connectedHeader.nextSibling);
        });
      } else {
        const empty = document.createElement('li');
        empty.innerHTML = '<em>No users online</em>';
        userList.insertBefore(empty, connectedHeader.nextSibling);
      }
    }
  });
}

let lastOnlineUsersFetch = 0;

export async function loadOnlineUsers() {
  const now = Date.now();
  if (now - lastOnlineUsersFetch < 2000) {
    console.log("Throttling loadOnlineUsers");
    return;
  }
  lastOnlineUsersFetch = now;

  console.log("Loading online users...");

  try {
    const onlineRes = await fetch("/api/online-users");
    if (!onlineRes.ok) throw new Error(`HTTP ${onlineRes.status}`);
    const onlineData = await onlineRes.json();
    const online = onlineData.users || [];

    const allUsers = await fetchAllUsersThrottled();

    if (allUsers && allUsers.length) {
      await renderUserList(allUsers, online);
    } else {
      updateOnlineUsers(online);
    }

    if (lastMessageTimestamps.size === 0) {
      await loadRecentChats();
    }
  } catch (err) {
    console.error("Error loading online users:", err);
    const userList = document.getElementById("userList");
    if (userList && !isRendering) {
      userList.innerHTML = `<li><em>Error loading users</em></li>`;
    }
  }
}

// INSTANT re-sort using cached data - NO THROTTLING, NO API CALLS
export function onMessageReceived(username) {
  console.log(`Message received from ${username}, re-sorting list INSTANTLY`);
  
  // Use cached data for instant update - NO THROTTLING
  if (cachedAllUsers && cachedAllUsers.length > 0 && cachedOnlineUsers) {
    // Render immediately with cached online users
    renderUserList(cachedAllUsers, cachedOnlineUsers);
  } else if (cachedOnlineUsers && cachedOnlineUsers.length > 0) {
    // Fallback: use just cached online users
    updateOnlineUsers(cachedOnlineUsers);
  }
  // If no cached data at all, the list will update on next refresh cycle
}

export function startOnlineUsersRefresh() {
  clearOnlineUsersRefreshInterval();
  setOnlineUsersRefreshInterval(setInterval(() => {
    if (!window.currentChatUser) {
      console.log("Auto-refreshing online users");
      loadOnlineUsers();
    }
  }, 10000));
}

export function stopOnlineUsersRefresh() {
  clearOnlineUsersRefreshInterval();
}