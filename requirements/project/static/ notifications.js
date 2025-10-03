let globalSocket = null;
let currentUser = null;
let notificationPermission = 'default';

// Initialize notifications
function initNotifications() {
  getCurrentUser().then(() => {
    if (currentUser) {
      requestNotificationPermission();
      setupGlobalWebSocket();
      addNotificationStyles();
    }
  });
}

async function getCurrentUser() {
  try {
    const response = await fetch('/api/me');
    if (response.ok) {
      currentUser = await response.json();
    }
  } catch (err) {
    console.log('Could not get current user');
  }
}

function setupGlobalWebSocket() {
  if (!currentUser?.Username) return;
  
  const scheme = location.protocol === "https:" ? "wss" : "ws";
  const socketUrl = `${scheme}://${location.host}/notifications?username=${currentUser.Username}`;
  
  globalSocket = new WebSocket(socketUrl);
  
  globalSocket.onopen = () => {
    console.log('Global notifications connected');
  };
  
  globalSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'message' && data.name !== currentUser.Username) {
        showBrowserNotification(data.name, data.message);
        showInAppNotification(data.name, data.message);
        playNotificationSound();
      }
    } catch (err) {
      console.log('Error parsing notification:', err);
    }
  };
  
  globalSocket.onclose = () => {
    setTimeout(setupGlobalWebSocket, 3000);
  };
}

export async function requestNotificationPermission() {
  if ('Notification' in window) {
    notificationPermission = await Notification.requestPermission();
  }
}

export function showBrowserNotification(username, message) {
  if (notificationPermission === 'granted') {
    const notification = new Notification(`New message from ${username}`, {
      body: message.substring(0, 100),
      icon: '/static/svg/chat.svg'
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    setTimeout(() => notification.close(), 5000);
  }
}

export function showInAppNotification(username, message) {
  const existing = document.querySelector('.global-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.className = 'global-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <strong>${username}</strong>
      <div>${message.substring(0, 80)}</div>
      <button class="close-btn">×</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  notification.querySelector('.close-btn').onclick = () => {
    notification.remove();
  };
  
  setTimeout(() => notification.remove(), 5000);
}

export function updateUserNotificationBadge(username, count) {
  const userItems = document.querySelectorAll(`[data-username="${username}"]`);
  userItems.forEach(userItem => {
    let badge = userItem.querySelector('.notification-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notification-badge';
        userItem.appendChild(badge);
      }
      badge.textContent = count;
    } else if (badge) {
      badge.remove();
    }
  });
}

export function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVKzn77FhHAU7kt3ywn0pBSl+zPLaizsIGGS27OihUBALTqXh8bllHAU7k93ywHwqBSl9y/HajDsIF2W27OihUQ8LTqXi8rllHQU7k93ywHsqBSl9y/HajDwIF2W17OihUQ8KTqXh8bllHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8Q==');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (err) {}
}

function addNotificationStyles() {
  if (document.querySelector('#notification-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = `
    .global-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #333;
      color: white;
      padding: 15px;
      border-radius: 8px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .notification-content {
      position: relative;
    }
    .close-btn {
      position: absolute;
      top: -5px;
      right: -5px;
      background: #666;
      color: white;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      cursor: pointer;
    }
  `;
  
  document.head.appendChild(style);
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotifications);
} else {
  initNotifications();
}