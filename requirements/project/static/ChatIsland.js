let floatingIsland = null;
let isExpanded = false;
let users = [];
let refreshInterval = null;
let unreadCounts = new Map(); // Track unread messages per user

// Fetch users directly from API
async function fetchUsersFromAPI() {
  const onlineUsers = [];
  const offlineUsers = [];
  
  try {
    // Fetch online users
    const onlineRes = await fetch("/api/online-users");
    if (!onlineRes.ok) {
      throw new Error(`HTTP ${onlineRes.status}`);
    }
    const onlineData = await onlineRes.json();
    const online = new Set(onlineData.users || []);

    // Try to fetch all users
    let allUsers = [];
    try {
      const allRes = await fetch("/api/all-users");
      if (allRes.ok) {
        const allData = await allRes.json();
        allUsers = Array.isArray(allData) ? allData : (allData.users || []);
      }
    } catch (e) {
      // If all-users endpoint doesn't exist, use only online users
      allUsers = Array.from(online);
    }

    // Get current user to exclude them
    let currentUsername = null;
    try {
      const meRes = await fetch("/api/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        currentUsername = meData.Username || meData.username;
      }
    } catch (e) {
      // ignore
    }

    // Separate online and offline users
    allUsers.forEach(username => {
      if (username === currentUsername) return; // Skip current user
      
      const userData = {
        username: username,
        isOnline: online.has(username),
        lastMessageTime: null,
        unreadCount: unreadCounts.get(username) || 0
      };
      
      if (userData.isOnline) {
        onlineUsers.push(userData);
      } else {
        offlineUsers.push(userData);
      }
    });

    // Try to get recent chats for timestamps
    try {
      const recentRes = await fetch("/api/recent-chats");
      if (recentRes.ok) {
        const contentType = recentRes.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const recentData = await recentRes.json();
          if (recentData.recent_chats && recentData.recent_chats.length > 0) {
            const timestampMap = new Map();
            const unreadMap = new Map();
            
            recentData.recent_chats.forEach(chat => {
              if (chat.username && chat.last_message_time) {
                timestampMap.set(chat.username, chat.last_message_time);
              }
              if (chat.username && chat.unread_count) {
                unreadMap.set(chat.username, chat.unread_count);
                unreadCounts.set(chat.username, chat.unread_count);
              }
            });
            
            // Add timestamps and unread counts to user data
            [...onlineUsers, ...offlineUsers].forEach(user => {
              if (timestampMap.has(user.username)) {
                user.lastMessageTime = new Date(timestampMap.get(user.username)).toLocaleTimeString();
              }
              if (unreadMap.has(user.username)) {
                user.unreadCount = unreadMap.get(user.username);
              }
            });
          }
        }
      }
    } catch (e) {
      // Recent chats not available, skip timestamps
    }

  } catch (err) {
    console.error("Error fetching users from API:", err);
  }
  
  return { online: onlineUsers, offline: offlineUsers };
}

export function createFloatingChatIsland(onUserSelect) {
  if (floatingIsland) {
    floatingIsland.remove();
  }

  floatingIsland = document.createElement('div');
  floatingIsland.className = 'floating-chat-island';
  floatingIsland.innerHTML = `
    <style>
      .floating-chat-island {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        width: 320px;
      }

      .chat-island-container {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        overflow: hidden;
      }

      .chat-island-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        color: white;
        cursor: pointer;
        transition: background 0.2s;
        position: relative;
      }

      .chat-island-header:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .chat-island-header-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .chat-island-icon {
        width: 24px;
        height: 24px;
      }

      .chat-island-title {
        font-weight: 600;
        font-size: 18px;
      }
      
      .chat-island-total-badge {
        position: absolute;
        top: -8px;
        right: -8px;
        background: #e74c3c;
        color: white;
        border-radius: 50%;
        min-width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
        padding: 0 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }

      .chat-island-chevron {
        transition: transform 0.3s;
      }

      .chat-island-chevron.expanded {
        transform: rotate(180deg);
      }

      .chat-island-users {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out;
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
      }

      .chat-island-users.expanded {
        max-height: 400px;
        overflow-y: auto;
      }

      .chat-island-users-inner {
        padding: 8px;
      }

      .chat-island-section-title {
        color: white;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 12px 12px 8px;
        opacity: 0.8;
      }

      .chat-user-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        margin-bottom: 8px;
        background: rgba(102, 126, 234, 0.4);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
      }

      .chat-user-item:hover {
        background: rgba(102, 126, 234, 0.6);
        transform: translateX(4px);
      }

      .chat-user-item.offline {
        background: rgba(102, 126, 234, 0.2);
        opacity: 0.7;
      }

      .chat-user-item.offline:hover {
        background: rgba(102, 126, 234, 0.35);
      }

      .chat-user-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;
      }

      .chat-user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        position: relative;
        flex-shrink: 0;
      }

      .chat-user-avatar.offline {
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
      }

      .chat-user-status-dot {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #10b981;
        border: 2px solid white;
      }

      .chat-user-status-dot.offline {
        background: #6b7280;
      }

      .chat-user-info {
        flex: 1;
        min-width: 0;
      }

      .chat-user-name {
        color: white;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .chat-user-time {
        color: rgba(255, 255, 255, 0.7);
        font-size: 11px;
        margin-top: 2px;
      }

      .chat-user-badge {
        background: #e74c3c;
        color: white;
        border-radius: 50%;
        min-width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        flex-shrink: 0;
        padding: 0 6px;
      }

      .chat-island-users::-webkit-scrollbar {
        width: 8px;
      }

      .chat-island-users::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
      }

      .chat-island-users::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.3);
        border-radius: 4px;
      }

      .chat-island-users::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.5);
      }

      .chat-island-empty {
        color: rgba(255, 255, 255, 0.6);
        font-style: italic;
        padding: 12px;
        text-align: center;
      }

      .chat-island-loading {
        color: rgba(255, 255, 255, 0.8);
        padding: 12px;
        text-align: center;
      }
    </style>

    <div class="chat-island-container">
      <div class="chat-island-header" id="chatIslandHeader">
        <div class="chat-island-header-left">
          <svg class="chat-island-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <span class="chat-island-title">Chat</span>
        </div>
        <div id="chatIslandTotalBadge" class="chat-island-total-badge" style="display: none;">0</div>
        <svg class="chat-island-chevron" id="chatIslandChevron" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>

      <div class="chat-island-users" id="chatIslandUsers">
        <div class="chat-island-users-inner" id="chatIslandUsersList">
          <div class="chat-island-loading">Loading users...</div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(floatingIsland);

  const header = floatingIsland.querySelector('#chatIslandHeader');
  const chevron = floatingIsland.querySelector('#chatIslandChevron');
  const usersContainer = floatingIsland.querySelector('#chatIslandUsers');

  header.addEventListener('click', () => {
    isExpanded = !isExpanded;
    chevron.classList.toggle('expanded', isExpanded);
    usersContainer.classList.toggle('expanded', isExpanded);
  });

  // Initial render
  updateFloatingIsland(onUserSelect);

  // Auto-refresh every 10 seconds
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  refreshInterval = setInterval(() => {
    updateFloatingIsland(onUserSelect);
  }, 10000);
}

export async function updateFloatingIsland(onUserSelect) {
  const usersList = document.getElementById('chatIslandUsersList');
  if (!usersList) return;

  // Fetch users from API
  const { online, offline } = await fetchUsersFromAPI();
  
  // Calculate total unread messages
  let totalUnread = 0;
  [...online, ...offline].forEach(user => {
    if (user.unreadCount > 0) {
      totalUnread += user.unreadCount;
    }
  });
  
  // Update total unread badge
  const totalBadge = document.getElementById('chatIslandTotalBadge');
  if (totalBadge) {
    if (totalUnread > 0) {
      totalBadge.textContent = totalUnread > 99 ? '99+' : totalUnread;
      totalBadge.style.display = 'flex';
    } else {
      totalBadge.style.display = 'none';
    }
  }
  
  usersList.innerHTML = '';

  // Online users section
  if (online.length > 0) {
    const onlineTitle = document.createElement('div');
    onlineTitle.className = 'chat-island-section-title';
    onlineTitle.textContent = `Online (${online.length})`;
    usersList.appendChild(onlineTitle);

    online.forEach(user => {
      const userItem = createUserItem(user, true, onUserSelect);
      usersList.appendChild(userItem);
    });
  }

  // Offline users section
  if (offline.length > 0) {
    const offlineTitle = document.createElement('div');
    offlineTitle.className = 'chat-island-section-title';
    offlineTitle.textContent = `Offline (${offline.length})`;
    usersList.appendChild(offlineTitle);

    offline.forEach(user => {
      const userItem = createUserItem(user, false, onUserSelect);
      usersList.appendChild(userItem);
    });
  }

  // Empty state
  if (online.length === 0 && offline.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'chat-island-empty';
    emptyMsg.textContent = 'No users available';
    usersList.appendChild(emptyMsg);
  }
}

function createUserItem(userData, isOnline, onUserSelect) {
  const item = document.createElement('div');
  item.className = `chat-user-item ${isOnline ? '' : 'offline'}`;
  
  const left = document.createElement('div');
  left.className = 'chat-user-left';
  
  const avatar = document.createElement('div');
  avatar.className = `chat-user-avatar ${isOnline ? '' : 'offline'}`;
  avatar.textContent = userData.username.charAt(0).toUpperCase();
  
  const statusDot = document.createElement('div');
  statusDot.className = `chat-user-status-dot ${isOnline ? '' : 'offline'}`;
  avatar.appendChild(statusDot);
  
  const info = document.createElement('div');
  info.className = 'chat-user-info';
  
  const name = document.createElement('div');
  name.className = 'chat-user-name';
  name.textContent = userData.username;
  info.appendChild(name);
  
  if (userData.lastMessageTime) {
    const time = document.createElement('div');
    time.className = 'chat-user-time';
    time.textContent = userData.lastMessageTime;
    info.appendChild(time);
  }
  
  left.appendChild(avatar);
  left.appendChild(info);
  item.appendChild(left);
  
  // Add unread badge if there are unread messages
  if (userData.unreadCount > 0) {
    const badge = document.createElement('div');
    badge.className = 'chat-user-badge';
    badge.textContent = userData.unreadCount > 99 ? '99+' : userData.unreadCount;
    item.appendChild(badge);
  }
  
 item.addEventListener('click', () => {
    if (onUserSelect) {
      // Clear unread count for this user when they click
      unreadCounts.delete(userData.username);
      // Update the badge immediately
      const totalBadge = document.getElementById('chatIslandTotalBadge');
      if (totalBadge) {
        const totalUnread = Array.from(unreadCounts.values()).reduce((sum, count) => sum + count, 0);
        if (totalUnread > 0) {
          totalBadge.textContent = totalUnread > 99 ? '99+' : totalUnread;
          totalBadge.style.display = 'flex';
        } else {
          totalBadge.style.display = 'none';
        }
      }
      onUserSelect(userData.username);
      // Refresh the island to update the badge
      updateFloatingIsland(onUserSelect);
    }
  });
  
  return item;
}

// Function to increment unread count for a user
export function incrementUnreadCount(username) {
  const currentCount = unreadCounts.get(username) || 0;
  unreadCounts.set(username, currentCount + 1);
}

// Function to clear unread count for a user
export function clearUnreadCount(username) {
  unreadCounts.delete(username);
}

export function destroyFloatingChatIsland() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  if (floatingIsland) {
    floatingIsland.remove();
    floatingIsland = null;
  }
  isExpanded = false;
  users = [];
  unreadCounts.clear();
}
 