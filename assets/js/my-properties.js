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
            propertiesList.innerHTML = '<div class="loading">Loading properties...</div>';
        }

        // Use the apiRequest function from config.js instead of direct fetch
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
                    Error loading properties: ${err.message}
                    <br><br>
                    <button onclick="loadMyProperties()" class="btn-primary">Try Again</button>
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
                <h3>No properties found</h3>
                <p>You haven't listed any properties yet.</p>
                <a href="add-property.html" class="btn-primary">Add Your First Property</a>
            </div>
        `;
        return;
    }
    
    propertiesList.innerHTML = '';
    
    properties.forEach(property => {
        const propertyCard = document.createElement('div');
        propertyCard.className = 'property-card';
        propertyCard.innerHTML = `
            <div class="property-image">
                <img src="${property.primary_image || 'assets/images/default-property.jpg'}" 
                     alt="${property.title}"
                     onerror="this.src='assets/images/default-property.jpg'">
            </div>
            <div class="property-info">
                <h3>${property.title}</h3>
                <p><strong>Location:</strong> ${property.city}, ${property.address}</p>
                <p><strong>Price:</strong> R${property.price}/month</p>
                <p><strong>Bedrooms:</strong> ${property.bedrooms} | <strong>Bathrooms:</strong> ${property.bathrooms}</p>
                <p><strong>Status:</strong> <span class="status ${property.status}">${property.status}</span></p>
                <p><strong>Bookings:</strong> ${property.total_bookings || 0} total, ${property.active_bookings || 0} active</p>
                <div class="property-actions">
                    <button class="btn-primary" onclick="viewProperty(${property.id})">View</button>
                    <button class="btn-secondary" onclick="editProperty(${property.id})">Edit</button>
                    <button class="btn-danger" onclick="deleteProperty(${property.id})">Delete</button>
                </div>
            </div>
        `;
        propertiesList.appendChild(propertyCard);
    });
}

function viewProperty(propertyId) {
    window.location.href = `property-details.html?id=${propertyId}`;
}

function editProperty(propertyId) {
    // Redirect to edit property page or show edit modal
    window.location.href = `edit-property.html?id=${propertyId}`;
}

async function deleteProperty(propertyId) {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('🔧 DELETE Debug - Starting deletion for property:', propertyId);
        
        // Debug: Check authentication status
        console.log('🔑 Session Token:', getSessionToken() ? '✅ Present' : '❌ Missing');
        console.log('👤 Logged In User:', sessionStorage.getItem('LoggedInUser'));
        console.log('🎭 User Role:', sessionStorage.getItem('UserRole'));
        
        const result = await apiRequest(`properties/delete.php?id=${propertyId}`, {
            method: 'DELETE'
        });
        
        console.log('✅ DELETE Response:', result);
        
        if (result.success) {
            showNotification('Property deleted successfully!', 'success');
            loadMyProperties(); // Reload the list
        } else {
            throw new Error(result.error || 'Failed to delete property');
        }
        
    } catch (err) {
        console.error('❌ DELETE Error:', err);
        showNotification('Error deleting property: ' + err.message, 'error');
        
        // More specific error messages
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
            showNotification('Session expired. Please login again.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else if (err.message.includes('403')) {
            showNotification('You do not have permission to delete this property.', 'error');
        }
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Use the logout function from config.js if available
            if (typeof window.setupLogout === 'function') {
                return; // Let config.js handle it
            }
            
            // Fallback logout
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }
}

// Make functions globally available
window.loadMyProperties = loadMyProperties;
window.viewProperty = viewProperty;
window.editProperty = editProperty;
window.deleteProperty = deleteProperty;