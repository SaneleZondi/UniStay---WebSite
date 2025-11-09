<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/EmailService.php'; // Use EmailService instead

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['email'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Email is required"]);
        exit();
    }
    
    $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
    
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid email format"]);
        exit();
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Check if user exists
    $query = "SELECT id, name FROM users WHERE email = :email AND is_verified = 1";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":email", $email);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        // Don't reveal whether email exists or not
        echo json_encode([
            "success" => true,
            "message" => "If this email is registered, you will receive a password reset link shortly."
        ]);
        exit();
    }
    
    $user = $stmt->fetch();
    
    // Generate reset token
    $reset_token = bin2hex(random_bytes(32));
    $reset_token_expires = date('Y-m-d H:i:s', time() + (60 * 60)); // 1 hour
    
    // Store reset token
    $update_query = "UPDATE users SET reset_token = :token, reset_token_expires = :expires WHERE id = :id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(":token", $reset_token);
    $update_stmt->bindParam(":expires", $reset_token_expires);
    $update_stmt->bindParam(":id", $user['id']);
    $update_stmt->execute();
    
    // Send reset email using EmailService
    $emailService = new EmailService();
    $email_sent = $emailService->sendPasswordResetEmail($email, $reset_token, $user['name']);
    
    if ($email_sent) {
        echo json_encode([
            "success" => true,
            "message" => "If this email is registered, you will receive a password reset link shortly."
        ]);
    } else {
        // Even if email fails, return success for security
        error_log("Password reset email failed for: " . $email);
        echo json_encode([
            "success" => true,
            "message" => "If this email is registered, you will receive a password reset link shortly."
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>