// Profile Management System
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.profileData = null;
        this.init();
    }

    init() {
        console.log('ProfileManager initializing...');
        this.checkAuthentication();
        this.setupEventListeners();
        this.loadProfileData();
    }

    checkAuthentication() {
        this.currentUser = sessionStorage.getItem('LoggedInUser');
        this.userRole = sessionStorage.getItem('UserRole');
        
        console.log('Auth check - User:', this.currentUser, 'Role:', this.userRole);
        
        if (!this.currentUser) {
            this.showNotification('Please login to access your profile.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

        this.updateNavigation();
    }

    updateNavigation() {
        const dashboardLink = document.getElementById('dashboardLink');
        if (dashboardLink) {
            dashboardLink.style.display = 'inline';
            if (this.userRole === 'tenant') {
                dashboardLink.href = 'tenant-dashboard.html';
            } else if (this.userRole === 'landlord') {
                dashboardLink.href = 'landlord-dashboard.html';
            } else if (this.userRole === 'admin') {
                dashboardLink.href = 'admin-dashboard.html';
            }
        }

        // Setup logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    async loadProfileData() {
        try {
            console.log('Loading profile data for:', this.currentUser);
            
            // Show loading state
            this.showLoadingState();
            
            const response = await apiRequest('users/profile.php');
            
            console.log('Profile API response:', response);
            
            if (response.success && response.profile) {
                this.profileData = response.profile;
                this.displayProfileData();
                this.checkProfileCompletion();
            } else {
                throw new Error(response.error || 'Failed to load profile data');
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showNotification('Error loading profile: ' + error.message, 'error');
            this.showErrorState(error.message);
        }
    }

    showLoadingState() {
        const profileInfo = document.getElementById('displayRole');
        if (profileInfo) {
            profileInfo.textContent = 'Loading...';
        }
    }

    showErrorState(message) {
        const profileContainer = document.querySelector('.profile-container');
        if (profileContainer) {
            profileContainer.innerHTML = `
                <div class="error-state">
                    <h2>Error Loading Profile</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn-primary">Try Again</button>
                    <button onclick="window.location.href='index.html'" class="btn-secondary">Go Home</button>
                </div>
            `;
        }
    }
    
    displayProfileData() {
        console.log('Displaying profile data:', this.profileData);
        
        // Update avatar with first letter of registered name
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            const firstName = this.profileData.name?.split(' ')[0] || 'U';
            avatar.textContent = firstName.charAt(0).toUpperCase();
        }

        // Display account info
        this.updateAccountInfo();
        
        // Populate form fields
        this.populateFormFields();

        // Show/hide role-specific sections
        this.toggleRoleSections();
        
        // Show the form (hidden during loading)
        const form = document.getElementById('profileForm');
        if (form) {
            form.style.display = 'block';
        }
    }
    
    updateAccountInfo() {
        // Display registered name (read-only)
        const displayName = document.getElementById('displayName');
        if (displayName) {
            displayName.value = this.profileData.name || '';
        }
        
        document.getElementById('displayRole').textContent = 
            this.profileData.role?.charAt(0).toUpperCase() + this.profileData.role?.slice(1) || 'User';
        
        document.getElementById('displayVerification').innerHTML = this.getVerificationStatus();
        document.getElementById('displayProfileStatus').innerHTML = this.getProfileStatus();
        document.getElementById('displayJoinDate').textContent = 
            this.formatDate(this.profileData.created_at) || 'Recently joined';
    }

    populateFormFields() {
        // Use the registered name from profile data
        const fullName = this.profileData.name || '';
        
        // For display purposes, split the name for first/last name fields
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Populate display fields (read-only)
        document.getElementById('displayName').value = fullName;
        document.getElementById('firstName').value = firstName;
        document.getElementById('lastName').value = lastName;

        const fields = {
            'email': 'email',
            'phone': 'phone',
            'dateOfBirth': 'date_of_birth',
            'gender': 'gender',
            'occupation': 'occupation',
            'institution': 'institution',
            'studentNumber': 'student_number',
            'course': 'course',
            'company': 'company',
            'idNumber': 'id_number',
            'address': 'address',
            'province': 'province',
            'country': 'country',
            'stateProvince': 'state_province'
        };

        Object.entries(fields).forEach(([fieldId, dataKey]) => {
            const element = document.getElementById(fieldId);
            if (element && this.profileData[dataKey] !== undefined && this.profileData[dataKey] !== null) {
                // Handle date formatting for date fields
                if (fieldId === 'dateOfBirth' && this.profileData[dataKey]) {
                    const date = new Date(this.profileData[dataKey]);
                    if (!isNaN(date.getTime())) {
                        element.value = date.toISOString().split('T')[0];
                    }
                } else {
                    element.value = this.profileData[dataKey];
                }
            }
        });

        // Set checkbox values
        const checkboxes = {
            'emailNotifications': 'email_notifications',
            'smsNotifications': 'sms_notifications', 
            'marketingEmails': 'marketing_emails'
        };

        Object.entries(checkboxes).forEach(([checkboxId, dataKey]) => {
            const element = document.getElementById(checkboxId);
            if (element) {
                element.checked = Boolean(this.profileData[dataKey]);
            }
        });
    }

    getVerificationStatus() {
        const isVerified = this.profileData.is_verified || false;
        return `<span class="verification-badge ${isVerified ? 'verified' : 'unverified'}">${
            isVerified ? 'Verified' : 'Unverified'
        }</span>`;
    }

    getProfileStatus() {
        const completion = this.profileData.completion_percentage || 0;
        return `<span class="verification-badge ${completion >= 80 ? 'verified' : 'unverified'}">${
            completion >= 80 ? 'Complete' : 'Incomplete'
        }</span>`;
    }

    toggleRoleSections() {
        const studentSection = document.getElementById('studentSection');
        const landlordSection = document.getElementById('landlordSection');

        if (this.userRole === 'tenant') {
            if (studentSection) studentSection.style.display = 'block';
            if (landlordSection) landlordSection.style.display = 'none';
        } else if (this.userRole === 'landlord') {
            if (studentSection) studentSection.style.display = 'none';
            if (landlordSection) landlordSection.style.display = 'block';
        } else {
            if (studentSection) studentSection.style.display = 'none';
            if (landlordSection) landlordSection.style.display = 'none';
        }
    }

    checkProfileCompletion() {
        const completion = this.profileData.completion_percentage || 0;
        const completionStatus = document.getElementById('completionStatus');
        const progressFill = document.getElementById('progressFill');
        const completionText = document.getElementById('completionText');

        if (completionStatus && progressFill && completionText) {
            completionStatus.style.display = 'block';
            progressFill.style.width = `${completion}%`;

            if (completion < 80) {
                completionText.innerHTML = `
                    Complete your profile to access all features. 
                    <strong>${completion}% complete</strong>
                `;
                completionStatus.style.background = '#fff3cd';
                completionStatus.style.borderLeftColor = '#ffc107';
            } else {
                completionText.innerHTML = `
                    Your profile is complete! 
                    <strong>${completion}% complete</strong>
                `;
                completionStatus.style.background = '#d4edda';
                completionStatus.style.borderLeftColor = '#28a745';
            }
        }

        // Store completion status for other pages to check
        sessionStorage.setItem('ProfileCompleted', completion >= 80 ? 'true' : 'false');
        sessionStorage.setItem('ProfileCompletion', completion.toString());
        
        // Update user name in session storage
        const fullName = this.profileData.name || '';
        if (fullName) {
            sessionStorage.setItem('UserName', fullName);
        }

        console.log('Profile completion:', completion + '%');
    }

    setupEventListeners() {
        const form = document.getElementById('profileForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProfile();
            });
        }

        // Real-time completion tracking
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateFormData();
                this.calculateRealTimeCompletion();
            });
        });

        // Hide loading and show form
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
    }

    updateFormData() {
        if (!this.profileData) return;
        
        // Update profile data from form for real-time calculation
        this.profileData.phone = document.getElementById('phone').value;
        this.profileData.date_of_birth = document.getElementById('dateOfBirth').value;
        this.profileData.gender = document.getElementById('gender').value;
        this.profileData.occupation = document.getElementById('occupation').value;
        this.profileData.institution = document.getElementById('institution').value;
        this.profileData.student_number = document.getElementById('studentNumber').value;
        this.profileData.course = document.getElementById('course').value;
        this.profileData.company = document.getElementById('company').value;
        this.profileData.id_number = document.getElementById('idNumber').value;
        this.profileData.address = document.getElementById('address').value;
        this.profileData.province = document.getElementById('province').value;
        this.profileData.country = document.getElementById('country').value;
        this.profileData.state_province = document.getElementById('stateProvince').value;
    }

    calculateRealTimeCompletion() {
        if (!this.profileData) return;
        
        // The name is always available from registration, so we don't need to validate it
        const requiredFields = ['phone', 'address', 'province', 'country'];
        const roleSpecificFields = this.userRole === 'tenant' ? 
            ['institution'] : this.userRole === 'landlord' ? ['id_number'] : [];
        
        const allFields = [...requiredFields, ...roleSpecificFields];
        let completed = 0;

        allFields.forEach(field => {
            const value = this.profileData[field];
            if (value && value.toString().trim() !== '') {
                completed++;
            }
        });

        const completion = Math.round((completed / allFields.length) * 100);
        
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            progressFill.style.width = `${completion}%`;
        }
        
        return completion;
    }

    async saveProfile() {
        try {
            console.log('Saving profile...');
            
            // Validate required fields
            if (!this.validateRequiredFields()) {
                return;
            }

            const saveButton = document.querySelector('button[type="submit"]');
            const originalText = saveButton.textContent;
            saveButton.textContent = 'Saving...';
            saveButton.disabled = true;

            const formData = this.getFormData();

            console.log('Sending profile data:', formData);

            const response = await apiRequest('users/profile.php', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            console.log('Profile save response:', response);

            if (response.success) {
                this.showNotification('Profile updated successfully!', 'success');
                this.profileData = { ...this.profileData, ...response.profile };
                this.checkProfileCompletion();
                
                // Update session storage with new name
                const fullName = this.profileData.name;
                sessionStorage.setItem('UserName', fullName);
                
                // Show completion message if profile just became complete
                if (response.profile_completed) {
                    this.showNotification('Congratulations! Your profile is now complete.', 'success');
                }
                
            } else {
                throw new Error(response.error || 'Failed to update profile');
            }

        } catch (error) {
            console.error('Error saving profile:', error);
            this.showNotification('Error updating profile: ' + error.message, 'error');
        } finally {
            const saveButton = document.querySelector('button[type="submit"]');
            saveButton.textContent = 'Update Profile';
            saveButton.disabled = false;
        }
    }

    getFormData() {
        // Get all form values including optional fields
        const formData = {
            phone: document.getElementById('phone').value.trim(),
            date_of_birth: document.getElementById('dateOfBirth').value,
            gender: document.getElementById('gender').value,
            occupation: document.getElementById('occupation').value.trim(),
            institution: document.getElementById('institution').value.trim(),
            student_number: document.getElementById('studentNumber').value.trim(),
            course: document.getElementById('course').value.trim(),
            company: document.getElementById('company').value.trim(),
            id_number: document.getElementById('idNumber').value.trim(),
            address: document.getElementById('address').value.trim(),
            province: document.getElementById('province').value,
            country: document.getElementById('country').value,
            state_province: document.getElementById('stateProvince').value.trim(),
            email_notifications: document.getElementById('emailNotifications').checked,
            sms_notifications: document.getElementById('smsNotifications').checked,
            marketing_emails: document.getElementById('marketingEmails').checked
        };

        // Clean up empty strings to null for optional fields
        const optionalFields = ['date_of_birth', 'gender', 'occupation', 'student_number', 'course', 'company', 'state_province'];
        optionalFields.forEach(field => {
            if (formData[field] === '') {
                formData[field] = null;
            }
        });

        return formData;
    }

    validateRequiredFields() {
        const requiredFields = [
            { id: 'phone', name: 'Phone Number' },
            { id: 'address', name: 'Address' },
            { id: 'province', name: 'Province' },
            { id: 'country', name: 'Country' }
        ];

        // Add role-specific required fields
        if (this.userRole === 'tenant') {
            requiredFields.push({ id: 'institution', name: 'Educational Institution' });
        } else if (this.userRole === 'landlord') {
            requiredFields.push({ id: 'idNumber', name: 'ID Number' });
        }

        let isValid = true;

        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (element && !element.value.trim()) {
                this.showFieldError(element, `${field.name} is required`);
                isValid = false;
            } else {
                this.clearFieldError(element);
            }
        });

        // Phone format validation
        const phone = document.getElementById('phone');
        if (phone && phone.value.trim()) {
            const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
            if (!phoneRegex.test(phone.value.trim())) {
                this.showFieldError(phone, 'Please enter a valid phone number');
                isValid = false;
            }
        }

        return isValid;
    }

    showFieldError(element, message) {
        element.style.borderColor = '#e74c3c';
        
        // Remove existing error message
        const existingError = element.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error message
        const errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        errorElement.style.cssText = `
            color: #e74c3c;
            font-size: 0.85rem;
            margin-top: 5px;
            display: flex;
            align-items: center;
            gap: 5px;
        `;
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        
        element.parentNode.appendChild(errorElement);
    }

    clearFieldError(element) {
        if (element) {
            element.style.borderColor = '#e0e0e0';
            const errorElement = element.parentNode.querySelector('.field-error');
            if (errorElement) {
                errorElement.remove();
            }
        }
    }

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
            alert(`${type === 'error' ? 'Error' : 'Success'} ${message}`);
        }
    }

    formatDate(dateString) {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (e) {
            return 'Invalid Date';
        }
    }

    logout() {
        if (typeof window.setupLogout === 'function') {
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.click();
            }
        } else {
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = 'login.html';
        }
    }
}

// Initialize profile manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing ProfileManager...');
    new ProfileManager();
});

// Make ProfileManager globally available
window.ProfileManager = ProfileManager;