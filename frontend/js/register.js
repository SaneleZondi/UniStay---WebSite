console.log("Register script loaded!");

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('userName').value.trim(),
                email: document.getElementById('userEmail').value.trim(),
                password: document.getElementById('userPassword').value,
                confirmPassword: document.getElementById('userConfirmPassword').value,
                role: document.querySelector('input[name="role"]:checked').value
            };

            console.log('Registration attempt:', formData);

            // Basic validation
            if (formData.password !== formData.confirmPassword) {
                alert('Passwords do not match');
                return;
            }

            if (formData.password.length < 8) {
                alert('Password must be at least 8 characters long');
                return;
            }

            // Send registration request
            fetch('http://localhost/UniStay---Website/backend/api/auth/register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                console.log('Registration response:', data);
                if (data.success) {
                    alert('Registration successful! You can now sign in.');
                    registerForm.reset();
                    // Redirect to login page after a delay
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                } else {
                    alert('Registration failed: ' + (data.error || 'Please try again'));
                }
            })
            .catch(error => {
                console.error('Registration error:', error);
                alert('An error occurred during registration. Please try again.');
            });
        });
    }
});