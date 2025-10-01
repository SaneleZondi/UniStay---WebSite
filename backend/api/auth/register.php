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
    
    if (!$data) {
        throw new Exception("Invalid JSON data");
    }
    
    $required_fields = ['name', 'email', 'password', 'confirmPassword', 'role'];
    $data = validateInput($data, $required_fields);
    
    // Validate email format
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid email format"]);
        exit();
    }
    
    // Validate password strength
    if (strlen($data['password']) < 8) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Password must be at least 8 characters long"]);
        exit();
    }
    
    // Validate password match
    if ($data['password'] !== $data['confirmPassword']) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Passwords do not match"]);
        exit();
    }
    
    // Validate role
    if (!in_array($data['role'], ['tenant', 'landlord'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid role specified"]);
        exit();
    }
    
    $auth = new Auth();
    $result = $auth->register($data['name'], $data['email'], $data['password'], $data['role']);
    
    if ($result['success']) {
        http_response_code(201);
        
        // Add debug info for testing
        $result['debug_info'] = "Check backend/email_log.txt for verification link";
        
        echo json_encode($result);
    } else {
        http_response_code(400);
        echo json_encode($result);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>