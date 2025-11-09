document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addPropertyForm');
    const messageDiv = document.getElementById('message');
    const submitBtn = document.getElementById('submitBtn');
    const buttonText = document.getElementById('buttonText');
    const imageInput = document.getElementById('images');
    const imagePreview = document.getElementById('imagePreview');
    const roomsContainer = document.getElementById('roomsContainer');
    const addRoomBtn = document.getElementById('addRoomBtn');
    let roomCount = 0;

    // Initialize room management
    initializeRoomManagement();

    function initializeRoomManagement() {
        // Add first room by default
        addRoom();

        addRoomBtn.addEventListener('click', addRoom);
    }

    function addRoom() {
        roomCount++;
        const roomDiv = document.createElement('div');
        roomDiv.className = 'room-entry';
        
        roomDiv.innerHTML = `
            <h4>Room ${roomCount}</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>Room Number/Name *</label>
                    <input type="text" name="rooms[${roomCount}][room_number]" required placeholder="e.g., 101, Room A">
                </div>
                <div class="form-group">
                    <label>Room Type *</label>
                    <select name="rooms[${roomCount}][room_type]" required>
                        <option value="">Select Room Type</option>
                        <option value="single">Single Room</option>
                        <option value="double">Double Room</option>
                        <option value="shared">Shared Room</option>
                        <option value="studio">Studio</option>
                        <option value="master">Master Suite</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Monthly Price (R) *</label>
                    <input type="number" name="rooms[${roomCount}][price]" required min="1" placeholder="4500">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Bedrooms *</label>
                    <input type="number" name="rooms[${roomCount}][bedrooms]" value="1" min="1" required>
                </div>
                <div class="form-group">
                    <label>Bathrooms *</label>
                    <input type="number" name="rooms[${roomCount}][bathrooms]" value="1" min="1" required>
                </div>
            </div>
            <div class="form-group">
                <label>Room-specific Amenities</label>
                <input type="text" name="rooms[${roomCount}][room_amenities]" placeholder="Desk, Wardrobe, Private Bathroom, etc.">
            </div>
            ${roomCount > 1 ? '<button type="button" class="btn-remove-room">Remove This Room</button>' : ''}
        `;
        
        roomsContainer.appendChild(roomDiv);

        // Add remove functionality
        const removeBtn = roomDiv.querySelector('.btn-remove-room');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                if (roomCount > 1) {
                    roomDiv.remove();
                    roomCount--;
                } else {
                    showMessage('Your property must have at least one room.', 'error');
                }
            });
        }
    }

    // Image preview functionality
    imageInput.addEventListener('change', function() {
        imagePreview.innerHTML = '';
        if (this.files && this.files.length > 0) {
            [...this.files].forEach(file => {
                const reader = new FileReader();
                reader.onload = e => {
                    const preview = document.createElement('div');
                    preview.innerHTML = `
                        <img src="${e.target.result}" alt="Image preview">
                        <span onclick="this.parentElement.remove()">×</span>
                    `;
                    imagePreview.appendChild(preview);
                };
                reader.readAsDataURL(file);
            });
        }
    });

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate at least one room
        if (roomCount === 0) {
            showMessage('Please add at least one room to your property.', 'error');
            return;
        }

        submitBtn.disabled = true;
        buttonText.innerHTML = '<span class="spinner"></span> Adding Property...';

        const formData = new FormData(form);

        try {
            console.log('Submitting property data...');
            
            const response = await fetch('http://localhost/UniStay---Website/backend/api/properties/create.php', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });

            console.log('Response status:', response.status);
            
            const data = await response.json();
            console.log('Response data:', data);
            
            if (data.success) {
                showMessage(data.message, 'success');
                form.reset();
                roomsContainer.innerHTML = '';
                imagePreview.innerHTML = '';
                // Reset and add first room
                roomCount = 0;
                addRoom();
                
                setTimeout(() => {
                    window.location.href = 'landlord-dashboard.html';
                }, 2000);
            } else {
                showMessage(data.error || 'Failed to add property', 'error');
                console.error('Server error:', data.error);
            }
        } catch (err) {
            console.error('Network error:', err);
            showMessage('Network error: ' + err.message, 'error');
        } finally {
            submitBtn.disabled = false;
            buttonText.textContent = 'Add Property';
        }
    });

    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = type;
        messageDiv.style.display = 'block';
        setTimeout(() => messageDiv.style.display = 'none', 5000);
    }

    // Logout functionality
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = 'index.html';
        });
    }
});