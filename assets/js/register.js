document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');

    // Redirect to dashboard if already logged in
    const loggedInUser = sessionStorage.getItem('LoggedInUser');
    if (loggedInUser) {
        const userRole = sessionStorage.getItem('UserRole');
        redirectToDashboard(userRole);
        return;
    }

    // Validate email format
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate password strength
    function isStrongPassword(password) {
        // At least 8 characters, one uppercase, one lowercase, one number
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return strongRegex.test(password);
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
        // Create error message element if it doesn't exist
        let errorElement = document.getElementById('errorMessage');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'errorMessage';
            errorElement.className = 'error-message';
            registerForm.parentNode.insertBefore(errorElement, registerForm);
        }
        
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorElement.style.display = 'block';
        
        // Remove success message if exists
        const successElement = document.getElementById('successMessage');
        if (successElement) {
            successElement.style.display = 'none';
        }
    }

    // Show success message
    function showSuccess(message) {
        // Create success message element if it doesn't exist
        let successElement = document.getElementById('successMessage');
        if (!successElement) {
            successElement = document.createElement('div');
            successElement.id = 'successMessage';
            successElement.className = 'success-message';
            registerForm.parentNode.insertBefore(successElement, registerForm);
        }
        
        successElement.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        successElement.style.display = 'block';
        
        // Remove error message if exists
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    // Clear all messages
    function clearMessages() {
        const errorElement = document.getElementById('errorMessage');
        const successElement = document.getElementById('successMessage');
        
        if (errorElement) errorElement.style.display = 'none';
        if (successElement) successElement.style.display = 'none';
    }

    // Validate registration form
    function validateRegistrationForm() {
        let isValid = true;
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const password = document.getElementById('userPassword').value;
        const confirmPassword = document.getElementById('userConfirmPassword').value;
        const termsAccepted = document.querySelector('input[type="checkbox"]').checked;

        // Clear previous errors
        clearFieldError('userName');
        clearFieldError('userEmail');
        clearFieldError('userPassword');
        clearFieldError('userConfirmPassword');
        clearMessages();

        // Validate name
        if (!name) {
            showFieldError('userName', 'Full name is required');
            isValid = false;
        } else if (name.length < 2) {
            showFieldError('userName', 'Name must be at least 2 characters long');
            isValid = false;
        }

        // Validate email
        if (!email) {
            showFieldError('userEmail', 'Email is required');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showFieldError('userEmail', 'Please enter a valid email address');
            isValid = false;
        }

        // Validate password
        if (!password) {
            showFieldError('userPassword', 'Password is required');
            isValid = false;
        } else if (password.length < 8) {
            showFieldError('userPassword', 'Password must be at least 8 characters long');
            isValid = false;
        } else if (!isStrongPassword(password)) {
            showFieldError('userPassword', 'Password must contain at least one uppercase letter, one lowercase letter, and one number');
            isValid = false;
        }

        // Validate confirm password
        if (!confirmPassword) {
            showFieldError('userConfirmPassword', 'Please confirm your password');
            isValid = false;
        } else if (password !== confirmPassword) {
            showFieldError('userConfirmPassword', 'Passwords do not match');
            isValid = false;
        }

        // Validate terms acceptance
        if (!termsAccepted) {
            showError('You must agree to the Terms of Service and Privacy Policy');
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

    if (registerForm) {
        // Add input event listeners to clear errors when typing
        const inputIds = ['userName', 'userEmail', 'userPassword', 'userConfirmPassword'];
        inputIds.forEach(id => {
            document.getElementById(id).addEventListener('input', function() {
                clearFieldError(id);
            });
        });

        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!validateRegistrationForm()) {
                return;
            }

            const formData = {
                name: document.getElementById('userName').value.trim(),
                email: document.getElementById('userEmail').value.trim(),
                password: document.getElementById('userPassword').value,
                confirmPassword: document.getElementById('userConfirmPassword').value,
                role: document.querySelector('input[name="role"]:checked').value
            };

            console.log('Sending registration data:', formData);

            // Show loading state
            const submitButton = registerForm.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.innerHTML = '<div class="spinner"></div> Creating Account...';
            submitButton.disabled = true;

            // Send registration request with better error handling
            apiRequest('auth/register.php', {
                method: 'POST',
                body: JSON.stringify(formData)
            })
            .then(data => {
                console.log('Registration response received:', data);
                
                if (data.success) {
                    showSuccess('Registration successful! Please check your email for verification instructions.');
                    registerForm.reset();
                    
                    setTimeout(() => {
                        window.location.href = 'login.html?message=' + encodeURIComponent(data.message);
                    }, 3000);
                } else {
                    if (data.error && data.error.includes('Email already registered')) {
                        showFieldError('userEmail', 'This email is already registered');
                    } else {
                        showError(data.error || 'Registration failed. Please try again.');
                    }
                }
            })
            .catch(error => {
                console.error('Registration error:', error);
                // More specific error messages
                if (error.message.includes('JSON') || error.message.includes('Invalid')) {
                    showError('Server response error. The registration might have worked - please try logging in.');
                } else if (error.message.includes('Network')) {
                    showError('Network error. Please check your connection and try again.');
                } else {
                    showError('An error occurred during registration. Please try again.');
                }
            })
            .finally(() => {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
            });
        });
    }

    // Password strength indicator
    const passwordInput = document.getElementById('userPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strengthIndicator = document.getElementById('passwordStrength') || createPasswordStrengthIndicator();
            
            if (password.length === 0) {
                strengthIndicator.innerHTML = '';
                return;
            }
            
            let strength = 0;
            let feedback = '';
            
            if (password.length >= 8) strength++;
            if (/[a-z]/.test(password)) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^a-zA-Z0-9]/.test(password)) strength++;
            
            switch (strength) {
                case 0:
                case 1:
                case 2:
                    feedback = '<span style="color: #e74c3c;">Weak</span>';
                    break;
                case 3:
                case 4:
                    feedback = '<span style="color: #f39c12;">Medium</span>';
                    break;
                case 5:
                    feedback = '<span style="color: #2ecc71;">Strong</span>';
                    break;
            }
            
            strengthIndicator.innerHTML = `Password strength: ${feedback}`;
        });
    }

    function createPasswordStrengthIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'passwordStrength';
        indicator.style.marginTop = '5px';
        indicator.style.fontSize = '12px';
        
        const passwordField = document.getElementById('userPassword');
        passwordField.parentNode.appendChild(indicator);
        
        return indicator;
    }
});