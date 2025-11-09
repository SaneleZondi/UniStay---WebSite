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

require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/functions.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['email']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Email and password are required"]);
        exit();
    }
    
    $auth = new Auth();
    $result = $auth->login($data['email'], $data['password']);
    
    if ($result['success']) {
        // Set session cookie
        setcookie('session_token', $result['session_token'], [
            'expires' => time() + (7 * 24 * 60 * 60), // 7 days
            'path' => '/',
            'domain' => 'localhost',
            'secure' => false, // Set to true in production with HTTPS
            'httponly' => true,
            'samesite' => 'Lax'
        ]);
        
        echo json_encode([
            "success" => true,
            "user" => $result['user'],
            "session_token" => $result['session_token']
        ]);
    } else {
        // Handle unverified email case specifically
        if (isset($result['needs_verification'])) {
            http_response_code(403); // Forbidden - needs verification
            echo json_encode([
                "success" => false, 
                "error" => $result['error'],
                "needs_verification" => true,
                "email" => $result['email']
            ]);
        } else {
            http_response_code(401);
            echo json_encode(["success" => false, "error" => $result['error']]);
        }
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>