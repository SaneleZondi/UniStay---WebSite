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
    $database = new Database();
    $db = $database->getConnection();
    
    // Check if admin user exists
    $query = "SELECT id, name, email, role, is_verified FROM users WHERE role = 'admin'";
    $stmt = $db->prepare($query);
    $stmt->execute();
    
    $admins = $stmt->fetchAll();
    
    echo json_encode([
        "success" => true,
        "admin_users" => $admins,
        "total_admins" => count($admins)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>