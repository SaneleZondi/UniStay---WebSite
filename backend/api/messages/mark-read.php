<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit();
}

require_once '../../includes/auth.php';
require_once '../../config/database.php';

try {
    $auth = new Auth();
    $user = $auth->authenticateRequestWithFallback();

    if (!$user) {
        echo json_encode(["success" => false, "error" => "Unauthorized"]);
        exit();
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $other_user_id = $input['other_user_id'] ?? 0;

    if ($other_user_id <= 0) {
        echo json_encode(["success" => false, "error" => "Valid user ID required"]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();

    // Mark messages as read
    $query = "UPDATE messages SET is_read = 1 
              WHERE receiver_id = ? AND sender_id = ? AND is_read = 0";
    
    $stmt = $db->prepare($query);
    $stmt->execute([$user['id'], $other_user_id]);

    echo json_encode([
        "success" => true,
        "updated" => $stmt->rowCount()
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false, 
        "error" => $e->getMessage()
    ]);
}
?>