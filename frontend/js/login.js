document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToLoginLink = document.getElementById('backToLoginLink');
    const errorMessage = document.getElementById('errorMessage');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.querySelector('.button-text');

    // Switch to forgot password form
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.style.display = 'none';
            forgotPasswordForm.style.display = 'block';
        });
    }

    // Switch back to login form
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            forgotPasswordForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            errorMessage.style.display = 'none';
            loginButton.disabled = true;
            buttonText.innerHTML = '<div class="spinner"></div> Signing in...';

            const formData = {
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value
            };

            fetch('http://localhost/UniStay---Website/backend/api/auth/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert("Login successful! ✅");
                    if (data.data.role === "tenant") {
                        window.location.href = "tenant-dashboard.html";
                    } else if (data.data.role === "landlord") {
                        window.location.href = "landlord-dashboard.html";
                    }
                } else {
                    errorMessage.textContent = data.error || "Invalid credentials";
                    errorMessage.style.display = "block";
                }
            })
            .catch(err => {
                console.error('Fetch error:', err);
                errorMessage.textContent = "Network error during login.";
                errorMessage.style.display = "block";
            })
            .finally(() => {
                loginButton.disabled = false;
                buttonText.textContent = 'Sign In';
            });
        });
    }
});
