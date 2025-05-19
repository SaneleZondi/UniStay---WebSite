// Tenant Dashboard Script
document.addEventListener('DOMContentLoaded', function() {
    // Get logged in user from session storage
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    // Check if user is logged in and is a tenant
    if (!loggedInUser || userRole !== 'tenant') {
        alert('Please login as a tenant to access this page.');
        window.location.href = 'login.html';
        return;
    }

    // Display username
    const usernameElement = document.getElementById('username');
    if (loggedInUser && usernameElement) {
        const userData = JSON.parse(localStorage.getItem(loggedInUser));
        usernameElement.textContent = userData.name || 'Student';
    }

    // Load bookings
    loadBookings();

    // Load saved properties
    loadSavedProperties();

    // Logout button functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            sessionStorage.removeItem('LoggedInUser');
            sessionStorage.removeItem('UserRole');
            window.location.href = 'index.html';
        });
    }
});

function loadBookings() {
    const bookingList = document.getElementById('bookingList');
    const noBookingsMessage = document.getElementById('noBookingsMessage');
    
    // In a real app, you would fetch this from an API
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]')
        .filter(booking => booking.tenantEmail === sessionStorage.getItem('LoggedInUser'));

    if (bookings.length === 0) {
        noBookingsMessage.style.display = 'block';
        return;
    }

    noBookingsMessage.style.display = 'none';
    bookingList.innerHTML = '';

    bookings.forEach(booking => {
        const bookingCard = document.createElement('div');
        bookingCard.className = 'booking-card';
        bookingCard.innerHTML = `
            <h3>${booking.propertyTitle}</h3>
            <p><strong>Location:</strong> ${booking.propertyLocation}</p>
            <p><strong>Dates:</strong> ${booking.checkIn} to ${booking.checkOut}</p>
            <p><strong>Total:</strong> R${booking.totalPrice}</p>
            <p><strong>Status:</strong> <span class="status ${booking.status.toLowerCase()}">${booking.status}</span></p>
            <button class="btn-secondary" onclick="viewBookingDetails('${booking.id}')">View Details</button>
        `;
        bookingList.appendChild(bookingCard);
    });
}

