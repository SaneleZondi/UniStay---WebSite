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
    $user = $auth->authenticateRequestWithFallback();

    if (!$user) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Unauthorized - Please login again"]);
        exit();
    }

    $booking_id = $_GET['id'] ?? null;
    
    if (!$booking_id) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Booking ID is required"]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();

    // UPDATED QUERY - Removed p.price and added room information
    $query = "SELECT b.*, 
                     p.title as property_title, 
                     p.description as property_description, 
                     p.city as property_city, 
                     p.address as property_address,
                     p.landlord_id as landlord_id,
                     pr.room_number,
                     pr.room_type,
                     pr.price as room_price,  -- Get price from room table
                     pr.bedrooms,
                     pr.bathrooms,
                     landlord.name as landlord_name, 
                     landlord.email as landlord_email,
                     tenant.name as tenant_name, 
                     tenant.email as tenant_email
              FROM bookings b
              JOIN properties p ON b.property_id = p.id
              JOIN property_rooms pr ON b.room_id = pr.id  -- Join with room table
              JOIN users landlord ON p.landlord_id = landlord.id
              LEFT JOIN users tenant ON b.tenant_id = tenant.id
              WHERE b.id = :booking_id";

    $stmt = $db->prepare($query);
    $stmt->bindParam(":booking_id", $booking_id);
    $stmt->execute();

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Booking not found"]);
        exit();
    }

    $booking = $stmt->fetch();

    // Check permissions
    $canView = false;
    
    if ($user['role'] === 'admin') {
        $canView = true;
    } else if ($user['role'] === 'landlord' && $booking['landlord_id'] == $user['id']) {
        $canView = true;
    } else if ($user['role'] === 'tenant' && $booking['tenant_id'] == $user['id']) {
        $canView = true;
    } else if (!$booking['tenant_id'] && $booking['guest_email'] === $user['email']) {
        $canView = true; // Guest booking
    }

    if (!$canView) {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Access denied"]);
        exit();
    }

    echo json_encode([
        "success" => true,
        "booking" => $booking
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>