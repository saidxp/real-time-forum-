import { getUserWebSocketStatus } from "./users.js"
import { startChatWithUser } from "./chat-ui.js"

// Initialize global state
if (!window.userOrderOverrides) window.userOrderOverrides = new Map();
if (!window.unreadCounts) window.unreadCounts = new Map();

// Test function to verify notifications work
window.testNotification = function(username) {
    console.log(`Testing notification for ${username}`);
    addUnreadMessage(username);
    console.log(`Unread count for ${username}:`, window.unreadCounts.get(username));
};

// Test function to simulate message from another user
window.simulateMessage = function(fromUser, message) {
    console.log(`Simulating message from ${fromUser}: ${message}`);
    const data = {
        type: 'message',
        name: fromUser,
        message: message,
        sender_id: 999,
        created_at: new Date().toISOString()
    };
    
    // Only add notification if not from active chat
    if (fromUser !== window.activeChatUsername) {
        addUnreadMessage(fromUser);
        console.log(`📢 Added notification for ${fromUser}`);
    } else {
        console.log(`📢 Message from active chat, no notification`);
    }
    
    updateTotalUnreadBadge();
};

// Update the users list in the UI
export function updateUsersList(data) {
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
        const aOverride = window.userOrderOverrides.get(a.username);
        const bOverride = window.userOrderOverrides.get(b.username);
        
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
        const override = window.userOrderOverrides.get(user.username);
        const lastMessage = override ? override.lastMessage : user.last_message;
        const lastMessagePreview = lastMessage ? 
            `<div class="user-last-message">${lastMessage.length > 30 ? lastMessage.substring(0, 30) + '...' : lastMessage}</div>` : '';
        
        const unreadCount = window.unreadCounts.get(username) || 0;
        
        // Add notification class if there are unread messages
        if (unreadCount > 0) {
            item.classList.add('has-unread');
        }
        
        item.innerHTML = `
            <div class="user-avatar">${initial}</div>
            <div class="user-info">
                <span class="user-name">${username}</span>
                <span class="user-status ${statusClass}">●</span>
                ${lastMessagePreview}
            </div>
        `;
        
        // Add unread badge after creating the element
        if (unreadCount > 0) {
            const userNameEl = item.querySelector('.user-name');
            const badge = document.createElement('span');
            badge.className = 'unread-badge';
            badge.textContent = unreadCount;
            userNameEl.appendChild(badge);
        }
        item.addEventListener('click', () => startChatWithUser(username));
        usersList.appendChild(item);
    });
}

// Update WebSocket status indicator
export function updateWebSocketStatus() {
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

export function updateUserListOrder(username, lastMessage) {
    const usersList = document.getElementById('chatUsersList');
    if (!usersList) return;
    
    // Track this user's recent activity
    window.userOrderOverrides.set(username, {
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

export function addUnreadMessage(senderName) {
    console.log(`🔔 addUnreadMessage called for: ${senderName}`);
    
    // Initialize unreadCounts if not exists
    if (!window.unreadCounts) window.unreadCounts = new Map();
    
    // Skip if currently chatting with this person
    if (senderName === window.activeChatUsername) {
        console.log(`❌ Skipping - active chat with: ${senderName}`);
        return;
    }
    
    const current = window.unreadCounts.get(senderName) || 0;
    const newCount = current + 1;
    window.unreadCounts.set(senderName, newCount);
    console.log(`✅ Notification added! ${senderName}: ${newCount} unread`);
    
    // Immediately update UI
    updateUserBadge(senderName);
    updateTotalUnreadBadge();
    
    console.log(`📢 UI updated for ${senderName}`);
}

function updateUserBadge(username) {
    const usersList = document.getElementById('chatUsersList');
    if (!usersList) return;

    const userItem = [...usersList.querySelectorAll('.user-item')]
        .find(item => item.dataset.username === username);
    if (!userItem) return;

    const userNameEl = userItem.querySelector('.user-name');
    if (!userNameEl) return;

    let badge = userNameEl.querySelector('.unread-badge');
    const count = window.unreadCounts?.get(username) || 0;

    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'unread-badge';
            userNameEl.appendChild(badge);
        }
        badge.textContent = count;
        userItem.classList.add('has-unread');
        console.log(`📢 Updated badge for ${username}: ${count}`);
    } else {
        if (badge) badge.remove();
        userItem.classList.remove('has-unread');
        console.log(`📢 Cleared badge for ${username}`);
    }
}

export function updateTotalUnreadBadge() {
    const totalBadge = document.getElementById('totalUnreadBadge');
    if (!totalBadge) return;
    
    let totalUnread = 0;
    if (window.unreadCounts) {
        for (const count of window.unreadCounts.values()) {
            totalUnread += count;
        }
    }
    
    console.log(`Total unread messages: ${totalUnread}`);
    if (totalUnread > 0) {
        totalBadge.textContent = totalUnread;
        totalBadge.style.display = 'inline';
    } else {
        totalBadge.style.display = 'none';
    }
}


export function znotif(username) {
    // Show desktop notification
    showDesktopNotification(username);
    
    // Show in-app notification popup
    showInAppNotification(username);
    
    // Update badge
    updateNotificationBadge(username);
    
    // Play notification sound
    playNotificationSound();
}

function showDesktopNotification(username) {
    if (Notification.permission === 'granted') {
        new Notification(`New message from ${username}`, {
            body: 'You have a new message',
            icon: '/static/svg/logo.svg',
            tag: username
        });
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(`New message from ${username}`, {
                    body: 'You have a new message',
                    icon: '/static/svg/logo.svg',
                    tag: username
                });
            }
        });
    }
}

function showInAppNotification(username) {
    // Remove existing notification
    const existing = document.querySelector('.notification-popup');
    if (existing) existing.remove();
    
    // Create notification popup
    const notification = document.createElement('div');
    notification.className = 'notification-popup';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">💬</span>
            <div class="notification-text">
                <strong>${username}</strong>
                <p>New message</p>
            </div>
            <button class="notification-close">×</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').onclick = () => {
        notification.remove();
    };
}

function updateNotificationBadge(username) {
    if (!window.unreadCounts) window.unreadCounts = new Map();
    const count = window.unreadCounts.get(username) || 0;

    const usersList = document.getElementById('chatUsersList');
    if (!usersList) return;

    const userItem = [...usersList.querySelectorAll('.user-item')]
        .find(item => item.dataset.username === username);
    if (!userItem) return;

    const userNameEl = userItem.querySelector('.user-name');
    if (!userNameEl) return;

    let badge = userNameEl.querySelector('.unread-badge');
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'unread-badge';
            userNameEl.appendChild(badge);
        }
        badge.textContent = count;
        userItem.classList.add('has-unread');
    } else {
        if (badge) badge.remove();
        userItem.classList.remove('has-unread');
    }
}

function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch (e) {
        // Silently fail if audio doesn't work
    }
}
