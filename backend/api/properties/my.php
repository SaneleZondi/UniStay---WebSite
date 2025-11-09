<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../includes/auth.php';
require_once '../../config/database.php';

try {
    $auth = new Auth();
    $user = $auth->authenticateRequestWithFallback(); // Use the enhanced authentication
    
    if (!$user) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Unauthorized. Please log in."]);
        exit();
    }
    
    if ($user['role'] !== 'landlord') {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Forbidden. Landlord access required."]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();

    $query = "SELECT p.*, 
                     COUNT(b.id) as total_bookings,
                     (SELECT COUNT(*) FROM bookings WHERE property_id = p.id AND status = 'approved') as active_bookings,
                     (SELECT image_path FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
              FROM properties p 
              LEFT JOIN bookings b ON p.id = b.property_id
              WHERE p.landlord_id = :landlord_id
              GROUP BY p.id
              ORDER BY p.created_at DESC";

    $stmt = $db->prepare($query);
    $stmt->bindParam(":landlord_id", $user['id']);
    $stmt->execute();

    $properties = $stmt->fetchAll();

    // Process images
    foreach ($properties as &$property) {
        if ($property['primary_image']) {
            $property['primary_image'] = 'http://localhost/UniStay---Website/backend/uploads/' . $property['primary_image'];
        } else {
            $property['primary_image'] = 'http://localhost/UniStay---Website/assets/default-property.jpg';
        }
    }

    echo json_encode([
        "success" => true,
        "data" => $properties
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>