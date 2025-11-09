// landlord-dashboard.js - Enhanced Version
document.addEventListener('DOMContentLoaded', function() {
    initializeLandlordDashboard();
});

function initializeLandlordDashboard() {
    console.log('🚀 Initializing landlord dashboard...');
    
    // Check authentication with enhanced validation
    if (!checkAuthAndRedirect('landlord')) {
        return;
    }

    console.log('✅ Authentication successful');
    
    // Display landlord name
    const landlordName = sessionStorage.getItem('UserName') || 'Landlord';
    const usernameElement = document.getElementById('landlordName');
    if (usernameElement) {
        usernameElement.textContent = landlordName;
    }

    // Set welcome message
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        const timeOfDay = getTimeOfDay();
        welcomeMessage.textContent = `Good ${timeOfDay}, ${landlordName}! Here's what's happening with your properties today.`;
    }

    // Load all dashboard data
    loadDashboardStats();
    loadRecentBookings();
    
    // Setup enhanced logout functionality
    setupEnhancedLogout();
}

// Enhanced authentication check (same as tenant dashboard)
function checkAuthAndRedirect(requiredRole = null) {
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    console.log('🔐 Auth check:', { loggedInUser, userRole, requiredRole });
    
    if (!loggedInUser) {
        showNotification('Please login to access the dashboard.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return false;
    }

    if (requiredRole && userRole !== requiredRole) {
        showNotification(`Access denied. This page is for ${requiredRole}s only.`, 'error');
        setTimeout(() => {
            // Redirect to appropriate dashboard
            if (userRole === 'tenant') {
                window.location.href = 'tenant-dashboard.html';
            } else if (userRole === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
        }, 2000);
        return false;
    }

    console.log('✅ Authentication successful');
    return true;
}

// Enhanced API request with retry logic
async function apiRequestWithRetry(endpoint, options = {}, retries = 3) {
    try {
        const response = await apiRequest(endpoint, options);
        return response;
    } catch (error) {
        if (retries > 0 && (error.message.includes('network') || error.message.includes('500'))) {
            console.log(`Retrying API request... ${retries} attempts left`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return apiRequestWithRetry(endpoint, options, retries - 1);
        }
        throw error;
    }
}

async function loadDashboardStats() {
    try {
        console.log('📊 Loading dashboard stats...');
        
        // Show loading state
        showStatsLoading();
        
        // Load properties data
        const propertiesResponse = await apiRequestWithRetry('properties/my.php');
        console.log('🏠 Properties response:', propertiesResponse);
        
        if (!propertiesResponse.success) {
            throw new Error(propertiesResponse.error || 'Failed to load properties');
        }
        
        const properties = propertiesResponse.data || [];
        
        // Load bookings data
        let bookings = [];
        let totalRevenue = 0;
        let pendingBookings = 0;
        
        try {
            const bookingsResponse = await apiRequestWithRetry('bookings/my.php');
            console.log('📋 Bookings response:', bookingsResponse);
            
            if (bookingsResponse.success) {
                bookings = bookingsResponse.data || [];
                
                // Calculate stats
                pendingBookings = bookings.filter(b => b.status === 'pending').length;
                totalRevenue = bookings
                    .filter(b => ['approved', 'completed'].includes(b.status))
                    .reduce((sum, booking) => sum + parseFloat(booking.total_price || 0), 0);
            }
        } catch (bookingsError) {
            console.warn('⚠️ Could not load bookings:', bookingsError);
            // Continue with properties data only
        }
        
        // Update the UI with actual data
        updateDashboardStats({
            totalProperties: properties.length,
            totalBookings: bookings.length,
            pendingBookings: pendingBookings,
            totalRevenue: totalRevenue
        });
        
        // Store data for later use
        window.dashboardData = {
            properties: properties,
            bookings: bookings,
            lastUpdated: new Date()
        };
        
    } catch (err) {
        console.error('❌ Error loading dashboard stats:', err);
        
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
            handleSessionExpired();
            return;
        }
        
        showNotification('Error loading dashboard statistics: ' + err.message, 'error');
        setDefaultStats();
    }
}

async function loadRecentBookings() {
    try {
        console.log('📥 Loading recent bookings...');
        
        const bookingList = document.getElementById('bookingsList');
        if (bookingList) {
            bookingList.innerHTML = `
                <div class="loading">
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <p>Loading recent bookings...</p>
                </div>
            `;
        }
        
        const response = await apiRequestWithRetry('bookings/my.php');
        console.log('📋 Recent bookings data:', response);
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to load bookings');
        }
        
        const bookings = response.data || [];
        displayBookings(bookings);
        
    } catch (err) {
        console.error('❌ Error loading bookings:', err);
        
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
            handleSessionExpired();
            return;
        }
        
        const bookingList = document.getElementById('bookingsList');
        if (bookingList) {
            bookingList.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <h3>Unable to Load Bookings</h3>
                    <p>${err.message}</p>
                    <div class="error-actions">
                        <button onclick="loadRecentBookings()" class="btn-primary">
                            🔄 Try Again
                        </button>
                        <button onclick="debugAuth()" class="btn-secondary">
                            🐛 Debug
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

async function loadProperties() {
    try {
        console.log('🏠 Loading properties...');
        
        const propertiesList = document.getElementById('propertiesList');
        if (propertiesList) {
            propertiesList.innerHTML = `
                <div class="loading">
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <p>Loading properties...</p>
                </div>
            `;
        }
        
        const response = await apiRequestWithRetry('properties/my.php');
        console.log('🏠 Properties data:', response);
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to load properties');
        }
        
        const properties = response.data || [];
        displayProperties(properties);
        
        // Mark as loaded
        window.propertiesLoaded = true;
        
    } catch (err) {
        console.error('❌ Error loading properties:', err);
        
        const propertiesList = document.getElementById('propertiesList');
        if (propertiesList) {
            propertiesList.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <h3>Unable to Load Properties</h3>
                    <p>${err.message}</p>
                    <button onclick="loadProperties()" class="btn-primary">
                        🔄 Try Again
                    </button>
                </div>
            `;
        }
    }
}

async function loadAnalytics() {
    try {
        console.log('📊 Loading analytics...');
        
        const analyticsContent = document.getElementById('analyticsContent');
        if (analyticsContent) {
            analyticsContent.innerHTML = `
                <div class="loading">
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <p>Loading analytics...</p>
                </div>
            `;
        }
        
        // Use existing data or load fresh
        const properties = window.dashboardData?.properties || [];
        const bookings = window.dashboardData?.bookings || [];
        
        displayAnalytics(properties, bookings);
        
        // Mark as loaded
        window.analyticsLoaded = true;
        
    } catch (err) {
        console.error('❌ Error loading analytics:', err);
        
        const analyticsContent = document.getElementById('analyticsContent');
        if (analyticsContent) {
            analyticsContent.innerHTML = `
                <div class="error-message">
                    <p>Error loading analytics: ${err.message}</p>
                    <button onclick="loadAnalytics()" class="btn-primary">
                        🔄 Try Again
                    </button>
                </div>
            `;
        }
    }
}

function displayBookings(bookings) {
    const bookingList = document.getElementById('bookingsList');
    if (!bookingList) return;
    
    console.log('🎯 Displaying bookings:', bookings);
    
    if (!bookings || bookings.length === 0) {
        bookingList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No Bookings Yet</h3>
                <p>When tenants book your properties, they'll appear here.</p>
                <p>Make sure your properties are listed and available for booking!</p>
                <button onclick="window.location.href='add-property.html'" class="btn btn-primary">
                    🏠 Add Your First Property
                </button>
            </div>
        `;
        return;
    }
    
    // Sort by creation date (newest first)
    const sortedBookings = bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Show only recent bookings (last 5)
    const recentBookings = sortedBookings.slice(0, 5);
    
    bookingList.innerHTML = '';
    
    recentBookings.forEach(booking => {
        const bookingCard = document.createElement('div');
        bookingCard.className = `booking-card status-${booking.status || 'pending'}`;
        bookingCard.innerHTML = `
            <div class="booking-header">
                <div class="property-info">
                    <h3 class="booking-title">${escapeHtml(booking.property_title || 'Unknown Property')}</h3>
                    <span class="booking-date">Booked on ${formatDate(booking.created_at)}</span>
                </div>
                <span class="status-badge status-${booking.status || 'pending'}">
                    ${getBookingStatusIcon(booking.status)} ${getBookingStatusText(booking.status)}
                </span>
            </div>
            
            <div class="booking-meta">
                <div class="meta-item">
                    <span>👤</span>
                    <span>${escapeHtml(booking.tenant_name || booking.guest_name || 'Guest')}</span>
                </div>
                <div class="meta-item">
                    <span>📧</span>
                    <span>${escapeHtml(booking.tenant_email || booking.guest_email || 'N/A')}</span>
                </div>
                <div class="meta-item">
                    <span>📞</span>
                    <span>${escapeHtml(booking.guest_phone || 'N/A')}</span>
                </div>
            </div>
            
            <div class="booking-dates">
                <div class="date-range">
                    <span>${formatDate(booking.check_in)}</span>
                    <span>→</span>
                    <span>${formatDate(booking.check_out)}</span>
                </div>
                <div class="duration">
                    ${booking.duration || 1} month${booking.duration !== 1 ? 's' : ''}
                </div>
            </div>
            
            <div class="booking-details">
                <div class="detail-row">
                    <span class="detail-label">Total Amount:</span>
                    <span class="detail-value amount">R${parseFloat(booking.total_price || 0).toFixed(2)}</span>
                </div>
                ${booking.special_requests ? `
                <div class="detail-row">
                    <span class="detail-label">Special Requests:</span>
                    <span class="detail-value">${escapeHtml(booking.special_requests)}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="action-buttons">
                <button class="btn-action btn-view" onclick="viewBookingDetails(${booking.id})">
                    View Details
                </button>
                ${booking.status === 'pending' ? `
                <button class="btn-action btn-approve" onclick="approveBooking(${booking.id})">
                    ✅ Approve
                </button>
                <button class="btn-action btn-reject" onclick="rejectBooking(${booking.id})">
                    ❌ Reject
                </button>
                ` : ''}
                ${booking.status === 'approved' ? `
                <button class="btn-action btn-success" onclick="completeBooking(${booking.id})">
                    Mark Completed
                </button>
                ` : ''}
                <button class="btn-action btn-contact" onclick="contactTenant('${escapeHtml(booking.tenant_email || booking.guest_email)}', '${escapeHtml(booking.tenant_name || booking.guest_name || 'Tenant')}')">
                    💬 Contact
                </button>
            </div>
        `;
        bookingList.appendChild(bookingCard);
    });
}

function displayProperties(properties) {
    const propertiesList = document.getElementById('propertiesList');
    if (!propertiesList) return;
    
    if (!properties || properties.length === 0) {
        propertiesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏠</div>
                <h3>No Properties Listed</h3>
                <p>Start by adding your first property to rent to students.</p>
                <button onclick="window.location.href='add-property.html'" class="btn btn-primary">
                    🏠 Add Your First Property
                </button>
            </div>
        `;
        return;
    }
    
    propertiesList.innerHTML = '';
    
    properties.forEach(property => {
        const propertyCard = document.createElement('div');
        propertyCard.className = 'property-card';
        propertyCard.innerHTML = `
            <div class="property-header">
                <div class="property-info">
                    <h3 class="property-title">${escapeHtml(property.title)}</h3>
                    <span class="property-location">📍 ${escapeHtml(property.city)}, ${escapeHtml(property.address)}</span>
                </div>
                <span class="status-badge status-${property.status || 'available'}">
                    ${property.status === 'available' ? '✅ Available' : 
                      property.status === 'fully_booked' ? '🏠 Fully Booked' : '⏳ Unavailable'}
                </span>
            </div>
            
            <div class="property-meta">
                <div class="meta-item">
                    <span>🏠</span>
                    <span>${escapeHtml(property.property_type || 'Apartment')}</span>
                </div>
                <div class="meta-item">
                    <span>🛏️</span>
                    <span>${property.total_rooms || 0} Total Rooms</span>
                </div>
                <div class="meta-item">
                    <span>✅</span>
                    <span>${property.available_rooms || 0} Available</span>
                </div>
            </div>
            
            <div class="property-stats">
                <div class="stat-item">
                    <span class="stat-label">Total Bookings:</span>
                    <span class="stat-value">${property.total_bookings || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Active Bookings:</span>
                    <span class="stat-value">${property.active_bookings || 0}</span>
                </div>
                ${property.price ? `
                <div class="stat-item">
                    <span class="stat-label">Price Range:</span>
                    <span class="stat-value">R${property.price}/month</span>
                </div>
                ` : ''}
            </div>
            
            <div class="action-buttons">
                <button class="btn-action btn-view" onclick="viewProperty(${property.id})">
                    View Details
                </button>
                <button class="btn-action btn-edit" onclick="editProperty(${property.id})">
                    Edit
                </button>
                <button class="btn-action btn-delete" onclick="deleteProperty(${property.id})">
                    Delete
                </button>
            </div>
        `;
        propertiesList.appendChild(propertyCard);
    });
}



function displayAnalytics(properties, bookings) {
    const analyticsContent = document.getElementById('analyticsContent');
    if (!analyticsContent) return;
    
    // Calculate analytics
    const totalProperties = properties.length;
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const approvedBookings = bookings.filter(b => b.status === 'approved').length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    
    const totalRevenue = bookings
        .filter(b => ['approved', 'completed'].includes(b.status))
        .reduce((sum, booking) => sum + parseFloat(booking.total_price || 0), 0);
    
    const occupancyRate = totalProperties > 0 ? 
        ((properties.filter(p => p.available_rooms < p.total_rooms).length / totalProperties) * 100).toFixed(1) : 0;
    
    analyticsContent.innerHTML = `
        <div class="analytics-grid">
            <div class="analytics-card">
                <h3>📈 Property Performance</h3>
                <div class="analytics-stats">
                    <div class="stat">
                        <span class="stat-label">Occupancy Rate</span>
                        <span class="stat-value">${occupancyRate}%</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Available Properties</span>
                        <span class="stat-value">${totalProperties}</span>
                    </div>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>📊 Booking Analytics</h3>
                <div class="analytics-stats">
                    <div class="stat">
                        <span class="stat-label">Total Bookings</span>
                        <span class="stat-value">${totalBookings}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Pending Approval</span>
                        <span class="stat-value">${pendingBookings}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Active Stays</span>
                        <span class="stat-value">${approvedBookings}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Completed</span>
                        <span class="stat-value">${completedBookings}</span>
                    </div>
                </div>
            </div>
            
            <div class="analytics-card">
                <h3>💰 Revenue Overview</h3>
                <div class="analytics-stats">
                    <div class="stat">
                        <span class="stat-label">Total Revenue</span>
                        <span class="stat-value">R${totalRevenue.toFixed(2)}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Average per Booking</span>
                        <span class="stat-value">R${totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : '0.00'}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="quick-tips">
            <h3>💡 Quick Tips</h3>
            <ul>
                <li>Keep your property listings updated with current photos</li>
                <li>Respond to booking requests within 24 hours</li>
                <li>Set competitive prices based on location and amenities</li>
                <li>Encourage tenants to leave reviews after their stay</li>
            </ul>
        </div>
    `;
}

// Enhanced logout function
function setupEnhancedLogout() {
    const logoutElements = document.querySelectorAll('[onclick="logout()"], #logoutBtn');
    logoutElements.forEach(element => {
        element.addEventListener('click', function(e) {
            e.preventDefault();
            enhancedLogout();
        });
    });
}

function enhancedLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear all session storage
        sessionStorage.clear();
        localStorage.removeItem('rememberMe');
        
        // Clear cookies
        document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'LoggedInUser=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        // Redirect to login
        window.location.href = 'login.html';
    }
}

// UTILITY FUNCTIONS (keep existing ones but ensure they're defined)
function showStatsLoading() {
    const stats = ['totalProperties', 'totalBookings', 'pendingBookings', 'totalRevenue'];
    stats.forEach(statId => {
        const elem = document.getElementById(statId);
        if (elem) {
            elem.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
        }
    });
}

function updateDashboardStats(stats) {
    // Animate number counting
    animateValue('totalProperties', 0, stats.totalProperties, 1000);
    animateValue('totalBookings', 0, stats.totalBookings, 1000);
    animateValue('pendingBookings', 0, stats.pendingBookings, 1000);
    
    // Update revenue
    const revenueElem = document.getElementById('totalRevenue');
    if (revenueElem) {
        revenueElem.textContent = `R${stats.totalRevenue.toFixed(2)}`;
    }
}

function animateValue(id, start, end, duration) {
    const element = document.getElementById(id);
    if (!element) return;
    
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = value;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function setDefaultStats() {
    const defaults = {
        totalProperties: 0,
        totalBookings: 0,
        pendingBookings: 0,
        totalRevenue: 'R0.00'
    };
    
    Object.keys(defaults).forEach(key => {
        const elem = document.getElementById(key);
        if (elem) elem.textContent = defaults[key];
    });
}

function getBookingStatusIcon(status) {
    const icons = {
        'pending': '⏳',
        'approved': '✅',
        'completed': '🏠',
        'cancelled': '❌',
        'rejected': '🚫'
    };
    return icons[status] || '📋';
}

function getBookingStatusText(status) {
    const statusMap = {
        'pending': 'PENDING APPROVAL',
        'approved': 'APPROVED', 
        'completed': 'COMPLETED',
        'cancelled': 'CANCELLED',
        'rejected': 'REJECTED'
    };
    return statusMap[status] || (status ? status.toUpperCase() : 'PENDING');
}

function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
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

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function handleSessionExpired() {
    console.error('🔐 Session expired - redirecting to login');
    showNotification('Your session has expired. Please login again.', 'error');
    sessionStorage.clear();
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}

// Enhanced notification system (same as tenant dashboard)
function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    // Remove any existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
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
        transform: translateX(400px);
        transition: transform 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    notification.innerHTML = `
        <span class="notification-icon">${getNotificationIcon(type)}</span>
        <span class="notification-message">${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
    
    // Click to dismiss
    notification.addEventListener('click', () => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => notification.remove(), 300);
    });
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

// BOOKING MANAGEMENT FUNCTIONS (keep existing ones)
async function approveBooking(bookingId) {
    if (!confirm('Are you sure you want to approve this booking?\n\nThis will confirm the booking and notify the tenant.')) return;
    
    try {
        showNotification('⏳ Approving booking...', 'info');
        
        const response = await apiRequestWithRetry('bookings/update.php', {
            method: 'POST',
            body: JSON.stringify({
                booking_id: bookingId,
                status: 'approved'
            })
        });
        
        if (response.success) {
            showNotification('✅ Booking approved successfully! Tenant has been notified.', 'success');
            // Refresh both bookings and stats
            await Promise.all([loadRecentBookings(), loadDashboardStats()]);
        } else {
            throw new Error(response.error || 'Failed to approve booking');
        }
        
    } catch (err) {
        console.error('Error approving booking:', err);
        showNotification('❌ Error approving booking: ' + err.message, 'error');
    }
}

async function rejectBooking(bookingId) {
    const reason = prompt('Please provide a reason for rejecting this booking:');
    if (reason === null) return; // User cancelled
    
    if (!confirm(`Are you sure you want to reject this booking?\n\nReason: ${reason}`)) {
        return;
    }
    
    try {
        showNotification('⏳ Rejecting booking...', 'info');
        
        const response = await apiRequestWithRetry('bookings/update.php', {
            method: 'POST',
            body: JSON.stringify({
                booking_id: bookingId,
                status: 'rejected',
                rejection_reason: reason
            })
        });
        
        if (response.success) {
            showNotification('✅ Booking rejected successfully! Tenant has been notified.', 'success');
            await Promise.all([loadRecentBookings(), loadDashboardStats()]);
        } else {
            throw new Error(response.error || 'Failed to reject booking');
        }
        
    } catch (err) {
        console.error('Error rejecting booking:', err);
        showNotification('❌ Error rejecting booking: ' + err.message, 'error');
    }
}

async function completeBooking(bookingId) {
    if (!confirm('Mark this booking as completed? This indicates the tenant has finished their stay.')) return;
    
    try {
        showNotification('⏳ Completing booking...', 'info');
        
        const response = await apiRequestWithRetry('bookings/update.php', {
            method: 'POST',
            body: JSON.stringify({
                booking_id: bookingId,
                status: 'completed'
            })
        });
        
        if (response.success) {
            showNotification('✅ Booking marked as completed!', 'success');
            await Promise.all([loadRecentBookings(), loadDashboardStats()]);
        } else {
            throw new Error(response.error || 'Failed to complete booking');
        }
        
    } catch (err) {
        console.error('Error completing booking:', err);
        showNotification('❌ Error completing booking: ' + err.message, 'error');
    }
}

function viewBookingDetails(bookingId) {
    window.location.href = `booking-details.html?id=${bookingId}`;
}

function contactTenant(email, name) {
    const subject = `Regarding your UniStay booking`;
    const body = `Hi ${name},\n\nI'm contacting you regarding your booking on UniStay.\n\nBest regards,\n${sessionStorage.getItem('UserName') || 'Landlord'}`;
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
}

// PROPERTY MANAGEMENT FUNCTIONS (keep existing ones)
function viewProperty(propertyId) {
    window.location.href = `property-details.html?id=${propertyId}`;
}

function editProperty(propertyId) {
    window.location.href = `edit-property.html?id=${propertyId}`;
}

async function deleteProperty(propertyId) {
    if (!confirm('Are you sure you want to delete this property?\n\nThis action cannot be undone.')) return;
    
    try {
        showNotification('Deleting property...', 'info');
        
        const response = await apiRequestWithRetry(`properties/delete.php?id=${propertyId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showNotification('✅ Property deleted successfully!', 'success');
            loadProperties();
            loadDashboardStats();
        } else {
            throw new Error(response.error || 'Failed to delete property');
        }
        
    } catch (err) {
        console.error('Error deleting property:', err);
        showNotification('❌ Error deleting property: ' + err.message, 'error');
    }
}

// DEBUG FUNCTION
function debugAuth() {
    console.log('🔐 Auth Debug Info:');
    console.log('LoggedInUser:', sessionStorage.getItem('LoggedInUser'));
    console.log('UserRole:', sessionStorage.getItem('UserRole'));
    console.log('UserName:', sessionStorage.getItem('UserName'));
    console.log('UserId:', sessionStorage.getItem('UserId'));
    console.log('Session Token:', getSessionToken() ? 'Present' : 'Missing');
    console.log('All sessionStorage:', { ...sessionStorage });
    
    showNotification('Check browser console for auth debug info', 'info');
}

function getSessionToken() {
    return sessionStorage.getItem('session_token') || 
           sessionStorage.getItem('LoggedInUserToken') || 
           document.cookie.match(/session_token=([^;]+)/)?.[1];
}

// Make functions globally available
window.loadDashboardStats = loadDashboardStats;
window.loadRecentBookings = loadRecentBookings;
window.loadProperties = loadProperties;
window.loadAnalytics = loadAnalytics;
window.approveBooking = approveBooking;
window.rejectBooking = rejectBooking;
window.completeBooking = completeBooking;
window.viewBookingDetails = viewBookingDetails;
window.contactTenant = contactTenant;
window.viewProperty = viewProperty;
window.editProperty = editProperty;
window.deleteProperty = deleteProperty;
window.debugAuth = debugAuth;
window.checkAuthAndRedirect = checkAuthAndRedirect;
window.apiRequestWithRetry = apiRequestWithRetry;
window.showNotification = showNotification;
window.enhancedLogout = enhancedLogout;