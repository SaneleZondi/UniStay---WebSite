// assets/js/booking-debug.js
document.addEventListener("DOMContentLoaded", () => {
    console.log('🔧 DEBUG: Booking page loaded');
    
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('property_id');
    
    console.log('📋 DEBUG: Property ID from URL:', propertyId);
    
    if (!propertyId) {
        console.error('❌ DEBUG: No property ID found in URL');
        showNotification('No property selected for booking.', 'error');
        setTimeout(() => {
            window.location.href = 'properties.html';
        }, 2000);
        return;
    }

    // Check authentication
    const user = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    console.log('👤 DEBUG: User status:', { user, userRole });
    
    // Show guest info fields if user is not logged in
    const guestInfo = document.getElementById('guestInfo');
    if (!user && guestInfo) {
        guestInfo.style.display = 'block';
        console.log('👤 DEBUG: Showing guest info fields');
    }
    
    // Load property details
    loadPropertyDetails(propertyId);
    
    // Set up event listeners
    setupEventListeners();
});

async function loadPropertyDetails(propertyId) {
    try {
        console.log('🌐 DEBUG: Loading property details for ID:', propertyId);
        
        const apiUrl = `http://localhost/UniStay---Website/backend/api/properties/read.php?id=${propertyId}`;
        console.log('🔗 DEBUG: API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('📡 DEBUG: Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📊 DEBUG: API Response:', result);
        
        if (result.error) {
            throw new Error(result.error);
        }

        // Store property data globally
        window.currentProperty = result.property || result.data;
        console.log('💾 DEBUG: Stored property data:', window.currentProperty);
        
        // Update UI with property details
        updatePropertyUI(window.currentProperty);
        
        // Calculate initial price
        calculateTotalPrice();
        
    } catch (err) {
        console.error('❌ DEBUG: Error loading property:', err);
        const propertySummary = document.getElementById('propertySummary');
        if (propertySummary) {
            propertySummary.innerHTML = `
                <div class="error-message">
                    <h3>Error Loading Property</h3>
                    <p>${err.message}</p>
                    <p style="font-size: 12px; margin-top: 10px;">API URL: http://localhost/UniStay---Website/backend/api/properties/read.php?id=${propertyId}</p>
                    <br>
                    <a href="properties.html" class="btn-primary">Back to Properties</a>
                    <button onclick="loadPropertyDetails(${propertyId})" class="btn-secondary">Try Again</button>
                </div>
            `;
        }
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) bookingForm.style.display = 'none';
    }
}

function updatePropertyUI(property) {
    const propertyIdInput = document.getElementById('propertyId');
    const propertyTitle = document.getElementById('propertyTitle');
    const propertyLocation = document.getElementById('propertyLocation');
    const propertyPrice = document.getElementById('propertyPrice');
    const propertyDescription = document.getElementById('propertyDescription');
    
    if (propertyIdInput) propertyIdInput.value = property.id;
    if (propertyTitle) propertyTitle.textContent = property.title;
    if (propertyLocation) propertyLocation.textContent = `${property.city}, ${property.address}`;
    if (propertyPrice) propertyPrice.textContent = `R${property.price}/month`;
    if (propertyDescription) propertyDescription.textContent = property.description;
    
    // Update price summary
    const summaryMonthlyRate = document.getElementById('summaryMonthlyRate');
    if (summaryMonthlyRate) summaryMonthlyRate.textContent = `R${property.price}`;
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const checkInInput = document.getElementById('check_in');
    if (checkInInput) {
        checkInInput.min = today;
        // Set default check-in to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        checkInInput.value = tomorrow.toISOString().split('T')[0];
    }
}

// ... rest of your existing functions with added debug logs
document.addEventListener("DOMContentLoaded", () => {
    // Get property ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('property_id');
    
    if (!propertyId) {
        showNotification('No property selected for booking.', 'error');
        setTimeout(() => {
            window.location.href = 'properties.html';
        }, 2000);
        return;
    }

    // Check authentication
    const user = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    // Show guest info fields if user is not logged in
    const guestInfo = document.getElementById('guestInfo');
    if (!user && guestInfo) {
        guestInfo.style.display = 'block';
    }
    
    // Load property details
    loadPropertyDetails(propertyId);
    
    // Set up event listeners
    setupEventListeners();
});

async function loadPropertyDetails(propertyId) {
    try {
        const response = await fetch(`http://localhost/UniStay---Website/backend/api/properties/read.php?id=${propertyId}`);
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }

        // Store property data globally
        window.currentProperty = result.property;
        
        // Update UI with property details - matching your HTML structure
        const propertyIdInput = document.getElementById('propertyId');
        const propertyTitle = document.getElementById('propertyTitle');
        const propertyLocation = document.getElementById('propertyLocation');
        const propertyPrice = document.getElementById('propertyPrice');
        const propertyDescription = document.getElementById('propertyDescription');
        
        if (propertyIdInput) propertyIdInput.value = propertyId;
        if (propertyTitle) propertyTitle.textContent = result.property.title;
        if (propertyLocation) propertyLocation.textContent = `${result.property.city}, ${result.property.address}`;
        if (propertyPrice) propertyPrice.textContent = `R${result.property.price}/month`;
        if (propertyDescription) propertyDescription.textContent = result.property.description;
        
        // Update price summary
        const summaryMonthlyRate = document.getElementById('summaryMonthlyRate');
        if (summaryMonthlyRate) summaryMonthlyRate.textContent = `R${result.property.price}`;
        
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        const checkInInput = document.getElementById('check_in');
        if (checkInInput) {
            checkInInput.min = today;
            // Set default check-in to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            checkInInput.value = tomorrow.toISOString().split('T')[0];
        }
        
        // Calculate initial price
        calculateTotalPrice();
        
    } catch (err) {
        console.error('Error loading property:', err);
        const propertySummary = document.getElementById('propertySummary');
        if (propertySummary) {
            propertySummary.innerHTML = `
                <div class="error-message">
                    Error loading property details. Please try again.
                    <br><br>
                    <a href="properties.html" class="btn-primary">Back to Properties</a>
                </div>
            `;
        }
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) bookingForm.style.display = 'none';
    }
}

function setupEventListeners() {
    // Duration dropdown change
    const durationSelect = document.getElementById('duration');
    if (durationSelect) {
        durationSelect.addEventListener('change', function() {
            const customGroup = document.getElementById('customMonthsGroup');
            if (this.value === 'custom') {
                if (customGroup) customGroup.style.display = 'block';
                const customMonths = document.getElementById('custom_months');
                if (customMonths) customMonths.value = 1;
            } else {
                if (customGroup) customGroup.style.display = 'none';
            }
            calculateTotalPrice();
        });
    }
    
    // Custom months input change
    const customMonths = document.getElementById('custom_months');
    if (customMonths) {
        customMonths.addEventListener('input', calculateTotalPrice);
    }
    
    // Check-in date change
    const checkInInput = document.getElementById('check_in');
    if (checkInInput) {
        checkInInput.addEventListener('change', function() {
            validateDates();
            calculateTotalPrice();
        });
    }
    
    // Form submission
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmission);
    }
}

function validateDates() {
    const checkInInput = document.getElementById('check_in');
    const checkInError = document.getElementById('checkInError');
    
    if (!checkInInput || !checkInError) return true;
    
    const checkInDate = new Date(checkInInput.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Reset error
    checkInError.style.display = 'none';
    
    // Validate check-in date
    if (checkInDate < today) {
        checkInError.textContent = 'Move-in date cannot be in the past';
        checkInError.style.display = 'block';
        return false;
    }
    
    return true;
}

function calculateTotalPrice() {
    if (!window.currentProperty) return;
    
    const monthlyRate = window.currentProperty.price;
    const durationSelect = document.getElementById('duration');
    let numberOfMonths = 1;
    
    if (durationSelect) {
        if (durationSelect.value === 'custom') {
            const customMonths = document.getElementById('custom_months');
            numberOfMonths = parseInt(customMonths?.value) || 1;
        } else {
            numberOfMonths = parseInt(durationSelect.value) || 1;
        }
    }
    
    numberOfMonths = Math.max(1, numberOfMonths);
    
    // Calculate prices with deposit
    const subtotal = monthlyRate * numberOfMonths;
    const serviceFee = Math.round(subtotal * 0.05);
    const depositRate = 0.3; // 30% deposit
    const depositAmount = Math.round(subtotal * depositRate);
    const total = subtotal + serviceFee;
    const balanceDue = total - depositAmount;
    
    // Update UI elements
    const summaryMonthlyRate = document.getElementById('summaryMonthlyRate');
    const summaryDuration = document.getElementById('summaryDuration');
    const summarySubtotal = document.getElementById('summarySubtotal');
    const summaryServiceFee = document.getElementById('summaryServiceFee');
    const summaryDeposit = document.getElementById('summaryDeposit');
    const summaryBalance = document.getElementById('summaryBalance');
    const summaryTotal = document.getElementById('summaryTotal');
    
    if (summaryMonthlyRate) summaryMonthlyRate.textContent = `R${monthlyRate}`;
    if (summaryDuration) summaryDuration.textContent = `${numberOfMonths} month${numberOfMonths !== 1 ? 's' : ''}`;
    if (summarySubtotal) summarySubtotal.textContent = `R${subtotal}`;
    if (summaryServiceFee) summaryServiceFee.textContent = `R${serviceFee}`;
    if (summaryDeposit) summaryDeposit.textContent = `R${depositAmount}`;
    if (summaryBalance) summaryBalance.textContent = `R${balanceDue}`;
    if (summaryTotal) summaryTotal.textContent = `R${total}`;
    
    return {
        subtotal,
        serviceFee,
        depositAmount,
        total,
        balanceDue,
        numberOfMonths
    };
}

async function handleBookingSubmission(e) {
    e.preventDefault();
    
    if (!validateDates()) return;
    
    const user = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    if (user && userRole !== 'tenant') {
        showNotification('Only tenants can book properties. Please login with a tenant account.', 'error');
        return;
    }
    
    let guestInfo = {};
    if (!user) {
        const guestName = document.getElementById('guest_name')?.value.trim();
        const guestEmail = document.getElementById('guest_email')?.value.trim();
        const guestPhone = document.getElementById('guest_phone')?.value.trim();
        
        if (!guestName || !guestEmail) {
            showNotification('Please provide your name and email to complete the booking', 'error');
            return;
        }
        
        if (!isValidEmail(guestEmail)) {
            showNotification('Please provide a valid email address', 'error');
            return;
        }
        
        guestInfo = {
            guest_name: guestName,
            guest_email: guestEmail,
            guest_phone: guestPhone
        };
    }
    
    const confirmBtn = document.getElementById('confirmBtn');
    const buttonText = document.getElementById('buttonText');
    const originalText = buttonText?.textContent || 'Confirm Booking';
    
    // Show loading state
    if (confirmBtn) confirmBtn.disabled = true;
    if (buttonText) buttonText.innerHTML = '<span class="spinner"></span> Processing...';
    
    try {
        const prices = calculateTotalPrice();
        const checkInInput = document.getElementById('check_in');
        const durationSelect = document.getElementById('duration');
        
        if (!checkInInput || !durationSelect) {
            throw new Error('Missing required form fields');
        }
        
        let numberOfMonths = parseInt(durationSelect.value) || 1;
        if (durationSelect.value === 'custom') {
            const customMonths = document.getElementById('custom_months');
            numberOfMonths = parseInt(customMonths?.value) || 1;
        }
        
        // Prepare booking data
        const bookingData = {
            property_id: document.getElementById('propertyId')?.value,
            check_in: checkInInput.value,
            duration: numberOfMonths,
            guests: document.getElementById('guests')?.value || 1,
            special_requests: document.getElementById('special_requests')?.value || '',
            ...guestInfo
        };
        
        // Submit booking
        const response = await fetch(`http://localhost/UniStay---Website/backend/api/bookings/create.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Booking created! Please pay the deposit to confirm your booking.', 'success');
            
            // Redirect to payment page
            setTimeout(() => {
                window.location.href = `payment.html?booking_id=${result.booking_id}`;
            }, 2000);
        } else {
            throw new Error(result.error || 'Failed to create booking');
        }
        
    } catch (err) {
        console.error('Booking error:', err);
        showNotification('Error creating booking: ' + err.message, 'error');
    } finally {
        if (confirmBtn) confirmBtn.disabled = false;
        if (buttonText) buttonText.textContent = originalText;
    }
}
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Your existing showNotification function
function showNotification(message, type = 'info') {
    // Use the enhanced notification system from config.js
    if (typeof showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Fallback notification
        alert(`${type.toUpperCase()}: ${message}`);
    }
}