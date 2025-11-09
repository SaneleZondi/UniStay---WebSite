<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
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
        // Get users with filters
        $params = [];
        $where = [];
        
        if (isset($_GET['role'])) {
            $where[] = "u.role = :role";
            $params[':role'] = $_GET['role'];
        }
        
        if (isset($_GET['status'])) {
            if ($_GET['status'] == 'verified') {
                $where[] = "u.is_verified = 1";
            } elseif ($_GET['status'] == 'unverified') {
                $where[] = "u.is_verified = 0";
            } elseif ($_GET['status'] == 'locked') {
                $where[] = "u.is_locked = 1";
            }
        }
        
        if (isset($_GET['search'])) {
            $where[] = "(u.name LIKE :search OR u.email LIKE :search)";
            $params[':search'] = '%' . $_GET['search'] . '%';
        }
        
        $where_clause = $where ? "WHERE " . implode(" AND ", $where) : "";
        
        $query = "SELECT 
            u.id, u.name, u.email, u.role, u.phone, u.is_verified, 
            u.is_locked, u.locked_until, u.last_login, u.created_at,
            up.first_name, up.last_name, up.profile_completed
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        $where_clause
        ORDER BY u.created_at DESC
        LIMIT 100";
        
        $stmt = $db->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->execute();
        
        $users = $stmt->fetchAll();
        
        echo json_encode([
            "success" => true,
            "users" => $users
        ]);
        
    } elseif ($_SERVER['REQUEST_METHOD'] == 'POST') {
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!isset($data['action'])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Action required"]);
            exit();
        }
        
        $user_id = $data['user_id'] ?? null;
        
        if (!$user_id) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "User ID required"]);
            exit();
        }
        
        switch ($data['action']) {
            case 'update_role':
                if (!isset($data['new_role'])) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "New role required"]);
                    exit();
                }
                
                $update_query = "UPDATE users SET role = :role WHERE id = :user_id";
                $update_stmt = $db->prepare($update_query);
                $update_stmt->bindParam(":role", $data['new_role']);
                $update_stmt->bindParam(":user_id", $user_id);
                $update_stmt->execute();
                
                // Log activity
                $activity_query = "INSERT INTO activity_log (user_id, action, description) 
                                  VALUES (:admin_id, 'user_role_updated', :description)";
                $activity_stmt = $db->prepare($activity_query);
                $description = "Updated user #$user_id role to {$data['new_role']}";
                $activity_stmt->bindParam(":admin_id", $user['id']);
                $activity_stmt->bindParam(":description", $description);
                $activity_stmt->execute();
                
                echo json_encode(["success" => true, "message" => "User role updated"]);
                break;
                
            case 'verify':
                $update_query = "UPDATE users SET is_verified = 1 WHERE id = :user_id";
                $update_stmt = $db->prepare($update_query);
                $update_stmt->bindParam(":user_id", $user_id);
                $update_stmt->execute();
                
                echo json_encode(["success" => true, "message" => "User verified"]);
                break;
                
            case 'unverify':
                $update_query = "UPDATE users SET is_verified = 0 WHERE id = :user_id";
                $update_stmt = $db->prepare($update_query);
                $update_stmt->bindParam(":user_id", $user_id);
                $update_stmt->execute();
                
                echo json_encode(["success" => true, "message" => "User unverified"]);
                break;
                
            case 'lock':
                $lock_until = date('Y-m-d H:i:s', time() + (24 * 60 * 60)); // 24 hours
                $update_query = "UPDATE users SET is_locked = 1, locked_until = :lock_until WHERE id = :user_id";
                $update_stmt = $db->prepare($update_query);
                $update_stmt->bindParam(":user_id", $user_id);
                $update_stmt->bindParam(":lock_until", $lock_until);
                $update_stmt->execute();
                
                echo json_encode(["success" => true, "message" => "User locked"]);
                break;
                
            case 'unlock':
                $update_query = "UPDATE users SET is_locked = 0, locked_until = NULL WHERE id = :user_id";
                $update_stmt = $db->prepare($update_query);
                $update_stmt->bindParam(":user_id", $user_id);
                $update_stmt->execute();
                
                echo json_encode(["success" => true, "message" => "User unlocked"]);
                break;
                
            case 'delete':
                // Check if user has related records
                $check_query = "SELECT 
                    (SELECT COUNT(*) FROM properties WHERE landlord_id = :user_id) as property_count,
                    (SELECT COUNT(*) FROM bookings WHERE tenant_id = :user_id) as booking_count";
                $check_stmt = $db->prepare($check_query);
                $check_stmt->bindParam(":user_id", $user_id);
                $check_stmt->execute();
                $counts = $check_stmt->fetch();
                
                if ($counts['property_count'] > 0 || $counts['booking_count'] > 0) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "Cannot delete user with associated properties or bookings"]);
                    exit();
                }
                
                $delete_query = "DELETE FROM users WHERE id = :user_id";
                $delete_stmt = $db->prepare($delete_query);
                $delete_stmt->bindParam(":user_id", $user_id);
                $delete_stmt->execute();
                
                echo json_encode(["success" => true, "message" => "User deleted"]);
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