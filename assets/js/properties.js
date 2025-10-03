

const API_BASE_URL = 'http://localhost/UniStay---Website/backend/api';

let currentPage = 1;
const propertiesPerPage = 9;
let totalProperties = 0;
let allProperties = [];

async function loadProperties(page = 1) {
    try {
        currentPage = page;
        const propertyGrid = document.getElementById('propertyGrid');
        
        // Show loading state
        propertyGrid.innerHTML = '<div class="loading">Loading properties...</div>';

        // Build query string
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', propertiesPerPage);

        const response = await fetch(`${API_BASE_URL}/properties/read.php?${params}`);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const result = await response.json();
        
        // Check if result has error property
        if (result.error) {
            throw new Error(result.error);
        }

        // Check the actual structure of the response
        console.log('API Response:', result);
        
        // Handle different response structures
        let properties = [];
        let total = 0;
        
        if (result.data) {
            // Response from search.php/read.php with pagination
            properties = result.data;
            total = result.total || 0;
        } else if (Array.isArray(result)) {
            // Response is directly an array
            properties = result;
            total = result.length;
        } else if (result.properties) {
            // Response has properties key
            properties = result.properties;
            total = result.total || properties.length;
        } else {
            throw new Error('Unexpected API response format');
        }

        // Store properties for pagination
        allProperties = properties;
        totalProperties = total;

        // Update results count
        const resultsElement = document.getElementById('searchResults');
        if (resultsElement) {
            resultsElement.textContent = `Found ${totalProperties} propert${totalProperties === 1 ? 'y' : 'ies'}`;
        }

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
                <p style="font-size: 12px; margin-top: 10px;">Check if your backend server is running on localhost.</p>
                <button onclick="loadProperties()" class="btn-primary" style="margin-top: 10px;">Try Again</button>
            </div>
        `;
    }
}

function displayProperties(properties) {
    const propertyGrid = document.getElementById('propertyGrid');

    if (properties.length === 0) {
        propertyGrid.innerHTML = `
            <div class="no-properties">
                <h3>No properties found</h3>
                <p>Try adjusting your search criteria or check back later for new listings.</p>
                <button onclick="clearFilters()" class="btn-primary">Clear All Filters</button>
            </div>
        `;
        return;
    }

    propertyGrid.innerHTML = '';

    properties.forEach(property => {
        const propertyCard = document.createElement('div');
        propertyCard.className = 'property-card';
        
        // Use your existing HTML structure
        propertyCard.innerHTML = `
            <div class="property-image">
                <img src="${property.primary_image || 'assets/default-property.jpg'}" 
                     alt="${property.title}" 
                     onerror="this.src='assets/default-property.jpg'">
                <div class="property-status ${property.status}">${property.status}</div>
            </div>
            <div class="property-info">
                <h3>${property.title}</h3>
                <p class="property-location">📍 ${property.city}, ${property.address}</p>
                <p class="property-price">R${property.price}/month</p>
                <div class="property-details">
                    <span>🛏️ ${property.bedrooms} bed${property.bedrooms !== 1 ? 's' : ''}</span>
                    <span>🚿 ${property.bathrooms} bath${property.bathrooms !== 1 ? 's' : ''}</span>
                </div>
                <p class="property-description">${truncateText(property.description, 100)}</p>
                <div class="property-actions">
                    <a href="property-details.html?id=${property.id}" class="btn-primary">View Details</a>
                    ${property.status === 'available' ? 
                        `<a href="booking.html?property_id=${property.id}" class="btn-secondary">Book Now</a>` :
                        `<button class="btn-disabled" disabled>${property.status}</button>`
                    }
                </div>
            </div>
        `;
        propertyGrid.appendChild(propertyCard);
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
    const bedroomsFilter = document.getElementById('bedroomsFilter');
    
    if (searchInput) searchInput.value = '';
    if (cityFilter) cityFilter.value = '';
    if (minPriceFilter) minPriceFilter.value = '';
    if (maxPriceFilter) maxPriceFilter.value = '';
    if (bedroomsFilter) bedroomsFilter.value = '';
    
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
    
    // Add filter listeners with debouncing
    const debouncedSearch = debounce(searchProperties, 300);
    
    const searchInput = document.getElementById('searchInput');
    const cityFilter = document.getElementById('cityFilter');
    const minPriceFilter = document.getElementById('minPriceFilter');
    const maxPriceFilter = document.getElementById('maxPriceFilter');
    const bedroomsFilter = document.getElementById('bedroomsFilter');
    
    if (searchInput) searchInput.addEventListener('input', debouncedSearch);
    if (cityFilter) cityFilter.addEventListener('input', debouncedSearch);
    if (minPriceFilter) minPriceFilter.addEventListener('input', debouncedSearch);
    if (maxPriceFilter) maxPriceFilter.addEventListener('input', debouncedSearch);
    if (bedroomsFilter) bedroomsFilter.addEventListener('change', searchProperties);
});

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