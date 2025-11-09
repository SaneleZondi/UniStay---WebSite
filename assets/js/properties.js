const API_BASE_URL = 'http://localhost/UniStay---Website/backend/api';

let currentPage = 1;
const propertiesPerPage = 9;
let totalProperties = 0;
let allProperties = [];

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function loadProperties(page = 1) {
    try {
        currentPage = page;
        const propertyGrid = document.getElementById('propertyGrid');
        
        // Show loading state
        propertyGrid.innerHTML = '<div class="loading">Loading properties...</div>';

        // Build query string with ALL filters
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', propertiesPerPage);

        // Add search parameter
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim()) {
            params.append('search', searchInput.value.trim());
        }

        // Add filter parameters
        const cityFilter = document.getElementById('cityFilter');
        const minPriceFilter = document.getElementById('minPriceFilter');
        const maxPriceFilter = document.getElementById('maxPriceFilter');
        const roomTypeFilter = document.getElementById('roomTypeFilter');
        const bedroomsFilter = document.getElementById('bedroomsFilter');

        if (cityFilter && cityFilter.value.trim()) {
            params.append('city', cityFilter.value.trim());
        }
        if (minPriceFilter && minPriceFilter.value) {
            params.append('min_price', minPriceFilter.value);
        }
        if (maxPriceFilter && maxPriceFilter.value) {
            params.append('max_price', maxPriceFilter.value);
        }
        if (roomTypeFilter && roomTypeFilter.value) {
            params.append('room_type', roomTypeFilter.value);
        }
        if (bedroomsFilter && bedroomsFilter.value) {
            params.append('bedrooms', bedroomsFilter.value);
        }

        console.log('Search params:', params.toString());

        const response = await fetch(`${API_BASE_URL}/properties/read.php?${params}`);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown API error');
        }

        console.log('API Response:', result);
        
        // Handle response structure
        let properties = [];
        let total = 0;
        
        if (result.data) {
            properties = result.data;
            total = result.total || 0;
        } else {
            throw new Error('Unexpected API response format');
        }

        // Store properties for pagination
        allProperties = properties;
        totalProperties = total;

        // Update results count
        updateSearchResults();

        // Display properties
        displayProperties(allProperties);

        // Update pagination
        updatePagination();

    } catch (err) {
        console.error('Error loading properties:', err);
        const propertyGrid = document.getElementById('propertyGrid');
        propertyGrid.innerHTML = `
            <div class="error-message">
                <h3>Error Loading Properties</h3>
                <p>${err.message || 'Please try again later.'}</p>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                    If this continues, check if the server is running and the database is properly configured.
                </p>
                <button onclick="loadProperties()" class="btn-primary" style="margin-top: 10px;">Try Again</button>
            </div>
        `;
    }
}

async function updateRoomAvailability(propertyId) {
    try {
        const response = await fetch(`${API_BASE_URL}/properties/available-rooms.php?property_id=${propertyId}`);
        const result = await response.json();
        
        if (result.success) {
            return result.available_rooms;
        }
    } catch (err) {
        console.error('Error fetching room availability:', err);
    }
    return [];
}
function updateSearchResults() {
    const resultsElement = document.getElementById('searchResults');
    if (!resultsElement) return;
    
    const searchInput = document.getElementById('searchInput');
    const cityFilter = document.getElementById('cityFilter');
    const minPriceFilter = document.getElementById('minPriceFilter');
    const maxPriceFilter = document.getElementById('maxPriceFilter');
    const roomTypeFilter = document.getElementById('roomTypeFilter');
    const bedroomsFilter = document.getElementById('bedroomsFilter');
    
    const searchTerm = searchInput ? searchInput.value : '';
    const cityTerm = cityFilter ? cityFilter.value : '';
    const minPrice = minPriceFilter ? minPriceFilter.value : '';
    const maxPrice = maxPriceFilter ? maxPriceFilter.value : '';
    const roomType = roomTypeFilter ? roomTypeFilter.value : '';
    const bedrooms = bedroomsFilter ? bedroomsFilter.value : '';
    
    let resultsText = `Found ${totalProperties} propert${totalProperties === 1 ? 'y' : 'ies'}`;
    
    // Add active filter information
    const activeFilters = [];
    if (searchTerm) activeFilters.push(`search: "${searchTerm}"`);
    if (cityTerm) activeFilters.push(`city: ${cityTerm}`);
    if (minPrice) activeFilters.push(`min price: R${minPrice}`);
    if (maxPrice) activeFilters.push(`max price: R${maxPrice}`);
    if (roomType) activeFilters.push(`room type: ${roomType}`);
    if (bedrooms) activeFilters.push(`bedrooms: ${bedrooms}`);
    
    if (activeFilters.length > 0) {
        resultsText += ` with ${activeFilters.join(', ')}`;
    }
    
    resultsElement.textContent = resultsText;
}

// Enhanced properties display
function displayProperties(properties) {
    const propertyGrid = document.getElementById('propertyGrid');
    
    propertyGrid.innerHTML = properties.map(property => `
        <div class="property-card">
            <div class="property-image">
                <img src="${property.primary_image}" alt="${property.title}">
                <div class="property-status">
                    ${property.available_rooms} of ${property.total_rooms} rooms available
                </div>
                ${property.average_rating ? `
                    <div class="property-rating-badge">
                        ⭐ ${property.average_rating} (${property.total_reviews || 0})
                    </div>
                ` : ''}
            </div>
            <div class="property-content">
                <h3 class="property-title">${property.title}</h3>
                <p class="property-location">📍 ${property.city}, ${property.address}</p>
                
                <!-- Rating Display -->
                ${property.average_rating ? `
                    <div class="property-rating">
                        <div class="stars">${generateRatingStars(property.average_rating)}</div>
                        <span class="rating-text">${property.average_rating} • ${property.total_reviews || 0} reviews</span>
                    </div>
                ` : `
                    <div class="property-rating no-reviews">
                        <span class="rating-text">No reviews yet</span>
                    </div>
                `}
                
                <!-- Room Type Breakdown -->
                <div class="room-breakdown">
                    ${property.available_singles > 0 ? 
                        `<span class="room-type-tag">${property.available_singles} Single</span>` : ''}
                    ${property.available_doubles > 0 ? 
                        `<span class="room-type-tag">${property.available_doubles} Double</span>` : ''}
                    ${property.available_shared > 0 ? 
                        `<span class="room-type-tag">${property.available_shared} Shared</span>` : ''}
                    ${property.available_studios > 0 ? 
                        `<span class="room-type-tag">${property.available_studios} Studio</span>` : ''}
                </div>
                
                <div class="property-actions">
                    <a href="property-details.html?id=${property.id}" class="btn btn-primary">
                        View Available Rooms
                    </a>
                </div>
            </div>
        </div>
    `).join('');
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

function updateActiveFilters() {
    const searchInput = document.getElementById('searchInput');
    const cityFilter = document.getElementById('cityFilter');
    const minPriceFilter = document.getElementById('minPriceFilter');
    const maxPriceFilter = document.getElementById('maxPriceFilter');
    const roomTypeFilter = document.getElementById('roomTypeFilter');
    const bedroomsFilter = document.getElementById('bedroomsFilter');
    
    // Add/remove active class based on whether filters have values
    if (searchInput && searchInput.value.trim()) {
        searchInput.classList.add('search-active');
    } else {
        searchInput.classList.remove('search-active');
    }
    
    [cityFilter, minPriceFilter, maxPriceFilter, roomTypeFilter, bedroomsFilter].forEach(filter => {
        if (filter && filter.value) {
            filter.classList.add('filter-active');
        } else {
            filter.classList.remove('filter-active');
        }
    });
}

function truncateText(text, maxLength) {
    if (!text) return 'No description available';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function searchProperties() {
    loadProperties(1);
}

function clearFilters() {
    // Clear all filter inputs
    const searchInput = document.getElementById('searchInput');
    const cityFilter = document.getElementById('cityFilter');
    const minPriceFilter = document.getElementById('minPriceFilter');
    const maxPriceFilter = document.getElementById('maxPriceFilter');
    const roomTypeFilter = document.getElementById('roomTypeFilter');
    const bedroomsFilter = document.getElementById('bedroomsFilter');
    
    if (searchInput) searchInput.value = '';
    if (cityFilter) cityFilter.value = '';
    if (minPriceFilter) minPriceFilter.value = '';
    if (maxPriceFilter) maxPriceFilter.value = '';
    if (roomTypeFilter) roomTypeFilter.value = '';
    if (bedroomsFilter) bedroomsFilter.value = '';
    
    // Remove active styles
    updateActiveFilters();
    
    loadProperties(1);
}

function updatePagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(totalProperties / propertiesPerPage);

    if (totalPages <= 1) {
        if (pagination) pagination.style.display = 'none';
        return;
    }

    if (pagination) {
        pagination.style.display = 'flex';
        const pageInfo = document.getElementById('pageInfo');
        const prevPage = document.getElementById('prevPage');
        const nextPage = document.getElementById('nextPage');
        
        if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        if (prevPage) prevPage.disabled = currentPage === 1;
        if (nextPage) nextPage.disabled = currentPage === totalPages;
    }
}

function changePage(direction) {
    const newPage = currentPage + direction;
    if (newPage >= 1 && newPage <= Math.ceil(totalProperties / propertiesPerPage)) {
        loadProperties(newPage);
    }
}

// Load properties when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Properties page loaded');
    
    // Check authentication and update navigation
    const user = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    
    if (user) {
        const loginNav = document.getElementById('loginNav');
        const dashboardNav = document.getElementById('dashboardNav');
        const landlordDashboardNav = document.getElementById('landlordDashboardNav');
        
        if (loginNav) loginNav.style.display = 'none';
        
        if (userRole === 'tenant' && dashboardNav) {
            dashboardNav.style.display = 'inline';
        } else if (userRole === 'landlord' && landlordDashboardNav) {
            landlordDashboardNav.style.display = 'inline';
        }
    }
    
    loadProperties();
    
    // Set up event listeners for filters
    const searchInput = document.getElementById('searchInput');
    const cityFilter = document.getElementById('cityFilter');
    const minPriceFilter = document.getElementById('minPriceFilter');
    const maxPriceFilter = document.getElementById('maxPriceFilter');
    const roomTypeFilter = document.getElementById('roomTypeFilter');
    const bedroomsFilter = document.getElementById('bedroomsFilter');
    
    // Use debounced search for real-time filtering
    const debouncedSearch = debounce(() => loadProperties(1), 500);
    
    if (searchInput) {
        searchInput.addEventListener('input', debouncedSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loadProperties(1);
            }
        });
    }
    
    if (cityFilter) cityFilter.addEventListener('input', debouncedSearch);
    if (minPriceFilter) minPriceFilter.addEventListener('input', debouncedSearch);
    if (maxPriceFilter) maxPriceFilter.addEventListener('input', debouncedSearch);
    if (roomTypeFilter) roomTypeFilter.addEventListener('change', () => loadProperties(1));
    if (bedroomsFilter) bedroomsFilter.addEventListener('change', () => loadProperties(1));
});