//dashboard-main.js
// dashboard-main.js - Unified Tenant Dashboard Script
document.addEventListener('DOMContentLoaded', function() {
    initializeTenantDashboard();
});

function initializeTenantDashboard() {
    // Check authentication
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    if (!loggedInUser || userRole !== 'tenant') {
        alert('Please login as a tenant to access the dashboard.');
        window.location.href = 'login.html';
        return;
    }

    // Display user info
    const userName = sessionStorage.getItem('UserName') || 'Tenant';
    document.getElementById('userName').textContent = userName;

    // Load bookings
    loadBookingsSimple();
}

async function loadBookingsSimple() {
    try {
        const response = await fetch('http://localhost/UniStay---Website/backend/api/bookings/my.php', {
            credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            displayBookingsSimple(result.data);
        } else {
            showNoBookings();
        }
    } catch (error) {
        showNoBookings('Failed to load bookings. Please try again.');
    }
}

function displayBookingsSimple(bookings) {
    const bookingsList = document.getElementById('bookingsList');
    const noBookingsMessage = document.getElementById('noBookingsMessage');
    
    // Hide "no bookings" message
    if (noBookingsMessage) noBookingsMessage.style.display = 'none';
    
    console.log('🎯 Displaying bookings:', bookings);
    
    // Update stats
    const activeBookings = bookings.filter(b => ['pending', 'approved'].includes(b.status)).length;
    document.getElementById('activeBookingsCount').textContent = activeBookings;
    document.getElementById('totalBookingsCount').textContent = bookings.length;
    
    // Display bookings
    bookingsList.innerHTML = bookings.map(booking => {
        console.log('📋 Booking details:', booking);
        
        const roomDetails = booking.room_number ? 
            `<p style="margin: 5px 0;"><strong>🚪 Room:</strong> ${booking.room_number} (${booking.room_type})</p>` : 
            '';
        
        return `
        <div class="booking-card" style="border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 15px; background: white;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #2c3e50;">${booking.property_title}</h3>
                <span style="background: ${getStatusColor(booking.status)}; color: white; padding: 4px 12px; border-radius: 15px; font-size: 12px; font-weight: bold;">
                    ${booking.status.toUpperCase()}
                </span>
            </div>
            
            <div style="color: #666; margin-bottom: 15px;">
                <p style="margin: 5px 0;"><strong>Location:</strong> ${booking.property_city}, ${booking.property_address}</p>
                <p style="margin: 5px 0;"><strong>Dates:</strong> ${formatDateSimple(booking.check_in)} to ${formatDateSimple(booking.check_out)}</p>
                <p style="margin: 5px 0;"><strong>Total:</strong> R${parseFloat(booking.total_price).toFixed(2)}</p>
                <p style="margin: 5px 0;"><strong>Landlord:</strong> ${booking.landlord_name}</p>
                ${roomDetails}
                ${booking.special_requests ? `<p style="margin: 5px 0;"><strong>Special Requests:</strong> ${booking.special_requests}</p>` : ''}
            </div>
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="viewBooking(${booking.id})" style="background: #1a237e; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    View Details
                </button>
                ${booking.status === 'approved' ? `
                <button onclick="makePayment(${booking.id})" style="background: #ffc107; color: black; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    Pay Balance
                </button>
                ` : ''}
                ${['pending', 'approved'].includes(booking.status) ? `
                <button onclick="cancelBookingSimple(${booking.id})" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
                ` : ''}
            </div>
        </div>
        `;
    }).join('');
}

function getStatusColor(status) {
    const colors = {
        'pending': '#ffc107',
        'approved': '#28a745', 
        'completed': '#17a2b8',
        'cancelled': '#dc3545'
    };
    return colors[status] || '#6c757d';
}

function formatDateSimple(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US');
}

function showNoBookings(message = 'No bookings found.') {
    const bookingsList = document.getElementById('bookingsList');
    const noBookingsMessage = document.getElementById('noBookingsMessage');
    
    if (noBookingsMessage) {
        noBookingsMessage.style.display = 'block';
    }
    
    if (bookingsList) {
        bookingsList.innerHTML = '';
    }
}

function viewBooking(bookingId) {
    window.location.href = `booking-details.html?id=${bookingId}`;
}

function makePayment(bookingId) {
    window.location.href = `payment.html?booking_id=${bookingId}`;
}

async function cancelBookingSimple(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
        const response = await fetch('http://localhost/UniStay---Website/backend/api/bookings/update.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ booking_id: bookingId, status: 'cancelled' })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Booking cancelled successfully!');
            loadBookingsSimple(); // Reload
        } else {
            alert('Failed to cancel booking: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        alert('Error cancelling booking. Please try again.');
    }
}

// Make functions available globally
window.viewBooking = viewBooking;
window.makePayment = makePayment;
window.cancelBookingSimple = cancelBookingSimple;