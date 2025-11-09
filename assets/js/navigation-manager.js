// navigation-manager.js
class NavigationManager {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    init() {
        this.updateNavigation();
        this.applyPageSpecificStyles();
        this.setupLogoutHandler();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop() || 'index.html';
        
        if (page.includes('booking')) return 'booking';
        if (page.includes('dashboard')) return 'dashboard';
        if (page.includes('landlord')) return 'landlord-dashboard';
        if (page.includes('tenant')) return 'tenant-dashboard';
        if (page.includes('property')) return 'property';
        if (page.includes('login') || page.includes('register') || page.includes('auth')) return 'auth';
        if (page.includes('profile')) return 'profile';
        if (page.includes('payment')) return 'payment';
        return 'home';
    }

    updateNavigation() {
        const currentUser = sessionStorage.getItem('LoggedInUser');
        const userRole = sessionStorage.getItem('UserRole');
        
        // Update auth state
        if (currentUser) {
            // User is logged in
            const loginLink = document.getElementById('loginLink');
            const loginNav = document.getElementById('loginNav');
            const dashboardLink = document.getElementById('dashboardLink');
            const dashboardNav = document.getElementById('dashboardNav');
            
            if (loginLink) loginLink.style.display = 'none';
            if (loginNav) loginNav.style.display = 'none';
            
            // Show appropriate dashboard based on role
            if (userRole === 'tenant') {
                if (dashboardLink) dashboardLink.style.display = 'inline';
                if (dashboardNav) dashboardNav.style.display = 'inline';
            } else if (userRole === 'landlord') {
                const landlordNav = document.getElementById('landlordDashboardNav');
                if (landlordNav) landlordNav.style.display = 'inline';
            }
        }
        
        // Set active navigation
        this.setActiveNavLink();
    }

    setActiveNavLink() {
        const navLinks = document.querySelectorAll('.nav-link, nav a');
        const currentPage = this.currentPage;
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            
            // Remove active class from all links
            link.classList.remove('active');
            
            // Set active class based on current page
            if (currentPage === 'home' && (href === 'index.html' || href === '/')) {
                link.classList.add('active');
            } else if (currentPage === 'booking' && href.includes('booking')) {
                link.classList.add('active');
            } else if (currentPage.includes('dashboard') && href.includes('dashboard')) {
                link.classList.add('active');
            } else if (currentPage === 'property' && href.includes('property')) {
                link.classList.add('active');
            } else if (currentPage === 'profile' && href.includes('profile')) {
                link.classList.add('active');
            }
        });
    }

    applyPageSpecificStyles() {
        // Add page-specific class to body
        document.body.classList.add(`${this.currentPage}-page`);
        
        // Apply page-specific enhancements
        switch (this.currentPage) {
            case 'tenant-dashboard':
            case 'landlord-dashboard':
                this.enhanceDashboard();
                break;
            case 'booking':
                this.enhanceBookingPage();
                break;
            case 'property':
                this.enhancePropertyPages();
                break;
        }
    }

    enhanceDashboard() {
        // Add dashboard specific interactions
        const statCards = document.querySelectorAll('.stat-card');
        statCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px) scale(1.02)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    enhanceBookingPage() {
        // Add booking page enhancements
        const progressSteps = document.querySelectorAll('.progress-step');
        progressSteps.forEach((step, index) => {
            step.addEventListener('click', () => {
                // Handle step navigation if needed
            });
        });
    }

    enhancePropertyPages() {
        // Add property page enhancements
        const propertyCards = document.querySelectorAll('.property-card');
        propertyCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.btn')) {
                    const link = card.querySelector('a');
                    if (link) {
                        window.location.href = link.href;
                    }
                }
            });
        });
    }

    setupLogoutHandler() {
        const logoutButtons = document.querySelectorAll('#logoutBtn');
        logoutButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        });
    }

    handleLogout() {
        if (confirm('Are you sure you want to log out?')) {
            sessionStorage.removeItem('LoggedInUser');
            sessionStorage.removeItem('UserRole');
            sessionStorage.removeItem('UserId');
            window.location.href = 'index.html';
        }
    }
}

// Initialize navigation manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.navigationManager = new NavigationManager();
});

// Utility functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 5px;
                color: white;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .notification-info { background: #3498db; }
            .notification-success { background: #27ae60; }
            .notification-warning { background: #f39c12; }
            .notification-error { background: #e74c3c; }
            .notification button {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// API utility function
async function apiRequest(endpoint, options = {}) {
    const baseUrl = 'http://localhost/UniStay---Website/backend/api';
    
    try {
        const response = await fetch(`${baseUrl}/${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include',
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}