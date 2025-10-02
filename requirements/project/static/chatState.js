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
export function updateLastMessageTimestamp(username, timestamp) {
  lastMessageTimestamps.set(username, timestamp);
}



export function clearOnlineUsersRefreshInterval() {
  if (onlineUsersRefreshInterval) {
    clearInterval(onlineUsersRefreshInterval);
    onlineUsersRefreshInterval = null;
  }
}
