<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - UniStay</title>
    <link rel="stylesheet" href="assets/css/admin-login.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <div class="login-container">
        <div class="login-form">
            <div class="form-header">
                <h1><i class="fas fa-cogs"></i> Admin Portal</h1>
                <p>UniStay Administration System</p>
            </div>
            
            <form id="adminLoginForm">
                <div class="input-group">
                    <div class="input-field">
                        <i class="fas fa-envelope"></i>
                        <input type="email" id="adminEmail" placeholder="Admin Email" required>
                    </div>
                </div>
                
                <div class="input-group">
                    <div class="input-field">
                        <i class="fas fa-lock"></i>
                        <input type="password" id="adminPassword" placeholder="Password" required>
                    </div>
                </div>
                
                <button type="submit" class="login-button" id="loginButton">
                    <span class="button-text">Sign In as Admin</span>
                </button>
            </form>
            
            <div class="form-footer">
                <p><a href="login.html">← Back to User Login</a></p>
            </div>
            
            <div id="errorMessage" class="error-message" style="display: none;"></div>
        </div>
    </div>

    <script src="assets/js/admin-login.js"></script>
</body>
</html>