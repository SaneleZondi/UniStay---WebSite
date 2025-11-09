<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

try {
    $auth = new Auth();
    $user = $auth->authenticateRequest();
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Unauthorized"]);
        exit();
    }

    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid JSON data"]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();

    // NEVER allow email changes - remove email from data if present
    if (isset($data['email'])) {
        unset($data['email']);
    }

    // NEVER allow role changes - remove role from data if present
    if (isset($data['role'])) {
        unset($data['role']);
    }

    // Validate and update fields - allow profile updates for all roles
    $allowed_fields = ['name', 'phone', 'profile_image'];
    $updates = [];
    $params = [':user_id' => $user['id']];

    foreach ($allowed_fields as $field) {
        if (isset($data[$field])) {
            // Validate phone format if it's a phone field
            if ($field === 'phone' && !empty($data[$field])) {
                $phone = preg_replace('/[^0-9+]/', '', $data[$field]);
                if (strlen($phone) < 10) {
                    http_response_code(400);
                    echo json_encode(["success" => false, "error" => "Invalid phone number format"]);
                    exit();
                }
                $data[$field] = $phone;
            }
            
            // Validate name length
            if ($field === 'name' && strlen(trim($data[$field])) < 2) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Name must be at least 2 characters long"]);
                exit();
            }
            
            $updates[] = "$field = :$field";
            $params[":$field"] = trim($data[$field]);
        }
    }

    if (empty($updates)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "No valid fields to update"]);
        exit();
    }

    $query = "UPDATE users SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = :user_id";
    $stmt = $db->prepare($query);
    
    if ($stmt->execute($params)) {
        // Return updated user data
        $select_query = "SELECT id, name, email, phone, profile_image, role, is_verified FROM users WHERE id = :user_id";
        $select_stmt = $db->prepare($select_query);
        $select_stmt->bindParam(":user_id", $user['id']);
        $select_stmt->execute();
        
        $updated_user = $select_stmt->fetch();
        
        echo json_encode([
            "success" => true, 
            "message" => "Profile updated successfully",
            "user" => $updated_user
        ]);
    } else {
        throw new Exception("Failed to update profile");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>