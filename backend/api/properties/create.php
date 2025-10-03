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

require_once '../../includes/auth.php';
require_once '../../includes/functions.php';
require_once '../../includes/UploadHandler.php';

try {
    // ✅ Enhanced authentication that handles both session cookies and Bearer tokens
    $auth = new Auth();
    $user = null;
    
    // First try Bearer token from Authorization header
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
        if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
            $token = $matches[1];
            $user = $auth->validateSessionToken($token);
        }
    }
    
    // If Bearer token failed, try session cookie
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

    // ✅ Rest of your existing validation code...
    $required_fields = ['title', 'description', 'price', 'address', 'city', 'bedrooms', 'bathrooms'];
    foreach ($required_fields as $field) {
        if (empty($_POST[$field])) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Missing field: $field"]);
            exit();
        }
    }

    $title       = trim($_POST['title']);
    $description = trim($_POST['description']);
    $price       = floatval($_POST['price']);
    $address     = trim($_POST['address']);
    $city        = trim($_POST['city']);
    $bedrooms    = intval($_POST['bedrooms']);
    $bathrooms   = intval($_POST['bathrooms']);
    $amenities   = $_POST['amenities'] ?? '';
    $landlordId  = $user['id'];

    $database = new Database();
    $db = $database->getConnection();

    // Prevent duplicates
    $check = $db->prepare("SELECT id FROM properties WHERE title = :title AND landlord_id = :landlord_id");
    $check->execute([':title' => $title, ':landlord_id' => $landlordId]);
    if ($check->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "You already have a property with this title"]);
        exit();
    }

    // Handle images
    $uploader = new UploadHandler();
    $image_paths = [];
    if (!empty($_FILES['images'])) {
        $upload_result = $uploader->uploadPropertyImages($_FILES['images']);
        if (!$upload_result['success']) {
            http_response_code(400);
            echo json_encode($upload_result);
            exit();
        }
        $image_paths = $upload_result['paths'];
    }

    // Insert property
    $stmt = $db->prepare("INSERT INTO properties 
        (landlord_id, title, description, price, address, city, bedrooms, bathrooms, amenities, status, created_at) 
        VALUES 
        (:landlord_id, :title, :description, :price, :address, :city, :bedrooms, :bathrooms, :amenities, 'available', NOW())");

    $stmt->execute([
        ':landlord_id' => $landlordId,
        ':title' => $title,
        ':description' => $description,
        ':price' => $price,
        ':address' => $address,
        ':city' => $city,
        ':bedrooms' => $bedrooms,
        ':bathrooms' => $bathrooms,
        ':amenities' => $amenities
    ]);

    $property_id = $db->lastInsertId();

    // Insert images
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
        "message" => "Property added successfully",
        "property_id" => $property_id
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>