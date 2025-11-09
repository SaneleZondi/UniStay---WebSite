console.log("Script loaded!");

// Panel switching logic
const signInBtn = document.querySelector("#sign-in-btn");
const signUpBtn = document.querySelector("#sign-up-btn");
const container = document.querySelector(".container");

signUpBtn.addEventListener("click", () => {
  container.classList.add("sign-up-mode");
});

signInBtn.addEventListener("click", () => {
  container.classList.remove("sign-up-mode");
});

// Forgot Password Functionality
document.addEventListener('DOMContentLoaded', function() {
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const backToLoginLink = document.getElementById('backToLoginLink');
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');

    // Show forgot password form
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.style.display = 'none';
            forgotPasswordForm.style.display = 'block';
        });
    }

    // Back to login form
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            forgotPasswordForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
    }

    // Handle forgot password form submission
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('resetEmail').value.trim();
            
            // Simple validation
            if (!email) {
                alert('Please enter your email address');
                return;
            }

            try {
                // Check if email exists in local storage
                const userExists = localStorage.getItem(email);
                if (!userExists) {
                    alert('No account found with that email address');
                    return;
                }

                // In a real app, you would send a reset link to the email
                alert(`Password reset link has been sent to ${email}\n\n(In a real app, this would send an email with a reset link)`);
                
                // Reset form and go back to login
                forgotPasswordForm.reset();
                forgotPasswordForm.style.display = 'none';
                loginForm.style.display = 'block';
            } catch (error) {
                console.error('Error processing password reset:', error);
                alert('An error occurred. Please try again.');
            }
        });
    }
});

// REMOVED THE CONFLICTING FORM HANDLERS - register.js will handle registration
// REMOVED THE LOGIN FORM HANDLER - login.js will handle login