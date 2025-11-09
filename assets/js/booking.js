// booking.js - Clean Room Booking System
document.addEventListener('DOMContentLoaded', function() {
    console.log('Booking Page Initialized');
    initializeBookingPage();
});

let currentRoom = null;
let currentProperty = null;
let isGuestBooking = false;

function getSessionToken() {
    return sessionStorage.getItem('session_token') || 
           sessionStorage.getItem('LoggedInUserToken') || 
           document.cookie.match(/session_token=([^;]+)/)?.[1];
}

function initializeBookingPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room_id');
    
    console.log('Room ID from URL:', roomId);
    
    if (!roomId) {
        showNotification('No room selected for booking. Please select a room first.', 'error');
        setTimeout(() => window.location.href = 'properties.html', 3000);
        return;
    }

    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    if (!loggedInUser || userRole !== 'tenant') {
        isGuestBooking = true;
        document.getElementById('contactInfoSection').style.display = 'block';
    } else {
        prefillUserInfo();
    }

    updateDashboardLink(loggedInUser, userRole);
    loadRoomDetails(roomId);
    setupEventListeners();
    setMinCheckInDate();
}

function updateDashboardLink(loggedInUser, userRole) {
    const dashboardLink = document.getElementById('dashboardLink');
    if (loggedInUser && userRole === 'tenant') {
        dashboardLink.style.display = 'inline';
    }
}

async function prefillUserInfo() {
    try {
        const userName = sessionStorage.getItem('UserName');
        const userEmail = sessionStorage.getItem('LoggedInUser');
        let userPhone = sessionStorage.getItem('UserPhone');
        
        if (!userPhone) {
            userPhone = await fetchUserPhone();
        }
        
        if (userName) document.getElementById('guest_name').value = userName;
        if (userEmail) document.getElementById('guest_email').value = userEmail;
        if (userPhone) {
            document.getElementById('guest_phone').value = userPhone;
        } else {
            document.getElementById('guest_phone').required = true;
            document.querySelector('label[for="guest_phone"]').innerHTML = 'Phone Number *';
        }
        
    } catch (error) {
        console.error('Error prefilling user info:', error);
    }
}

async function fetchUserPhone() {
    try {
        const response = await apiRequest('users/profile.php');
        if (response.success && response.user?.phone) {
            sessionStorage.setItem('UserPhone', response.user.phone);
            return response.user.phone;
        }
        return null;
    } catch (error) {
        console.error('Error fetching user phone:', error);
        return null;
    }
}

function setMinCheckInDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    
    document.getElementById('check_in').min = minDate;
    
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    document.getElementById('check_in').value = defaultDate.toISOString().split('T')[0];
}

function setupEventListeners() {
    document.getElementById('duration').addEventListener('change', function() {
        if (this.value === 'custom') {
            document.getElementById('customMonthsGroup').style.display = 'block';
            document.getElementById('custom_months').focus();
        } else {
            document.getElementById('customMonthsGroup').style.display = 'none';
        }
        calculatePrice();
    });
    
    document.getElementById('custom_months').addEventListener('input', calculatePrice);
    document.getElementById('check_in').addEventListener('change', calculatePrice);
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmission);
}

async function loadRoomDetails(roomId) {
    try {
        const roomResponse = await apiRequest('properties/rooms.php?room_id=' + roomId);
        
        if (!roomResponse.success || !roomResponse.room) {
            throw new Error(roomResponse.error || 'Failed to load room details');
        }
        
        currentRoom = roomResponse.room;
        await loadPropertyDetails(currentRoom.property_id);
        
    } catch (err) {
        console.error('Error loading room:', err);
        
        document.getElementById('propertySummary').innerHTML = 
            '<div class="error-message">' +
            '<h3>Error Loading Room</h3>' +
            '<p>' + err.message + '</p>' +
            '<div class="action-buttons">' +
            '<a href="properties.html" class="btn-primary">Back to Properties</a>' +
            '<button onclick="loadRoomDetails(' + roomId + ')" class="btn-secondary">Try Again</button>' +
            '</div>' +
            '</div>';
        
        document.getElementById('confirmBtn').disabled = true;
        document.getElementById('confirmBtn').textContent = 'Room Not Available';
    }
}

async function loadPropertyDetails(propertyId) {
    try {
        const response = await apiRequest('properties/read.php?id=' + propertyId);
        
        if (!response.success || !response.property) {
            throw new Error(response.error || 'Failed to load property details');
        }
        
        currentProperty = response.property;
        displayPropertyAndRoomDetails(currentProperty, currentRoom);
        calculatePrice();
        
    } catch (err) {
        console.error('Error loading property:', err);
        throw err;
    }
}

function displayPropertyAndRoomDetails(property, room) {
    document.getElementById('propertyId').value = property.id;
    
    let roomIdField = document.getElementById('roomId');
    if (!roomIdField) {
        roomIdField = document.createElement('input');
        roomIdField.type = 'hidden';
        roomIdField.id = 'roomId';
        roomIdField.name = 'room_id';
        document.getElementById('bookingForm').appendChild(roomIdField);
    }
    roomIdField.value = room.id;
    
    document.getElementById('propertyTitle').textContent = property.title + ' - Room ' + room.room_number;
    document.getElementById('propertyLocation').textContent = property.city + ', ' + property.address;
    document.getElementById('propertyPrice').textContent = 'R' + parseFloat(room.price).toFixed(2) + '/month';
    document.getElementById('propertyBedrooms').textContent = room.bedrooms + ' Bedroom' + (room.bedrooms !== 1 ? 's' : '');
    document.getElementById('propertyBathrooms').textContent = room.bathrooms + ' Bathroom' + (room.bathrooms !== 1 ? 's' : '');
    document.getElementById('propertyStatus').textContent = room.status.charAt(0).toUpperCase() + room.status.slice(1);
    
    let description = property.description || 'No description available.';
    if (room.room_amenities) {
        description += '\n\nRoom Amenities: ' + room.room_amenities;
    }
    document.getElementById('propertyDescription').textContent = description;
    
    if (property.images && property.images.length > 0) {
        document.getElementById('propertyImage').src = property.images[0];
    } else {
        document.getElementById('propertyImage').src = 'assets/images/default-property.jpg';
    }
    
    const statusElement = document.getElementById('propertyStatus');
    if (room.status === 'available') {
        statusElement.style.color = '#27ae60';
    } else {
        statusElement.style.color = '#e74c3c';
        document.getElementById('confirmBtn').disabled = true;
        document.getElementById('confirmBtn').textContent = 'Room Not Available';
    }
}

function validateCheckInDate() {
    const checkInInput = document.getElementById('check_in');
    const checkInDate = new Date(checkInInput.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const errorElement = document.getElementById('checkInError');
    
    if (checkInDate <= today) {
        errorElement.textContent = 'Check-in date must be in the future';
        errorElement.style.display = 'block';
        return false;
    } else {
        errorElement.style.display = 'none';
        return true;
    }
}

function calculatePrice() {
    if (!currentRoom) return;
    
    const roomPrice = parseFloat(currentRoom.price) || 0;
    const durationSelect = document.getElementById('duration');
    let duration = parseInt(durationSelect.value);
    
    if (durationSelect.value === 'custom') {
        duration = parseInt(document.getElementById('custom_months').value) || 1;
    }
    
    if (duration < 1) duration = 1;
    if (duration > 24) duration = 24;
    
    const monthlyRate = roomPrice;
    const subtotal = monthlyRate * duration;
    const depositAmount = subtotal * 0.3;
    const serviceFee = subtotal * 0.05;
    const totalAmount = subtotal + serviceFee;
    const balanceDue = totalAmount - depositAmount;
    
    // Add null checks for all DOM elements
    const summaryMonthlyRate = document.getElementById('summaryMonthlyRate');
    const summaryDuration = document.getElementById('summaryDuration');
    const summarySubtotal = document.getElementById('summarySubtotal');
    const summaryServiceFee = document.getElementById('summaryServiceFee');
    const summaryDeposit = document.getElementById('summaryDeposit');
    const summaryBalance = document.getElementById('summaryBalance');
    const summaryTotal = document.getElementById('summaryTotal');
    const buttonText = document.getElementById('buttonText');
    
    if (summaryMonthlyRate) summaryMonthlyRate.textContent = 'R' + monthlyRate.toFixed(2);
    if (summaryDuration) summaryDuration.textContent = duration + ' month' + (duration !== 1 ? 's' : '');
    if (summarySubtotal) summarySubtotal.textContent = 'R' + subtotal.toFixed(2);
    if (summaryServiceFee) summaryServiceFee.textContent = 'R' + serviceFee.toFixed(2);
    if (summaryDeposit) summaryDeposit.innerHTML = '<strong>R' + depositAmount.toFixed(2) + '</strong>';
    if (summaryBalance) summaryBalance.textContent = 'R' + balanceDue.toFixed(2);
    if (summaryTotal) summaryTotal.innerHTML = '<strong>R' + totalAmount.toFixed(2) + '</strong>';
    
    if (buttonText) buttonText.textContent = 'Confirm Booking & Pay R' + depositAmount.toFixed(2) + ' Deposit';
    
    return { monthlyRate, duration, subtotal, depositAmount, serviceFee, totalAmount, balanceDue };
}

async function handleBookingSubmission(e) {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const submitBtn = document.getElementById('confirmBtn');
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('buttonSpinner');
    
    buttonText.textContent = 'Creating Booking...';
    spinner.style.display = 'inline-block';
    submitBtn.disabled = true;
    
    try {
        // Get values directly from form elements to ensure we capture everything
        const bookingData = {
            room_id: parseInt(document.getElementById('roomId').value),
            property_id: parseInt(document.getElementById('propertyId').value),
            check_in: document.getElementById('check_in').value,
            duration: parseInt(getSelectedDuration()),
            guests: parseInt(document.getElementById('guests').value),
            special_requests: document.getElementById('special_requests').value || '',
            guest_name: document.getElementById('guest_name').value,
            guest_email: document.getElementById('guest_email').value,
            guest_phone: document.getElementById('guest_phone').value || ''
        };

        console.log('Booking data being sent:', bookingData);

        // For logged-in users, use session data if form fields are empty
        if (!isGuestBooking) {
            const userName = sessionStorage.getItem('UserName');
            const userEmail = sessionStorage.getItem('LoggedInUser');
            const userPhone = sessionStorage.getItem('UserPhone');
            
            if (!bookingData.guest_name && userName) {
                bookingData.guest_name = userName;
            }
            if (!bookingData.guest_email && userEmail) {
                bookingData.guest_email = userEmail;
            }
            if (!bookingData.guest_phone && userPhone) {
                bookingData.guest_phone = userPhone;
            }
        }

        // Validate required fields
        if (!bookingData.guest_name || bookingData.guest_name.trim().length < 2) {
            throw new Error('Guest name must be at least 2 characters long');
        }
        
        if (!bookingData.guest_email || !isValidEmail(bookingData.guest_email)) {
            throw new Error('Valid email address is required');
        }

        // Trim all string values
        bookingData.guest_name = bookingData.guest_name.trim();
        bookingData.guest_email = bookingData.guest_email.trim();
        bookingData.guest_phone = bookingData.guest_phone.trim();

        const response = await fetch('http://localhost/UniStay---Website/backend/api/bookings/create.php', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getSessionToken()}`
            },
            credentials: 'include',
            body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Booking response:', result);
        
        if (result.success) {
            showNotification('Booking created successfully! Redirecting to payment...', 'success');
            sessionStorage.setItem('lastBookingId', result.booking_id);
            
            setTimeout(() => {
                const paymentUrl = 'payment.html?booking_id=' + result.booking_id;
                window.location.href = paymentUrl;
            }, 2000);
        } else {
            throw new Error(result.error || 'Unknown error occurred');
        }
        
    } catch (err) {
        console.error('Booking submission error:', err);
        let errorMessage = err.message;
        
        if (err.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your connection.';
        }
        
        showNotification('Error creating booking: ' + errorMessage, 'error');
        resetButtonState();
    }
}
function getSelectedDuration() {
    const durationSelect = document.getElementById('duration');
    if (durationSelect.value === 'custom') {
        return parseInt(document.getElementById('custom_months').value) || 1;
    }
    return parseInt(durationSelect.value);
}

function validateForm() {
    let isValid = true;
    clearAllErrors();
    
    if (!validateCheckInDate()) isValid = false;
    
    const duration = getSelectedDuration();
    if (!duration || duration < 1 || duration > 24) {
        document.getElementById('durationError').textContent = 'Please select valid duration (1-24 months)';
        document.getElementById('durationError').style.display = 'block';
        isValid = false;
    }
    
    const guests = document.getElementById('guests').value;
    if (!guests) {
        document.getElementById('guestsError').textContent = 'Please select number of guests';
        document.getElementById('guestsError').style.display = 'block';
        isValid = false;
    }
    
    if (isGuestBooking) {
        const guestName = document.getElementById('guest_name').value.trim();
        const guestEmail = document.getElementById('guest_email').value.trim();
        const guestPhone = document.getElementById('guest_phone').value.trim();
        
        if (!guestName || guestName.length < 2) {
            document.getElementById('guestNameError').textContent = 'Name must be at least 2 characters';
            document.getElementById('guestNameError').style.display = 'block';
            isValid = false;
        }
        
        if (!guestEmail || !isValidEmail(guestEmail)) {
            document.getElementById('guestEmailError').textContent = 'Please enter valid email';
            document.getElementById('guestEmailError').style.display = 'block';
            isValid = false;
        }
        
        if (guestPhone && !isValidPhone(guestPhone)) {
            document.getElementById('guestPhoneError').textContent = 'Please enter valid phone number';
            document.getElementById('guestPhoneError').style.display = 'block';
            isValid = false;
        }
    }
    
    return isValid;
}

function clearAllErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.style.display = 'none';
        element.textContent = '';
    });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    // South African phone number validation
    const phoneRegex = /^(\+?27|0)[1-9][0-9]{8}$/;
    const cleanedPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    return phoneRegex.test(cleanedPhone);
}

function resetButtonState() {
    const submitBtn = document.getElementById('confirmBtn');
    const buttonText = document.getElementById('buttonText');
    const spinner = document.getElementById('buttonSpinner');
    
    const priceSummary = calculatePrice();
    buttonText.textContent = 'Confirm Booking & Pay R' + priceSummary.depositAmount.toFixed(2) + ' Deposit';
    spinner.style.display = 'none';
    submitBtn.disabled = false;
}

function goBack() {
    if (confirm('Are you sure you want to cancel? Your booking details will be lost.')) {
        window.history.back();
    }
}

function showNotification(message, type) {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px 20px; border-radius: 5px; color: white; font-weight: bold; z-index: 1000; transition: opacity 0.3s;';
        document.body.appendChild(notification);
    }
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    if (type === 'warning') notification.style.color = '#212529';
    
    notification.textContent = message;
    notification.style.opacity = '1';
    
    setTimeout(() => notification.style.opacity = '0', 3000);
}

window.calculatePrice = calculatePrice;
window.goBack = goBack;

document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    if (confirm('Are you sure you want to log out?')) {
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
});