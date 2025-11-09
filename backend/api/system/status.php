<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Get maintenance settings
    $query = "SELECT setting_key, setting_value FROM admin_settings WHERE setting_key IN ('site_maintenance', 'maintenance_message')";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    
    $maintenance_mode = isset($settings['site_maintenance']) && $settings['site_maintenance'] === 'true';
    $maintenance_message = $settings['maintenance_message'] ?? 'System is under maintenance. Please try again later.';
    
    echo json_encode([
        "success" => true,
        "maintenance_mode" => $maintenance_mode,
        "maintenance_message" => $maintenance_message
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>