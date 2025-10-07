import { loadUsersWithStatus, initUserWebSocket, closeUserWebSocket, getUserWebSocketStatus } from "./users.js"
import { updateUsersList, updateWebSocketStatus } from "./chat-users.js"

// Store interval IDs for cleanup
let wsStatusInterval = null;
let userRefreshInterval = null;

export function creatchatisland() {
    // Initialize global notification state
    if (!window.unreadCounts) window.unreadCounts = new Map();
    if (!window.userOrderOverrides) window.userOrderOverrides = new Map();
    
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
                <h3>💬 Chat <span class="total-unread-badge" id="totalUnreadBadge" style="display: none;"></span></h3>
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
    
    // Set up minimize button with toggle functionality
    const minimizeBtn = document.querySelector('.chat-minimize-btn');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            const chatIsland = document.getElementById('chatIsland');
            if (chatIsland) {
                chatIsland.classList.toggle('minimized');
                minimizeBtn.textContent = chatIsland.classList.contains('minimized') ? '+' : '−';
            }
        });
    }
    
    // Initialize WebSocket for real-time user updates
    initUserWebSocket(updateUsersList);
    
    // Load initial users list
    loadUsersWithStatus().then(users => {
        if (users) {
            updateUsersList(users);
        }
    });
    
    // Get current user info for chat
    fetch('/api/me').then(res => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.text();
    }).then(text => {
        try {
            const user = JSON.parse(text);
            if (user.authenticated) {
                window.currentUsername = user.Username || user.username;
                window.currentUserId = user.userId || user.Id || user.id || user.ID;
            }
        } catch (e) {
            console.log('User not authenticated');
        }
    }).catch(err => console.log('User not authenticated'));

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
    }, 120000); // Increased to 2 minutes
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

// Clean up function to close WebSocket when chat island is removed
export function destroyChatIsland() {
    // Clear intervals
    if (wsStatusInterval) {
        clearInterval(wsStatusInterval);
        wsStatusInterval = null;
    }
    if (userRefreshInterval) {
        clearInterval(userRefreshInterval);
        userRefreshInterval = null;
    }
    
    // Clear typing timer
    if (window.typingTimer) {
        clearTimeout(window.typingTimer);
        window.typingTimer = null;
    }
    
    // Close chat WebSocket
    if (window.chatWebSocket) {
        try {
            window.chatWebSocket.close();
        } catch (e) {
            console.error('Error closing chat WebSocket:', e);
        }
        window.chatWebSocket = null;
    }
    
    // Close user WebSocket
    closeUserWebSocket();
    
    // Reset state
    window.activeChatUsername = null;
    window.activeChatUserId = null;
    window.chatReconnectAttempts = 0;
    
    // Remove chat section
    const chatSection = document.querySelector('.chat-island');
    if (chatSection) {
        chatSection.remove();
    }
}