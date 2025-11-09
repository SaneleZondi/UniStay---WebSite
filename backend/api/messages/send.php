<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../includes/auth.php';

try {
    $auth = new Auth();
    $user = $auth->authenticateRequestWithFallback();

    if (!$user) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Unauthorized"]);
        exit();
    }

    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid JSON input"]);
        exit();
    }

    $receiver_id = $input['receiver_id'] ?? null;
    $message = trim($input['message'] ?? '');
    $property_id = $input['property_id'] ?? null;
    $subject = $input['subject'] ?? 'New Message';

    // Validate required fields
    if (!$receiver_id || empty($message)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Receiver ID and message are required"]);
        exit();
    }

    require_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    // Verify receiver exists
    $check_user_query = "SELECT id FROM users WHERE id = :receiver_id";
    $check_user_stmt = $db->prepare($check_user_query);
    $check_user_stmt->bindParam(":receiver_id", $receiver_id);
    $check_user_stmt->execute();

    if ($check_user_stmt->rowCount() === 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Receiver not found"]);
        exit();
    }

    // Insert message
    $insert_query = "INSERT INTO messages (sender_id, receiver_id, property_id, subject, message, created_at) 
                     VALUES (:sender_id, :receiver_id, :property_id, :subject, :message, NOW())";
    
    $insert_stmt = $db->prepare($insert_query);
    $insert_stmt->bindParam(":sender_id", $user['id']);
    $insert_stmt->bindParam(":receiver_id", $receiver_id);
    $insert_stmt->bindParam(":property_id", $property_id);
    $insert_stmt->bindParam(":subject", $subject);
    $insert_stmt->bindParam(":message", $message);

    if ($insert_stmt->execute()) {
        $message_id = $db->lastInsertId();
        
        echo json_encode([
            "success" => true,
            "message" => "Message sent successfully",
            "message_id" => $message_id
        ]);
    } else {
        throw new Exception("Failed to insert message into database");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>