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
        // Get payments with filters
        $params = [];
        $where = [];
        
        if (isset($_GET['status'])) {
            $where[] = "p.status = :status";
            $params[':status'] = $_GET['status'];
        }
        
        if (isset($_GET['type'])) {
            $where[] = "p.payment_type = :type";
            $params[':type'] = $_GET['type'];
        }
        
        if (isset($_GET['search'])) {
            $where[] = "(prop.title LIKE :search OR b.guest_name LIKE :search)";
            $params[':search'] = '%' . $_GET['search'] . '%';
        }
        
        $where_clause = $where ? "WHERE " . implode(" AND ", $where) : "";
        
        $query = "SELECT 
            p.*,
            b.guest_name,
            prop.title as property_title,
            prop.city as property_city
        FROM payments p
        JOIN bookings b ON p.booking_id = b.id
        JOIN properties prop ON b.property_id = prop.id
        $where_clause
        ORDER BY p.created_at DESC
        LIMIT 100";
        
        $stmt = $db->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        
        $payments = $stmt->fetchAll();
        
        // Get totals
        $totals_query = "SELECT 
            COUNT(*) as total_count,
            SUM(amount) as total_amount,
            SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as completed_amount
        FROM payments";
        $totals_stmt = $db->prepare($totals_query);
        $totals_stmt->execute();
        $totals = $totals_stmt->fetch();
        
        echo json_encode([
            "success" => true,
            "payments" => $payments,
            "totals" => $totals
        ]);
        
    } elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['action']) || !isset($data['payment_id'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Action and payment ID required"]);
            exit();
        }
        
        $payment_id = $data['payment_id'];
        $action = $data['action'];
        
        // Validate payment exists
        $check_query = "SELECT id, amount FROM payments WHERE id = :payment_id";
        $check_stmt = $db->prepare($check_query);
        $check_stmt->bindParam(":payment_id", $payment_id);
        $check_stmt->execute();
        
        if ($check_stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Payment not found"]);
            exit();
        }
        
        $payment = $check_stmt->fetch();
        $allowed_actions = ['mark_completed', 'mark_failed', 'refund'];
        
        if (!in_array($action, $allowed_actions)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid action"]);
            exit();
        }
        
        if ($action === 'refund') {
            $amount = $data['amount'] ?? $payment['amount'];
            
            // Create refund payment
            $refund_query = "INSERT INTO payments (booking_id, amount, payment_method, payment_type, status, transaction_id) 
                            SELECT booking_id, :amount, payment_method, 'refund', 'completed', CONCAT('REFUND_', transaction_id)
                            FROM payments WHERE id = :payment_id";
            $refund_stmt = $db->prepare($refund_query);
            $refund_stmt->bindParam(":amount", $amount);
            $refund_stmt->bindParam(":payment_id", $payment_id);
            $refund_stmt->execute();
            
            $message = "Refund processed successfully";
        } else {
            $status = $action === 'mark_completed' ? 'completed' : 'failed';
            $update_query = "UPDATE payments SET status = :status WHERE id = :payment_id";
            $update_stmt = $db->prepare($update_query);
            $update_stmt->bindParam(":status", $status);
            $update_stmt->bindParam(":payment_id", $payment_id);
            $update_stmt->execute();
            
            $message = "Payment marked as {$status}";
        }
        
        // Log activity
        $activity_query = "INSERT INTO activity_log (user_id, action, description) 
                          VALUES (:admin_id, 'payment_updated', :description)";
        $activity_stmt = $db->prepare($activity_query);
        $description = "Admin {$action} for payment #$payment_id";
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