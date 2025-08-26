<?php
// backend/config/constants.php

// Application constants
define('APP_NAME', 'UniStay');
define('APP_URL', 'http://localhost/UniStay---Website');
define('APP_ROOT', dirname(dirname(__DIR__)));

// Security constants
define('PASSWORD_HASH_COST', 12);
define('TOKEN_EXPIRY_HOURS', 24);
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_MINUTES', 30);

// File upload constants
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
define('UPLOAD_DIR', APP_ROOT . '/backend/uploads/');

// Email constants
define('EMAIL_FROM', 'noreply@unistay.example.com');
define('EMAIL_FROM_NAME', 'UniStay Team');

// Database constants
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'unistay_db');
?>