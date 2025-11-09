<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../includes/auth.php';
require_once '../../includes/functions.php';

try {
    // Enhanced authentication
    $auth = new Auth();
    $user = null;
    
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
        if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
            $token = $matches[1];
            $user = $auth->validateSessionToken($token);
        }
    }
    
    if (!$user && isset($_COOKIE['session_token'])) {
        $user = $auth->validateSessionToken($_COOKIE['session_token']);
    }
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Unauthorized. Please log in again."]);
        exit();
    }

    $data = json_decode(file_get_contents("php://input"), true);
    
    if (!isset($data['id'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Property ID is required"]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();

    // Check if property belongs to user (or user is admin)
    $check_query = "SELECT landlord_id FROM properties WHERE id = :id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(":id", $data['id']);
    $check_stmt->execute();

    if ($check_stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Property not found"]);
        exit();
    }

    $property = $check_stmt->fetch();

    if ($property['landlord_id'] != $user['id'] && $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "You can only update your own properties"]);
        exit();
    }

    // Build update query for property
    $allowed_fields = ['title', 'description', 'address', 'city', 'property_type', 'amenities', 'status'];
    $update_fields = [];
    $params = [':id' => $data['id']];

    foreach ($allowed_fields as $field) {
        if (isset($data[$field])) {
            $update_fields[] = "$field = :$field";
            $params[":$field"] = $data[$field];
        }
    }

    if (empty($update_fields)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "No fields to update"]);
        exit();
    }

    // Update property
    $query = "UPDATE properties SET " . implode(', ', $update_fields) . ", updated_at = NOW() WHERE id = :id";
    $stmt = $db->prepare($query);
    
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }

    if (!$stmt->execute()) {
        throw new Exception("Failed to update property");
    }

    // Handle room updates if provided
    if (isset($data['rooms']) && is_array($data['rooms'])) {
        $room_count = 0;
        $available_rooms = 0;
        
        foreach ($data['rooms'] as $room) {
            if (!empty($room['room_number']) && !empty($room['room_type']) && !empty($room['price'])) {
                
                if (isset($room['id']) && !empty($room['id'])) {
                    // Update existing room
                    $room_query = "UPDATE property_rooms SET 
                                  room_number = :room_number, 
                                  room_type = :room_type, 
                                  price = :price, 
                                  bedrooms = :bedrooms, 
                                  bathrooms = :bathrooms, 
                                  room_amenities = :room_amenities, 
                                  status = :status,
                                  updated_at = NOW() 
                                  WHERE id = :id AND property_id = :property_id";
                    
                    $room_stmt = $db->prepare($room_query);
                    $room_stmt->execute([
                        ':room_number' => $room['room_number'],
                        ':room_type' => $room['room_type'],
                        ':price' => $room['price'],
                        ':bedrooms' => $room['bedrooms'],
                        ':bathrooms' => $room['bathrooms'],
                        ':room_amenities' => $room['room_amenities'],
                        ':status' => $room['status'],
                        ':id' => $room['id'],
                        ':property_id' => $data['id']
                    ]);
                } else {
                    // Insert new room
                    $room_query = "INSERT INTO property_rooms 
                                  (property_id, room_number, room_type, price, bedrooms, bathrooms, room_amenities, status) 
                                  VALUES 
                                  (:property_id, :room_number, :room_type, :price, :bedrooms, :bathrooms, :room_amenities, :status)";
                    
                    $room_stmt = $db->prepare($room_query);
                    $room_stmt->execute([
                        ':property_id' => $data['id'],
                        ':room_number' => $room['room_number'],
                        ':room_type' => $room['room_type'],
                        ':price' => $room['price'],
                        ':bedrooms' => $room['bedrooms'],
                        ':bathrooms' => $room['bathrooms'],
                        ':room_amenities' => $room['room_amenities'],
                        ':status' => $room['status']
                    ]);
                }
                
                $room_count++;
                if ($room['status'] === 'available') {
                    $available_rooms++;
                }
            }
        }
        
        // Update property room counts
        $update_counts = "UPDATE properties SET 
                         total_rooms = :total_rooms,
                         available_rooms = :available_rooms 
                         WHERE id = :property_id";
        
        $count_stmt = $db->prepare($update_counts);
        $count_stmt->execute([
            ':total_rooms' => $room_count,
            ':available_rooms' => $available_rooms,
            ':property_id' => $data['id']
        ]);
    }

    logActivity($user['id'], "property_update", "Updated property #" . $data['id'], $data['id']);
    
    echo json_encode([
        "success" => true,
        "message" => "Property updated successfully"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>