<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

try {
    if (!isset($_GET['token'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Verification token is required"]);
        exit();
    }
    
    $token = $_GET['token'];
    $database = new Database();
    $db = $database->getConnection();
    
    // Find user with this token (check if token exists and user is not verified)
    $query = "SELECT id, email, name, verification_token FROM users WHERE verification_token = :token AND is_verified = 0";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":token", $token);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        // Check if user is already verified
        $query_check = "SELECT id FROM users WHERE verification_token = :token AND is_verified = 1";
        $stmt_check = $db->prepare($query_check);
        $stmt_check->bindParam(":token", $token);
        $stmt_check->execute();
        
        if ($stmt_check->rowCount() > 0) {
            echo json_encode(["success" => false, "error" => "Email already verified. You can now login."]);
        } else {
            echo json_encode(["success" => false, "error" => "Invalid or expired verification token"]);
        }
        exit();
    }
    
    $user = $stmt->fetch();
    
    // Verify the user
    $update_query = "UPDATE users SET is_verified = 1, verification_token = NULL, updated_at = NOW() WHERE id = :id";
    $update_stmt = $db->prepare($update_query);
    $update_stmt->bindParam(":id", $user['id']);
    
    if ($update_stmt->execute()) {
        // Log activity
        require_once '../../includes/functions.php';
        logActivity($user['id'], "email_verified", "Email verified successfully");
        
        // Log successful verification
        $log_message = "=== EMAIL VERIFIED ===\n";
        $log_message .= "User: {$user['email']} ({$user['name']})\n";
        $log_message .= "Time: " . date('Y-m-d H:i:s') . "\n";
        $log_message .= "Token: {$user['verification_token']}\n";
        $log_message .= "----------------------------------------\n";
        
        $log_file = __DIR__ . '/../../email_log.txt';
        file_put_contents($log_file, $log_message, FILE_APPEND);
        
        echo json_encode([
            "success" => true,
            "message" => "Email verified successfully! You can now login to your account.",
            "user" => [
                "name" => $user['name'],
                "email" => $user['email']
            ]
        ]);
    } else {
        throw new Exception("Failed to verify email");
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>