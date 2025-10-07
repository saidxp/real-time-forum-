// CHAT ISLAND FUNCTIONALITY - COMMENTED OUT
// All chat island functionality has been split into separate modules:
// - chat-core.js: Main initialization and lifecycle
// - chat-websocket.js: WebSocket connections and messaging
// - chat-ui.js: UI management and message display
// - chat-users.js: User list and status management
// - chat-utils.js: Utility functions and helpers

// Import from the new modular files
import { creatchatisland as createChatIsland, showChatIsland, hideChatIsland, destroyChatIsland } from './chat-core.js';

// Re-export the functions to maintain compatibility
export { createChatIsland as creatchatisland, showChatIsland, hideChatIsland, destroyChatIsland };

/*
import { loadUsersWithStatus, initUserWebSocket, closeUserWebSocket, getUserWebSocketStatus } from "./users.js"

// Store interval IDs for cleanup
let wsStatusInterval = null;
let userRefreshInterval = null;

export function creatchatisland() {
    // Remove existing chat island if any
    const existingChatIsland = document.querySelector('.chat-island');
    if (existingChatIsland) {
        existingChatIsland.remove();
    }
    
    const chatSection = document.createElement("div");
    chatSection.className = 'chat-island';
    chatSection.id = 'chatIsland';
    chatSection.innerHTML = `
        <div class="chat-island-container">
            <!-- Header -->
            <div class="chat-island-header">
                <h3>💬 Chat</h3>
                <span class="ws-status" id="wsStatus" title="WebSocket Status">🔴</span>
                <button class="chat-minimize-btn">−</button>
            </div>

            <!-- Users Section -->
            <div class="chat-users-section">
                <div class="chat-users-header">
                    <span>Online Users</span>
                    <span class="users-count" id="onlineUsersCount">0</span>
                </div>
                <div class="chat-users-list" id="chatUsersList">
                    <!-- Users will be loaded here dynamically -->
                    <div class="user-item">
                        <div class="user-avatar">U</div>
                        <div class="user-info">
                            <span class="user-name">Loading...</span>
                            <span class="user-status online">Online</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Chat Messages Section -->
            <div class="chat-messages-section">
                <div class="chat-messages-header">
                    <span id="activeChatUser">Select a user to chat</span>
                </div>
                <div class="chat-messages-container" id="chatMessagesContainer">
                    <!-- Messages will appear here -->
                    <div class="no-chat-selected">
                        <p>👋 Select a user from the list to start chatting</p>
                    </div>
                </div>
                <div class="chat-input-section">
                    <input 
                        type="text" 
                        id="chatMessageInput" 
                        placeholder="Type a message..." 
                        class="chat-input"
                        disabled
                    />
                    <button id="chatSendBtn" class="chat-send-btn" disabled>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(chatSection);
    
    // Set up minimize button
    setupMinimizeButton();
    
    // Initialize WebSocket for real-time user updates
    initUserWebSocket(updateUsersList);
    
    // Load initial users list
    loadUsersWithStatus().then(users => {
        if (users) {
            updateUsersList(users);
        }
    });
    
    // Get current user info for chat
    fetch('/api/me').then(res => res.json()).then(user => {
        if (user.authenticated) {
            currentUsername = user.Username || user.username;
            currentUserId = user.userId || user.Id || user.id || user.ID;
        }
    }).catch(err => console.error('Failed to get user info:', err));

    // Update WebSocket status indicator periodically
    wsStatusInterval = setInterval(updateWebSocketStatus, 10000);
    
    // Refresh user list periodically (reduced frequency to avoid rate limiting)
    userRefreshInterval = setInterval(() => {
        loadUsersWithStatus().then(users => {
            if (users) {
                updateUsersList(users);
            }
        }).catch(err => {
            console.log('Rate limited, skipping refresh');
        });
    }, 60000); // Increased to 60 seconds
}

// Setup minimize button
function setupMinimizeButton() {
    const minimizeBtn = document.querySelector('.chat-minimize-btn');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            hideChatIsland();
        });
    }
}

// Show the chat island
export function showChatIsland() {
    const chatIsland = document.getElementById('chatIsland');
    if (chatIsland) {
        chatIsland.classList.add('visible');
        console.log('✅ Chat island shown');
    }
}

// Hide the chat island
export function hideChatIsland() {
    const chatIsland = document.getElementById('chatIsland');
    if (chatIsland) {
        chatIsland.classList.remove('visible');
        console.log('🔒 Chat island hidden');
    }
}

// Update the users list in the UI
function updateUsersList(data) {
    const usersList = document.getElementById('chatUsersList');
    const usersCount = document.getElementById('onlineUsersCount');
    if (!usersList) return;

    let users = [];
    if (Array.isArray(data)) {
        users = data;
    } else if (data && Array.isArray(data.users)) {
        users = data.users;
    } else if (data && data.Users && Array.isArray(data.Users)) {
        users = data.Users;
    }

    // Count online users
    const onlineCount = users.filter(u => u.isOnline).length;
    if (usersCount) usersCount.textContent = onlineCount || 0;

    usersList.innerHTML = '';

    if (users.length === 0) {
        usersList.innerHTML = `<div class="user-item"><span>No users found</span></div>`;
        return;
    }

    // Sort: prioritize recent activity overrides, then by last_message_at, then alphabetically
    users.sort((a, b) => {
        const aOverride = userOrderOverrides.get(a.username);
        const bOverride = userOrderOverrides.get(b.username);
        
        // If both have recent overrides, sort by override timestamp
        if (aOverride && bOverride) {
            return bOverride.timestamp - aOverride.timestamp;
        }
        // Recent override always comes first
        if (aOverride && !bOverride) return -1;
        if (!aOverride && bOverride) return 1;
        
        // Fall back to original sorting logic
        const aHasMsg = a.last_message_at && a.last_message_at !== '';
        const bHasMsg = b.last_message_at && b.last_message_at !== '';
        
        if (aHasMsg && bHasMsg) {
            return new Date(b.last_message_at) - new Date(a.last_message_at);
        }
        if (aHasMsg && !bHasMsg) return -1;
        if (!aHasMsg && bHasMsg) return 1;
        return (a.username || '').localeCompare(b.username || '');
    });

    users.forEach(user => {
        const username = user.username || 'Unknown';
        const userId = user.id || '';
        const initial = username.charAt(0).toUpperCase();
        const statusClass = user.isOnline ? 'online' : 'offline';

        const item = document.createElement('div');
        item.className = 'user-item';
        item.dataset.userId = userId;
        item.dataset.username = username;

        // Check for recent activity override first
        const override = userOrderOverrides.get(user.username);
        const lastMessage = override ? override.lastMessage : user.last_message;
        const lastMessagePreview = lastMessage ? 
            `<div class="user-last-message">${lastMessage.length > 30 ? lastMessage.substring(0, 30) + '...' : lastMessage}</div>` : '';
        
        const unreadCount = unreadCounts.get(username) || 0;
        const badge = unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : '';
        
        item.innerHTML = `
            <div class="user-avatar">${initial}</div>
            <div class="user-info">
                <span class="user-name">${username}</span>
                <span class="user-status ${statusClass}">●</span>
                ${lastMessagePreview}
            </div>
            ${badge}
        `;
        item.addEventListener('click', () => startChatWithUser(username));
        usersList.appendChild(item);
    });
}

// Update WebSocket status indicator
function updateWebSocketStatus() {
    const statusIndicator = document.getElementById('wsStatus');
    if (!statusIndicator) return;
    
    const status = getUserWebSocketStatus();
    
    switch (status) {
        case 'connected':
            statusIndicator.textContent = '🟢';
            statusIndicator.title = 'Connected';
            break;
        case 'connecting':
            statusIndicator.textContent = '🟡';
            statusIndicator.title = 'Connecting...';
            break;
        case 'disconnected':
            statusIndicator.textContent = '🔴';
            statusIndicator.title = 'Disconnected';
            break;
        default:
            statusIndicator.textContent = '⚪';
            statusIndicator.title = 'Unknown';
    }
}

// Store active chat state
let activeChatUsername = null;
let activeChatUserId = null;
let chatWebSocket = null;
let currentUserId = null;
let currentUsername = null;
let messageOffset = 0;
let lastReceivedMessage = null;
let typingTimer = null;
let isTyping = false;
let userOrderOverrides = new Map();
let unreadCounts = new Map();

// Start a chat with a specific user
async function startChatWithUser(username) {
    console.log(`Starting chat with ${username}`);
    activeChatUsername = username;
    
    // Clear unread count for this user
    clearUnreadMessages(username);
    
    try {
        // Get current user info
        const currentUserRes = await fetch('/api/me');
        const currentUser = await currentUserRes.json();
        currentUsername = currentUser.Username || currentUser.username;
        currentUserId = currentUser.userId || currentUser.Id || currentUser.id || currentUser.ID;
        
        console.log('Current user info:', { currentUsername, currentUserId, fullUser: currentUser });
        
        // Get target user ID
        const targetUserRes = await fetch(`/api/user-by-username?username=${encodeURIComponent(username)}`);
        if (!targetUserRes.ok) {
            console.error('Failed to get user info');
            return;
        }
        const targetUser = await targetUserRes.json();
        activeChatUserId = targetUser.id;
        
        // Update UI
        const activeChatUser = document.getElementById('activeChatUser');
        const chatInput = document.getElementById('chatMessageInput');
        const sendBtn = document.getElementById('chatSendBtn');
        
        if (activeChatUser) {
            activeChatUser.innerHTML = `
                <span>Chat with ${username}</span>
                <button class="close-chat-btn" onclick="closeChat()">✕</button>
            `;
        }
        
        if (chatInput) {
            chatInput.disabled = false;
            chatInput.placeholder = `Message ${username}...`;
            chatInput.value = '';
        }
        
        if (sendBtn) {
            sendBtn.disabled = false;
        }
        
        // Load chat history
        messageOffset = 0;
        await loadChatHistory(activeChatUserId, 10, 0);
        
        // Set up WebSocket for real-time messages
        setupChatWebSocket(currentUsername, username);
        
        // Set up send message handler
        setupSendMessageHandler();
        
    } catch (error) {
        console.error('Error starting chat:', error);
    }
}

// Load chat history
async function loadChatHistory(otherUserId, limit = 10, offset = 0) {
    try {
        const res = await fetch(`/api/chat-messages?other_user_id=${otherUserId}&limit=${limit}&offset=${offset}`);
        if (!res.ok) return;

        const data = await res.json();
        const messages = data.messages || [];
        const container = document.getElementById('chatMessagesContainer');
        if (!container) return;

        if (offset === 0) {
            container.innerHTML = '';
            messageOffset = 0;
        }

        if (offset === 0) {
            // Initial load - show messages normally
            messages.forEach(m => {
                const isSent = String(m.sender_id) === String(currentUserId);
                displayMessage(m, isSent);
            });
            scrollToBottom();
        } else {
            // Loading more - insert at top and preserve scroll
            const scrollHeight = container.scrollHeight;
            messages.reverse().forEach(m => {
                const isSent = String(m.sender_id) === String(currentUserId);
                const el = createMessageElement(m, isSent);
                container.insertBefore(el, container.firstChild);
            });
            container.scrollTop = container.scrollHeight - scrollHeight;
        }

        // Setup scroll listener only once
        if (!container.dataset.scrollHandler) {
            container.addEventListener('scroll', throttle(() => {
                if (container.scrollTop === 0 && messages.length === limit) {
                    loadChatHistory(otherUserId, 10, messageOffset);
                }
            }, 500));
            container.dataset.scrollHandler = "true";
        }

        messageOffset += messages.length;
    } catch (e) {
        console.error('Error loading chat history:', e);
    }
}

// Display a message
function displayMessage(message, isSent) {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    maybeAddDateSeparator(container, message.created_at);

    const el = createMessageElement(message, isSent);
    container.appendChild(el);
}

function createMessageElement(message, isSent) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-row ${isSent ? 'sent' : 'received'}`;

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isSent ? 'bubble-sent' : 'bubble-received'}`;

    // Show sender name (you or the other user)
    const name = document.createElement('div');
    name.className = 'message-sender';
    name.textContent = isSent ? currentUsername : activeChatUsername;

    // Message text
    const text = document.createElement('div');
    text.className = 'message-text';
    text.textContent = message.message;

    // Full date + time
    const time = document.createElement('div');
    time.className = 'message-time';
    const d = new Date(message.created_at);
    time.textContent = d.toLocaleString('en-US', { 
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    bubble.appendChild(name);
    bubble.appendChild(text);
    bubble.appendChild(time);
    wrapper.appendChild(bubble);

    return wrapper;
}

// Format message date
function formatMessageDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const timeStr = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    
    if (messageDate.getTime() === today.getTime()) {
        return `Today at ${timeStr}`;
    } else if (messageDate.getTime() === yesterday.getTime()) {
        return `Yesterday at ${timeStr}`;
    } else if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        }) + ` at ${timeStr}`;
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        }) + ` at ${timeStr}`;
    }
}

let chatReconnectAttempts = 0;
const MAX_CHAT_RECONNECT_ATTEMPTS = 5;
let heartbeatInterval = null;

// Set up WebSocket for chat
function setupChatWebSocket(user1, user2) {
    // Close existing chat WebSocket if any
    if (chatWebSocket) {
        try {
            chatWebSocket.close();
        } catch (e) {
            console.error('Error closing existing WebSocket:', e);
        }
        chatWebSocket = null;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/room?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}&username=${encodeURIComponent(user1)}`;
    
    console.log('🔌 Connecting to chat WebSocket:', wsUrl);
    
    try {
        chatWebSocket = new WebSocket(wsUrl);
    } catch (error) {
        console.error('❌ Failed to create WebSocket:', error);
        return;
    }
    
    chatWebSocket.onopen = () => {
        console.log('✅ Chat WebSocket connected');
        chatReconnectAttempts = 0;
    };
    
    chatWebSocket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('📨 Received WebSocket message:', data);
            
            if (data.type === 'message') {
                const isSent = data.name === currentUsername;
                
                // Only display message if it belongs to the current active chat
                if (isSent || data.name === activeChatUsername) {
                    hideTypingIndicator();
                    
                    const message = {
                        message: data.message,
                        sender_id: isSent ? currentUserId : activeChatUserId,
                        created_at: data.created_at || new Date().toISOString()
                    };
                    
                    console.log('💬 Displaying message in active chat:', { message, isSent, activeChatUsername });
                    displayMessage(message, isSent);
                    scrollToBottom();
                }
                
                // Always update user list order for any message
                if (isSent) {
                    updateUserListOrder(activeChatUsername, data.message);
                } else {
                    updateUserListOrder(data.name, data.message);
                    // Only add unread count if not currently chatting with this user
                    if (data.name !== activeChatUsername) {
                        addUnreadMessage(data.name);
                    }
                }
            } else if (data.type === 'typing') {
                if (data.name !== currentUsername && data.name === activeChatUsername) {
                    showTypingIndicator();
                }
            } else if (data.type === 'stop_typing') {
                if (data.name !== currentUsername && data.name === activeChatUsername) {
                    hideTypingIndicator();
                }
            }
        } catch (error) {
            console.debug('Non-JSON message or parse error:', error);
        }
    };

    chatWebSocket.onerror = (error) => {
        console.error('❌ Chat WebSocket error:', error);
    };
    
    chatWebSocket.onclose = (event) => {
        console.log('🔌 Chat WebSocket closed:', event.code, event.reason);
        chatWebSocket = null;
        
        // Auto-reconnect if still in active chat and not too many attempts
        if (activeChatUsername && chatReconnectAttempts < MAX_CHAT_RECONNECT_ATTEMPTS) {
            chatReconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, chatReconnectAttempts - 1), 5000);
            console.log(`🔄 Reconnecting chat WebSocket... Attempt ${chatReconnectAttempts} in ${delay}ms`);
            
            setTimeout(() => {
                if (activeChatUsername) {
                    setupChatWebSocket(user1, user2);
                }
            }, delay);
        } else if (chatReconnectAttempts >= MAX_CHAT_RECONNECT_ATTEMPTS) {
            console.error('❌ Max reconnection attempts reached');
            alert('Lost connection to chat. Please refresh the page.');
        }
    };
}

// Set up send message handler
function setupSendMessageHandler() {
    const input = document.getElementById('chatMessageInput');
    const btn = document.getElementById('chatSendBtn');

    // Remove old listeners first
    btn.replaceWith(btn.cloneNode(true));
    input.replaceWith(input.cloneNode(true));

    const newBtn = document.getElementById('chatSendBtn');
    const newInput = document.getElementById('chatMessageInput');

    newBtn.onclick = sendMessage;
    newInput.onkeypress = e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    
    newInput.oninput = () => {
        handleTyping();
    };
}

// Typing indicator functions
function handleTyping() {
    if (!chatWebSocket || chatWebSocket.readyState !== WebSocket.OPEN) {
        return;
    }
    
    if (!isTyping) {
        isTyping = true;
        try {
            chatWebSocket.send(JSON.stringify({
                type: 'typing',
                name: currentUsername
            }));
        } catch (e) {
            console.error('Error sending typing indicator:', e);
            return;
        }
    }
    
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        if (isTyping && chatWebSocket && chatWebSocket.readyState === WebSocket.OPEN) {
            isTyping = false;
            try {
                chatWebSocket.send(JSON.stringify({
                    type: 'stop_typing',
                    name: currentUsername
                }));
            } catch (e) {
                console.error('Error sending stop_typing:', e);
            }
        }
    }, 1000);
}

function showTypingIndicator() {
    let indicator = document.getElementById('typingIndicator');
    if (!indicator) {
        const container = document.getElementById('chatMessagesContainer');
        if (!container) return;
        
        indicator = document.createElement('div');
        indicator.id = 'typingIndicator';
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <div class="message-row received">
                <div class="message-bubble bubble-received">
                    <div class="message-sender">${activeChatUsername}</div>
                    <div class="typing-dots">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(indicator);
        scrollToBottom();
    }
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Send message
function sendMessage() {
  const chatInput = document.getElementById('chatMessageInput');
  if (!chatInput) {
    console.error('Chat input not found');
    return;
  }

  const message = chatInput.value.trim();
  if (!message || !activeChatUsername) {
    console.warn('No message or no active chat');
    return;
  }

  // Immediately stop typing and clear input to prevent conflicts
  isTyping = false;
  clearTimeout(typingTimer);
  chatInput.value = '';

  // Check WebSocket state
  if (!chatWebSocket || chatWebSocket.readyState !== WebSocket.OPEN) {
    console.warn('WebSocket not ready, attempting to reconnect...');
    chatInput.value = message; // Put message back
    return;
  }

  const messageData = {
    type: 'message',
    name: currentUsername,
    message: message,
    sender_id: currentUserId
  };

  // Send via WebSocket
  try {
    chatWebSocket.send(JSON.stringify(messageData));
    console.log('✅ Message sent via WebSocket');
  } catch (error) {
    console.error('❌ Error sending message:', error);
    chatInput.value = message; // Put message back on error
  }
}

// Scroll to bottom of messages
function scrollToBottom() {
    const messagesContainer = document.getElementById('chatMessagesContainer');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Close chat
window.closeChat = function() {
    activeChatUsername = null;
    activeChatUserId = null;
    messageOffset = 0;
    lastReceivedMessage = null;
    chatReconnectAttempts = 0;
    
    // Clear typing state
    clearTimeout(typingTimer);
    isTyping = false;
    hideTypingIndicator();
    
    // Close WebSocket connection
    if (chatWebSocket) {
        try {
            chatWebSocket.close();
        } catch (e) {
            console.error('Error closing WebSocket:', e);
        }
        chatWebSocket = null;
    }
    
    const activeChatUser = document.getElementById('activeChatUser');
    const chatInput = document.getElementById('chatMessageInput');
    const sendBtn = document.getElementById('chatSendBtn');
    const messagesContainer = document.getElementById('chatMessagesContainer');
    
    if (activeChatUser) {
        activeChatUser.textContent = 'Select a user to chat';
    }
    
    if (chatInput) {
        chatInput.disabled = true;
        chatInput.placeholder = 'Type a message...';
        chatInput.value = '';
    }
    
    if (sendBtn) {
        sendBtn.disabled = true;
    }
    
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="no-chat-selected">
                <p>👋 Select a user from the list to start chatting</p>
            </div>
        `;
    }
};

// Throttle function for scroll events
function throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    return function (...args) {
        const currentTime = Date.now();
        if (currentTime - lastExecTime > delay) {
            func.apply(this, args);
            lastExecTime = currentTime;
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
                lastExecTime = Date.now();
            }, delay - (currentTime - lastExecTime));
        }
    };
}

// Stub function - actual implementation is in the modular files
export function destroyChatIsland() {
    console.log('destroyChatIsland called - functionality moved to modular files');
}
let lastMessageDate = null;

function updateUserListOrder(username, lastMessage) {
    const usersList = document.getElementById('chatUsersList');
    if (!usersList) return;
    
    // Track this user's recent activity
    userOrderOverrides.set(username, {
        lastMessage: lastMessage,
        timestamp: Date.now()
    });
    
    const userItem = Array.from(usersList.children).find(item => 
        item.dataset.username === username
    );
    
    if (userItem) {
        // Update last message preview
        const lastMessageEl = userItem.querySelector('.user-last-message');
        const preview = lastMessage.length > 30 ? lastMessage.substring(0, 30) + '...' : lastMessage;
        
        if (lastMessageEl) {
            lastMessageEl.textContent = preview;
        } else {
            const userInfo = userItem.querySelector('.user-info');
            const newLastMessage = document.createElement('div');
            newLastMessage.className = 'user-last-message';
            newLastMessage.textContent = preview;
            userInfo.appendChild(newLastMessage);
        }
        
        // Move to top
        usersList.insertBefore(userItem, usersList.firstChild);
    }
}

function addUnreadMessage(senderName) {
    // Only skip if currently chatting with this person
    if (senderName === activeChatUsername) return;
    
    const current = unreadCounts.get(senderName) || 0;
    unreadCounts.set(senderName, current + 1);
    updateUserBadge(senderName);
}

function clearUnreadMessages(username) {
    unreadCounts.set(username, 0);
    updateUserBadge(username);
}

function updateUserBadge(username) {
    const usersList = document.getElementById('chatUsersList');
    if (!usersList) return;

    const userItem = [...usersList.querySelectorAll('.user-item')]
        .find(item => item.dataset.username === username);
    if (!userItem) return;

    let badge = userItem.querySelector('.unread-badge');
    const count = unreadCounts.get(username) || 0;

    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'unread-badge';
            userItem.appendChild(badge);
        }
        badge.textContent = count;
    } else {
        if (badge) badge.remove();
    }
}

function maybeAddDateSeparator(container, createdAt) {
    const msgDate = new Date(createdAt);
    const dateKey = msgDate.toDateString();

    if (lastMessageDate !== dateKey) {
        lastMessageDate = dateKey;

        const separator = document.createElement('div');
        separator.className = 'date-separator';

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today); 
        yesterday.setDate(yesterday.getDate() - 1);

        if (msgDate >= today) {
            separator.textContent = "Today";
        } else if (msgDate >= yesterday) {
            separator.textContent = "Yesterday";
        } else {
            separator.textContent = msgDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: msgDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        }

        container.appendChild(separator);
    }
}
*/