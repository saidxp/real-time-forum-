
export async function requestNotificationPermission() {
  if ('Notification' in window) {
    notificationPermission = await Notification.requestPermission();
        setNotificationPermission(permission);
  }
}
export function showBrowserNotification(username, message) {
  if (notificationPermission === 'granted' && document.hidden) {
    const notification = new Notification(`New message from ${username}`, {
      body: message.substring(0, 100),
      icon: '/static/svg/chat.svg',
      badge: '/static/svg/chat.svg',
      tag: `chat-${username}`,
      requireInteraction: false
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    setTimeout(() => notification.close(), 5000);
  }
}
export function showInAppNotification(username, message) {
  // Remove existing notification if any
  const existingNotif = document.querySelector('.chat-notification');
  if (existingNotif) {
    existingNotif.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = 'chat-notification';
  notification.innerHTML = `
    <div class="chat-notification-content">
      <div class="chat-notification-header">
        <strong>${escapeHtml(username)}</strong>
        <button class="chat-notification-close">&times;</button>
      </div>
      <div class="chat-notification-message">${escapeHtml(message.substring(0, 80))}${message.length > 80 ? '...' : ''}</div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Close button handler
  const closeBtn = notification.querySelector('.chat-notification-close');
  closeBtn.addEventListener('click', () => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  });
  
  // Click to open chat
  notification.addEventListener('click', (e) => {
    if (!e.target.classList.contains('chat-notification-close')) {
      loadChatUI(username);
      notification.remove();
    }
  });
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 5000);
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
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVKzn77FhHAU7kt3ywn0pBSl+zPLaizsIGGS27OihUBALTqXh8bllHAU7k93ywHwqBSl9y/HajDsIF2W27OihUQ8LTqXi8rllHQU7k93ywHsqBSl9y/HajDwIF2W17OihUQ8KTqXh8bllHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8blmHQU7lN3ywHsqBSl9y/HajDwIF2W17OihUQ8KTqTh8Q==');
    audio.volume = 0.3;
    audio.play().catch(err => console.log("Could not play notification sound:", err));
  } catch (err) {
    console.log("Notification sound not supported:", err);
  }
}