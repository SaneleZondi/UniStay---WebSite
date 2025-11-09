<?php
// Set headers FIRST before any output
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Simple error handling to avoid HTML output
try {
    // Include database configuration
    $config_path = __DIR__ . '../../../config/database.php';
    if (!file_exists($config_path)) {
        throw new Exception("Database config not found");
    }
    
    require_once $config_path;
    
    // Create database connection
    $database = new Database();
    $db = $database->getConnection();
    
    if (!$db) {
        throw new Exception("Database connection failed");
    }
    
    // Simple query to get maintenance status
    $query = "SELECT setting_value FROM admin_settings WHERE setting_key = 'site_maintenance'";
    $stmt = $db->prepare($query);
    
    if (!$stmt) {
        throw new Exception("Failed to prepare query");
    }
    
    $stmt->execute();
    $maintenance_enabled = $stmt->fetchColumn();
    
    // Get maintenance message if available
    $message_query = "SELECT setting_value FROM admin_settings WHERE setting_key = 'maintenance_message'";
    $message_stmt = $db->prepare($message_query);
    $message_stmt->execute();
    $maintenance_message = $message_stmt->fetchColumn();
    
    // Return JSON response
    echo json_encode([
        "success" => true,
        "maintenance_mode" => ($maintenance_enabled === 'true'),
        "maintenance_message" => $maintenance_message ?: 'System is under maintenance. Please try again later.',
        "timestamp" => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    // Return error as JSON, not HTML
    echo json_encode([
        "success" => false,
        "maintenance_mode" => false,
        "error" => $e->getMessage(),
        "timestamp" => date('Y-m-d H:i:s')
    ]);
}
?>