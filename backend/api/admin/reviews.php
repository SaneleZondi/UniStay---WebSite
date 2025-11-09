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
        // Get reviews with filters
        $params = [];
        $where = [];
        
        if (isset($_GET['status'])) {
            if ($_GET['status'] == 'approved') {
                $where[] = "r.is_approved = 1";
            } elseif ($_GET['status'] == 'pending') {
                $where[] = "r.is_approved = 0";
            }
        }
        
        if (isset($_GET['search'])) {
            $where[] = "(p.title LIKE :search OR t.name LIKE :search)";
            $params[':search'] = '%' . $_GET['search'] . '%';
        }
        
        $where_clause = $where ? "WHERE " . implode(" AND ", $where) : "";
        
        $query = "SELECT 
            r.*,
            p.title as property_title,
            t.name as tenant_name,
            t.email as tenant_email
        FROM reviews r
        JOIN properties p ON r.property_id = p.id
        JOIN users t ON r.tenant_id = t.id
        $where_clause
        ORDER BY r.created_at DESC
        LIMIT 100";
        
        $stmt = $db->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        
        $reviews = $stmt->fetchAll();
        
        echo json_encode([
            "success" => true,
            "reviews" => $reviews
        ]);
        
    } elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['action']) || !isset($data['review_id'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Action and review ID required"]);
            exit();
        }
        
        $review_id = $data['review_id'];
        $action = $data['action'];
        
        // Validate review exists
        $check_query = "SELECT id FROM reviews WHERE id = :review_id";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":review_id", $review_id);
        $check_stmt->execute();
        
        if ($check_stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Review not found"]);
            exit();
        }
        
        $allowed_actions = ['approve', 'reject', 'delete'];
        if (!in_array($action, $allowed_actions)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid action"]);
            exit();
        }
        
        if ($action === 'delete') {
            $delete_query = "DELETE FROM reviews WHERE id = :review_id";
            $delete_stmt = $db->prepare($delete_query);
            $delete_stmt->bindParam(":review_id", $review_id);
            $delete_stmt->execute();
            
            $message = "Review deleted successfully";
        } else {
            $update_query = "UPDATE reviews SET is_approved = :approved WHERE id = :review_id";
            $update_stmt = $db->prepare($update_query);
            $update_stmt->bindParam(":review_id", $review_id);
            $update_stmt->bindValue(":approved", $action === 'approve' ? 1 : 0);
            $update_stmt->execute();
            
            $message = "Review {$action}d successfully";
        }
        
        // Log activity
        $activity_query = "INSERT INTO activity_log (user_id, action, description) 
                          VALUES (:admin_id, 'review_updated', :description)";
        $activity_stmt = $db->prepare($activity_query);
        $description = "Admin {$action}d review #$review_id";
        $activity_stmt->bindParam(":admin_id", $user['id']);
        $activity_stmt->bindParam(":description", $description);
        $activity_stmt->execute();
        
        echo json_encode([
            "success" => true,
            "message" => $message
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