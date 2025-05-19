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

// Sign-up form validation and registration
const signUpForm = document.getElementById("UserSignUpForm");
if (signUpForm) {
    signUpForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("UserName");
        const email = document.getElementById("UserEmail");
        const password = document.getElementById("UserPassword");
        const confirmPassword = document.getElementById("UserConfirmPassword");
        const role = document.getElementById("UserRole");

        let valid = true;

        // Reset all error messages
        document.querySelectorAll(".text-danger").forEach(span => span.textContent = "");

        if (name.value.trim() === "") {
            name.nextElementSibling.textContent = "Name is required.";
            valid = false;
        }

        if (email.value.trim() === "") {
            email.nextElementSibling.textContent = "Email is required.";
            valid = false;
        }

        if (password.value.trim() === "") {
            password.nextElementSibling.textContent = "Password is required.";
            valid = false;
        }

        if (confirmPassword.value.trim() === "") {
            confirmPassword.nextElementSibling.textContent = "Confirm your password.";
            valid = false;
        }

        if (role.value === "") {
            alert("Please select your role.");
            valid = false;
        }

        if (password.value !== confirmPassword.value) {
            password.nextElementSibling.textContent = "Passwords do not match.";
            valid = false;
        }

        if (valid) {
            try {
                // Save user in localStorage (mock registration)
                const user = {
                    name: name.value,
                    email: email.value,
                    password: password.value,
                    role: role.value,
                };

                localStorage.setItem(user.email, JSON.stringify(user));
                sessionStorage.setItem("LoggedInUser", user.email);

                alert("Registration successful. You can now sign in.");
                container.classList.remove("sign-up-mode");
                signUpForm.reset();
            } catch (error) {
                console.error('Error during registration:', error);
                alert('Registration failed. Please try again.');
            }
        }
    });
}

// Sign-in form validation and login
const signInForm = document.getElementById("loginForm");
if (signInForm) {
    signInForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        try {
            const userData = localStorage.getItem(username);

            if (userData) {
                const user = JSON.parse(userData);
                if (user.password === password) {
                    sessionStorage.setItem("LoggedInUser", username);
                    sessionStorage.setItem("UserRole", user.role);
                    alert("Login successful!");

                    // Redirect based on user role
                    if (user.role === "tenant") {
                        window.location.href = "tenant-dashboard.html";
                    } else if (user.role === "landlord") {
                        window.location.href = "landlord-dashboard.html";
                    } else {
                        alert("Please select role first. Cannot redirect.");
                    }
                } else {
                    alert("Incorrect password.");
                }
            } else {
                alert("User not found. Please sign up first.");
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('An error occurred during login. Please try again.');
        }
    });
}
