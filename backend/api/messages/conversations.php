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

require_once '../../includes/auth.php';

try {
    $auth = new Auth();
    $user = $auth->authenticateRequestWithFallback();

    if (!$user) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Unauthorized - No user found"]);
        exit();
    }

    error_log("Loading conversations for user ID: " . $user['id'] . ", Email: " . $user['email']);

    require_once '../../config/database.php';
    $database = new Database();
    $db = $database->getConnection();

    // Check total messages
    $test_query = "SELECT COUNT(*) as message_count FROM messages WHERE sender_id = ? OR receiver_id = ?";
    $test_stmt = $db->prepare($test_query);
    $test_stmt->execute([$user['id'], $user['id']]);
    $test_result = $test_stmt->fetch();
    
    error_log("User has " . $test_result['message_count'] . " messages total");

    if ($test_result['message_count'] == 0) {
        echo json_encode([
            "success" => true,
            "conversations" => [],
            "debug" => [
                "user_id" => $user['id'],
                "total_messages" => 0,
                "message" => "No messages found for user"
            ]
        ]);
        exit();
    }

    // FIXED QUERY - removed duplicate parameter binding
    $query = "SELECT 
                other_user.id as other_user_id,
                other_user.name as other_user_name,
                other_user.role as other_user_role,
                last_msg.message as last_message,
                last_msg.created_at as last_message_time,
                last_msg.is_read as is_read
              FROM (
                  SELECT 
                      CASE 
                          WHEN sender_id = :user_id1 THEN receiver_id 
                          ELSE sender_id 
                      END as other_user_id,
                      MAX(created_at) as latest_timestamp
                  FROM messages 
                  WHERE sender_id = :user_id2 OR receiver_id = :user_id3
                  GROUP BY 
                      CASE 
                          WHEN sender_id = :user_id4 THEN receiver_id 
                          ELSE sender_id 
                      END
              ) as conversations
              JOIN users other_user ON other_user.id = conversations.other_user_id
              JOIN messages last_msg ON (
                  (last_msg.sender_id = :user_id5 AND last_msg.receiver_id = conversations.other_user_id) 
                  OR (last_msg.sender_id = conversations.other_user_id AND last_msg.receiver_id = :user_id6)
              ) AND last_msg.created_at = conversations.latest_timestamp
              ORDER BY last_msg.created_at DESC";

    $stmt = $db->prepare($query);
    $stmt->bindParam(":user_id1", $user['id']);
    $stmt->bindParam(":user_id2", $user['id']);
    $stmt->bindParam(":user_id3", $user['id']);
    $stmt->bindParam(":user_id4", $user['id']);
    $stmt->bindParam(":user_id5", $user['id']);
    $stmt->bindParam(":user_id6", $user['id']); // FIXED: Only bind once
    $stmt->execute();

    $conversations = $stmt->fetchAll(PDO::FETCH_ASSOC);

    error_log("Found " . count($conversations) . " conversations");

    echo json_encode([
        "success" => true,
        "conversations" => $conversations,
        "debug" => [
            "user_id" => $user['id'],
            "conversation_count" => count($conversations),
            "query_executed" => true
        ]
    ]);

} catch (Exception $e) {
    error_log("Conversations API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "Server error: " . $e->getMessage(),
        "conversations" => [],
        "debug" => ["error_trace" => $e->getTraceAsString()]
    ]);
}
?>