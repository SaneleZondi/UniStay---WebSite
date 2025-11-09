// tenant-dashboard.js - Simplified Version (No Payment Balance)
document.addEventListener('DOMContentLoaded', function() {
    initializeTenantDashboard();
});

function initializeTenantDashboard() {
    console.log('🚀 Initializing tenant dashboard...');
    
    // Check authentication
    if (!checkAuthAndRedirect('tenant')) {
        return;
    }

    console.log('✅ Authentication successful');
    
    // Display tenant name
    const tenantName = sessionStorage.getItem('UserName') || 'Student';
    const usernameElement = document.getElementById('userName');
    if (usernameElement) {
        usernameElement.textContent = tenantName;
    }

    // Load dashboard data
    loadDashboardStats();
    loadRecentBookings();
    setupReviewFormHandler();
	setupCommentValidation();
    // Setup logout functionality
    setupEnhancedLogout();
}

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
            if (userRole === 'landlord') {
                window.location.href = 'landlord-dashboard.html';
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

async function loadDashboardStats() {
    try {
        console.log('📊 Loading dashboard stats...');
        
        const response = await apiRequest('bookings/my.php');
        
        if (response.success) {
            const bookings = response.data || [];
            
            const activeBookings = bookings.filter(b => 
                ['pending', 'approved'].includes(b.status)
            ).length;
            
            const completedBookings = bookings.filter(b => 
                b.status === 'completed'
            ).length;
            
            // Update stats without payment info
            document.getElementById('activeBookingsCount').textContent = activeBookings;
            document.getElementById('totalBookingsCount').textContent = bookings.length;
            document.getElementById('completedBookingsCount').textContent = completedBookings;
            
        } else {
            throw new Error(response.error || 'Failed to load bookings');
        }
        
    } catch (err) {
        console.error('Error loading dashboard stats:', err);
        // Set default values
        document.getElementById('activeBookingsCount').textContent = 0;
        document.getElementById('totalBookingsCount').textContent = 0;
        document.getElementById('completedBookingsCount').textContent = 0;
    }
}

async function loadRecentBookings() {
    try {
        console.log('📥 Loading recent bookings...');
        
        const bookingList = document.getElementById('bookingsList');
        if (bookingList) {
            bookingList.innerHTML = `
                <div class="loading">
                    <div class="loading-spinner">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <p>Loading your bookings...</p>
                </div>
            `;
        }
        
        const response = await apiRequest('bookings/my.php');
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
                        <button onclick="loadRecentBookings()" class="btn btn-primary">
                            🔄 Try Again
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

function displayBookings(bookings) {
    const bookingsList = document.getElementById('bookingsList');
    if (!bookingsList) return;
    
    console.log('🎯 Displaying bookings:', bookings);
    
    if (!bookings || bookings.length === 0) {
        bookingsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>No bookings yet</h3>
                <p>Start by exploring available properties near your campus</p>
                <a href="properties.html" class="btn btn-primary">Browse Properties</a>
            </div>
        `;
        return;
    }
    
    bookingsList.innerHTML = '';
    
    // Sort bookings by status and date
    const sortedBookings = bookings.sort((a, b) => {
        // Show pending first, then approved, then completed
        const statusOrder = { 'pending': 1, 'approved': 2, 'completed': 3, 'cancelled': 4 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        // Then by check-in date (soonest first)
        return new Date(a.check_in) - new Date(b.check_in);
    });
    
    sortedBookings.forEach(booking => {
        const bookingCard = document.createElement('div');
        bookingCard.className = 'booking-card';
        bookingCard.innerHTML = `
            <div class="booking-header">
                <div class="booking-info">
                    <h3 class="booking-title">${escapeHtml(booking.property_title || 'Property')}</h3>
                    <p class="booking-location">📍 ${escapeHtml(booking.property_city || '')}, ${escapeHtml(booking.property_address || '')}</p>
                </div>
                <span class="status-badge status-${booking.status || 'pending'}">
                    ${getBookingStatusIcon(booking.status)} ${getBookingStatusText(booking.status)}
                </span>
            </div>
            
            <div class="booking-meta">
                <div class="meta-item">
                    <span>👤</span>
                    <span>Landlord: ${escapeHtml(booking.landlord_name || 'N/A')}</span>
                </div>
                <div class="meta-item">
                    <span>📅</span>
                    <span>${formatDate(booking.check_in)} - ${formatDate(booking.check_out)}</span>
                </div>
                <div class="meta-item">
                    <span>💰</span>
                    <span>R${parseFloat(booking.total_price || 0).toFixed(2)}</span>
                </div>
            </div>
            
            <div class="booking-details">
                <div class="detail-row">
                    <span class="detail-label">Duration:</span>
                    <span class="detail-value">${calculateDuration(booking.check_in, booking.check_out)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Booking Date:</span>
                    <span class="detail-value">${formatDate(booking.created_at)}</span>
                </div>
                ${booking.special_requests ? `
                <div class="detail-row">
                    <span class="detail-label">Your Requests:</span>
                    <span class="detail-value">${escapeHtml(booking.special_requests)}</span>
                </div>
                ` : ''}
                
                <!-- ✅ UPDATED STATUS MESSAGES -->
                ${booking.status === 'pending' ? `
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value" style="color: #f39c12; font-style: italic;">
                        ⏳ Waiting for landlord approval
                    </span>
                </div>
                ` : ''}
                
                ${booking.status === 'approved' && !booking.has_review ? `
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value" style="color: #27ae60; font-style: italic;">
                        ✅ Approved! Ready for review
                    </span>
                </div>
                ` : ''}
                
                ${booking.status === 'approved' && booking.has_review ? `
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value" style="color: #27ae60; font-style: italic;">
                        ⭐ You've reviewed this booking
                    </span>
                </div>
                ` : ''}
                
                ${booking.status === 'completed' && !booking.has_review ? `
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value" style="color: #3498db; font-style: italic;">
                        🏠 Stay completed - Ready for review!
                    </span>
                </div>
                ` : ''}
                
                ${booking.status === 'completed' && booking.has_review ? `
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-value" style="color: #27ae60; font-style: italic;">
                        ⭐ You've reviewed this stay
                    </span>
                </div>
                ` : ''}
            </div>
            
            <div class="action-buttons">
                <button class="btn-action btn-view" onclick="viewBookingDetails(${booking.id})">
                    👁️ View Details
                </button>
                
                <!-- ✅ UPDATED: Show review button for BOTH approved AND completed bookings without review -->
                ${(booking.status === 'approved' || booking.status === 'completed') && !booking.has_review ? `
                <button class="btn-action btn-review" onclick="openReviewModal(${booking.id}, '${escapeHtml(booking.property_title)}')">
                    ⭐ Leave Review
                </button>
                ` : ''}
                
                ${booking.status === 'approved' ? `
                <button class="btn-action btn-contact" onclick="contactLandlord(${booking.landlord_id}, '${escapeHtml(booking.landlord_name)}')">
                    💬 Contact Landlord
                </button>
                ` : ''}
                
                ${(booking.status === 'pending' || booking.status === 'approved') ? `
                <button class="btn-action btn-cancel" onclick="cancelBooking(${booking.id})">
                    ❌ Cancel
                </button>
                ` : ''}
            </div>
        `;
        bookingsList.appendChild(bookingCard);
    });
}

// Utility Functions
function calculateDuration(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 'N/A';
    try {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        return `${months} month${months !== 1 ? 's' : ''}`;
    } catch (e) {
        return 'N/A';
    }
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

// Action Functions
function viewBookingDetails(bookingId) {
    window.location.href = `booking-details.html?id=${bookingId}`;
}

function contactLandlord(landlordId, landlordName) {
    showNotification(`Opening conversation with ${landlordName}...`, 'info');
    window.location.href = `messages.html?landlord_id=${landlordId}`;
}

async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?\n\nYou may be subject to cancellation fees depending on the landlord\'s policy.')) {
        return;
    }
    
    try {
        showNotification('⏳ Cancelling booking...', 'info');
        
        const response = await apiRequest('bookings/update.php', {
            method: 'POST',
            body: JSON.stringify({
                booking_id: bookingId,
                status: 'cancelled'
            })
        });
        
        if (response.success) {
            showNotification('✅ Booking cancelled successfully!', 'success');
            loadRecentBookings();
            loadDashboardStats();
        } else {
            throw new Error(response.error || 'Failed to cancel booking');
        }
        
    } catch (err) {
        console.error('Error cancelling booking:', err);
        showNotification('❌ Error cancelling booking: ' + err.message, 'error');
    }
}
function setupCommentValidation() {
    const commentField = document.getElementById('reviewComment');
    if (commentField) {
        commentField.addEventListener('input', function() {
            const errorElement = document.getElementById('commentError');
            if (this.value.length > 0 && this.value.length < 10) {
                errorElement.textContent = `Minimum 10 characters required (${this.value.length}/10)`;
                errorElement.style.display = 'block';
            } else {
                errorElement.style.display = 'none';
            }
        });
    }
}
// Review Modal Functions
function openReviewModal(bookingId, propertyTitle) {
    document.getElementById('reviewBookingId').value = bookingId;
    document.getElementById('reviewPropertyTitle').textContent = propertyTitle;
    document.getElementById('reviewModal').style.display = 'flex';
    document.getElementById('reviewForm').reset();
    document.getElementById('ratingValue').value = '0'; 
    initializeStarRating();
	
	updateReviewModalDescription(bookingId, propertyTitle);
	
	 const modalDescription = document.querySelector('#reviewModal .modal-content p');
    if (modalDescription) {
        modalDescription.innerHTML = `<strong>Property:</strong> ${propertyTitle}<br>
        <em>Share your experience about your completed stay</em>`;
    }
}

function updateReviewModalDescription(bookingId, propertyTitle) {
    const modalDescription = document.querySelector('#reviewModal .modal-content p');
    if (!modalDescription) return;
    
    // Try to get the current booking status from the displayed bookings
    const bookingCards = document.querySelectorAll('.booking-card');
    let bookingStatus = 'approved'; // Default
    
    bookingCards.forEach(card => {
        const reviewBtn = card.querySelector('.btn-review');
        if (reviewBtn && reviewBtn.onclick && reviewBtn.onclick.toString().includes(bookingId)) {
            const statusBadge = card.querySelector('.status-badge');
            if (statusBadge) {
                const statusClass = statusBadge.className;
                if (statusClass.includes('status-approved')) {
                    bookingStatus = 'approved';
                } else if (statusClass.includes('status-completed')) {
                    bookingStatus = 'completed';
                }
            }
        }
    });
    
    if (bookingStatus === 'approved') {
        modalDescription.innerHTML = `<strong>Property:</strong> ${propertyTitle}<br>
        <em>Share your initial thoughts about this approved booking</em>`;
    } else if (bookingStatus === 'completed') {
        modalDescription.innerHTML = `<strong>Property:</strong> ${propertyTitle}<br>
        <em>Share your experience about your completed stay</em>`;
    } else {
        modalDescription.innerHTML = `<strong>Property:</strong> ${propertyTitle}`;
    }
}

// Add this function to handle review form submission
function setupReviewFormHandler() {
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmission);
    }
}

async function handleReviewSubmission(e) {
    e.preventDefault();
    
    const bookingId = document.getElementById('reviewBookingId').value;
    const rating = document.getElementById('ratingValue').value;
    const comment = document.getElementById('reviewComment').value.trim();
    
    // Validation
    if (!rating || rating === '0') {
        showNotification('Please select a rating', 'error');
        return;
    }
    
    if (!comment || comment.length < 10) {
        showNotification('Please write a review of at least 10 characters', 'error');
        return;
    }
    
    try {
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        const response = await apiRequest('reviews/create.php', {
            method: 'POST',
            body: JSON.stringify({
                booking_id: parseInt(bookingId),
                rating: parseInt(rating),
                comment: comment
            })
        });
        
        if (response.success) {
            showNotification('✅ Review submitted successfully!', 'success');
            closeReviewModal();
            // Refresh bookings to update the UI (remove review button)
            loadRecentBookings();
            loadDashboardStats();
        } else {
            throw new Error(response.error || 'Failed to submit review');
        }
        
    } catch (err) {
        console.error('Error submitting review:', err);
        showNotification('❌ Error: ' + err.message, 'error');
    } finally {
        // Reset button state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Submit Review';
            submitBtn.disabled = false;
        }
    }
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
    document.getElementById('reviewForm').reset();
}

function initializeStarRating() {
    const starContainer = document.getElementById('starRating');
    starContainer.innerHTML = '';
    
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.innerHTML = '☆';
        star.style.cssText = 'font-size: 2rem; cursor: pointer; color: #ccc; transition: color 0.2s;';
        star.onclick = () => setRating(i);
        star.onmouseover = () => highlightStars(i);
        starContainer.appendChild(star);
    }
    
    // Reset hover effect when mouse leaves
    starContainer.onmouseleave = resetStars;
}

function setRating(rating) {
    document.getElementById('ratingValue').value = rating;
    highlightStars(rating);
}

function highlightStars(count) {
    const stars = document.getElementById('starRating').children;
    for (let i = 0; i < stars.length; i++) {
        stars[i].innerHTML = i < count ? '★' : '☆';
        stars[i].style.color = i < count ? '#ffd700' : '#ccc';
    }
}

function resetStars() {
    const currentRating = document.getElementById('ratingValue').value || 0;
    highlightStars(currentRating);
}

// Enhanced logout function
function setupEnhancedLogout() {
    const logoutElements = document.querySelectorAll('[onclick="logout()"]');
    logoutElements.forEach(element => {
        element.addEventListener('click', function(e) {
            e.preventDefault();
            enhancedLogout();
        });
    });
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

function handleSessionExpired() {
    console.error('🔐 Session expired - redirecting to login');
    showNotification('Your session has expired. Please login again.', 'error');
    sessionStorage.clear();
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
}

function refreshBookings() {
    loadRecentBookings();
    loadDashboardStats();
    showNotification('Bookings refreshed!', 'success');
}

// Notification function
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

// Make functions globally available
window.loadDashboardStats = loadDashboardStats;
window.loadRecentBookings = loadRecentBookings;
window.viewBookingDetails = viewBookingDetails;
window.contactLandlord = contactLandlord;
window.cancelBooking = cancelBooking;
window.openReviewModal = openReviewModal;
window.closeReviewModal = closeReviewModal;
window.refreshBookings = refreshBookings;
window.checkAuthAndRedirect = checkAuthAndRedirect;
window.showNotification = showNotification;
window.enhancedLogout = enhancedLogout;
window.setupReviewFormHandler = setupReviewFormHandler;
window.handleReviewSubmission = handleReviewSubmission;