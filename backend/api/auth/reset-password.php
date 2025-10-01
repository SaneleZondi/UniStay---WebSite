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

require_once '/../../config/database.php';

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['token']) || !isset($data['password']) || !isset($data['confirmPassword'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Token, password, and confirmation are required"]);
        exit();
    }
    
    $token = $data['token'];
    $password = $data['password'];
    $confirmPassword = $data['confirmPassword'];
    
    if ($password !== $confirmPassword) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Passwords do not match"]);
        exit();
    }
    
    if (strlen($password) < 8) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Password must be at least 8 characters long"]);
        exit();
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Verify reset token
    $query = "SELECT id FROM users WHERE reset_token = :token AND reset_token_expires > NOW()";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":token", $token);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid or expired reset token"]);
        exit();
    }
    
    $user = $stmt->fetch();
    
    // Update password
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $update_query = "UPDATE users SET password = :password, reset_token = NULL, reset_token_expires = NULL WHERE id = :id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(":password", $hashed_password);
    $update_stmt->bindParam(":id", $user['id']);
    
    if ($update_stmt->execute()) {
        // Log activity
        require_once '../../includes/functions.php';
        logActivity($user['id'], "password_reset", "Password reset successfully");
        
        echo json_encode([
            "success" => true,
            "message" => "Password reset successfully! You can now login with your new password."
        ]);
    } else {
        throw new Exception("Failed to reset password");
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>