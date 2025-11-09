// Complete Messages JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeMessaging();
});

let currentUser = null;
let currentUserRole = null;
let currentConversation = null;
let conversations = [];

function initializeMessaging() {
    currentUser = sessionStorage.getItem('LoggedInUser');
    currentUserRole = sessionStorage.getItem('UserRole');
    
    if (!currentUser) {
        showNotification('You must be logged in to view messages.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    // Setup event listeners
    const sendButton = document.getElementById('sendButton');
    const messageInput = document.getElementById('messageInput');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            enhancedLogout();
        });
    }

    loadConversations();
}

async function loadConversations() {
    try {
        const response = await fetch('http://localhost/UniStay---Website/backend/api/messages/conversations.php', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load conversations');
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load conversations');
        }
        
        conversations = result.conversations || [];
        displayConversations(conversations);
        
    } catch (err) {
        showNotification('Error loading conversations', 'error');
        displayConversations([]);
    }
}

function displayConversations(conversations) {
    const conversationsList = document.getElementById('conversationsList');
    if (!conversationsList) return;
    
    if (!conversations || conversations.length === 0) {
        conversationsList.innerHTML = `
            <div class="no-conversation">
                <div class="no-conversation-icon">💬</div>
                <h3>No conversations yet</h3>
                <p>Start a conversation by messaging a landlord</p>
                <button onclick="window.location.href='properties.html'" style="margin-top: 1rem; padding: 10px 20px; background: #1a237e; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Browse Properties
                </button>
            </div>
        `;
        return;
    }
    
    conversationsList.innerHTML = conversations.map(conv => `
        <div class="conversation-item" onclick="selectConversation(${conv.other_user_id}, '${escapeHtml(conv.other_user_name)}', '${escapeHtml(conv.other_user_role)}')">
            <div class="conversation-avatar">${getInitials(conv.other_user_name)}</div>
            <div class="conversation-info">
                <div class="conversation-name">${escapeHtml(conv.other_user_name)}</div>
                <div class="conversation-preview">${escapeHtml(conv.last_message || 'Start conversation...')}</div>
                <div class="conversation-time">${conv.last_message_time ? formatTime(conv.last_message_time) : ''}</div>
            </div>
        </div>
    `).join('');
}

function selectConversation(userId, userName, userRole) {
    currentConversation = userId;
    
    // Update active state
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Update chat header
    const chatAvatar = document.getElementById('chatAvatar');
    const chatUserName = document.getElementById('chatUserName');
    const chatUserRole = document.getElementById('chatUserRole');
    
    if (chatAvatar) chatAvatar.textContent = getInitials(userName);
    if (chatUserName) chatUserName.textContent = userName;
    if (chatUserRole) chatUserRole.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
    
    // Show message input
    document.getElementById('messageInputContainer').style.display = 'flex';
    
    loadMessages(userId);
}

async function loadMessages(userId) {
    try {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        messagesList.innerHTML = '<div class="loading">Loading messages...</div>';
        
        const response = await fetch(`http://localhost/UniStay---Website/backend/api/messages/conversation.php?user_id=${userId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load messages');
        }
        
        const result = await response.json();
        
        if (result.success) {
            displayMessages(result.messages || []);
        } else {
            throw new Error(result.error || 'Failed to load messages');
        }
        
    } catch (err) {
        showNotification('Error loading messages', 'error');
        displayMessages([]);
    }
}

function displayMessages(messages) {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;
    
    if (!messages || messages.length === 0) {
        messagesList.innerHTML = `
            <div class="no-conversation">
                <div class="no-conversation-icon">💬</div>
                <h3>No messages yet</h3>
                <p>Start the conversation by sending a message</p>
            </div>
        `;
        return;
    }
    
    messagesList.innerHTML = messages.map(msg => `
        <div class="message ${msg.is_own ? 'own-message' : 'other-message'}">
            <div class="message-content">${escapeHtml(msg.message)}</div>
            <div class="message-time">${formatTime(msg.created_at)}</div>
        </div>
    `).join('');
    
    // Scroll to bottom
    messagesList.scrollTop = messagesList.scrollHeight;
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    const message = messageInput.value.trim();
    
    if (!message) {
        showNotification('Please enter a message', 'warning');
        return;
    }
    
    if (!currentConversation) {
        showNotification('Please select a conversation first', 'warning');
        return;
    }

    try {
        addMessageToUI(message, true);
        const originalMessage = messageInput.value;
        messageInput.value = '';
        
        const response = await fetch('http://localhost/UniStay---Website/backend/api/messages/send.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                receiver_id: currentConversation,
                message: message
            })
        });
        
        const result = await response.json();
        
        if (!result.success) {
            removeLastMessage();
            messageInput.value = originalMessage;
            throw new Error('Failed to send message');
        }
        
        showNotification('Message sent successfully', 'success');
        loadConversations();
        
    } catch (err) {
        showNotification('Error sending message', 'error');
    }
}

function addMessageToUI(message, isOwnMessage = false) {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;
    
    // Hide no conversation message if visible
    const noConversation = messagesList.querySelector('.no-conversation');
    if (noConversation) {
        noConversation.style.display = 'none';
    }
    
    // Remove loading message if present
    const loading = messagesList.querySelector('.loading');
    if (loading) {
        loading.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwnMessage ? 'own-message' : 'other-message'}`;
    messageDiv.innerHTML = `
        <div class="message-content">${escapeHtml(message)}</div>
        <div class="message-time">${formatTime(new Date().toISOString())}</div>
    `;
    
    messagesList.appendChild(messageDiv);
    messagesList.scrollTop = messagesList.scrollHeight;
}

function removeLastMessage() {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;
    
    const messages = messagesList.querySelectorAll('.message');
    if (messages.length > 0) {
        messages[messages.length - 1].remove();
    }
}

function enhancedLogout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        localStorage.removeItem('rememberMe');
        document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'LoggedInUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = 'login.html';
    }
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
}

function formatTime(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hr ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
        return '';
    }
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        z-index: 10000;
        font-weight: 600;
        max-width: 400px;
        background: ${getNotificationColor(type)};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    notification.innerHTML = `
        <span>${getNotificationIcon(type)}</span>
        <span style="margin-left: 8px;">${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    return colors[type] || colors.info;
}

// Make functions globally available
window.selectConversation = selectConversation;
window.sendMessage = sendMessage;
window.loadConversations = loadConversations;