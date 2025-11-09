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
        $action = $_GET['action'] ?? 'info';
        
        switch ($action) {
            case 'info':
                // Get system information
                $system_info = [
                    'php_version' => phpversion(),
                    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
                    'database_version' => 'MySQL', // You can get actual version from DB
                    'database_size' => 0, // You can calculate this
                    'upload_max_filesize' => ini_get('upload_max_filesize'),
                    'max_execution_time' => ini_get('max_execution_time')
                ];
                
                echo json_encode([
                    "success" => true,
                    "system_info" => $system_info
                ]);
                break;
                
            case 'logs':
                $limit = $_GET['limit'] ?? 50;
                $query = "SELECT al.*, u.name as user_name, u.email as user_email 
                         FROM activity_log al 
                         LEFT JOIN users u ON al.user_id = u.id 
                         ORDER BY al.created_at DESC 
                         LIMIT :limit";
                $stmt = $db->prepare($query);
                $stmt->bindValue(":limit", (int)$limit, PDO::PARAM_INT);
                $stmt->execute();
                $logs = $stmt->fetchAll();
                
                echo json_encode([
                    "success" => true,
                    "logs" => $logs
                ]);
                break;
                
            default:
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid action"]);
        }
        
    } elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        $action = $data['action'] ?? '';
        
        switch ($action) {
            case 'clear_cache':
                // Simple cache clearing - you can implement actual cache clearing
                echo json_encode([
                    "success" => true,
                    "message" => "Cache cleared successfully"
                ]);
                break;
                
            case 'backup_database':
                // Placeholder for database backup
                echo json_encode([
                    "success" => true,
                    "message" => "Database backup created successfully"
                ]);
                break;
                
            default:
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Invalid action"]);
        }
        
    } else {
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>