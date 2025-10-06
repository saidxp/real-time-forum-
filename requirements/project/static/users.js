// WebSocket connection for real-time user updates
let userWebSocket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 seconds

// Load all users via REST API
export async function loadAllUsers(){
    const apirout = '/api/all-users'
    try{
        const response = await fetch(apirout)
        if(!response.ok){
            throw new Error(`Response status: ${response.status}`);
        }
        const result = await response.json();
        console.log('All users:', result);
        return result;
    } catch (error) {
        console.error('Error loading all users:', error.message);
        return null;
    }
}

// Load online users via REST API
export async function loadOnlineUsers(){
    const apirout = '/api/online-users'
    try{
        const response = await fetch(apirout)
        if(!response.ok){
            throw new Error(`Response status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Online users:', result);
        return result;
    } catch (error) {
        console.error('Error loading online users:', error.message);
        return null;
    }
}

// Get current user info
export async function getCurrentUser(){
    try {
        const response = await fetch('/api/me');
        if(!response.ok){
            throw new Error(`Response status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Current user:', result);
        return result;
    } catch (error) {
        console.error('Error loading current user:', error.message);
        return null;
    }
}

// Load users with online status (excluding current user)
export async function loadUsersWithStatus(){
    try {
        // Fetch current user, all users and online users
        const [currentUserData, allUsersData, onlineUsersData] = await Promise.all([
            getCurrentUser(),
            loadAllUsers(),
            loadOnlineUsers()
        ]);
        
        // Extract user arrays
        const currentUsername = currentUserData?.Username || currentUserData?.username || '';
        const allUsers = allUsersData?.users || [];
        const onlineUsers = onlineUsersData?.users || [];
        
        // Create a Set for faster lookup
        const onlineUsersSet = new Set(onlineUsers);
        
        // Map all users with their online status, excluding current user
        const usersWithStatus = allUsers
            .filter(username => username !== currentUsername) // Exclude current user
            .map(username => ({
                username: username,
                isOnline: onlineUsersSet.has(username)
            }));
        
        console.log('Users with status (excluding current user):', usersWithStatus);
        return usersWithStatus;
    } catch (error) {
        console.error('Error loading users with status:', error);
        return [];
    }
}

// Initialize WebSocket connection for real-time user updates
export function initUserWebSocket(onUsersUpdate) {
    // Close existing connection if any
    if (userWebSocket) {
        userWebSocket.close();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/room?room=users_lobby`;
    
    console.log('🔌 Connecting to user WebSocket:', wsUrl);
    
    try {
        userWebSocket = new WebSocket(wsUrl);
        
        userWebSocket.onopen = () => {
            console.log('✅ User WebSocket connected');
            reconnectAttempts = 0;
            
            // Request initial user list with status
            loadUsersWithStatus().then(users => {
                if (users && onUsersUpdate) {
                    onUsersUpdate(users);
                }
            });
        };
        
        userWebSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📨 WebSocket message received:', data);
                
                // Handle different message types
                if (data.type === 'users_update') {
                    // Full user list update - refresh with status
                    console.log('🔄 Users list updated via WebSocket');
                    loadUsersWithStatus().then(users => {
                        if (users && onUsersUpdate) {
                            onUsersUpdate(users);
                        }
                    });
                } else if (data.type === 'user_joined') {
                    // User joined - refresh immediately
                    console.log(`👋 User joined: ${data.username}`);
                    loadUsersWithStatus().then(users => {
                        if (users && onUsersUpdate) {
                            onUsersUpdate(users);
                        }
                    });
                } else if (data.type === 'user_left') {
                    // User left - refresh immediately
                    console.log(`👋 User left: ${data.username}`);
                    loadUsersWithStatus().then(users => {
                        if (users && onUsersUpdate) {
                            onUsersUpdate(users);
                        }
                    });
                } else if (data.type === 'message') {
                    // Chat message received - could trigger refresh if needed
                    console.log('💬 Chat message received');
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        userWebSocket.onerror = (error) => {
            console.error('❌ User WebSocket error:', error);
        };
        
        userWebSocket.onclose = (event) => {
            console.log('🔌 User WebSocket closed:', event.code, event.reason);
            
            // Attempt to reconnect
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
                setTimeout(() => {
                    initUserWebSocket(onUsersUpdate);
                }, RECONNECT_DELAY);
            } else {
                console.log('❌ Max reconnection attempts reached');
            }
        };
        
    } catch (error) {
        console.error('Failed to create WebSocket:', error);
    }
    
    return userWebSocket;
}

// Close WebSocket connection
export function closeUserWebSocket() {
    if (userWebSocket) {
        console.log('🔌 Closing user WebSocket');
        userWebSocket.close();
        userWebSocket = null;
    }
}

// Send a message through WebSocket
export function sendUserWebSocketMessage(message) {
    if (userWebSocket && userWebSocket.readyState === WebSocket.OPEN) {
        userWebSocket.send(JSON.stringify(message));
        return true;
    } else {
        console.warn('WebSocket is not connected');
        return false;
    }
}

// Get WebSocket connection status
export function getUserWebSocketStatus() {
    if (!userWebSocket) return 'disconnected';
    
    switch (userWebSocket.readyState) {
        case WebSocket.CONNECTING:
            return 'connecting';
        case WebSocket.OPEN:
            return 'connected';
        case WebSocket.CLOSING:
            return 'closing';
        case WebSocket.CLOSED:
            return 'disconnected';
        default:
            return 'unknown';
    }
}