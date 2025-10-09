import { displayMessage, scrollToBottom, showTypingIndicator, hideTypingIndicator } from "./chat-ui.js"
import { updateUserListOrder, addUnreadMessage, updateTotalUnreadBadge, showNotification } from "./chat-users.js"

// WebSocket state
let chatReconnectAttempts = 0;
const MAX_CHAT_RECONNECT_ATTEMPTS = 5;

// Set up WebSocket for chat
export function setupChatWebSocket(user1, user2) {
    // Close existing chat WebSocket if any
    if (window.chatWebSocket) {
        try {
            window.chatWebSocket.close();
        } catch (e) {
            console.error('Error closing existing WebSocket:', e);
        }
        window.chatWebSocket = null;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
    const wsUrl = `${protocol}//${host}:${port}/room?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}&username=${encodeURIComponent(user1)}`;
    
    try {
        window.chatWebSocket = new WebSocket(wsUrl);
    } catch (error) {
        return;
    }
    
    window.chatWebSocket.addEventListener('open', () => {
        chatReconnectAttempts = 0;
    });
    
    window.chatWebSocket.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'message') {
                const isSent = data.name === window.currentUsername;
                
                if (isSent || data.name === window.activeChatUsername) {
                    hideTypingIndicator();
                    
                    const message = {
                        message: data.message,
                        sender_id: isSent ? window.currentUserId : window.activeChatUserId,
                        created_at: data.created_at || new Date().toISOString()
                    };
                    
                    displayMessage(message, isSent);
                    scrollToBottom();
                }
                
                if (!isSent) {
                    addUnreadMessage(data.name);
                    showNotification(data.name);
                }
                
                if (isSent) {
                    updateUserListOrder(window.activeChatUsername, data.message);
                } else {
                    updateUserListOrder(data.name, data.message);
                }
                
                updateTotalUnreadBadge();
            } else if (data.type === 'typing') {
                if (data.name !== window.currentUsername && data.name === window.activeChatUsername) {
                    showTypingIndicator();
                }
            } else if (data.type === 'stop_typing') {
                if (data.name !== window.currentUsername && data.name === window.activeChatUsername) {
                    hideTypingIndicator();
                }
            }
        } catch (error) {}
    });

    window.chatWebSocket.addEventListener('error', (error) => {});
    
    window.chatWebSocket.addEventListener('close', (event) => {
        window.chatWebSocket = null;
        
        if (window.activeChatUsername && chatReconnectAttempts < MAX_CHAT_RECONNECT_ATTEMPTS) {
            chatReconnectAttempts++;
            const delay = Math.min(1000 * (2 ** (chatReconnectAttempts - 1)), 5000);
            
            setTimeout(() => {
                if (window.activeChatUsername) {
                    setupChatWebSocket(user1, user2);
                }
            }, delay);
        } else if (chatReconnectAttempts >= MAX_CHAT_RECONNECT_ATTEMPTS) {
            alert('Lost connection to chat. Please refresh the page.');
        }
    });
}

// Typing indicator functions
export function handleTyping() {
    if (!window.chatWebSocket || window.chatWebSocket.readyState !== WebSocket.OPEN) {
        return;
    }
    
    if (!window.isTyping) {
        window.isTyping = true;
        try {
            window.chatWebSocket.send(JSON.stringify({
                type: 'typing',
                name: window.currentUsername
            }));
        } catch (e) {
            return;
        }
    }
    
    clearTimeout(window.typingTimer);
    window.typingTimer = setTimeout(() => {
        if (window.isTyping && window.chatWebSocket && window.chatWebSocket.readyState === WebSocket.OPEN) {
            window.isTyping = false;
            try {
                window.chatWebSocket.send(JSON.stringify({
                    type: 'stop_typing',
                    name: window.currentUsername
                }));
            } catch (e) {}
        }
    }, 1000);
}

// Send message
export function sendMessage() {
    const chatInput = document.getElementById('chatMessageInput');
    if (!chatInput) return;

    const message = chatInput.value.trim();
    if (!message || !window.activeChatUsername) return;

    // Immediately stop typing and clear input to prevent conflicts
    window.isTyping = false;
    clearTimeout(window.typingTimer);
    chatInput.value = '';

    if (!window.chatWebSocket || window.chatWebSocket.readyState !== WebSocket.OPEN) {
        chatInput.value = message;
        return;
    }

    const messageData = {
        type: 'message',
        name: window.currentUsername,
        message: message,
        sender_id: window.currentUserId
    };

    try {
        window.chatWebSocket.send(JSON.stringify(messageData));
    } catch (error) {
        chatInput.value = message;
    }
}

