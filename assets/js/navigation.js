// Navigation Management
document.addEventListener('DOMContentLoaded', function() {
    updateNavigation();
});

function updateNavigation() {
    const user = sessionStorage.getItem('LoggedInUser');
    const userRole = sessionStorage.getItem('UserRole');
    const userName = sessionStorage.getItem('UserName');
    
    const loginLink = document.getElementById('loginLink');
    const tenantDashboardLink = document.getElementById('tenantDashboardLink');
    const landlordDashboardLink = document.getElementById('landlordDashboardLink');
    
    if (user && userRole) {
        // User is logged in
        if (loginLink) loginLink.style.display = 'none';
        
        if (userRole === 'tenant' && tenantDashboardLink) {
            tenantDashboardLink.style.display = 'inline';
            if (userName) {
                tenantDashboardLink.innerHTML = `👤 ${userName}`;
            }
        } else if (userRole === 'landlord' && landlordDashboardLink) {
            landlordDashboardLink.style.display = 'inline';
            if (userName) {
                landlordDashboardLink.innerHTML = `👤 ${userName}`;
            }
        }
    } else {
        // User is not logged in
        if (tenantDashboardLink) tenantDashboardLink.style.display = 'none';
        if (landlordDashboardLink) landlordDashboardLink.style.display = 'none';
        if (loginLink) loginLink.style.display = 'inline';
    }
    
    // Set active page
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.clear();
        localStorage.removeItem('rememberMe');
        window.location.href = 'index.html';
    }
}