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
        // Get bookings with filters
        $params = [];
        $where = [];
        
        if (isset($_GET['status'])) {
            $where[] = "b.status = :status";
            $params[':status'] = $_GET['status'];
        }
        
        if (isset($_GET['search'])) {
            $where[] = "(p.title LIKE :search OR t.name LIKE :search OR l.name LIKE :search)";
            $params[':search'] = '%' . $_GET['search'] . '%';
        }
        
        $where_clause = $where ? "WHERE " . implode(" AND ", $where) : "";
        
        $query = "SELECT 
            b.*,
            p.title as property_title,
            p.city as property_city,
            t.name as tenant_name,
            t.email as tenant_email,
            l.name as landlord_name,
            l.email as landlord_email
        FROM bookings b
        JOIN properties p ON b.property_id = p.id
        JOIN users l ON p.landlord_id = l.id
        LEFT JOIN users t ON b.tenant_id = t.id
        $where_clause
        ORDER BY b.created_at DESC
        LIMIT 100";
        
        $stmt = $db->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        
        $bookings = $stmt->fetchAll();
        
        echo json_encode([
            "success" => true,
            "bookings" => $bookings
        ]);
        
    } elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['action']) || !isset($data['booking_id'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Action and booking ID required"]);
            exit();
        }
        
        $booking_id = $data['booking_id'];
        $action = $data['action'];
        
        // Validate booking exists
        $check_query = "SELECT id FROM bookings WHERE id = :booking_id";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":booking_id", $booking_id);
        $check_stmt->execute();
        
        if ($check_stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Booking not found"]);
            exit();
        }
        
        $allowed_actions = ['approve', 'reject', 'complete', 'cancel'];
        if (!in_array($action, $allowed_actions)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid action"]);
            exit();
        }
        
        $update_query = "UPDATE bookings SET status = :status WHERE id = :booking_id";
        $update_stmt = $db->prepare($update_query);
        $update_stmt->bindParam(":booking_id", $booking_id);
        
        switch ($action) {
            case 'approve':
                $update_stmt->bindValue(":status", 'approved');
                break;
            case 'reject':
                $update_stmt->bindValue(":status", 'rejected');
                break;
            case 'complete':
                $update_stmt->bindValue(":status", 'completed');
                break;
            case 'cancel':
                $update_stmt->bindValue(":status", 'cancelled');
                break;
        }
        
        $update_stmt->execute();
        
        // Log activity
        $activity_query = "INSERT INTO activity_log (user_id, action, description) 
                          VALUES (:admin_id, 'booking_updated', :description)";
        $activity_stmt = $db->prepare($activity_query);
        $description = "Admin {$action}d booking #$booking_id";
        $activity_stmt->bindParam(":admin_id", $user['id']);
        $activity_stmt->bindParam(":description", $description);
        $activity_stmt->execute();
        
        echo json_encode([
            "success" => true,
            "message" => "Booking {$action}d successfully"
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