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
    $user = $auth->authenticateRequestWithFallback(); // Use consistent auth
    
    if (!$user || $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Admin access required"]);
        exit();
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    if ($_SERVER['REQUEST_METHOD'] == 'GET') {
        // Get properties with filters
        $params = [];
        $where = [];
        
        if (isset($_GET['status'])) {
            $where[] = "p.status = :status";
            $params[':status'] = $_GET['status'];
        }
        
        if (isset($_GET['search'])) {
            $where[] = "(p.title LIKE :search OR p.city LIKE :search OR u.name LIKE :search)";
            $params[':search'] = '%' . $_GET['search'] . '%';
        }
        
        $where_clause = $where ? "WHERE " . implode(" AND ", $where) : "";
        
        // ENHANCED QUERY WITH ROOM INFORMATION
        $query = "SELECT 
            p.*, 
            u.name as landlord_name,
            u.email as landlord_email,
            (SELECT COUNT(*) FROM property_rooms pr WHERE pr.property_id = p.id) as total_rooms,
            (SELECT COUNT(*) FROM property_rooms pr WHERE pr.property_id = p.id AND pr.status = 'available') as available_rooms,
            (SELECT MIN(price) FROM property_rooms pr WHERE pr.property_id = p.id AND pr.status = 'available') as min_price,
            (SELECT MAX(price) FROM property_rooms pr WHERE pr.property_id = p.id AND pr.status = 'available') as max_price,
            (SELECT COUNT(*) FROM bookings b WHERE b.property_id = p.id) as total_bookings,
            (SELECT image_path FROM property_images pi WHERE pi.property_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
        FROM properties p
        JOIN users u ON p.landlord_id = u.id
        $where_clause
        ORDER BY p.created_at DESC
        LIMIT 100";
        
        $stmt = $db->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        
        $properties = $stmt->fetchAll();
        
        echo json_encode([
            "success" => true,
            "properties" => $properties
        ]);
        
    } else {
        http_response_code(405);
        echo json_encode(["success" => false, "error" => "Method not allowed"]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>