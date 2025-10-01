// Tenant Dashboard Script - Fixed version
document.addEventListener('DOMContentLoaded', function() {
    // Check profile completion first
    enforceProfileCompletion();
    
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    const userName = sessionStorage.getItem('UserName');
    
    // Check if user is logged in and is a tenant
    if (!loggedInUser || userRole !== 'tenant') {
        showNotification('Please login as a tenant to access this page.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    // Update navigation profile indicator
    updateNavigationProfile();

    // Display username and profile
    displayUserProfile(loggedInUser, userName);

    // Load tenant bookings
    loadTenantBookings();
});

function displayUserProfile(email, userName) {
    const usernameElement = document.getElementById('username');
    if (usernameElement) {
        usernameElement.textContent = userName || 'Tenant';
    }
}

async function loadTenantBookings() {
    try {
        console.log('Loading tenant bookings...');
        
        const response = await apiRequest('bookings/my.php');
        
        if (response.success) {
            displayBookings(response.data || []);
        } else {
            throw new Error(response.error || 'Failed to load bookings');
        }
        
    } catch (err) {
        console.error('Error loading bookings:', err);
        const bookingList = document.getElementById('bookingList');
        if (bookingList) {
            bookingList.innerHTML = `
                <div class="error-message">
                    <h3>Unable to Load Bookings</h3>
                    <p>${err.message}</p>
                    <div class="action-buttons">
                        <button onclick="loadTenantBookings()" class="btn-primary">Try Again</button>
                        <button onclick="window.location.href='properties.html'" class="btn-secondary">Browse Properties</button>
                    </div>
                </div>
            `;
        }
    }
}

function displayBookings(bookings) {
    const bookingList = document.getElementById('bookingList');
    const noBookingsMessage = document.getElementById('noBookingsMessage');
    
    if (!bookingList) return;
    
    if (bookings.length === 0) {
        if (noBookingsMessage) noBookingsMessage.style.display = 'block';
        bookingList.innerHTML = '';
        return;
    }
    
    if (noBookingsMessage) noBookingsMessage.style.display = 'none';
    bookingList.innerHTML = '';
    
    bookings.forEach(booking => {
        const bookingCard = document.createElement('div');
        bookingCard.className = 'booking-card';
        
        // Check if booking can be reviewed
        const canReview = booking.status === 'completed' && !booking.has_review;
        const reviewButton = canReview ? 
            `<button class="btn-success" onclick="showReviewForm(${booking.id}, '${escapeHtml(booking.property_title)}')">Write Review</button>` : '';
        
        const hasReview = booking.has_review ? '<span class="review-badge">✓ Reviewed</span>' : '';
        
        const paymentButton = booking.status === 'approved' ? 
            `<button class="btn-warning" onclick="makePayment(${booking.id})">Pay Deposit</button>` : '';
            
        const cancelButton = booking.status === 'pending' ? 
            `<button class="btn-secondary" onclick="cancelBooking(${booking.id})">Cancel</button>` : '';
        
        bookingCard.innerHTML = `
            <h3>${escapeHtml(booking.property_title)} ${hasReview}</h3>
            <p><strong>Location:</strong> ${escapeHtml(booking.property_city)}</p>
            <p><strong>Dates:</strong> ${formatDate(booking.check_in)} to ${formatDate(booking.check_out)}</p>
            <p><strong>Total:</strong> R${booking.total_price || '0'}</p>
            <p><strong>Deposit Due:</strong> R${booking.deposit_amount || '0'}</p>
            <p><strong>Status:</strong> <span class="status ${booking.status_class}">${booking.status}</span></p>
            <p><strong>Landlord:</strong> ${escapeHtml(booking.landlord_name)}</p>
            <div class="booking-actions">
                <button class="btn-primary" onclick="viewBooking(${booking.id})">View Details</button>
                ${cancelButton}
                ${paymentButton}
                ${reviewButton}
            </div>
        `;
        bookingList.appendChild(bookingCard);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

function viewBooking(bookingId) {
    window.location.href = `booking-details.html?id=${bookingId}`;
}

function makePayment(bookingId) {
    window.location.href = `payment.html?booking_id=${bookingId}`;
}

function showReviewForm(bookingId, propertyTitle) {
    const modalHtml = `
        <div class="modal" id="reviewModal" style="display: block;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Write Review for ${propertyTitle}</h3>
                    <span class="close" onclick="closeReviewModal()">&times;</span>
                </div>
                <form id="reviewForm">
                    <input type="hidden" name="booking_id" value="${bookingId}">
                    
                    <div class="form-group">
                        <label>Rating</label>
                        <div class="star-rating">
                            ${[1,2,3,4,5].map(i => `
                                <span class="star" data-rating="${i}" onmouseover="highlightStars(${i})" 
                                      onclick="setRating(${i})">★</span>
                            `).join('')}
                        </div>
                        <input type="hidden" name="rating" id="ratingValue" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Review Comment</label>
                        <textarea name="comment" rows="4" placeholder="Share your experience..."></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" onclick="closeReviewModal()">Cancel</button>
                        <button type="submit">Submit Review</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to page
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Setup form submission
    document.getElementById('reviewForm').addEventListener('submit', submitReview);
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        if (parseInt(star.dataset.rating) <= rating) {
            star.style.color = '#ffc107';
        } else {
            star.style.color = '#ccc';
        }
    });
}

function setRating(rating) {
    document.getElementById('ratingValue').value = rating;
    highlightStars(rating);
}

async function submitReview(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const reviewData = {
        booking_id: formData.get('booking_id'),
        rating: parseInt(formData.get('rating')),
        comment: formData.get('comment')
    };
    
    try {
        const response = await fetch('http://localhost/UniStay---Website/backend/api/reviews/create.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reviewData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Review submitted successfully!', 'success');
            closeReviewModal();
            loadTenantBookings(); // Reload to update UI
        } else {
            throw new Error(result.error);
        }
        
    } catch (err) {
        showNotification('Error submitting review: ' + err.message, 'error');
    }
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.remove();
    }
}

async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }
    
    try {
        const response = await apiRequest('bookings/update.php', {
            method: 'POST',
            body: JSON.stringify({
                booking_id: bookingId,
                status: 'cancelled'
            })
        });
        
        if (response.success) {
            showNotification('Booking cancelled successfully!', 'success');
            loadTenantBookings(); // Reload bookings
        } else {
            throw new Error(response.error || 'Failed to cancel booking');
        }
        
    } catch (err) {
        console.error('Error cancelling booking:', err);
        showNotification('Error cancelling booking: ' + err.message, 'error');
    }
}

// Make functions globally available
window.loadTenantBookings = loadTenantBookings;
window.viewBooking = viewBooking;
window.makePayment = makePayment;
window.showReviewForm = showReviewForm;
window.cancelBooking = cancelBooking;