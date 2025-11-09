document.addEventListener('DOMContentLoaded', function() {
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    if (!loggedInUser || userRole !== 'landlord') {
        showNotification('Please login as a landlord to access this page.', 'error');
        setTimeout(function() {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }

    // Get property ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');
    
    if (!propertyId) {
        showNotification('No property specified', 'error');
        setTimeout(function() {
            window.location.href = 'my-properties.html';
        }, 2000);
        return;
    }

    loadPropertyForEditing(propertyId);
});

let roomCount = 0;

async function loadPropertyForEditing(propertyId) {
    try {
        // Load property details
        const propertyResult = await apiRequest('properties/read.php?id=' + propertyId);
        
        if (!propertyResult.success) {
            throw new Error(propertyResult.error || 'Failed to load property');
        }
        
        const property = propertyResult.property;
        populateForm(property);
        
        // Load rooms for this property
        const roomsResult = await apiRequest('properties/rooms.php?property_id=' + propertyId);
        if (roomsResult.success) {
            populateRooms(roomsResult.rooms);
        }
        
        // Show form, hide loading
        document.getElementById('loadingMessage').style.display = 'none';
        document.getElementById('editPropertyForm').style.display = 'block';
        
        // Setup form handler after everything is loaded
        setupFormHandler(propertyId);
        
    } catch (err) {
        console.error('Error loading property:', err);
        document.getElementById('loadingMessage').innerHTML = '<div class="error-message">Error loading property: ' + err.message + '<br><br><a href="my-properties.html" class="btn-primary">Back to My Properties</a></div>';
    }
}

function populateForm(property) {
    document.getElementById('title').value = property.title || '';
    document.getElementById('description').value = property.description || '';
    document.getElementById('address').value = property.address || '';
    document.getElementById('city').value = property.city || '';
    document.getElementById('property_type').value = property.property_type || 'apartment';
    document.getElementById('amenities').value = property.amenities || '';
    document.getElementById('status').value = property.status || 'available';
}

function populateRooms(rooms) {
    const roomsContainer = document.getElementById('roomsContainer');
    roomsContainer.innerHTML = '';
    roomCount = 0;
    
    if (rooms && rooms.length > 0) {
        rooms.forEach(function(room) {
            addRoom(room);
        });
    } else {
        // Add one empty room if no rooms exist
        addRoom();
    }
    
    // Setup room management
    setupRoomManagement();
}

function addRoom(roomData = null) {
    roomCount++;
    const roomDiv = document.createElement('div');
    roomDiv.className = 'room-entry';
    roomDiv.dataset.roomId = roomData ? roomData.id : '';
    
    roomDiv.innerHTML = '<h4>Room ' + roomCount + (roomData ? ' (ID: ' + roomData.id + ')' : '') + '</h4>' +
        '<div class="form-row">' +
            '<div class="form-group">' +
                '<label>Room Number/Name *</label>' +
                '<input type="text" name="rooms[' + roomCount + '][room_number]" value="' + (roomData ? roomData.room_number : '') + '" required placeholder="e.g., 101, Room A">' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Room Type *</label>' +
                '<select name="rooms[' + roomCount + '][room_type]" required>' +
                    '<option value="">Select Room Type</option>' +
                    '<option value="single"' + (roomData && roomData.room_type === 'single' ? ' selected' : '') + '>Single Room</option>' +
                    '<option value="double"' + (roomData && roomData.room_type === 'double' ? ' selected' : '') + '>Double Room</option>' +
                    '<option value="shared"' + (roomData && roomData.room_type === 'shared' ? ' selected' : '') + '>Shared Room</option>' +
                    '<option value="studio"' + (roomData && roomData.room_type === 'studio' ? ' selected' : '') + '>Studio</option>' +
                    '<option value="master"' + (roomData && roomData.room_type === 'master' ? ' selected' : '') + '>Master Suite</option>' +
                '</select>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Monthly Price (R) *</label>' +
                '<input type="number" name="rooms[' + roomCount + '][price]" value="' + (roomData ? roomData.price : '') + '" required min="1" placeholder="4500">' +
            '</div>' +
        '</div>' +
        '<div class="form-row">' +
            '<div class="form-group">' +
                '<label>Bedrooms *</label>' +
                '<input type="number" name="rooms[' + roomCount + '][bedrooms]" value="' + (roomData ? roomData.bedrooms : '1') + '" min="1" required>' +
            '</div>' +
            '<div class="form-group">' +
                '<label>Bathrooms *</label>' +
                '<input type="number" name="rooms[' + roomCount + '][bathrooms]" value="' + (roomData ? roomData.bathrooms : '1') + '" min="1" required>' +
            '</div>' +
        '</div>' +
        '<div class="form-group">' +
            '<label>Room-specific Amenities</label>' +
            '<input type="text" name="rooms[' + roomCount + '][room_amenities]" value="' + (roomData ? roomData.room_amenities : '') + '" placeholder="Desk, Wardrobe, Private Bathroom, etc.">' +
        '</div>' +
        '<div class="form-group">' +
            '<label>Room Status</label>' +
            '<select name="rooms[' + roomCount + '][status]">' +
                '<option value="available"' + (roomData && roomData.status === 'available' ? ' selected' : '') + '>Available</option>' +
                '<option value="booked"' + (roomData && roomData.status === 'booked' ? ' selected' : '') + '>Booked</option>' +
                '<option value="maintenance"' + (roomData && roomData.status === 'maintenance' ? ' selected' : '') + '>Maintenance</option>' +
            '</select>' +
        '</div>' +
        (roomCount > 1 ? '<button type="button" class="btn-remove-room">Remove This Room</button>' : '');
    
    document.getElementById('roomsContainer').appendChild(roomDiv);
}

function setupRoomManagement() {
    const addRoomBtn = document.getElementById('addRoomBtn');
    const roomsContainer = document.getElementById('roomsContainer');
    
    addRoomBtn.addEventListener('click', function() {
        addRoom();
    });
    
    // Delegate remove room events
    roomsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-remove-room')) {
            if (roomCount > 1) {
                e.target.closest('.room-entry').remove();
                roomCount--;
                // Re-number rooms
                renumberRooms();
            } else {
                showNotification('Your property must have at least one room.', 'error');
            }
        }
    });
}

function renumberRooms() {
    const roomEntries = document.querySelectorAll('.room-entry');
    roomEntries.forEach(function(roomEntry, index) {
        const roomHeader = roomEntry.querySelector('h4');
        roomHeader.textContent = 'Room ' + (index + 1);
        
        // Update all input names
        const inputs = roomEntry.querySelectorAll('input, select');
        inputs.forEach(function(input) {
            const oldName = input.getAttribute('name');
            if (oldName) {
                const newName = oldName.replace(/rooms\[\d+\]/, 'rooms[' + (index + 1) + ']');
                input.setAttribute('name', newName);
            }
        });
    });
    roomCount = roomEntries.length;
}

function setupFormHandler(propertyId) {
    const form = document.getElementById('editPropertyForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            id: propertyId,
            title: document.getElementById('title').value.trim(),
            description: document.getElementById('description').value.trim(),
            address: document.getElementById('address').value.trim(),
            city: document.getElementById('city').value.trim(),
            property_type: document.getElementById('property_type').value,
            amenities: document.getElementById('amenities').value.trim(),
            status: document.getElementById('status').value
        };
        
        // Validate required fields
        if (!formData.title || !formData.description || !formData.address || 
            !formData.city || !formData.property_type) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Validate rooms
        const roomEntries = document.querySelectorAll('.room-entry');
        if (roomEntries.length === 0) {
            showNotification('Please add at least one room', 'error');
            return;
        }
        
        // Collect room data
        formData.rooms = [];
        roomEntries.forEach(function(roomEntry) {
            const roomNumber = roomEntry.querySelector('input[name*="[room_number]"]').value.trim();
            const roomType = roomEntry.querySelector('select[name*="[room_type]"]').value;
            const price = roomEntry.querySelector('input[name*="[price]"]').value;
            const bedrooms = roomEntry.querySelector('input[name*="[bedrooms]"]').value;
            const bathrooms = roomEntry.querySelector('input[name*="[bathrooms]"]').value;
            const roomAmenities = roomEntry.querySelector('input[name*="[room_amenities]"]').value.trim();
            const status = roomEntry.querySelector('select[name*="[status]"]').value;
            const roomId = roomEntry.dataset.roomId;
            
            if (roomNumber && roomType && price) {
                formData.rooms.push({
                    id: roomId || null, // null for new rooms
                    room_number: roomNumber,
                    room_type: roomType,
                    price: parseFloat(price),
                    bedrooms: parseInt(bedrooms),
                    bathrooms: parseInt(bathrooms),
                    room_amenities: roomAmenities,
                    status: status
                });
            }
        });
        
        if (formData.rooms.length === 0) {
            showNotification('Please fill in all required room information', 'error');
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
                setTimeout(function() {
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

// Notification function
function showNotification(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.style.display = 'block';
    
    setTimeout(function() {
        messageDiv.style.display = 'none';
    }, 5000);
}