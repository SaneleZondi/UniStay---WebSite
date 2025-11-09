<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/constants.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['email']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Email and password are required"]);
        exit();
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    $email = $data['email'];
    $password = $data['password'];
    
    // Check if user exists and is admin
    $query = "SELECT * FROM users WHERE email = :email AND role = 'admin'";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":email", $email);
    $stmt->execute();
    
    if ($stmt->rowCount() == 0) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Invalid admin credentials"]);
        exit();
    }
    
    $user = $stmt->fetch();
    
    // Verify password
    if (password_verify($password, $user['password'])) {
        // Generate session token
        $session_token = bin2hex(random_bytes(32));
        $expires_at = date('Y-m-d H:i:s', time() + (7 * 24 * 60 * 60)); // 7 days
        
        // First, delete any existing sessions for this user
        $delete_query = "DELETE FROM user_sessions WHERE user_id = :user_id";
        $delete_stmt = $db->prepare($delete_query);
        $delete_stmt->bindParam(":user_id", $user['id']);
        $delete_stmt->execute();
        
        // Store new session in database
        $session_query = "INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at, created_at) 
                         VALUES (:user_id, :token, :ip_address, :user_agent, :expires_at, NOW())";
        $session_stmt = $db->prepare($session_query);
        $session_stmt->bindParam(":user_id", $user['id']);
        $session_stmt->bindParam(":token", $session_token);
        $session_stmt->bindValue(":ip_address", $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
        $session_stmt->bindValue(":user_agent", $_SERVER['HTTP_USER_AGENT'] ?? 'Browser');
        $session_stmt->bindParam(":expires_at", $expires_at);
        
        if (!$session_stmt->execute()) {
            $error_info = $session_stmt->errorInfo();
            error_log("Session insert failed: " . $error_info[2]);
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Failed to create session: " . $error_info[2]]);
            exit();
        }
        
        // Verify the session was inserted
        $verify_query = "SELECT * FROM user_sessions WHERE session_token = :token";
        $verify_stmt = $db->prepare($verify_query);
        $verify_stmt->bindParam(":token", $session_token);
        $verify_stmt->execute();
        
        if ($verify_stmt->rowCount() == 0) {
            error_log("Session verification failed - token not found in database");
            http_response_code(500);
            echo json_encode(["success" => false, "error" => "Session creation failed - token not stored"]);
            exit();
        }
        
        // Set session cookie
        setcookie('session_token', $session_token, [
            'expires' => time() + (7 * 24 * 60 * 60),
            'path' => '/',
            'domain' => 'localhost',
            'secure' => false,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        
        // Update last login
        $update_query = "UPDATE users SET last_login = NOW() WHERE id = :user_id";
        $update_stmt = $db->prepare($update_query);
        $update_stmt->bindParam(":user_id", $user['id']);
        $update_stmt->execute();
        
        // Log activity
        $activity_query = "INSERT INTO activity_log (user_id, action, description, ip_address, user_agent) 
                          VALUES (:user_id, 'admin_login', 'Admin user logged in', :ip_address, :user_agent)";
        $activity_stmt = $db->prepare($activity_query);
        $activity_stmt->bindParam(":user_id", $user['id']);
        $activity_stmt->bindValue(":ip_address", $_SERVER['REMOTE_ADDR'] ?? '');
        $activity_stmt->bindValue(":user_agent", $_SERVER['HTTP_USER_AGENT'] ?? '');
        $activity_stmt->execute();
        
        // Remove sensitive data
        unset($user['password']);
        unset($user['verification_token']);
        unset($user['reset_token']);
        
        echo json_encode([
            "success" => true,
            "user" => $user,
            "session_token" => $session_token,
            "message" => "Admin login successful - session stored in database"
        ]);
        
    } else {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Invalid admin credentials"]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>