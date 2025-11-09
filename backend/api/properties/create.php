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

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    // Include required files
    require_once '../../includes/auth.php';
    require_once '../../includes/functions.php';
    require_once '../../includes/UploadHandler.php';
    require_once '../../config/database.php';

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
    
    if ($user['role'] !== 'landlord') {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Forbidden. Landlord access required."]);
        exit();
    }

    // Validate required fields
    $required_fields = ['title', 'description', 'address', 'city', 'property_type'];
    foreach ($required_fields as $field) {
        if (empty($_POST[$field])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing required field: $field"]);
            exit();
        }
    }

    // Validate rooms
    if (empty($_POST['rooms']) || !is_array($_POST['rooms'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "At least one room is required"]);
        exit();
    }

    $title = trim($_POST['title']);
    $description = trim($_POST['description']);
    $address = trim($_POST['address']);
    $city = trim($_POST['city']);
    $property_type = $_POST['property_type'];
    $amenities = $_POST['amenities'] ?? '';
    $landlordId = $user['id'];

    // Database connection
    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception("Database connection failed");
    }

    // Prevent duplicates
    $check = $db->prepare("SELECT id FROM properties WHERE title = :title AND landlord_id = :landlord_id");
    $check->execute([':title' => $title, ':landlord_id' => $landlordId]);
    if ($check->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "You already have a property with this title"]);
        exit();
    }

    // Handle images (optional)
    $image_paths = [];
    if (!empty($_FILES['images']) && $_FILES['images']['error'][0] !== 4) {
        $uploader = new UploadHandler();
        $upload_result = $uploader->uploadPropertyImages($_FILES['images']);
        if (!$upload_result['success']) {
            http_response_code(400);
            echo json_encode($upload_result);
            exit();
        }
        $image_paths = $upload_result['paths'];
    }

    // Insert property (NO PRICE COLUMN)
    $stmt = $db->prepare("INSERT INTO properties 
        (landlord_id, title, description, address, city, property_type, amenities, status, created_at) 
        VALUES 
        (:landlord_id, :title, :description, :address, :city, :property_type, :amenities, 'available', NOW())");

    $result = $stmt->execute([
        ':landlord_id' => $landlordId,
        ':title' => $title,
        ':description' => $description,
        ':address' => $address,
        ':city' => $city,
        ':property_type' => $property_type,
        ':amenities' => $amenities
    ]);

    if (!$result) {
        throw new Exception("Failed to insert property: " . implode(", ", $stmt->errorInfo()));
    }

    $property_id = $db->lastInsertId();

    // Insert rooms (prices are stored here)
    $room_count = 0;
    $rooms_data = $_POST['rooms'];
    
    foreach ($rooms_data as $roomData) {
        if (!empty($roomData['room_number']) && !empty($roomData['room_type']) && !empty($roomData['price'])) {
            $roomStmt = $db->prepare("INSERT INTO property_rooms 
                (property_id, room_number, room_type, price, bedrooms, bathrooms, room_amenities, status) 
                VALUES 
                (:property_id, :room_number, :room_type, :price, :bedrooms, :bathrooms, :room_amenities, 'available')");
            
            $roomResult = $roomStmt->execute([
                ':property_id' => $property_id,
                ':room_number' => trim($roomData['room_number']),
                ':room_type' => $roomData['room_type'],
                ':price' => floatval($roomData['price']),
                ':bedrooms' => intval($roomData['bedrooms'] ?? 1),
                ':bathrooms' => intval($roomData['bathrooms'] ?? 1),
                ':room_amenities' => $roomData['room_amenities'] ?? ''
            ]);
            
            if (!$roomResult) {
                throw new Exception("Failed to insert room: " . implode(", ", $roomStmt->errorInfo()));
            }
            
            $room_count++;
        }
    }

    if ($room_count === 0) {
        throw new Exception("No valid rooms were added");
    }

    // Update property room counts
    $updateStmt = $db->prepare("UPDATE properties SET 
        total_rooms = :total_rooms,
        available_rooms = :available_rooms
        WHERE id = :property_id");
    
    $updateResult = $updateStmt->execute([
        ':total_rooms' => $room_count,
        ':available_rooms' => $room_count,
        ':property_id' => $property_id
    ]);

    if (!$updateResult) {
        throw new Exception("Failed to update room counts: " . implode(", ", $updateStmt->errorInfo()));
    }

    // Insert images if any
    if (!empty($image_paths)) {
        foreach ($image_paths as $index => $path) {
            $imgStmt = $db->prepare("INSERT INTO property_images (property_id, image_path, is_primary) 
                                     VALUES (:property_id, :path, :is_primary)");
            $imgStmt->execute([
                ':property_id' => $property_id,
                ':path' => $path,
                ':is_primary' => $index === 0 ? 1 : 0
            ]);
        }
    }

    echo json_encode([
        "success" => true,
        "message" => "Property added successfully with $room_count rooms",
        "property_id" => $property_id
    ]);

} catch (Exception $e) {
    error_log("Error in create.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "Server error: " . $e->getMessage()
    ]);
}
?>