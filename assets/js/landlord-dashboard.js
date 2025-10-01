document.addEventListener('DOMContentLoaded', function() {
    // Check profile completion first
    enforceProfileCompletion();
    
    console.log('Landlord dashboard loading...');
    console.log('Session token available:', !!getSessionToken());
    console.log('User role:', sessionStorage.getItem('UserRole'));
    
    // Check authentication first
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    if (!loggedInUser || userRole !== 'landlord') {
        console.error('Authentication failed - redirecting to login');
        showNotification('Please login as a landlord to access this page.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    // Update navigation profile indicator
    updateNavigationProfile();

    // Display username
    const usernameElement = document.getElementById('username');
    if (loggedInUser && usernameElement) {
        const userName = sessionStorage.getItem('UserName') || 'Landlord';
        usernameElement.textContent = userName;
    }

    // Load dashboard data
    loadDashboardStats();
    loadRecentBookings();
    
    // Setup logout functionality
    setupLogout();
});

async function loadDashboardStats() {
    try {
        console.log('Loading dashboard stats...');
        
        // Show loading state
        const propertiesCountElem = document.getElementById('propertiesCount');
        const activeBookingsElem = document.getElementById('activeBookings');
        const unreadMessagesElem = document.getElementById('unreadMessages');
        
        if (propertiesCountElem) propertiesCountElem.textContent = '...';
        if (activeBookingsElem) activeBookingsElem.textContent = '...';
        if (unreadMessagesElem) unreadMessagesElem.textContent = '...';
        
        // Load landlord's properties using the apiRequest function from config.js
        const propertiesResponse = await apiRequest('properties/my.php');
        
        console.log('Properties API response:', propertiesResponse);
        
        if (!propertiesResponse.success) {
            throw new Error(propertiesResponse.error || 'Failed to load properties');
        }
        
        const properties = propertiesResponse.data || [];
        
        // Load landlord's bookings
        const bookingsResponse = await apiRequest('bookings/my.php');
        
        console.log('Bookings API response:', bookingsResponse);
        
        if (!bookingsResponse.success) {
            // If bookings fail, still show properties count
            if (propertiesCountElem) propertiesCountElem.textContent = properties.length;
            if (activeBookingsElem) activeBookingsElem.textContent = '0';
            if (unreadMessagesElem) unreadMessagesElem.textContent = '0';
            return;
        }
        
        const bookings = bookingsResponse.data || [];
        const activeBookings = bookings.filter(b => b.status === 'approved');

        // Update stats
        if (propertiesCountElem) propertiesCountElem.textContent = properties.length;
        if (activeBookingsElem) activeBookingsElem.textContent = activeBookings.length;
        if (unreadMessagesElem) unreadMessagesElem.textContent = '0'; // Placeholder for now
        
    } catch (err) {
        console.error('Error loading dashboard stats:', err);
        
        // Check if it's an authentication error
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
            showNotificationFallback('Session expired. Please login again.', 'error');
            // Clear session and redirect to login
            sessionStorage.clear();
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        showNotificationFallback('Error loading dashboard statistics: ' + err.message, 'error');
        
        // Set default values on error
        const propertiesCount = document.getElementById('propertiesCount');
        const activeBookingsElem = document.getElementById('activeBookings');
        const unreadMessages = document.getElementById('unreadMessages');
        
        if (propertiesCount) propertiesCount.textContent = '0';
        if (activeBookingsElem) activeBookingsElem.textContent = '0';
        if (unreadMessages) unreadMessages.textContent = '0';
    }
}

async function loadRecentBookings() {
    try {
        const bookingList = document.getElementById('bookingList');
        if (bookingList) {
            bookingList.innerHTML = '<div class="loading">Loading bookings...</div>';
        }
        
        const response = await apiRequest('bookings/my.php');
        
        console.log('Bookings API response:', response);
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to load bookings');
        }
        
        displayBookings(response.data || []);
        
    } catch (err) {
        console.error('Error loading bookings:', err);
        const bookingList = document.getElementById('bookingList');
        if (bookingList) {
            bookingList.innerHTML = `
                <div class="error-message">
                    Error loading bookings: ${err.message}
                    <br><br>
                    <button onclick="loadRecentBookings()" class="btn-primary">Try Again</button>
                </div>
            `;
        }
    }
}

function displayBookings(bookings) {
    const bookingList = document.getElementById('bookingList');
    if (!bookingList) return;
    
    // Show only recent bookings (last 5)
    const recentBookings = bookings.slice(0, 5);
    
    if (recentBookings.length === 0) {
        bookingList.innerHTML = `
            <div class="no-bookings">
                <p>No recent bookings.</p>
            </div>
        `;
        return;
    }
    
    bookingList.innerHTML = '';
    
    recentBookings.forEach(booking => {
        const bookingCard = document.createElement('div');
        bookingCard.className = 'booking-card';
        bookingCard.innerHTML = `
            <h3>${booking.property_title || 'Unknown Property'}</h3>
            <p><strong>Tenant:</strong> ${booking.tenant_name || booking.guest_name || 'Guest'}</p>
            <p><strong>Dates:</strong> ${formatDate(booking.check_in)} to ${formatDate(booking.check_out)}</p>
            <p><strong>Total:</strong> R${booking.total_price || '0'}</p>
            <p><strong>Status:</strong> <span class="status ${booking.status ? booking.status.toLowerCase() : 'pending'}">${booking.status || 'pending'}</span></p>
            <div class="booking-actions">
                <button class="btn-primary" onclick="manageBooking(${booking.id})">Manage</button>
                ${booking.status === 'pending' ? 
                    `<button class="btn-success" onclick="approveBooking(${booking.id})">Approve</button>
                     <button class="btn-danger" onclick="rejectBooking(${booking.id})">Reject</button>` : ''}
            </div>
        `;
        bookingList.appendChild(bookingCard);
    });
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Use the logout function from config.js if available
            if (typeof window.setupLogout === 'function') {
                // This will be handled by config.js
                return;
            }
            
            // Fallback logout
            showNotificationFallback('Logging out...', 'info');
            sessionStorage.clear();
            // Clear cookies
            document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        });
    }
}

// Make functions globally available
window.loadDashboardStats = loadDashboardStats;
window.loadRecentBookings = loadRecentBookings;
window.manageBooking = manageBooking;
window.approveBooking = approveBooking;
window.rejectBooking = rejectBooking;

async function manageBooking(bookingId) {
    showNotificationFallback('Booking management feature coming soon!', 'info');
}

async function approveBooking(bookingId) {
    if (!confirm('Are you sure you want to approve this booking?')) {
        return;
    }
    
    try {
        const response = await apiRequest('bookings/update.php', {
            method: 'POST',
            body: JSON.stringify({
                booking_id: bookingId,
                status: 'approved'
            })
        });
        
        if (response.success) {
            showNotificationFallback('Booking approved successfully!', 'success');
            loadRecentBookings();
            loadDashboardStats(); // Refresh stats
        } else {
            throw new Error(response.error || 'Failed to approve booking');
        }
        
    } catch (err) {
        console.error('Error approving booking:', err);
        showNotificationFallback('Error approving booking: ' + err.message, 'error');
    }
}

async function rejectBooking(bookingId) {
    if (!confirm('Are you sure you want to reject this booking?')) {
        return;
    }
    
    try {
        const response = await apiRequest('bookings/update.php', {
            method: 'POST',
            body: JSON.stringify({
                booking_id: bookingId,
                status: 'rejected'
            })
        });
        
        if (response.success) {
            showNotificationFallback('Booking rejected successfully!', 'success');
            loadRecentBookings();
            loadDashboardStats(); // Refresh stats
        } else {
            throw new Error(response.error || 'Failed to reject booking');
        }
        
    } catch (err) {
        console.error('Error rejecting booking:', err);
        showNotificationFallback('Error rejecting booking: ' + err.message, 'error');
    }
}

// FIXED: Use a different function name to avoid recursion
function showNotificationFallback(message, type = 'info') {
    // Use the notification function from config.js if available
    if (typeof window.showNotification === 'function' && window.showNotification !== showNotificationFallback) {
        window.showNotification(message, type);
        return;
    }
    
    // Fallback notification - no recursion
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Create simple notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        font-weight: bold;
        max-width: 300px;
        background: ${getNotificationColor(type)};
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
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

// Alias for backward compatibility
window.showNotification = showNotificationFallback;
window.debugAuth = debugAuth;