<?php
header("Content-Type: application/json; charset=UTF-8");
require_once __DIR__ . '/../../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Check if table exists and show current settings
    $query = "SHOW TABLES LIKE 'admin_settings'";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $tableExists = $stmt->fetch();
    
    if (!$tableExists) {
        echo json_encode(["success" => false, "error" => "admin_settings table does not exist"]);
        exit();
    }
    
    // Show all current settings
    $query = "SELECT * FROM admin_settings";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $settings = $stmt->fetchAll();
    
    echo json_encode([
        "success" => true,
        "table_exists" => true,
        "settings" => $settings
    ]);
    
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>