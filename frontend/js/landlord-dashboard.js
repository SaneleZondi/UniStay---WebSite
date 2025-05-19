// Landlord Dashboard Script
document.addEventListener('DOMContentLoaded', function() {
    // Get logged in user from session storage
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    // Check if user is logged in and is a landlord
    if (!loggedInUser || userRole !== 'landlord') {
        alert('Please login as a landlord to access this page.');
        window.location.href = 'login.html';
        return;
    }

    // Display username
    const usernameElement = document.getElementById('username');
    if (loggedInUser && usernameElement) {
        const userData = JSON.parse(localStorage.getItem(loggedInUser));
        usernameElement.textContent = userData.name || 'Landlord';
    }

    // Load dashboard stats
    loadDashboardStats();

    // Load recent bookings
    loadRecentBookings();

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

function loadDashboardStats() {
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    
    // Get all properties
    const properties = JSON.parse(localStorage.getItem('properties') || [];
    const landlordProperties = properties.filter(p => p.landlordEmail === loggedInUser);
    
    // Get all bookings
    const bookings = JSON.parse(localStorage.getItem('bookings') || [];
    const propertyIds = landlordProperties.map(p => p.id);
    const landlordBookings = bookings.filter(b => propertyIds.includes(b.propertyId));
    const activeBookings = landlordBookings.filter(b => b.status === 'Confirmed');

    // Update stats
    document.getElementById('propertiesCount').textContent = landlordProperties.length;
    document.getElementById('activeBookings').textContent = activeBookings.length;
    
    // For messages, you would typically fetch from an API
    document.getElementById('unreadMessages').textContent = '0'; // Placeholder
}

function loadRecentBookings() {
    const bookingList = document.getElementById('bookingList');
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    
    // Get all properties belonging to this landlord
    const properties = JSON.parse(localStorage.getItem('properties') || [])
        .filter(p => p.landlordEmail === loggedInUser);
    const propertyIds = properties.map(p => p.id);
    
    // Get bookings for these properties
    const bookings = JSON.parse(localStorage.getItem('bookings') || [])
        .filter(b => propertyIds.includes(b.propertyId))
        .sort((a, b) => new Date(b.bookingDate) - new Date(a.bookingDate))
        .slice(0, 3); // Get 3 most recent

    if (bookings.length === 0) {
        return; // Keep the "no bookings" message
    }

    bookingList.innerHTML = '';

    bookings.forEach(booking => {
        const property = properties.find(p => p.id === booking.propertyId);
        const bookingCard = document.createElement('div');
        bookingCard.className = 'booking-card';
        bookingCard.innerHTML = `
            <h3>${property ? property.title : 'Property'}</h3>
            <p><strong>Tenant:</strong> ${booking.tenantName}</p>
            <p><strong>Dates:</strong> ${booking.checkIn} to ${booking.checkOut}</p>
            <p><strong>Total:</strong> R${booking.totalPrice}</p>
            <p><strong>Status:</strong> <span class="status ${booking.status.toLowerCase()}">${booking.status}</span></p>
            <div class="booking-actions">
                <button class="btn-primary" onclick="viewBooking('${booking.id}')">Manage</button>
            </div>
        `;
        bookingList.appendChild(bookingCard);
    });
}

// These would be implemented in your main application JS
function viewBooking(bookingId) {
    // Implement booking management view
    console.log('Manage booking:', bookingId);
    // window.location.href = `manage-booking.html?id=${bookingId}`;
}