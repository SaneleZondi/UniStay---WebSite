<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/functions.php';

// Log the request for debugging
$log_message = "=== ADMIN LOGIN ATTEMPT ===\n";
$log_message .= "Time: " . date('Y-m-d H:i:s') . "\n";
$log_message .= "Method: " . $_SERVER['REQUEST_METHOD'] . "\n";
$log_message .= "Content Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'Not set') . "\n";
$log_message .= "Raw input: " . file_get_contents("php://input") . "\n";
$log_message .= "----------------------------------------\n";

$log_file = __DIR__ . '/../../admin_login_debug.txt';
file_put_contents($log_file, $log_message, FILE_APPEND);

try {
    $raw_input = file_get_contents("php://input");
    $data = json_decode($raw_input, true);
    
    error_log("Admin login raw input: " . $raw_input);
    error_log("Admin login parsed data: " . print_r($data, true));
    
    if (!isset($data['email']) || !isset($data['password'])) {
        error_log("Missing email or password in admin login");
        http_response_code(400);
        echo json_encode([
            "success" => false, 
            "error" => "Email and password are required",
            "debug" => [
                "raw_input" => $raw_input,
                "parsed_data" => $data
            ]
        ]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();
    
    // Direct admin authentication - bypass regular restrictions
    $query = "SELECT * FROM users WHERE email = :email AND role = 'admin'";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":email", $data['email']);
    $stmt->execute();
    
    if ($stmt->rowCount() == 0) {
        error_log("Admin account not found: " . $data['email']);
        http_response_code(401);
        echo json_encode([
            "success" => false, 
            "error" => "Admin account not found",
            "debug_email" => $data['email']
        ]);
        exit();
    }
    
    $user = $stmt->fetch();
    error_log("Found admin user: " . $user['email']);
    
    // Verify password directly
    if (password_verify($data['password'], $user['password'])) {
        error_log("Password verification successful for admin: " . $user['email']);
        
        // For admin, bypass all restrictions and create session
        
        // Reset any failed attempts and unlock account
        $resetQuery = "UPDATE users SET failed_login_attempts = 0, is_locked = 0, is_verified = 1 WHERE id = :user_id";
        $resetStmt = $db->prepare($resetQuery);
        $resetStmt->bindParam(":user_id", $user['id']);
        $resetStmt->execute();
        
        // Update last login
        $updateQuery = "UPDATE users SET last_login = NOW() WHERE id = :user_id";
        $updateStmt = $db->prepare($updateQuery);
        $updateStmt->bindParam(":user_id", $user['id']);
        $updateStmt->execute();
        
        // Generate session token
        $session_token = bin2hex(random_bytes(32));
        $expires_at = date('Y-m-d H:i:s', time() + (7 * 24 * 60 * 60)); // 7 days
        
        // Remove existing sessions
        $deleteQuery = "DELETE FROM user_sessions WHERE user_id = :user_id";
        $deleteStmt = $db->prepare($deleteQuery);
        $deleteStmt->bindParam(":user_id", $user['id']);
        $deleteStmt->execute();
        
        // Store new session
        $sessionQuery = "INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at) 
                        VALUES (:user_id, :token, :ip_address, :user_agent, :expires_at)";
        $sessionStmt = $db->prepare($sessionQuery);
        $sessionStmt->bindParam(":user_id", $user['id']);
        $sessionStmt->bindParam(":token", $session_token);
        $sessionStmt->bindValue(":ip_address", $_SERVER['REMOTE_ADDR'] ?? '');
        $sessionStmt->bindValue(":user_agent", $_SERVER['HTTP_USER_AGENT'] ?? '');
        $sessionStmt->bindParam(":expires_at", $expires_at);
        $sessionStmt->execute();
        
        // Remove sensitive data
        unset($user['password']);
        unset($user['verification_token']);
        unset($user['reset_token']);
        
        // Set session cookie
        setcookie('session_token', $session_token, [
            'expires' => time() + (7 * 24 * 60 * 60),
            'path' => '/',
            'domain' => 'localhost',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        
        error_log("Admin login successful: " . $user['email']);
        
        echo json_encode([
            "success" => true,
            "user" => $user,
            "session_token" => $session_token,
            "message" => "Admin login successful"
        ]);
        
    } else {
        error_log("Password verification failed for admin: " . $user['email']);
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Invalid admin credentials"]);
    }
    
} catch (Exception $e) {
    error_log("Admin login exception: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>