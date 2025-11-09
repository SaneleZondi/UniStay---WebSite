<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// SIMPLE WORKING VERSION
try {
    // Basic includes
    require_once '../../includes/auth.php';
    require_once '../../config/database.php';

    // Authenticate
    $auth = new Auth();
    $user = $auth->authenticateRequestWithFallback();

    if (!$user) {
        echo json_encode(["success" => false, "error" => "Unauthorized"]);
        exit();
    }

    $other_user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    
    if ($other_user_id <= 0) {
        echo json_encode(["success" => false, "error" => "Valid User ID is required"]);
        exit();
    }

    // Database connection
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception("Database connection failed");
    }

    // SIMPLE QUERY - Get messages between two users
    $query = "SELECT * FROM messages 
              WHERE (sender_id = ? AND receiver_id = ?) 
                 OR (sender_id = ? AND receiver_id = ?)
              ORDER BY created_at ASC";

    $stmt = $db->prepare($query);
    
    // Bind parameters: current user and other user in both combinations
    $stmt->bindParam(1, $user['id']);
    $stmt->bindParam(2, $other_user_id);
    $stmt->bindParam(3, $other_user_id);
    $stmt->bindParam(4, $user['id']);
    
    $stmt->execute();
    $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Add is_own field to each message
    foreach ($messages as &$message) {
        $message['is_own'] = ($message['sender_id'] == $user['id']) ? 1 : 0;
    }

    echo json_encode([
        "success" => true,
        "messages" => $messages,
        "count" => count($messages),
        "debug" => [
            "current_user_id" => $user['id'],
            "other_user_id" => $other_user_id,
            "message_count" => count($messages)
        ]
    ]);

} catch (Exception $e) {
    // Return safe error response
    echo json_encode([
        "success" => false, 
        "error" => "Unable to load messages",
        "messages" => [],
        "debug_error" => $e->getMessage()
    ]);
}
?>