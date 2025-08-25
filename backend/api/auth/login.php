<?php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: " . APP_URL);
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Invalid request method'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$email = sanitizeInput($data['email'] ?? '');
$password = sanitizeInput($data['password'] ?? '');

if (empty($email) || empty($password)) {
    jsonResponse(['error' => 'Email and password are required'], 400);
}

try {
    $conn = getDBConnection();
    
    // Rate limiting
    checkRateLimit('login_'.$email);
    
    // Check account status
    $stmt = $conn->prepare("SELECT * FROM users WHERE email = :email");
    $stmt->bindParam(':email', $email);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        jsonResponse(['error' => 'Invalid email or password'], 401);
    }
    
    // Check if account is locked
    if ($user['login_attempts'] >= MAX_LOGIN_ATTEMPTS) {
        $lastAttempt = new DateTime($user['last_attempt'] ?? 'now');
        $now = new DateTime();
        $diff = $now->diff($lastAttempt);
        
        if ($diff->i < LOGIN_LOCKOUT_MINUTES) {
            jsonResponse(['error' => 'Account temporarily locked. Try again later.'], 403);
        } else {
            // Reset attempt counter if lockout period has passed
            $stmt = $conn->prepare("UPDATE users SET login_attempts = 0 WHERE email = :email");
            $stmt->bindParam(':email', $email);
            $stmt->execute();
        }
    }
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        // Track failed attempt
        $stmt = $conn->prepare("UPDATE users SET login_attempts = login_attempts + 1, last_attempt = NOW() WHERE email = :email");
        $stmt->bindParam(':email', $email);
        $stmt->execute();
        
        jsonResponse(['error' => 'Invalid email or password'], 401);
    }
    
    // Check email verification
    if (!$user['is_verified']) {
        jsonResponse(['error' => 'Please verify your email address first'], 403);
    }
    
    // Login successful
    regenerateSession();
    
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_role'] = $user['role'];
    $_SESSION['user_name'] = $user['name'];
    
    // Reset login attempts
    $stmt = $conn->prepare("UPDATE users SET login_attempts = 0 WHERE email = :email");
    $stmt->bindParam(':email', $email);
    $stmt->execute();
    
    // Return user data
    $response = [
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'role' => $user['role'],
        'profile_image' => $user['profile_image']
    ];
    
    jsonResponse($response);
    
} catch (PDOException $e) {
    handlePDOException($e);
}
?>