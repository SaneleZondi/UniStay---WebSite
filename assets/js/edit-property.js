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

    // Get property ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');
    
    if (!propertyId) {
        showNotification('No property specified', 'error');
        setTimeout(() => {
            window.location.href = 'my-properties.html';
        }, 2000);
        return;
    }

    loadPropertyForEditing(propertyId);
    setupFormHandler(propertyId);
});

async function loadPropertyForEditing(propertyId) {
    try {
        const result = await apiRequest(`properties/read.php?id=${propertyId}`);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to load property');
        }
        
        const property = result.property;
        populateForm(property);
        
        // Show form, hide loading
        document.getElementById('loadingMessage').style.display = 'none';
        document.getElementById('editPropertyForm').style.display = 'block';
        
    } catch (err) {
        console.error('Error loading property:', err);
        document.getElementById('loadingMessage').innerHTML = `
            <div class="error-message">
                Error loading property: ${err.message}
                <br><br>
                <a href="my-properties.html" class="btn-primary">Back to My Properties</a>
            </div>
        `;
    }
}

function populateForm(property) {
    document.getElementById('title').value = property.title || '';
    document.getElementById('description').value = property.description || '';
    document.getElementById('price').value = property.price || '';
    document.getElementById('address').value = property.address || '';
    document.getElementById('city').value = property.city || '';
    document.getElementById('bedrooms').value = property.bedrooms || '';
    document.getElementById('bathrooms').value = property.bathrooms || '';
    document.getElementById('amenities').value = property.amenities || '';
    document.getElementById('status').value = property.status || 'available';
}

function setupFormHandler(propertyId) {
    const form = document.getElementById('editPropertyForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            id: propertyId,
            title: document.getElementById('title').value.trim(),
            description: document.getElementById('description').value.trim(),
            price: parseFloat(document.getElementById('price').value),
            address: document.getElementById('address').value.trim(),
            city: document.getElementById('city').value.trim(),
            bedrooms: parseInt(document.getElementById('bedrooms').value),
            bathrooms: parseInt(document.getElementById('bathrooms').value),
            amenities: document.getElementById('amenities').value.trim(),
            status: document.getElementById('status').value
        };
        
        // Validate required fields
        if (!formData.title || !formData.description || !formData.price || 
            !formData.address || !formData.city || !formData.bedrooms || !formData.bathrooms) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        try {
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.textContent = 'Updating...';
            submitButton.disabled = true;
            
            const result = await apiRequest('properties/update.php', {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            
            if (result.success) {
                showNotification('Property updated successfully!', 'success');
                setTimeout(() => {
                    window.location.href = 'my-properties.html';
                }, 1500);
            } else {
                throw new Error(result.error || 'Failed to update property');
            }
            
        } catch (err) {
            console.error('Error updating property:', err);
            showNotification('Error updating property: ' + err.message, 'error');
        } finally {
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.textContent = 'Update Property';
            submitButton.disabled = false;
        }
    });
}