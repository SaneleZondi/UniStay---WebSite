<?php


// Session security configuration
function secureSession() {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 0); // Enable if using HTTPS
    ini_set('session.use_strict_mode', 1);
    ini_set('session.gc_maxlifetime', 3600); // 1 hour
   
}
secureSession();

 $_SESSION['last_activity'] = time();

require_once __DIR__ . '/functions.php';

// Regenerate session ID
function regenerateSession() {
    session_regenerate_id(true);
    $_SESSION['created'] = time();
}

// Authentication functions
function isLoggedIn() {
    return isset($_SESSION['user_id']);
}

function hasRole($role) {
    return isLoggedIn() && $_SESSION['user_role'] === $role;
}

function requireLogin() {
    if (!isLoggedIn()) {
        header('Location: /login.html');
        exit;
    }
}

function requireRole($role) {
    requireLogin();
    if (!hasRole($role)) {
        header('Location: /403.html');
        exit;
    }
}

// CSRF protection
function generateCSRFToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// Rate limiting
function checkRateLimit($key, $limit = 5, $timeout = 300) {
    if (!isset($_SESSION['rate_limits'])) {
        $_SESSION['rate_limits'] = [];
    }
    
    if (!isset($_SESSION['rate_limits'][$key])) {
        $_SESSION['rate_limits'][$key] = ['count' => 1, 'time' => time()];
    } else {
        if (time() - $_SESSION['rate_limits'][$key]['time'] > $timeout) {
            $_SESSION['rate_limits'][$key] = ['count' => 1, 'time' => time()];
        } else {
            $_SESSION['rate_limits'][$key]['count']++;
            if ($_SESSION['rate_limits'][$key]['count'] > $limit) {
                header('HTTP/1.1 429 Too Many Requests');
                die(json_encode(['error' => 'Too many requests']));
            }
        }
    }
}

// Session timeout check
function checkSessionTimeout($timeout = 3600) {
    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity'] > $timeout)) {
        session_unset();
        session_destroy();
        return false;
    }
    $_SESSION['last_activity'] = time();
    return true;
}
?>