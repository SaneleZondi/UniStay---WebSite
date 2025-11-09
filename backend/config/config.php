<?php
// Application Configuration
define('APP_NAME', 'UniStay');
define('APP_VERSION', '1.0.0');
define('APP_URL', 'http://localhost/UniStay---Website');
define('UPLOAD_PATH', __DIR__ . '/../uploads/');

// Email Configuration - LOCALHOST ONLY (Simple)
define('SMTP_FROM', 'noreply@unistay.com');
define('SMTP_FROM_NAME', 'UniStay');

// Security Configuration
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOCKOUT_TIME', 900); // 15 minutes
define('SESSION_TIMEOUT', 3600); // 1 hour

// File Upload Configuration
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['jpg', 'jpeg', 'png', 'gif']);

// Localhost Email Settings
define('USE_LOCALHOST_EMAIL', true); // Always use localhost mail() function
?>