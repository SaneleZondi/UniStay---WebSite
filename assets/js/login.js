document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToLoginLink = document.getElementById('backToLoginLink');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.querySelector('.button-text');

    // Check maintenance mode first
    checkMaintenanceMode();

    // Redirect to dashboard if already logged in
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    if (loggedInUser) {
        const userRole = sessionStorage.getItem('UserRole');
        redirectToDashboard(userRole);
        return;
    }

    // Switch to forgot password form
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.style.display = 'none';
            forgotPasswordForm.style.display = 'block';
            clearMessages();
        });
    }

    // Switch back to login form
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            forgotPasswordForm.style.display = 'none';
            loginForm.style.display = 'block';
            clearMessages();
        });
    }

    // Validate email format
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Show error for a specific field
    function showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const fieldContainer = field.closest('.input-field');

        // Add error class to field
        fieldContainer.classList.add('error');

        // Remove any existing error message
        const existingError = fieldContainer.nextElementSibling;
        if (existingError && existingError.classList.contains('field-error')) {
            existingError.remove();
        }

        // Create and insert error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        fieldContainer.parentNode.insertBefore(errorElement, fieldContainer.nextSibling);
    }

    // Clear field error
    function clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const fieldContainer = field.closest('.input-field');

        // Remove error class
        fieldContainer.classList.remove('error');

        // Remove error message
        const errorElement = fieldContainer.nextElementSibling;
        if (errorElement && errorElement.classList.contains('field-error')) {
            errorElement.remove();
        }
    }

    // Show general error message
    function showError(message) {
        errorMessage.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorMessage.style.display = 'block';
        errorMessage.className = 'error-message';

        successMessage.style.display = 'none';
    }

    // Show success message
    function showSuccess(message) {
        successMessage.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
    }

    // Clear all messages
    function clearMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
    }

    // Validate login form
    function validateLoginForm() {
        let isValid = true;
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Clear previous errors
        clearFieldError('email');
        clearFieldError('password');
        clearMessages();

        // Validate email
        if (!email) {
            showFieldError('email', 'Email is required');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showFieldError('email', 'Please enter a valid email address');
            isValid = false;
        }

        // Validate password
        if (!password) {
            showFieldError('password', 'Password is required');
            isValid = false;
        }

        return isValid;
    }

    // Redirect to appropriate dashboard
    function redirectToDashboard(userRole) {
        switch (userRole) {
            case 'tenant':
                window.location.href = 'tenant-dashboard.html';
                break;
            case 'landlord':
                window.location.href = 'landlord-dashboard.html';
                break;
            case 'admin':
                window.location.href = 'admin-dashboard.html';
                break;
            default:
                window.location.href = 'index.html';
        }
    }

    // Check profile after login and redirect accordingly
    async function checkProfileAfterLogin(userRole) {
        try {
            const response = await apiRequest('users/profile.php');
            if (response.success && response.profile) {
                const completion = response.profile.completion_percentage || 0;
                sessionStorage.setItem('ProfileCompleted', completion >= 80 ? 'true' : 'false');
                sessionStorage.setItem('ProfileCompletion', completion.toString());
                sessionStorage.setItem('UserName', response.profile.name);
                
                if (completion < 80) {
                    const proceed = confirm(
                        `Welcome! Your profile is ${completion}% complete. ` +
                        'Complete your profile for the best experience. Go to profile now?'
                    );
                    if (proceed) {
                        window.location.href = 'profile.html';
                        return;
                    }
                }
                
                // Redirect to appropriate dashboard
                redirectToDashboard(userRole);
            }
        } catch (error) {
            console.error('Error checking profile:', error);
            redirectToDashboard(userRole);
        }
    }

    if (loginForm) {
        // Add input event listeners to clear errors when typing
        document.getElementById('email').addEventListener('input', function() {
            clearFieldError('email');
        });

        document.getElementById('password').addEventListener('input', function() {
            clearFieldError('password');
        });

        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Check maintenance mode before proceeding
            const restrictionsActive = await checkSystemSettings();
            if (restrictionsActive) {
                showError('System is currently under maintenance. Please try again later.');
                return;
            }

            if (!validateLoginForm()) {
                return;
            }

            clearMessages();
            loginButton.disabled = true;
            buttonText.innerHTML = '<div class="spinner"></div> Signing in...';

            const formData = {
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value
            };

            apiRequest('auth/login.php', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                })
                .then(data => {
                    if (data.error) {
                        showError(data.error);
                    } else {
                        showSuccess("Login successful! Redirecting...");
                        
                        // Store user info in sessionStorage
                        sessionStorage.setItem('LoggedInUser', data.user.email);
                        sessionStorage.setItem('UserRole', data.user.role);
                        sessionStorage.setItem('UserName', data.user.name);
                        sessionStorage.setItem('UserId', data.user.id);
                        sessionStorage.setItem('EmailVerified', data.user.is_verified);

                        // Store session token
                        if (data.session_token) {
                            storeSessionToken(data.session_token);
                        }

                        // Check profile completion and redirect
                        setTimeout(() => {
                            checkProfileAfterLogin(data.user.role);
                        }, 1000);
                    }
                })
                .catch(err => {
                    console.error('Login error:', err);
                    showError(err.message || "Invalid credentials. Please try again.");
                })
                .finally(() => {
                    loginButton.disabled = false;
                    buttonText.textContent = 'Sign In';
                });
        });
    }

    // Forgot password form handling
    const resetForm = document.getElementById('forgotPasswordForm');
    if (resetForm) {
        resetForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Check maintenance mode before proceeding
            const restrictionsActive = await checkSystemSettings();
            if (restrictionsActive) {
                showError('System is currently under maintenance. Please try again later.');
                return;
            }

            const email = document.getElementById('resetEmail').value.trim();

            if (!email) {
                showError('Please enter your email address');
                return;
            }

            if (!isValidEmail(email)) {
                showError('Please enter a valid email address');
                return;
            }

            const submitBtn = resetForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="spinner"></div> Sending...';

            // Send reset request
            apiRequest('auth/forgot-password.php', {
                method: 'POST',
                body: JSON.stringify({ email: email })
            })
            .then(data => {
                if (data.success) {
                    showSuccess(data.message);
                    resetForm.reset();
                    
                    // Switch back to login form after success
                    setTimeout(() => {
                        forgotPasswordForm.style.display = 'none';
                        loginForm.style.display = 'block';
                    }, 3000);
                } else {
                    showError(data.error || 'Failed to send reset link');
                }
            })
            .catch(err => {
                console.error('Reset error:', err);
                showError('Error sending reset link. Please try again.');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            });
        });
    }

    // Check for URL parameters (for email verification feedback)
    const urlParams = new URLSearchParams(window.location.search);
    const verified = urlParams.get('verified');
    const message = urlParams.get('message');

    if (verified === 'true') {
        showSuccess(message || 'Email verified successfully! You can now login.');
    } else if (verified === 'false') {
        showError(message || 'Email verification failed. Please try again.');
    }
});

// Check system settings for maintenance mode
async function checkSystemSettings() {
    try {
        const response = await apiRequest('admin/system-settings.php');
        
        if (response.success) {
            const settings = response.settings;
            
            // Check maintenance mode
            if (settings.site_maintenance && settings.site_maintenance.value === 'true') {
                return true; // Maintenance mode is active
            }
        }
        return false; // No restrictions
    } catch (error) {
        console.error('Error checking system settings:', error);
        return false;
    }
}

// Check and apply maintenance mode
async function checkMaintenanceMode() {
    const maintenanceActive = await checkSystemSettings();
    
    if (maintenanceActive) {
        // Hide login/register forms
        const loginForm = document.getElementById('loginForm');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        if (loginForm) loginForm.style.display = 'none';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
        
        // Show maintenance message
        const maintenanceAlert = document.getElementById('maintenanceAlert');
        if (maintenanceAlert) {
            maintenanceAlert.style.display = 'flex';
        }
        
        // Also hide the form container if needed
        const formContainer = document.querySelector('.form-container');
        if (formContainer) {
            formContainer.style.display = 'none';
        }
    }
}

function showMaintenanceMode(message) {
    const maintenanceAlert = document.getElementById('maintenanceAlert');
    const maintenanceMessage = document.getElementById('maintenanceMessage');
    
    if (maintenanceAlert && maintenanceMessage) {
        maintenanceMessage.textContent = message;
        maintenanceAlert.style.display = 'flex';
        
        // Hide the login forms
        const loginForm = document.getElementById('loginForm');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        if (loginForm) loginForm.style.display = 'none';
        if (forgotPasswordForm) forgotPasswordForm.style.display = 'none';
    }
}