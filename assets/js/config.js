// frontend/js/config.js
const APP_CONFIG = {
    API_BASE_URL: 'http://localhost/UniStay---Website/backend/api',
    APP_URL: 'http://localhost/UniStay---Website',
    UPLOADS_BASE_URL: 'http://localhost/UniStay---Website/backend/uploads'
};

// Enhanced apiRequest function with proper authentication and CORS handling
async function apiRequest(endpoint, options = {}) {
    const url = `${APP_CONFIG.API_BASE_URL}/${endpoint}`;
    
    // Get session token from wherever it's stored
    const sessionToken = getSessionToken();
    
    const defaultOptions = {
        credentials: 'include', // This sends cookies including session_token
        headers: {
            'Content-Type': 'application/json',
        }
    };

    // Add Authorization header if we have a session token
    if (sessionToken) {
        defaultOptions.headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    // Add CSRF token for non-GET requests
    if (options.method && options.method !== 'GET') {
        try {
            const csrfToken = await getCSRFToken();
            if (csrfToken) {
                defaultOptions.headers['X-CSRF-Token'] = csrfToken;
            }
        } catch (error) {
            console.warn('CSRF token not available, proceeding without it');
        }
    }

    const config = {...defaultOptions, ...options };

    try {
        const response = await fetch(url, config);
        
        // Handle unauthorized responses
        if (response.status === 401) {
            // Clear session and redirect to login
            sessionStorage.clear();
            localStorage.removeItem('session_token');
            document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            
            throw new Error('Unauthorized - Please login again');
        }
        
        // Get response as text first to handle potential PHP warnings
        const responseText = await response.text();
        console.log('API Response for', endpoint, ':', responseText);
        
        // Clean the response - remove any PHP warnings before JSON
        const cleanedText = responseText.replace(/^[^{]*/, ''); // Remove everything before first {
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error('Invalid JSON response from server');
        }
        
        const data = JSON.parse(jsonMatch[0]);

        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API request failed for', endpoint, ':', error);
        
        // Handle CORS errors specifically
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            throw new Error('Network error: Cannot connect to server. Please check if the server is running.');
        }
        
        throw error;
    }
}

// Helper function to get session token from various sources
function getSessionToken() {
    // Try to get from sessionStorage first
    const sessionToken = sessionStorage.getItem('session_token');
    if (sessionToken) {
        console.log('Found token in sessionStorage');
        return sessionToken;
    }
    
    // Try to get from localStorage
    const localToken = localStorage.getItem('session_token');
    if (localToken) {
        console.log('Found token in localStorage');
        // Also store in sessionStorage for consistency
        sessionStorage.setItem('session_token', localToken);
        return localToken;
    }
    
    // Try to extract from cookies
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'session_token' && value) {
            console.log('Found token in cookies');
            // Store in both storage for future use
            sessionStorage.setItem('session_token', value);
            localStorage.setItem('session_token', value);
            return value;
        }
    }
    
    console.log('No session token found');
    return null;
}

// Store session token when user logs in
function storeSessionToken(token) {
    sessionStorage.setItem('session_token', token);
    localStorage.setItem('session_token', token);
    // Also set cookie for PHP sessions
    document.cookie = `session_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`; // 7 days
}

// Enhanced CSRF token function with better error handling
async function getCSRFToken() {
    try {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/auth/csrf.php`, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.token || '';
    } catch (error) {
        console.error('Error getting CSRF token:', error);
        // Don't throw error here, just return empty string
        return '';
    }
}

// Rest of your existing config.js functions remain the same...
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);

    return notification;
}

function getNotificationIcon(type) {
    const icons = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    return icons[type] || icons.info;
}

function getNotificationColor(type) {
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };
    return colors[type] || colors.info;
}

function checkAuth(requiredRole = null) {
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');

    if (!loggedInUser) {
        // Not logged in at all
        if (window.location.pathname !== '/login.html' &&
            window.location.pathname !== '/register.html' &&
            !window.location.pathname.includes('verify-email') &&
            !window.location.pathname.includes('reset-password')) {
            showNotification('Please login to access this page', 'warning');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return false;
        }
        return true;
    }

    // Check if user has the required role
    if (requiredRole && userRole !== requiredRole) {
        showNotification(`You need to be a ${requiredRole} to access this page`, 'error');
        setTimeout(() => {
            window.location.href = userRole === 'tenant' ? 'tenant-dashboard.html' :
                userRole === 'landlord' ? 'landlord-dashboard.html' : 'index.html';
        }, 2000);
        return false;
    }

    // Update navigation based on user role
    updateNavigation(userRole);

    return true;
}

function updateNavigation(userRole) {
    // Hide login link and show appropriate dashboard link
    const loginLink = document.getElementById('loginLink');
    const dashboardLink = document.getElementById('dashboardLink');
    const landlordDashboardLink = document.getElementById('landlordDashboardNav');

    if (loginLink) loginLink.style.display = 'none';
    
    if (userRole === 'tenant' && dashboardLink) {
        dashboardLink.style.display = 'inline';
        dashboardLink.href = 'tenant-dashboard.html';
    } else if (userRole === 'landlord' && landlordDashboardLink) {
        landlordDashboardLink.style.display = 'inline';
        landlordDashboardLink.href = 'landlord-dashboard.html';
    } else if (userRole === 'admin') {
        // Admin navigation
        if (dashboardLink) {
            dashboardLink.style.display = 'inline';
            dashboardLink.href = 'admin-dashboard.html';
            dashboardLink.textContent = 'Admin Dashboard';
        }
    }
}

function setupLogout() {
    const logoutButtons = document.querySelectorAll('#logoutBtn');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            showNotification('Logging out...', 'info');
            
            apiRequest('auth/logout.php', {
                method: 'POST'
            })
            .then(() => {
                // Clear all storage
                sessionStorage.clear();
                localStorage.clear();
                
                // Clear cookies
                document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                
                showNotification('Logged out successfully', 'success');
                
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            })
            .catch(err => {
                console.error('Logout error:', err);
                // Still clear storage and redirect even if API call fails
                sessionStorage.clear();
                localStorage.clear();
                window.location.href = 'index.html';
            });
        });
    });
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatCurrency(amount) {
    return 'R' + parseInt(amount).toLocaleString();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function debugAuth() {
    console.group('Authentication Debug Info');
    console.log('Session Storage Token:', sessionStorage.getItem('session_token'));
    console.log('Local Storage Token:', localStorage.getItem('session_token'));
    console.log('LoggedInUser:', sessionStorage.getItem('LoggedInUser'));
    console.log('UserRole:', sessionStorage.getItem('UserRole'));
    console.log('Cookies:', document.cookie);
    console.groupEnd();
}

// Profile completion check for other pages
function checkProfileCompletion() {
    const profileCompleted = sessionStorage.getItem('ProfileCompleted');
    const completionPercentage = parseInt(sessionStorage.getItem('ProfileCompletion') || '0');
    
    return {
        isComplete: profileCompleted === 'true',
        percentage: completionPercentage,
        requiresCompletion: completionPercentage < 80
    };
}

// Redirect to profile if incomplete - call this on all protected pages
function enforceProfileCompletion() {
    // Don't enforce on these pages
    const allowedPages = [
        'login.html',
        'register.html',
        'verify-email.html',
        'reset-password.html',
        'profile.html',
        'index.html'
    ];
    
    const currentPage = window.location.pathname.split('/').pop();
    if (allowedPages.includes(currentPage)) {
        return;
    }

    const profileCheck = checkProfileCompletion();
    
    if (profileCheck.requiresCompletion) {
        const proceed = confirm(
            'Please complete your profile to access all features. ' +
            `Your profile is ${profileCheck.percentage}% complete. ` +
            'Would you like to complete it now?'
        );
        
        if (proceed) {
            window.location.href = 'profile.html';
        }
    }
}

// Update navigation profile indicator
function updateNavigationProfile() {
    const navAvatar = document.getElementById('navAvatar');
    const completionDot = document.getElementById('completionDot');
    const userName = sessionStorage.getItem('UserName');
    
    if (navAvatar && userName) {
        navAvatar.textContent = userName.charAt(0).toUpperCase();
    }
    
    if (completionDot) {
        const profileCheck = checkProfileCompletion();
        completionDot.className = 'completion-dot ' + 
            (profileCheck.isComplete ? 'complete' : 'incomplete');
    }
}

// Initialize auth check on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    if (loggedInUser) {
        updateNavigation(userRole);
        updateNavigationProfile();
    }
    
    setupLogout();
    
    // Add global error handler
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.error);
    });
});

// Make functions globally available
window.apiRequest = apiRequest;
window.storeSessionToken = storeSessionToken;
window.getSessionToken = getSessionToken;
window.checkProfileCompletion = checkProfileCompletion;
window.enforceProfileCompletion = enforceProfileCompletion;
window.updateNavigationProfile = updateNavigationProfile;

// Add CSS for notifications
const notificationStyles = `
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 10px;
}

.notification-icon {
    font-weight: bold;
    font-size: 16px;
}

.notification-close {
    background: none;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    margin-left: auto;
}

.notification-close:hover {
    opacity: 0.8;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);