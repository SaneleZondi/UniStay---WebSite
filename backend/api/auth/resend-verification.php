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

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['email'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Email is required"]);
        exit();
    }
    
    $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
    $database = new Database();
    $db = $database->getConnection();
    
    // Check if user exists and is not verified
    $query = "SELECT id, name, verification_token FROM users WHERE email = :email AND is_verified = 0";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":email", $email);
    $stmt->execute();
    
    if ($stmt->rowCount() === 0) {
        echo json_encode(["success" => true, "message" => "If your email exists and is unverified, a new verification link will be sent."]);
        exit();
    }
    
    $user = $stmt->fetch();
    
    // Generate new token if none exists
    if (empty($user['verification_token'])) {
        $new_token = bin2hex(random_bytes(32));
        $update_query = "UPDATE users SET verification_token = :token WHERE id = :id";
        $update_stmt = $db->prepare($update_query);
        $update_stmt->bindParam(":token", $new_token);
        $update_stmt->bindParam(":id", $user['id']);
        $update_stmt->execute();
        $user['verification_token'] = $new_token;
    }
    
    // Send verification email (using the same method from auth.php)
    require_once __DIR__ . '/../../includes/auth.php';
    $auth = new Auth();
    
    // You'll need to make sendVerificationEmail public or create a public method
    $email_sent = $auth->sendVerificationEmail($email, $user['verification_token'], $user['name']);
    
    if ($email_sent) {
        echo json_encode(["success" => true, "message" => "Verification email sent successfully."]);
    } else {
        echo json_encode(["success" => false, "error" => "Failed to send verification email."]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>