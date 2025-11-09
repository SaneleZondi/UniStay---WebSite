document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Property Details Debug - Page loaded');
    
    // Define API base URL
    const API_BASE_URL = 'http://localhost/UniStay---Website/backend/api';
    
    // Get property ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');
    
    console.log('📋 Property ID from URL:', propertyId);
    
    if (!propertyId) {
        showNotification('No property specified', 'error');
        setTimeout(function() {
            window.location.href = 'properties.html';
        }, 2000);
        return;
    }
    
    // Check user login status
    const user = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    console.log('👤 User status:', { user: user, userRole: userRole });
    
    // Load property details
    loadPropertyDetails(propertyId);
    
    // Add global event listener for book buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('book-room-btn') && !e.target.disabled) {
            const roomId = e.target.getAttribute('data-room-id');
            console.log('🎯 Book button clicked via event delegation, room ID:', roomId);
            if (roomId) {
                bookRoom(roomId);
            } else {
                console.error('❌ No room ID found on button');
            }
        }
    });
    
    async function loadPropertyDetails(propertyId) {
        try {
            console.log('🌐 Loading property details for ID:', propertyId);
            
            const testUrl = API_BASE_URL + '/properties/read.php?id=' + propertyId;
            console.log('🔗 API URL:', testUrl);
            
            const response = await fetch(testUrl);
            
            console.log('📡 Response received:', response);
            
            if (!response.ok) {
                throw new Error('Server returned ' + response.status);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to load property details');
            }
            
            console.log('✅ Property data loaded successfully:', result.property);
            displayPropertyDetails(result.property);
            
            // Load rooms for this property
            const roomsResponse = await fetch(API_BASE_URL + '/properties/rooms.php?property_id=' + propertyId);
            if (roomsResponse.ok) {
                const roomsResult = await roomsResponse.json();
                if (roomsResult.success) {
                    displayRooms(roomsResult.rooms);
                }
            }
            
        } catch (err) {
            console.error('❌ Error loading property details:', err);
            
            let errorMessage = err.message || 'Please try again later.';
            
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                errorMessage = 'Network error. Please check if the server is running.';
            }
            
            const container = document.getElementById('propertyDetail');
            if (container) {
                container.innerHTML = '<div class="error-message">' +
                    '<h3>Error Loading Property</h3>' +
                    '<p>' + errorMessage + '</p>' +
                    '<br>' +
                    '<a href="properties.html" class="btn-primary">Back to Properties</a>' +
                    '<button onclick="loadPropertyDetails(' + propertyId + ')" class="btn-secondary" style="margin-left: 10px;">Try Again</button>' +
                    '</div>';
            }
        }
    }

 function displayPropertyDetails(property) {
    const container = document.getElementById('propertyDetail');
    if (!container) return;
    
    // Create image gallery
    let imagesHTML = '';
    if (property.images && property.images.length > 0) {
        let imageTags = '';
        property.images.forEach(function(img, index) {
            imageTags += '<img src="' + img + '" alt="' + property.title + ' - Image ' + (index + 1) + '" onerror="this.src=\'assets/images/default-property.jpg\'">';
        });
        imagesHTML = '<div class="property-gallery">' + imageTags + '</div>';
    } else {
        imagesHTML = '<div class="property-gallery"><img src="assets/images/default-property.jpg" alt="No image available"></div>';
    }
    
    // Create rating HTML
    let ratingHTML = '';
    if (property.average_rating) {
        ratingHTML = `
            <div class="property-rating-overview">
                <div class="rating-display">
                    <div class="rating-score">
                        <span class="score">${property.average_rating}</span>
                        <span class="out-of">/5</span>
                    </div>
                    <div class="rating-stars">${generateRatingStars(property.average_rating)}</div>
                    <div class="rating-count">${property.total_reviews || 0} review${(property.total_reviews || 0) !== 1 ? 's' : ''}</div>
                </div>
                <div class="rating-breakdown">
                    <a href="#reviews-section" class="view-reviews-link">View all reviews</a>
                </div>
            </div>
        `;
    } else {
        ratingHTML = `
            <div class="property-rating-overview">
                <div class="no-ratings">
                    <div class="rating-stars">☆☆☆☆☆</div>
                    <div class="rating-count">No reviews yet</div>
                    <div class="be-first">Be the first to review this property!</div>
                </div>
            </div>
        `;
    }
    
    // Format amenities
    let amenitiesHTML = '';
    if (property.amenities) {
        const amenitiesList = property.amenities.split(',').map(function(a) {
            return a.trim();
        }).filter(function(a) {
            return a;
        });
        
        if (amenitiesList.length > 0) {
            let amenityTags = '';
            amenitiesList.forEach(function(amenity) {
                amenityTags += '<span class="amenity-tag">' + amenity + '</span>';
            });
            amenitiesHTML = '<div class="amenities">' +
                '<h3>Property Amenities</h3>' +
                '<div class="amenities-list">' + amenityTags + '</div>' +
                '</div>';
        }
    }
    
    container.innerHTML = imagesHTML + 
        `<div class="property-layout">
            <div class="property-main">
                <div class="property-header">
                    <h1 class="property-title">${property.title}</h1>
                    <p class="property-location">📍 ${property.city}, ${property.address}</p>
                </div>
                
                ${ratingHTML}
                
                <div class="property-meta">
                    <div class="meta-item">
                        <strong>${property.total_rooms}</strong>
                        <span>total rooms</span>
                    </div>
                    <div class="meta-item">
                        <strong>${property.available_rooms}</strong>
                        <span>available rooms</span>
                    </div>
                    <div class="meta-item">
                        <strong>${property.property_type}</strong>
                        <span>property type</span>
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
            </div>
            
            <div class="property-sidebar">
                <div class="sidebar-card landlord-info">
                    <h3>Landlord Information</h3>
                    <p><strong>Name:</strong> ${property.landlord_name}</p>
                    <p><strong>Email:</strong> ${property.landlord_email}</p>
                    <p><strong>Contact:</strong> <a href="mailto:${property.landlord_email}">Send Email</a></p>
                    <div class="landlord-actions">
                        <button class="btn btn-primary" onclick="messageLandlord(${property.landlord_id}, ${property.id}, '${property.title.replace(/'/g, "\\'")}')">
                            💬 Message Landlord
                        </button>
                    </div>
                </div>
                
                <div class="sidebar-card">
                    <h3>Quick Actions</h3>
                    <div class="quick-actions">
                        <a href="#rooms-section" class="quick-action">
                            <i>🛏️</i>
                            <span>View Available Rooms</span>
                        </a>
                        <a href="properties.html" class="quick-action">
                            <i>🔍</i>
                            <span>Browse More Properties</span>
                        </a>
                        <a href="#" class="quick-action" onclick="window.location.reload()">
                            <i>🔄</i>
                            <span>Refresh Page</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>`;
}

// Add this function to generate star display
function generateRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    // Full stars
    for (let i = 0; i < fullStars; i++) {
        stars += '⭐';
    }
    
    // Half star
    if (hasHalfStar) {
        stars += '⭐';
    }
    
    // Empty stars
    for (let i = 0; i < emptyStars; i++) {
        stars += '☆';
    }
    
    return stars;
}

    function displayRooms(rooms) {
        const roomsContainer = document.getElementById('roomsContainer');
        
        if (!rooms || rooms.length === 0) {
            roomsContainer.innerHTML = '<p>No rooms currently available.</p>';
            return;
        }
        
        // Group rooms by type
        const roomsByType = {};
        rooms.forEach(function(room) {
            if (!roomsByType[room.room_type]) {
                roomsByType[room.room_type] = [];
            }
            roomsByType[room.room_type].push(room);
        });
        
        let roomsHTML = '';
        
        Object.keys(roomsByType).forEach(function(roomType) {
            const typeRooms = roomsByType[roomType];
            const availableCount = typeRooms.filter(function(room) {
                return room.status === 'available';
            }).length;
            
            let roomCards = '';
            typeRooms.forEach(function(room) {
                const roomAmenities = room.room_amenities ? 
                    '<div class="room-feature"><i>⭐</i> ' + room.room_amenities + '</div>' : '';
                
                roomCards += '<div class="room-card ' + (room.status !== 'available' ? 'room-unavailable' : '') + '">' +
                    '<div class="room-header">' +
                    '<div>' +
                    '<h4>Room ' + room.room_number + '</h4>' +
                    '<span class="room-type">' + (room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)) + '</span>' +
                    '</div>' +
                    '<div class="room-price">R' + room.price + '/month</div>' +
                    '</div>' +
                    '<div class="room-features">' +
                    '<div class="room-feature"><i>🛏️</i> ' + room.bedrooms + ' bedroom' + (room.bedrooms !== 1 ? 's' : '') + '</div>' +
                    '<div class="room-feature"><i>🚿</i> ' + room.bathrooms + ' bathroom' + (room.bathrooms !== 1 ? 's' : '') + '</div>' +
                    roomAmenities +
                    '</div>' +
                    '<div class="room-status">' +
                    '<span class="status-badge ' + room.status + '">' + (room.status.charAt(0).toUpperCase() + room.status.slice(1)) + '</span>' +
                    '</div>' +
                    '<button class="book-room-btn" data-room-id="' + room.id + '" ' + 
                    (room.status !== 'available' ? 'disabled' : '') + '>' +
                    (room.status === 'available' ? 'Book This Room' : 'Not Available') +
                    '</button>' +
                    '</div>';
            });
            
            roomsHTML += '<div class="room-type-section">' +
                '<h3>' + (roomType.charAt(0).toUpperCase() + roomType.slice(1)) + ' Rooms (' + availableCount + ' available)</h3>' +
                '<div class="rooms-grid">' + roomCards + '</div>' +
                '</div>';
        });
        
        roomsContainer.innerHTML = roomsHTML;
        console.log('✅ Rooms displayed with data-room-id attributes');
    }

    // Make functions globally available
    window.loadPropertyDetails = loadPropertyDetails;
});

// Book room function - MUST BE OUTSIDE DOMContentLoaded
function bookRoom(roomId) {
    console.log('🚀 Book Room function called with room ID:', roomId);
    
    const user = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    console.log('👤 User check:', { user: user, userRole: userRole });
    
    if (!user) {
        console.log('⚠️ User not logged in, redirecting to login');
        showNotification('Please login to book this room', 'warning');
        setTimeout(function() {
            const currentUrl = encodeURIComponent(window.location.href);
            window.location.href = 'login.html?returnUrl=' + currentUrl;
        }, 2000);
        return;
    }
    
    if (userRole !== 'tenant') {
        console.log('❌ User is not a tenant, role:', userRole);
        showNotification('Only tenants can book rooms', 'error');
        return;
    }
    
    // Enhanced redirect with error handling
    console.log('✅ User authenticated, redirecting to booking page with room_id:', roomId);
    
    // Create the booking URL
    const bookingUrl = 'booking.html?room_id=' + roomId;
    console.log('🔗 Redirecting to:', bookingUrl);
    
    // Try multiple redirect methods
    try {
        window.location.href = bookingUrl;
    } catch (error) {
        console.error('❌ Redirect failed:', error);
        // Fallback method
        window.location.assign(bookingUrl);
    }
}

// Message Landlord function - MUST BE OUTSIDE DOMContentLoaded
// Message Landlord function - FIXED VERSION
function messageLandlord(landlordId, propertyId, propertyTitle) {
    console.log('💬 Message landlord clicked:', { landlordId, propertyId, propertyTitle });
    
    const user = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    const userName = sessionStorage.getItem('UserName') || 'Tenant';
    
    if (!user) {
        showNotification('Please login to message the landlord', 'warning');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    if (userRole !== 'tenant') {
        showNotification('Only tenants can message landlords', 'error');
        return;
    }
    
    // Create the initial message
    const message = `Hi, I'm ${userName} and I'm interested in your property "${propertyTitle}". Can you tell me more about it?`;
    
    console.log('📤 Sending initial message to landlord:', { landlordId, message });
    
    // Send the message via API
    fetch('http://localhost/UniStay---Website/backend/api/messages/send.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            receiver_id: landlordId,
            property_id: propertyId,
            message: message,
            subject: `Inquiry about ${propertyTitle}`
        })
    })
    .then(response => response.json())
    .then(result => {
        console.log('📨 Send message response:', result);
        if (result.success) {
            showNotification('Message sent to landlord! Redirecting to messages...', 'success');
            // Redirect to messages page after a short delay
            setTimeout(() => {
                window.location.href = 'messages.html';
            }, 1500);
        } else {
            showNotification('Error sending message: ' + result.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error sending message:', error);
        showNotification('Error sending message. Please try again.', 'error');
    });
}

// Notification function
function showNotification(message, type) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px 20px; border-radius: 5px; color: white; font-weight: bold; z-index: 1000; transition: opacity 0.3s;';
        document.body.appendChild(notification);
    }
    
    // Set styles based on type
    if (type === 'success') {
        notification.style.backgroundColor = '#28a745';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#dc3545';
    } else if (type === 'warning') {
        notification.style.backgroundColor = '#ffc107';
        notification.style.color = '#212529';
    } else {
        notification.style.backgroundColor = '#17a2b8';
    }
    
    notification.textContent = message;
    notification.style.opacity = '1';
    
    // Auto hide after 3 seconds
    setTimeout(function() {
        notification.style.opacity = '0';
    }, 3000);
}