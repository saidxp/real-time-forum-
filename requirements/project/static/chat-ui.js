import { setupChatWebSocket, handleTyping, sendMessage } from "./chat-websocket.js"
import { throttle } from "./chat-utils.js"
import { updateTotalUnreadBadge } from "./chat-users.js"

// UI state
let messageOffset = 0;
let lastMessageDate = null;

// Start a chat with a specific user
export async function startChatWithUser(username) {
    window.activeChatUsername = username;
    // Clear unread count for this user immediately
    if (!window.unreadCounts) window.unreadCounts = new Map();
    const oldCount = window.unreadCounts.get(username) || 0;
    window.unreadCounts.set(username, 0);
    // Update UI immediately
    const usersList = document.getElementById('chatUsersList');
    if (usersList) {
        const userItem = [...usersList.querySelectorAll('.user-item')]
            .find(item => item.dataset.username === username);
        if (userItem) {
            const badge = userItem.querySelector('.unread-badge');
            if (badge) badge.remove();
            userItem.classList.remove('has-unread');
        }
    }
    updateTotalUnreadBadge();
    try {
        // Get current user info
        const currentUserRes = await fetch('/api/me');
        const currentUser = await currentUserRes.json();
        window.currentUsername = currentUser.Username || currentUser.username;
        window.currentUserId = currentUser.userId || currentUser.Id || currentUser.id || currentUser.ID;
        
        console.log('Current user info:', { currentUsername: window.currentUsername, currentUserId: window.currentUserId, fullUser: currentUser });
        
        // Get target user ID
        const targetUserRes = await fetch(`/api/user-by-username?username=${encodeURIComponent(username)}`);
        if (!targetUserRes.ok) {
            console.error('Failed to get user info');
            return;
        }
        const targetUser = await targetUserRes.json();
        window.activeChatUserId = targetUser.id;
        
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
        await loadChatHistory(window.activeChatUserId, 10, 0);
        
        // Set up WebSocket for real-time messages
        setupChatWebSocket(window.currentUsername, username);
        
        // Set up send message handler
        setupSendMessageHandler();
        
    } catch (error) {
        console.error('Error starting chat:', error);
    }
}

// Load chat history
export async function loadChatHistory(otherUserId, limit = 10, offset = 0) {
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
                const isSent = String(m.sender_id) === String(window.currentUserId);
                displayMessage(m, isSent);
            });
            scrollToBottom();
        } else {
            // Loading more - insert at top and preserve scroll
            const scrollHeight = container.scrollHeight;
            messages.reverse().forEach(m => {
                const isSent = String(m.sender_id) === String(window.currentUserId);
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
export function displayMessage(message, isSent) {
    const container = document.getElementById('chatMessagesContainer');
    if (!container) return;

    maybeAddDateSeparator(container, message.created_at);

    const el = createMessageElement(message, isSent);
    container.appendChild(el);
}

export function createMessageElement(message, isSent) {
    const wrapper = document.createElement('div');
    wrapper.className = `message-row ${isSent ? 'sent' : 'received'}`;

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isSent ? 'bubble-sent' : 'bubble-received'}`;

    // Show sender name (you or the other user)
    const name = document.createElement('div');
    name.className = 'message-sender';
    name.textContent = isSent ? window.currentUsername : window.activeChatUsername;

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

export function showTypingIndicator() {
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
                    <div class="message-sender">${window.activeChatUsername}</div>
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

export function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// Scroll to bottom of messages
export function scrollToBottom() {
    const messagesContainer = document.getElementById('chatMessagesContainer');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Close chat
window.closeChat = function() {
    window.activeChatUsername = null;
    window.activeChatUserId = null;
    messageOffset = 0;
    window.chatReconnectAttempts = 0;
    
    // Clear typing state
    clearTimeout(window.typingTimer);
    window.isTyping = false;
    hideTypingIndicator();
    
    // Close WebSocket connection
    if (window.chatWebSocket) {
        try {
            window.chatWebSocket.close();
        } catch (e) {
            console.error('Error closing WebSocket:', e);
        }
        window.chatWebSocket = null;
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

function clearUnreadMessages(username) {
    if (!window.unreadCounts) window.unreadCounts = new Map();
    window.unreadCounts.set(username, 0);
    updateUserBadge(username);
    updateTotalUnreadBadge();
}



