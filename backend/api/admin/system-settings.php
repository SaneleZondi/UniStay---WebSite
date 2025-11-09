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

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

try {
    $auth = new Auth();
    $user = $auth->authenticate();
    
    if (!$user || $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Admin access required"]);
        exit();
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    if ($_SERVER['REQUEST_METHOD'] == 'GET') {
        // Get all settings
        $query = "SELECT * FROM admin_settings";
        $stmt = $db->prepare($query);
        $stmt->execute();
        $settings = $stmt->fetchAll();
        
        // Convert to key-value pairs
        $settings_array = [];
        foreach ($settings as $setting) {
            $settings_array[$setting['setting_key']] = [
                'value' => $setting['setting_value'],
                'type' => $setting['setting_type'],
                'description' => $setting['description']
            ];
        }
        
        echo json_encode([
            "success" => true,
            "settings" => $settings_array
        ]);
        
    } elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['settings'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Settings data required"]);
            exit();
        }
        
        // Begin transaction for atomic operations
        $db->beginTransaction();
        
        try {
            foreach ($data['settings'] as $key => $value) {
                // First check if the setting exists
                $checkQuery = "SELECT COUNT(*) FROM admin_settings WHERE setting_key = :key";
                $checkStmt = $db->prepare($checkQuery);
                $checkStmt->bindParam(":key", $key);
                $checkStmt->execute();
                $exists = $checkStmt->fetchColumn();
                
                if ($exists) {
                    // Update existing setting
                    $query = "UPDATE admin_settings SET 
                             setting_value = :value, 
                             updated_by = :user_id, 
                             updated_at = NOW() 
                             WHERE setting_key = :key";
                } else {
                    // Insert new setting
                    $query = "INSERT INTO admin_settings (setting_key, setting_value, setting_type, description, updated_by) 
                             VALUES (:key, :value, 'string', 'System setting', :user_id)";
                }
                
                $stmt = $db->prepare($query);
                $stmt->bindParam(":key", $key);
                $stmt->bindParam(":value", $value);
                $stmt->bindParam(":user_id", $user['id']);
                
                if (!$stmt->execute()) {
                    throw new Exception("Failed to save setting: $key");
                }
            }
            
            // Commit transaction
            $db->commit();
            
            // Log activity
            $activity_query = "INSERT INTO activity_log (user_id, action, description) 
                             VALUES (:user_id, 'settings_updated', 'Admin updated system settings')";
            $activity_stmt = $db->prepare($activity_query);
            $activity_stmt->bindParam(":user_id", $user['id']);
            $activity_stmt->execute();
            
            echo json_encode([
                "success" => true,
                "message" => "Settings updated successfully"
            ]);
            
        } catch (Exception $e) {
            // Rollback transaction on error
            $db->rollBack();
            throw $e;
        }
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>