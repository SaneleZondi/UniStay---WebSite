

// Complete Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.currentTab = 'dashboard';
        this.currentTheme = localStorage.getItem('admin-theme') || 'light';
        this.charts = {};
        this.data = {
            users: [],
            properties: [],
            bookings: [],
            reviews: [],
            payments: []
        };
        this.init();
    }

    init() {
        this.checkAdminAuth();
        this.setupTheme();
        this.setupEventListeners();
        this.loadDashboardData();
        this.updateUserInfo();
        this.loadSettings();
    }

    checkAdminAuth() {
        const loggedInUser = sessionStorage.getItem('LoggedInUser');
        const userRole = sessionStorage.getItem('UserRole');
        
        if (!loggedInUser || userRole !== 'admin') {
            showNotification('Access denied. Admin privileges required.', 'error');
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 2000);
            throw new Error('Admin access required');
        }
    }

    setupTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.innerHTML = this.currentTheme === 'dark' 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = item.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // Search functionality
        this.setupSearchHandlers();
        
        // Filter changes
        this.setupFilterHandlers();

        // User menu
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.addEventListener('click', () => {
                this.showUserMenu();
            });
        }

        // Modal close
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.hideModal();
            }
        });

        // Export buttons
        document.getElementById('exportUsers')?.addEventListener('click', () => this.exportUsers());
        document.getElementById('exportBookings')?.addEventListener('click', () => this.exportBookings());
    }

    setupSearchHandlers() {
        const searchFields = ['userSearch', 'propertySearch', 'bookingSearch', 'reviewSearch', 'paymentSearch'];
        searchFields.forEach(field => {
            const element = document.getElementById(field);
            if (element) {
                element.addEventListener('input', this.debounce(() => {
                    const tab = field.replace('Search', '');
                    this.loadTabData(tab);
                }, 300));
            }
        });
    }

    setupFilterHandlers() {
        const filters = {
            'userRoleFilter': 'users',
            'userStatusFilter': 'users',
            'propertyStatusFilter': 'properties',
            'bookingStatusFilter': 'bookings',
            'reviewStatusFilter': 'reviews',
            'paymentStatusFilter': 'payments',
            'paymentTypeFilter': 'payments'
        };

        Object.entries(filters).forEach(([filter, tab]) => {
            const element = document.getElementById(filter);
            if (element) {
                element.addEventListener('change', () => this.loadTabData(tab));
            }
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNav = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeNav) activeNav.classList.add('active');
        
        // Show active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const activeTab = document.getElementById(tabName);
        if (activeTab) activeTab.classList.add('active');
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }

    loadTabData(tabName) {
        switch(tabName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'properties':
                this.loadProperties();
                break;
            case 'bookings':
                this.loadBookings();
                break;
            case 'reviews':
                this.loadReviews();
                break;
            case 'payments':
                this.loadPayments();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }

    async loadDashboardData() {
        try {
            const response = await apiRequest('admin/statistics.php');
            
            if (response.success) {
                this.updateDashboardStats(response.stats);
                this.createAnalyticsChart(response.analytics);
                this.displayRecentActivity(response.stats.recent_activity);
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            console.error('Error loading dashboard data:', err);
            showNotification('Error loading dashboard data', 'error');
        }
    }

    updateDashboardStats(stats) {
    // Update all stat cards
    const statElements = {
        'totalUsers': stats.users?.total_users || 0,
        'totalProperties': stats.properties?.total_properties || 0,
        'activeBookings': stats.bookings?.approved_bookings || 0,
        'totalRevenue': `R${(stats.bookings?.completed_revenue || 0).toLocaleString()}`,
        'pendingBookings': stats.bookings?.pending_bookings || 0
    };

    Object.entries(statElements).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (element) element.textContent = value;
    });
}

    createAnalyticsChart(analytics) {
    const ctx = document.getElementById('analyticsChart');
    if (!ctx) return;

    if (this.charts.analytics) {
        this.charts.analytics.destroy();
    }

    // Ensure we have valid data
    const labels = analytics?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const usersData = analytics?.users || [10, 15, 12, 18, 22, 25];
    const propertiesData = analytics?.properties || [5, 8, 6, 10, 12, 15];
    const bookingsData = analytics?.bookings || [8, 12, 10, 15, 18, 20];

    this.charts.analytics = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Users',
                    data: usersData,
                    borderColor: '#1a237e',
                    backgroundColor: 'rgba(26, 35, 126, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'Properties',
                    data: propertiesData,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                },
                {
                    label: 'Bookings',
                    data: bookingsData,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Monthly Analytics Overview'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            }
        }
    });

    this.createUserDistributionChart();
}

    createUserDistributionChart() {
        const ctx = document.getElementById('userDistributionChart');
        if (!ctx) return;

        if (this.charts.userDistribution) {
            this.charts.userDistribution.destroy();
        }

        // Get user distribution from stats
        const userData = this.data.users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, { tenant: 0, landlord: 0, admin: 0 });

        this.charts.userDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Tenants', 'Landlords', 'Admins'],
                datasets: [{
                    data: [userData.tenant, userData.landlord, userData.admin],
                    backgroundColor: [
                        '#2ecc71',
                        '#3498db',
                        '#1a237e'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    displayRecentActivity(logs) {
        const tbody = document.getElementById('recentActivityTable');
        if (!tbody) return;

        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No recent activity</td></tr>';
            return;
        }

        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 32px; height: 32px; border-radius: 50%; background: #1a237e; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">
                            ${log.user_name ? log.user_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div>
                            <div style="font-weight: 500;">${log.user_name || 'System'}</div>
                            <div style="font-size: 0.8rem; color: #666;">${log.user_email || ''}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${this.getActionColor(log.action)}">
                        ${log.action.replace(/_/g, ' ')}
                    </span>
                </td>
                <td>${log.description}</td>
                <td>${new Date(log.created_at).toLocaleString()}</td>
            </tr>
        `).join('');
    }

    // Enhanced User Management
    async loadUsers() {
        try {
            const roleFilter = document.getElementById('userRoleFilter')?.value;
            const statusFilter = document.getElementById('userStatusFilter')?.value;
            const searchTerm = document.getElementById('userSearch')?.value;

            const params = new URLSearchParams();
            if (roleFilter) params.append('role', roleFilter);
            if (statusFilter) params.append('status', statusFilter);
            if (searchTerm) params.append('search', searchTerm);

            const response = await apiRequest(`admin/users.php?${params}`);
            
            if (response.success) {
                this.data.users = response.users;
                this.displayUsers(response.users);
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            console.error('Error loading users:', err);
            showNotification('Error loading users', 'error');
        }
    }

    displayUsers(users) {
        const tbody = document.getElementById('usersTable');
        if (!tbody) return;

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.8rem;">
                            ${user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span>${user.name || 'Unknown User'}</span>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <select class="role-select" data-user-id="${user.id}" onchange="adminDashboard.updateUserRole(${user.id}, this.value)">
                        <option value="tenant" ${user.role === 'tenant' ? 'selected' : ''}>Tenant</option>
                        <option value="landlord" ${user.role === 'landlord' ? 'selected' : ''}>Landlord</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                        <span class="status-badge ${user.is_verified ? 'verified' : 'pending'}">
                            ${user.is_verified ? 'Verified' : 'Unverified'}
                        </span>
                        ${user.is_locked ? '<span class="status-badge inactive">Locked</span>' : ''}
                    </div>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon" onclick="adminDashboard.viewUserDetails(${user.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!user.is_verified ? `
                            <button class="btn-icon" onclick="adminDashboard.verifyUser(${user.id})" title="Verify">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : `
                            <button class="btn-icon" onclick="adminDashboard.unverifyUser(${user.id})" title="Unverify">
                                <i class="fas fa-times"></i>
                            </button>
                        `}
                        ${user.is_locked ? `
                            <button class="btn-icon" onclick="adminDashboard.unlockUser(${user.id})" title="Unlock">
                                <i class="fas fa-unlock"></i>
                            </button>
                        ` : `
                            <button class="btn-icon delete" onclick="adminDashboard.lockUser(${user.id})" title="Lock">
                                <i class="fas fa-lock"></i>
                            </button>
                        `}
                        <button class="btn-icon delete" onclick="adminDashboard.deleteUser(${user.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async updateUserRole(userId, newRole) {
        try {
            const response = await apiRequest('admin/users.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'update_role',
                    user_id: userId,
                    new_role: newRole
                })
            });
            
            if (response.success) {
                showNotification('User role updated successfully', 'success');
                this.loadUsers();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error updating user role: ' + err.message, 'error');
            // Reload to reset the select
            this.loadUsers();
        }
    }

    async verifyUser(userId) {
        try {
            const response = await apiRequest('admin/users.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'verify',
                    user_id: userId
                })
            });
            
            if (response.success) {
                showNotification('User verified successfully', 'success');
                this.loadUsers();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error verifying user: ' + err.message, 'error');
        }
    }

    async unverifyUser(userId) {
        if (!confirm('Are you sure you want to unverify this user?')) return;
        
        try {
            const response = await apiRequest('admin/users.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'unverify',
                    user_id: userId
                })
            });
            
            if (response.success) {
                showNotification('User unverified successfully', 'success');
                this.loadUsers();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error unverifying user: ' + err.message, 'error');
        }
    }

    async lockUser(userId) {
        if (!confirm('Are you sure you want to lock this user?')) return;
        
        try {
            const response = await apiRequest('admin/users.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'lock',
                    user_id: userId
                })
            });
            
            if (response.success) {
                showNotification('User locked successfully', 'success');
                this.loadUsers();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error locking user: ' + err.message, 'error');
        }
    }

    async unlockUser(userId) {
        try {
            const response = await apiRequest('admin/users.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'unlock',
                    user_id: userId
                })
            });
            
            if (response.success) {
                showNotification('User unlocked successfully', 'success');
                this.loadUsers();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error unlocking user: ' + err.message, 'error');
        }
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        
        try {
            const response = await apiRequest('admin/users.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'delete',
                    user_id: userId
                })
            });
            
            if (response.success) {
                showNotification('User deleted successfully', 'success');
                this.loadUsers();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error deleting user: ' + err.message, 'error');
        }
    }
	
	async viewUserDetails(userId) {
    try {
        // First get user basic info
        const userResponse = await apiRequest(`admin/users.php?user_id=${userId}`);
        
        if (!userResponse.success) {
            throw new Error(userResponse.error);
        }
        
        const user = userResponse.users.find(u => u.id == userId) || userResponse.users[0];
        
        // Get user statistics
        const statsResponse = await apiRequest(`admin/statistics.php?user_id=${userId}`);
        
        // Create modal with user details
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>User Details</h3>
                    <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="user-details-grid">
                        <div class="detail-section">
                            <h4>Basic Information</h4>
                            <div class="detail-item">
                                <label>Name:</label>
                                <span>${user.name}</span>
                            </div>
                            <div class="detail-item">
                                <label>Email:</label>
                                <span>${user.email}</span>
                            </div>
                            <div class="detail-item">
                                <label>Role:</label>
                                <span class="role-badge ${user.role}">${user.role}</span>
                            </div>
                            <div class="detail-item">
                                <label>Phone:</label>
                                <span>${user.phone || 'Not provided'}</span>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4>Account Status</h4>
                            <div class="detail-item">
                                <label>Verified:</label>
                                <span class="status-badge ${user.is_verified ? 'verified' : 'pending'}">
                                    ${user.is_verified ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <label>Locked:</label>
                                <span class="status-badge ${user.is_locked ? 'inactive' : 'active'}">
                                    ${user.is_locked ? 'Yes' : 'No'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <label>Last Login:</label>
                                <span>${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Joined:</label>
                                <span>${new Date(user.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                        
                        ${user.first_name || user.last_name ? `
                        <div class="detail-section">
                            <h4>Profile Information</h4>
                            ${user.first_name ? `<div class="detail-item">
                                <label>First Name:</label>
                                <span>${user.first_name}</span>
                            </div>` : ''}
                            ${user.last_name ? `<div class="detail-item">
                                <label>Last Name:</label>
                                <span>${user.last_name}</span>
                            </div>` : ''}
                            ${user.institution ? `<div class="detail-item">
                                <label>Institution:</label>
                                <span>${user.institution}</span>
                            </div>` : ''}
                            ${user.course ? `<div class="detail-item">
                                <label>Course:</label>
                                <span>${user.course}</span>
                            </div>` : ''}
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (err) {
        console.error('Error loading user details:', err);
        showNotification('Error loading user details: ' + err.message, 'error');
    }
}

    //Property Management
async loadProperties() {
    try {
        const statusFilter = document.getElementById('propertyStatusFilter')?.value;
        const searchTerm = document.getElementById('propertySearch')?.value;

        const params = new URLSearchParams();
        if (statusFilter) params.append('status', statusFilter);
        if (searchTerm) params.append('search', searchTerm);

        const response = await apiRequest(`admin/properties.php?${params}`);
        
        if (response.success) {
            this.data.properties = response.properties;
            this.displayProperties(response.properties);
        } else {
            throw new Error(response.error);
        }
    } catch (err) {
        console.error('Error loading properties:', err);
        showNotification('Error loading properties', 'error');
    }
}

displayProperties(properties) {
    const tbody = document.getElementById('propertiesTable');
    if (!tbody) return;

    if (!properties || properties.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">No properties found</td></tr>';
        return;
    }

    tbody.innerHTML = properties.map(property => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    ${property.primary_image ? 
                        `<img src="${property.primary_image}" alt="${property.title}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">` : 
                        `<div style="width: 40px; height: 40px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-home"></i>
                        </div>`
                    }
                    <div>
                        <div style="font-weight: 500;">${property.title}</div>
                        <div style="font-size: 0.8rem; color: #666;">${property.property_type}</div>
                    </div>
                </div>
            </td>
            <td>
                <div>${property.landlord_name}</div>
                <div style="font-size: 0.8rem; color: #666;">${property.landlord_email}</div>
            </td>
            <td>${property.city}</td>
            <td>
                ${property.min_price ? `R${property.min_price}${property.max_price ? ' - R' + property.max_price : ''}` : 'No rooms'}
            </td>
            <td>
                <span class="status-badge ${property.status}">
                    ${property.status}
                </span>
                <div style="font-size: 0.8rem; color: #666;">
                    ${property.available_rooms || 0}/${property.total_rooms || 0} rooms available
                </div>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon" onclick="adminDashboard.viewPropertyDetails(${property.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon delete" onclick="adminDashboard.deleteProperty(${property.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Add missing property methods
async viewPropertyDetails(propertyId) {
    try {
        const response = await apiRequest(`../api/properties/read.php?id=${propertyId}`);
        
        if (response.success) {
            const property = response.property || response.data;
            this.showPropertyModal(property);
        } else {
            throw new Error(response.error);
        }
    } catch (err) {
        console.error('Error loading property details:', err);
        showNotification('Error loading property details: ' + err.message, 'error');
    }
}

async deleteProperty(propertyId) {
    if (!confirm('Are you sure you want to delete this property? This will also delete all associated rooms and bookings.')) return;
    
    try {
        const response = await apiRequest(`../api/properties/delete.php?id=${propertyId}`, {
            method: 'DELETE'
        });
        
        if (response.success) {
            showNotification('Property deleted successfully', 'success');
            this.loadProperties();
        } else {
            throw new Error(response.error);
        }
    } catch (err) {
        showNotification('Error deleting property: ' + err.message, 'error');
    }
}

showPropertyModal(property) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3>Property Details</h3>
                <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="property-details">
                    <div class="property-images">
                        ${property.images && property.images.length > 0 ? 
                            property.images.map(img => `<img src="${img}" alt="Property image" style="max-width: 100%; margin-bottom: 10px;">`).join('') : 
                            '<p>No images available</p>'
                        }
                    </div>
                    <div class="property-info">
                        <h4>${property.title}</h4>
                        <p><strong>Location:</strong> ${property.address}, ${property.city}</p>
                        <p><strong>Type:</strong> ${property.property_type}</p>
                        <p><strong>Description:</strong> ${property.description}</p>
                        <p><strong>Amenities:</strong> ${property.amenities || 'None specified'}</p>
                        <p><strong>Status:</strong> <span class="status-badge ${property.status}">${property.status}</span></p>
                        <p><strong>Landlord:</strong> ${property.landlord_name} (${property.landlord_email})</p>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

    // Bookings Management
    async loadBookings() {
        try {
            const statusFilter = document.getElementById('bookingStatusFilter')?.value;
            const searchTerm = document.getElementById('bookingSearch')?.value;

            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (searchTerm) params.append('search', searchTerm);

            const response = await apiRequest(`admin/bookings.php?${params}`);
            
            if (response.success) {
                this.data.bookings = response.bookings;
                this.displayBookings(response.bookings);
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            console.error('Error loading bookings:', err);
            showNotification('Error loading bookings', 'error');
        }
    }

    displayBookings(bookings) {
        const tbody = document.getElementById('bookingsTable');
        if (!tbody) return;

        if (!bookings || bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">No bookings found</td></tr>';
            return;
        }

        tbody.innerHTML = bookings.map(booking => `
            <tr>
                <td>${booking.property_title}</td>
                <td>${booking.tenant_name || booking.guest_name || 'N/A'}</td>
                <td>${booking.landlord_name}</td>
                <td>${new Date(booking.check_in).toLocaleDateString()} - ${new Date(booking.check_out).toLocaleDateString()}</td>
                <td>R${booking.total_price}</td>
                <td>
                    <span class="status-badge ${booking.status}">
                        ${booking.status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${booking.status === 'pending' ? `
                            <button class="btn-icon" onclick="adminDashboard.approveBooking(${booking.id})" title="Approve">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn-icon delete" onclick="adminDashboard.rejectBooking(${booking.id})" title="Reject">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                        ${booking.status === 'approved' ? `
                            <button class="btn-icon" onclick="adminDashboard.completeBooking(${booking.id})" title="Complete">
                                <i class="fas fa-flag-checkered"></i>
                            </button>
                            <button class="btn-icon delete" onclick="adminDashboard.cancelBooking(${booking.id})" title="Cancel">
                                <i class="fas fa-ban"></i>
                            </button>
                        ` : ''}
                        <button class="btn-icon" onclick="adminDashboard.viewBookingDetails(${booking.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async approveBooking(bookingId) {
        if (!confirm('Are you sure you want to approve this booking?')) return;
        
        try {
            const response = await apiRequest('admin/bookings.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'approve',
                    booking_id: bookingId
                })
            });
            
            if (response.success) {
                showNotification('Booking approved successfully', 'success');
                this.loadBookings();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error approving booking: ' + err.message, 'error');
        }
    }

    async rejectBooking(bookingId) {
        if (!confirm('Are you sure you want to reject this booking?')) return;
        
        try {
            const response = await apiRequest('admin/bookings.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'reject',
                    booking_id: bookingId
                })
            });
            
            if (response.success) {
                showNotification('Booking rejected successfully', 'success');
                this.loadBookings();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error rejecting booking: ' + err.message, 'error');
        }
    }

    async completeBooking(bookingId) {
        if (!confirm('Are you sure you want to mark this booking as completed?')) return;
        
        try {
            const response = await apiRequest('admin/bookings.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'complete',
                    booking_id: bookingId
                })
            });
            
            if (response.success) {
                showNotification('Booking marked as completed', 'success');
                this.loadBookings();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error completing booking: ' + err.message, 'error');
        }
    }

    async cancelBooking(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking?')) return;
        
        try {
            const response = await apiRequest('admin/bookings.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'cancel',
                    booking_id: bookingId
                })
            });
            
            if (response.success) {
                showNotification('Booking cancelled successfully', 'success');
                this.loadBookings();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error cancelling booking: ' + err.message, 'error');
        }
    }

    // Add missing booking details method
    async viewBookingDetails(bookingId) {
        try {
            const booking = this.data.bookings.find(b => b.id == bookingId);
            if (!booking) {
                showNotification('Booking not found', 'error');
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>Booking Details #${booking.id}</h3>
                        <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="booking-details">
                            <div class="detail-section">
                                <h4>Booking Information</h4>
                                <div class="detail-item">
                                    <label>Property:</label>
                                    <span>${booking.property_title}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Tenant:</label>
                                    <span>${booking.tenant_name || booking.guest_name}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Landlord:</label>
                                    <span>${booking.landlord_name}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Dates:</label>
                                    <span>${new Date(booking.check_in).toLocaleDateString()} to ${new Date(booking.check_out).toLocaleDateString()}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Duration:</label>
                                    <span>${booking.duration} months</span>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h4>Payment Information</h4>
                                <div class="detail-item">
                                    <label>Monthly Rate:</label>
                                    <span>R${booking.monthly_rate}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Subtotal:</label>
                                    <span>R${booking.subtotal}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Deposit:</label>
                                    <span>R${booking.deposit_amount}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Service Fee:</label>
                                    <span>R${booking.service_fee}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Total Price:</label>
                                    <span><strong>R${booking.total_price}</strong></span>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h4>Status</h4>
                                <div class="detail-item">
                                    <label>Current Status:</label>
                                    <span class="status-badge ${booking.status}">${booking.status}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Created:</label>
                                    <span>${new Date(booking.created_at).toLocaleString()}</span>
                                </div>
                                ${booking.updated_at && booking.updated_at !== booking.created_at ? `
                                <div class="detail-item">
                                    <label>Last Updated:</label>
                                    <span>${new Date(booking.updated_at).toLocaleString()}</span>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
        } catch (err) {
            console.error('Error loading booking details:', err);
            showNotification('Error loading booking details: ' + err.message, 'error');
        }
    }

    // Reviews Management
    async loadReviews() {
        try {
            const statusFilter = document.getElementById('reviewStatusFilter')?.value;
            const searchTerm = document.getElementById('reviewSearch')?.value;

            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (searchTerm) params.append('search', searchTerm);

            const response = await apiRequest(`admin/reviews.php?${params}`);
            
            if (response.success) {
                this.data.reviews = response.reviews;
                this.displayReviews(response.reviews);
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            console.error('Error loading reviews:', err);
            showNotification('Error loading reviews', 'error');
        }
    }

    displayReviews(reviews) {
        const tbody = document.getElementById('reviewsTable');
        if (!tbody) return;

        if (!reviews || reviews.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No reviews found</td></tr>';
            return;
        }

        tbody.innerHTML = reviews.map(review => `
            <tr>
                <td>${review.property_title}</td>
                <td>${review.tenant_name}</td>
                <td>
                    <div class="star-rating">
                        ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                    </div>
                </td>
                <td>${review.comment ? (review.comment.length > 100 ? review.comment.substring(0, 100) + '...' : review.comment) : 'No comment'}</td>
                <td>
                    <span class="status-badge ${review.is_approved ? 'verified' : 'pending'}">
                        ${review.is_approved ? 'Approved' : 'Pending'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${!review.is_approved ? `
                            <button class="btn-icon" onclick="adminDashboard.approveReview(${review.id})" title="Approve">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : `
                            <button class="btn-icon delete" onclick="adminDashboard.rejectReview(${review.id})" title="Reject">
                                <i class="fas fa-times"></i>
                            </button>
                        `}
                        <button class="btn-icon delete" onclick="adminDashboard.deleteReview(${review.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async approveReview(reviewId) {
        if (!confirm('Are you sure you want to approve this review?')) return;
        
        try {
            const response = await apiRequest('admin/reviews.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'approve',
                    review_id: reviewId
                })
            });
            
            if (response.success) {
                showNotification('Review approved successfully', 'success');
                this.loadReviews();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error approving review: ' + err.message, 'error');
        }
    }

    async rejectReview(reviewId) {
        if (!confirm('Are you sure you want to reject this review?')) return;
        
        try {
            const response = await apiRequest('admin/reviews.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'reject',
                    review_id: reviewId
                })
            });
            
            if (response.success) {
                showNotification('Review rejected successfully', 'success');
                this.loadReviews();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error rejecting review: ' + err.message, 'error');
        }
    }

    async deleteReview(reviewId) {
        if (!confirm('Are you sure you want to delete this review?')) return;
        
        try {
            const response = await apiRequest('admin/reviews.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'delete',
                    review_id: reviewId
                })
            });
            
            if (response.success) {
                showNotification('Review deleted successfully', 'success');
                this.loadReviews();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error deleting review: ' + err.message, 'error');
        }
    }

    // Payments Management
    async loadPayments() {
        try {
            const statusFilter = document.getElementById('paymentStatusFilter')?.value;
            const typeFilter = document.getElementById('paymentTypeFilter')?.value;
            const searchTerm = document.getElementById('paymentSearch')?.value;

            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (typeFilter) params.append('type', typeFilter);
            if (searchTerm) params.append('search', searchTerm);

            const response = await apiRequest(`admin/payments.php?${params}`);
            
            if (response.success) {
                this.data.payments = response.payments;
                this.displayPayments(response.payments, response.totals);
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            console.error('Error loading payments:', err);
            showNotification('Error loading payments', 'error');
        }
    }

    displayPayments(payments, totals) {
        const tbody = document.getElementById('paymentsTable');
        if (!tbody) return;

        // Update payment totals
        if (totals) {
            const totalCount = document.getElementById('totalPaymentsCount');
            const totalAmount = document.getElementById('totalPaymentsAmount');
            const completedAmount = document.getElementById('completedPaymentsAmount');
            
            if (totalCount) totalCount.textContent = totals.total_count;
            if (totalAmount) totalAmount.textContent = `R${totals.total_amount}`;
            if (completedAmount) completedAmount.textContent = `R${totals.completed_amount}`;
        }

        if (!payments || payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8">No payments found</td></tr>';
            return;
        }

        tbody.innerHTML = payments.map(payment => `
            <tr>
                <td>${payment.property_title}</td>
                <td>${payment.guest_name}</td>
                <td>R${payment.amount}</td>
                <td>
                    <span class="status-badge ${payment.payment_type}">
                        ${payment.payment_type}
                    </span>
                </td>
                <td>${payment.payment_method}</td>
                <td>
                    <span class="status-badge ${payment.status}">
                        ${payment.status}
                    </span>
                </td>
                <td>${payment.transaction_id || 'N/A'}</td>
                <td>
                    <div class="action-buttons">
                        ${payment.status === 'completed' && payment.payment_type !== 'refund' ? `
                            <button class="btn-icon delete" onclick="adminDashboard.refundPayment(${payment.id})" title="Refund">
                                <i class="fas fa-undo"></i>
                            </button>
                        ` : ''}
                        ${payment.status === 'pending' ? `
                            <button class="btn-icon" onclick="adminDashboard.markPaymentCompleted(${payment.id})" title="Mark Completed">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn-icon delete" onclick="adminDashboard.markPaymentFailed(${payment.id})" title="Mark Failed">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async refundPayment(paymentId) {
        const amount = prompt('Enter refund amount:');
        if (!amount || isNaN(amount)) return;
        
        try {
            const response = await apiRequest('admin/payments.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'refund',
                    payment_id: paymentId,
                    amount: parseFloat(amount)
                })
            });
            
            if (response.success) {
                showNotification('Refund processed successfully', 'success');
                this.loadPayments();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error processing refund: ' + err.message, 'error');
        }
    }

    async markPaymentCompleted(paymentId) {
        if (!confirm('Are you sure you want to mark this payment as completed?')) return;
        
        try {
            const response = await apiRequest('admin/payments.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'mark_completed',
                    payment_id: paymentId
                })
            });
            
            if (response.success) {
                showNotification('Payment marked as completed', 'success');
                this.loadPayments();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error updating payment: ' + err.message, 'error');
        }
    }

    async markPaymentFailed(paymentId) {
        if (!confirm('Are you sure you want to mark this payment as failed?')) return;
        
        try {
            const response = await apiRequest('admin/payments.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'mark_failed',
                    payment_id: paymentId
                })
            });
            
            if (response.success) {
                showNotification('Payment marked as failed', 'success');
                this.loadPayments();
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error updating payment: ' + err.message, 'error');
        }
    }

    // Analytics
    async loadAnalytics() {
        try {
            const response = await apiRequest('admin/statistics.php');
            
            if (response.success) {
                this.createAdvancedCharts(response.stats, response.analytics);
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            console.error('Error loading analytics:', err);
            showNotification('Error loading analytics', 'error');
        }
    }

    createAdvancedCharts(stats, analytics) {
    this.createRevenueChart(analytics);
    this.createBookingStatusChart(stats?.bookings);
    this.createUserGrowthChart(analytics);
	this.createPropertyPerformanceChart(stats.property_performance || []);
	 this.createRatingDistributionChart(stats.rating_distribution);
}

createRatingDistributionChart(ratingDistribution) {
    const ctx = document.getElementById('ratingDistributionChart');
    if (!ctx) return;

    if (this.charts.ratingDistribution) {
        this.charts.ratingDistribution.destroy();
    }

    const data = ratingDistribution ? [
        ratingDistribution['5_stars'] || 0,
        ratingDistribution['4_stars'] || 0,
        ratingDistribution['3_stars'] || 0,
        ratingDistribution['2_stars'] || 0,
        ratingDistribution['1_star'] || 0
    ] : [0, 0, 0, 0, 0];

    this.charts.ratingDistribution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'],
            datasets: [{
                label: 'Number of Reviews',
                data: data,
                backgroundColor: [
                    'rgba(46, 204, 113, 0.6)',
                    'rgba(52, 152, 219, 0.6)',
                    'rgba(241, 196, 15, 0.6)',
                    'rgba(230, 126, 34, 0.6)',
                    'rgba(231, 76, 60, 0.6)'
                ],
                borderColor: [
                    '#2ecc71',
                    '#3498db',
                    '#f1c40f',
                    '#e67e22',
                    '#e74c3c'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Review Rating Distribution'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Reviews'
                    }
                }
            }
        }
    });
}

createRevenueChart(analytics) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    if (this.charts.revenue) {
        this.charts.revenue.destroy();
    }

    const revenueData = analytics?.revenue || [1000, 1500, 1200, 1800, 2200, 2500];
    const labels = analytics?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

    this.charts.revenue = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Monthly Revenue',
                data: revenueData,
                backgroundColor: [
                    'rgba(46, 204, 113, 0.6)',
                    'rgba(52, 152, 219, 0.6)',
                    'rgba(155, 89, 182, 0.6)',
                    'rgba(52, 73, 94, 0.6)',
                    'rgba(241, 196, 15, 0.6)',
                    'rgba(230, 126, 34, 0.6)'
                ],
                borderColor: [
                    '#2ecc71',
                    '#3498db',
                    '#9b59b6',
                    '#34495e',
                    '#f1c40f',
                    '#e67e22'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Monthly Revenue (R)'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R' + value;
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            }
        }
    });
}

	
    createBookingStatusChart(bookings) {
        const ctx = document.getElementById('bookingStatusChart');
        if (!ctx) return;

        if (this.charts.bookingStatus) {
            this.charts.bookingStatus.destroy();
        }

        this.charts.bookingStatus = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Pending', 'Approved', 'Completed', 'Cancelled'],
                datasets: [{
                    data: [
                        bookings?.pending || 5,
                        bookings?.approved || 10,
                        bookings?.completed || 8,
                        bookings?.cancelled || 2
                    ],
                    backgroundColor: [
                        '#ffc107',
                        '#17a2b8',
                        '#28a745',
                        '#dc3545'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Booking Status Distribution'
                    }
                }
            }
        });
    }
	
	createPropertyPerformanceChart(propertyPerformance) {
    const ctx = document.getElementById('propertyPerformanceChart');
    if (!ctx) return;

    if (this.charts.propertyPerformance) {
        this.charts.propertyPerformance.destroy();
    }

    // Prepare data for chart
    const properties = propertyPerformance.map(p => p.title.length > 20 ? p.title.substring(0, 20) + '...' : p.title);
    const revenues = propertyPerformance.map(p => p.total_revenue || 0);
    const ratings = propertyPerformance.map(p => p.avg_rating || 0);
    const bookings = propertyPerformance.map(p => p.total_bookings || 0);

    this.charts.propertyPerformance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: properties,
            datasets: [
                {
                    label: 'Revenue (R)',
                    data: revenues,
                    backgroundColor: 'rgba(46, 204, 113, 0.6)',
                    borderColor: '#2ecc71',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Avg Rating',
                    data: ratings,
                    type: 'line',
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Top Properties by Revenue & Ratings'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label.includes('Revenue')) {
                                return `Revenue: R${context.parsed.y}`;
                            } else if (label.includes('Rating')) {
                                return `Rating: ${context.parsed.y}/5`;
                            }
                            return label + ': ' + context.parsed.y;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Revenue (R)'
                    },
                    ticks: {
                        callback: function(value) {
                            return 'R' + value;
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Average Rating'
                    },
                    min: 0,
                    max: 5,
                    grid: {
                        drawOnChartArea: false,
                    },
                }
            }
        }
    });
}


    createUserGrowthChart(analytics) {
    const ctx = document.getElementById('userGrowthChart');
    if (!ctx) return;

    if (this.charts.userGrowth) {
        this.charts.userGrowth.destroy();
    }

    const usersData = analytics?.users || [10, 15, 12, 18, 22, 25];
    const labels = analytics?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

    this.charts.userGrowth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'New Users',
                data: usersData,
                borderColor: '#1a237e',
                backgroundColor: 'rgba(26, 35, 126, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'User Growth Trend'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            }
        }
    });
}

    // Settings
    async loadSettings() {
        try {
            const response = await apiRequest('admin/system-settings.php');
            
            if (response.success) {
                this.displaySettings(response.settings);
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            console.error('Error loading settings:', err);
            showNotification('Error loading system settings', 'error');
        }
    }

    displaySettings(settings) {
        console.log('Settings loaded:', settings);
        // Implementation for displaying settings in the UI
    }

    async clearCache() {
        try {
            const response = await apiRequest('admin/system.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'clear_cache'
                })
            });
            
            if (response.success) {
                showNotification('Cache cleared successfully', 'success');
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error clearing cache: ' + err.message, 'error');
        }
    }

    async backupDatabase() {
        try {
            const response = await apiRequest('admin/system.php', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'backup_database'
                })
            });
            
            if (response.success) {
                showNotification('Database backup created successfully', 'success');
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error creating backup: ' + err.message, 'error');
        }
    }

    async viewSystemLogs() {
        try {
            const response = await apiRequest('admin/system.php?action=logs&limit=50');
            
            if (response.success) {
                this.displaySystemLogs(response.logs);
            } else {
                throw new Error(response.error);
            }
        } catch (err) {
            showNotification('Error loading system logs: ' + err.message, 'error');
        }
    }

    displaySystemLogs(logs) {
        // Create modal for system logs
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>System Logs</h3>
                    <button class="btn-icon" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                    ${logs && logs.length > 0 ? logs.map(log => `
                        <div class="log-entry">
                            <div class="log-header">
                                <span class="log-action">${log.action}</span>
                                <span class="log-time">${new Date(log.created_at).toLocaleString()}</span>
                            </div>
                            <div class="log-description">${log.description}</div>
                            <div class="log-user">User: ${log.user_name || 'System'}</div>
                        </div>
                    `).join('') : '<p>No system logs found</p>'}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Export functionality
    async exportUsers() {
        try {
            const users = this.data.users;
            const csv = this.convertToCSV(users, ['name', 'email', 'role', 'is_verified', 'created_at']);
            this.downloadCSV(csv, 'unistay_users.csv');
            showNotification('Users exported successfully', 'success');
        } catch (err) {
            showNotification('Error exporting users: ' + err.message, 'error');
        }
    }

    async exportBookings() {
        try {
            const bookings = this.data.bookings;
            const csv = this.convertToCSV(bookings, ['property_title', 'tenant_name', 'check_in', 'check_out', 'total_price', 'status']);
            this.downloadCSV(csv, 'unistay_bookings.csv');
            showNotification('Bookings exported successfully', 'success');
        } catch (err) {
            showNotification('Error exporting bookings: ' + err.message, 'error');
        }
    }

    convertToCSV(data, fields) {
        const headers = fields.join(',');
        const rows = data.map(item => 
            fields.map(field => {
                const value = item[field] || '';
                return `"${String(value).replace(/"/g, '""')}"`;
            }).join(',')
        );
        return [headers, ...rows].join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    // Utility methods
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    getActionColor(action) {
        const colors = {
            'user_login': 'active',
            'user_registered': 'active',
            'booking_created': 'pending',
            'property_created': 'active',
            'admin_action': 'verified',
            'payment_completed': 'verified'
        };
        return colors[action] || 'pending';
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('admin-theme', this.currentTheme);
        this.setupTheme();
    }

    debounce(func, wait) {
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

    updateUserInfo() {
        const userName = sessionStorage.getItem('UserName') || 'Admin';
        const userEmail = sessionStorage.getItem('LoggedInUser') || 'admin@unistay.com';
        
        const usernameElement = document.getElementById('username');
        const userAvatarElement = document.getElementById('userAvatar');
        
        if (usernameElement) usernameElement.textContent = userName;
        if (userAvatarElement) userAvatarElement.textContent = userName.charAt(0).toUpperCase();
    }

    showUserMenu() {
        const menu = document.createElement('div');
        menu.className = 'user-dropdown';
        menu.innerHTML = `
            <div class="dropdown-item" onclick="adminDashboard.viewProfile()">
                <i class="fas fa-user"></i> My Profile
            </div>
            <div class="dropdown-item" onclick="adminDashboard.logout()">
                <i class="fas fa-sign-out-alt"></i> Logout
            </div>
        `;
        
        // Position and show dropdown
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            menu.style.position = 'absolute';
            menu.style.top = userMenu.offsetTop + userMenu.offsetHeight + 'px';
            menu.style.right = '20px';
            menu.style.background = 'var(--admin-white)';
            menu.style.border = '1px solid var(--admin-border)';
            menu.style.borderRadius = 'var(--border-radius-md)';
            menu.style.boxShadow = 'var(--shadow-lg)';
            menu.style.zIndex = '1000';
            
            document.body.appendChild(menu);
            
            // Close on outside click
            setTimeout(() => {
                document.addEventListener('click', function closeMenu() {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                });
            }, 100);
        }
    }

    viewProfile() {
        showNotification('Profile view coming soon', 'info');
    }

    logout() {
        showNotification('Logging out...', 'info');
        sessionStorage.clear();
        localStorage.removeItem('session_token');
        document.cookie = 'session_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 1000);
    }

    hideModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }
}

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.adminDashboard = new AdminDashboard();
});

// Make methods globally available
window.switchTab = (tab) => window.adminDashboard.switchTab(tab);