document.addEventListener('DOMContentLoaded', function() {
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    if (!loggedInUser || userRole !== 'landlord') {
        showNotification('Please login as a landlord to access this page.', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    loadMyProperties();
    setupLogout();
});

async function loadMyProperties() {
    try {
        console.log('Loading landlord properties...');
        
        const propertiesList = document.getElementById('propertiesList');
        if (propertiesList) {
            propertiesList.innerHTML = `
                <div class="loading">
                    <div class="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <p>Loading your properties...</p>
                </div>
            `;
        }

        const result = await apiRequest('properties/my.php');
        
        console.log('Properties API response:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load properties');
        }
        
        displayProperties(result.data || []);
        
    } catch (err) {
        console.error('Error loading properties:', err);
        const propertiesList = document.getElementById('propertiesList');
        if (propertiesList) {
            propertiesList.innerHTML = `
                <div class="error-message">
                    <div class="error-icon">⚠️</div>
                    <h3>Unable to Load Properties</h3>
                    <p>${err.message}</p>
                    <div class="error-actions">
                        <button onclick="loadMyProperties()" class="btn btn-primary">
                            🔄 Try Again
                        </button>
                        <button onclick="debugProperties()" class="btn btn-secondary">
                            🐛 Debug
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

function displayProperties(properties) {
    const propertiesList = document.getElementById('propertiesList');
    if (!propertiesList) return;
    
    if (properties.length === 0) {
        propertiesList.innerHTML = `
            <div class="no-properties">
                <div class="no-properties-icon">🏠</div>
                <h3>No Properties Listed</h3>
                <p>Start by adding your first property to rent to students.</p>
                <a href="add-property.html" class="btn btn-primary">Add Your First Property</a>
            </div>
        `;
        return;
    }
    
    propertiesList.innerHTML = '<div class="properties-grid"></div>';
    const propertiesGrid = propertiesList.querySelector('.properties-grid');
    
    properties.forEach(property => {
        const propertyCard = document.createElement('div');
        propertyCard.className = 'property-card';
        propertyCard.innerHTML = `
            <div class="property-header">
                <div class="property-info">
                    <h3 class="property-title">${escapeHtml(property.title)}</h3>
                    <div class="property-location">
                        <span>📍</span>
                        <span>${escapeHtml(property.city)}, ${escapeHtml(property.address)}</span>
                    </div>
                </div>
                <span class="status-badge status-${property.status || 'available'}">
                    ${getPropertyStatusText(property.status)}
                </span>
            </div>
            
            <div class="property-meta">
                <div class="meta-item">
                    <span>🏠</span>
                    <span>${escapeHtml(property.property_type || 'Apartment')}</span>
                </div>
                <div class="meta-item">
                    <span>🛏️</span>
                    <span>${property.bedrooms || 1} Bedrooms</span>
                </div>
                <div class="meta-item">
                    <span>🚿</span>
                    <span>${property.bathrooms || 1} Bathrooms</span>
                </div>
            </div>
            
            ${property.price ? `
            <div class="property-price">
                R${property.price}/month
            </div>
            ` : ''}
            
            <div class="property-stats">
                <div class="stat-item">
                    <span class="stat-label">Total Rooms:</span>
                    <span class="stat-value">${property.total_rooms || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Available Rooms:</span>
                    <span class="stat-value">${property.available_rooms || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total Bookings:</span>
                    <span class="stat-value">${property.total_bookings || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Active Bookings:</span>
                    <span class="stat-value">${property.active_bookings || 0}</span>
                </div>
            </div>
            
            <div class="action-buttons">
                <button class="btn-action btn-view" onclick="viewProperty(${property.id})">
                    👁️ View Details
                </button>
                <button class="btn-action btn-edit" onclick="editProperty(${property.id})">
                    ✏️ Edit
                </button>
                <button class="btn-action btn-delete" onclick="deleteProperty(${property.id})">
                    🗑️ Delete
                </button>
            </div>
        `;
        propertiesGrid.appendChild(propertyCard);
    });
}

function getPropertyStatusText(status) {
    const statusMap = {
        'available': '✅ Available',
        'unavailable': '⏳ Unavailable', 
        'fully_booked': '🏠 Fully Booked'
    };
    return statusMap[status] || '✅ Available';
}

function viewProperty(propertyId) {
    window.location.href = `property-details.html?id=${propertyId}`;
}

function editProperty(propertyId) {
    window.location.href = `edit-property.html?id=${propertyId}`;
}

async function deleteProperty(propertyId) {
    if (!confirm('Are you sure you want to delete this property?\n\n⚠️ This action cannot be undone and will remove all associated rooms and bookings.')) {
        return;
    }
    
    try {
        showNotification('⏳ Deleting property...', 'info');
        
        const result = await apiRequest(`properties/delete.php?id=${propertyId}`, {
            method: 'DELETE'
        });
        
        console.log('✅ DELETE Response:', result);
        
        if (result.success) {
            showNotification('✅ Property deleted successfully!', 'success');
            loadMyProperties(); // Reload the list
        } else {
            throw new Error(result.error || 'Failed to delete property');
        }
        
    } catch (err) {
        console.error('❌ DELETE Error:', err);
        showNotification('❌ Error deleting property: ' + err.message, 'error');
        
        // More specific error messages
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
            showNotification('Session expired. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else if (err.message.includes('403')) {
            showNotification('You do not have permission to delete this property.', 'error');
        } else if (err.message.includes('bookings')) {
            showNotification('Cannot delete property with active bookings. Please cancel bookings first.', 'error');
        }
    }
}

function setupLogout() {
    const logoutBtn = document.querySelector('[onclick="logout()"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (typeof window.enhancedLogout === 'function') {
                window.enhancedLogout();
            } else {
                sessionStorage.clear();
                localStorage.clear();
                window.location.href = 'index.html';
            }
        });
    }
}

// Utility functions
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

function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        alert(message);
    }
}

function debugProperties() {
    console.log('🔧 Properties Debug Info:');
    console.log('LoggedInUser:', sessionStorage.getItem('LoggedInUser'));
    console.log('UserRole:', sessionStorage.getItem('UserRole'));
    console.log('Session Token:', getSessionToken() ? 'Present' : 'Missing');
    
    showNotification('Check browser console for debug info', 'info');
}

function getSessionToken() {
    return sessionStorage.getItem('session_token') || 
           sessionStorage.getItem('LoggedInUserToken') || 
           document.cookie.match(/session_token=([^;]+)/)?.[1];
}

// Make functions globally available
window.loadMyProperties = loadMyProperties;
window.viewProperty = viewProperty;
window.editProperty = editProperty;
window.deleteProperty = deleteProperty;
window.debugProperties = debugProperties;