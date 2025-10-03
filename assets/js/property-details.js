document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Property Details Debug - Page loaded');
    
    // Get property ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');
    
    console.log('📋 Property ID from URL:', propertyId);
    
    if (!propertyId) {
        showNotification('No property specified', 'error');
        setTimeout(() => {
            window.location.href = 'properties.html';
        }, 2000);
        return;
    }
    
    // Check user login status
    const user = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    console.log('👤 User status:', { user, userRole });
    
    // Load property details
    loadPropertyDetails(propertyId);
    
    // Set up booking button
    const bookNowBtn = document.getElementById('bookNowBtn');
    if (bookNowBtn) {
        bookNowBtn.addEventListener('click', function() {
            handleBookNow(propertyId, user, userRole);
        });
    }
});

async function loadPropertyDetails(propertyId) {
    try {
        console.log('🌐 Loading property details for ID:', propertyId);
        
        // Test if API is reachable first
        console.log('🧪 Testing API connectivity...');
        const testUrl = `${APP_CONFIG.API_BASE_URL}/properties/read.php?id=${propertyId}`;
        console.log('🔗 API URL:', testUrl);
        
        const response = await apiRequest(`properties/read.php?id=${propertyId}`);
        
        console.log('📡 Response received:', response);
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to load property details');
        }
        
        console.log('✅ Property data loaded successfully:', response.property);
        displayPropertyDetails(response.property);
        
    } catch (err) {
        console.error('❌ Error loading property details:', err);
        
        // More specific error messages
        let errorMessage = err.message || 'Please try again later.';
        
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            errorMessage = 'Network error. Please check if the server is running.';
        } else if (err.message.includes('CORS')) {
            errorMessage = 'CORS error. Please check server configuration.';
        }
        
        const container = document.getElementById('propertyDetail');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>Error Loading Property</h3>
                    <p>${errorMessage}</p>
                    <p style="font-size: 12px; margin-top: 10px;">URL: ${APP_CONFIG.API_BASE_URL}/properties/read.php?id=${propertyId}</p>
                    <br>
                    <a href="properties.html" class="btn-primary">Back to Properties</a>
                    <button onclick="loadPropertyDetails(${propertyId})" class="btn-secondary" style="margin-left: 10px;">Try Again</button>
                </div>
            `;
        }
        
        // Hide booking button
        const bookNowBtn = document.getElementById('bookNowBtn');
        if (bookNowBtn) bookNowBtn.style.display = 'none';
    }
}

function displayPropertyDetails(property) {
    const container = document.getElementById('propertyDetail');
    if (!container) return;
    
    console.log('🎨 Displaying property:', property);
    
    // Create image gallery
    let imagesHTML = '';
    if (property.images && property.images.length > 0) {
        imagesHTML = `
            <div class="property-gallery">
                ${property.images.map((img, index) => `
                    <img src="${img}" 
                         alt="${property.title} - Image ${index + 1}"
                         onerror="this.src='assets/images/default-property.jpg'">
                `).join('')}
            </div>
        `;
    } else {
        imagesHTML = `
            <div class="property-gallery">
                <img src="assets/images/default-property.jpg" alt="No image available">
            </div>
        `;
    }
    
    // Format amenities
    let amenitiesHTML = '';
    if (property.amenities) {
        const amenitiesList = property.amenities.split(',').map(a => a.trim()).filter(a => a);
        if (amenitiesList.length > 0) {
            amenitiesHTML = `
                <div class="amenities">
                    <h3>Amenities</h3>
                    <div class="amenities-list">
                        ${amenitiesList.map(amenity => `
                            <span class="amenity-tag">${amenity}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    // Update booking button based on status
    const bookNowBtn = document.getElementById('bookNowBtn');
    if (bookNowBtn) {
        if (property.status !== 'available') {
            bookNowBtn.textContent = property.status === 'booked' ? 'Already Booked' : 'Not Available';
            bookNowBtn.disabled = true;
            bookNowBtn.classList.remove('btn-primary');
            bookNowBtn.classList.add('btn-disabled');
        }
    }
    
    container.innerHTML = `
        ${imagesHTML}
        <div class="property-info">
            <h1>${property.title}</h1>
            <p class="property-location">📍 ${property.city}, ${property.address}</p>
            
            <div class="property-meta">
                <div class="meta-item">
                    <strong>R${property.price}</strong>
                    <span>per month</span>
                </div>
                <div class="meta-item">
                    <strong>${property.bedrooms}</strong>
                    <span>bedroom${property.bedrooms !== 1 ? 's' : ''}</span>
                </div>
                <div class="meta-item">
                    <strong>${property.bathrooms}</strong>
                    <span>bathroom${property.bathrooms !== 1 ? 's' : ''}</span>
                </div>
                <div class="meta-item">
                    <strong>${property.status}</strong>
                    <span>status</span>
                </div>
            </div>
            
            <div class="property-description">
                <h3>Description</h3>
                <p>${property.description || 'No description available.'}</p>
            </div>
            
            ${amenitiesHTML}
            
            <div class="landlord-info">
                <h3>Landlord Information</h3>
                <p><strong>Name:</strong> ${property.landlord_name}</p>
                <p><strong>Email:</strong> ${property.landlord_email}</p>
                <p><strong>Contact:</strong> <a href="mailto:${property.landlord_email}">Send Email</a></p>
            </div>
        </div>
    `;
}

function handleBookNow(propertyId, user, userRole) {
    if (!user) {
        // Not logged in - redirect to login with return URL
        showNotification('Please login to book this property', 'warning');
        setTimeout(() => {
            window.location.href = `login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
        }, 2000);
        return;
    }
    
    if (userRole !== 'tenant') {
        showNotification('Only tenants can book properties. Please login with a tenant account.', 'error');
        return;
    }
    
    // Redirect to booking page
    window.location.href = `booking.html?property_id=${propertyId}`;
}

// Make functions globally available
window.loadPropertyDetails = loadPropertyDetails;
window.handleBookNow = handleBookNow;