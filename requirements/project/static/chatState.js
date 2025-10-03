export let notificationPermission = "default";
export let unreadMessages = new Map();
export let currentChatUser = null;
export let currentChatUserID = null;
export let messagesLoaded = 0;
export let isLoadingMessages = false;
export let hasMoreMessages = true;
export let currentSocket = null;
export let currentUser = null;
export let intentionalSocketClose = false;
export let lastMessageTimestamps = new Map();
export let onlineUsersRefreshInterval = null;

// Setters
export function setNotificationPermission(val) { notificationPermission = val; }
export function setCurrentChatUser(val) { currentChatUser = val; }
export function setCurrentChatUserID(val) { currentChatUserID = val; }
export function setMessagesLoaded(val) { messagesLoaded = val; }
export function setIsLoadingMessages(val) { isLoadingMessages = val; }
export function setHasMoreMessages(val) { hasMoreMessages = val; }
export function setCurrentSocket(val) { currentSocket = val; }
export function setCurrentUser(val) { currentUser = val; }
export function setIntentionalSocketClose(val) { intentionalSocketClose = val; }
export function setOnlineUsersRefreshInterval(val) { onlineUsersRefreshInterval = val; }

// Utilities
export function incrementMessagesLoaded(amount = 1) { messagesLoaded += amount; }
export function clearUnreadMessages(username) { unreadMessages.delete(username); }
export function incrementUnreadMessages(username) {
  const current = unreadMessages.get(username) || 0;
  unreadMessages.set(username, current + 1);
}

// OPTIMIZED: Immediate DOM update with better error handling
export function updateLastMessageTimestamp(username, timestamp) {
  if (!username) return;

  const normalizedUsername = username.toLowerCase();
  lastMessageTimestamps.set(normalizedUsername, timestamp);

  // Immediate DOM update - use requestAnimationFrame for smooth updates
  requestAnimationFrame(() => {
    updateTimestampInDOM(username, timestamp);
  });
}

// Separate function for DOM updates to avoid blocking
function updateTimestampInDOM(username, timestamp) {
  try {
    // Find all instances of this user (might be in multiple lists)
    const userItems = document.querySelectorAll(`[data-username="${username}"]`);
    
    userItems.forEach(userItem => {
      let timeEl = userItem.querySelector(".last-message-indicator");
      
      // Create element if it doesn't exist
      if (!timeEl) {
        timeEl = document.createElement('small');
        timeEl.className = 'last-message-indicator';
        timeEl.style.cssText = 'display: block; color: #95a5a6; font-size: 0.75rem; margin-top: 2px;';
        userItem.appendChild(timeEl);
      }

      // Update with formatted time
      const date = new Date(timestamp);
      timeEl.textContent = date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      // Add data attribute for sorting
      userItem.setAttribute('data-last-message-time', timestamp);
    });
  } catch (err) {
    console.error('Error updating timestamp in DOM:', err);
  }
}

// Force refresh all timestamps in DOM
export function refreshAllTimestampsInDOM() {
  lastMessageTimestamps.forEach((timestamp, username) => {
    updateTimestampInDOM(username, timestamp);
  });
}

export function clearOnlineUsersRefreshInterval() {
  if (onlineUsersRefreshInterval) {
    clearInterval(onlineUsersRefreshInterval);
    onlineUsersRefreshInterval = null;
  }
}