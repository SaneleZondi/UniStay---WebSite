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
        echo json_encode(["success" => false, "error" => "Unauthorized. Please log in."]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();

    if ($user['role'] === 'landlord') {
        // Landlord sees bookings for their properties
        $query = "SELECT 
                    b.*,
                    p.title as property_title,
                    p.city as property_city,
                    p.address as property_address,
                    pr.room_number,
                    pr.room_type,
                    pr.price as room_price,
                    u.name as tenant_name,
                    u.email as tenant_email,
                    (SELECT COUNT(*) FROM reviews WHERE booking_id = b.id) as has_review
                  FROM bookings b
                  JOIN properties p ON b.property_id = p.id
                  JOIN property_rooms pr ON b.room_id = pr.id
                  LEFT JOIN users u ON b.tenant_id = u.id
                  WHERE p.landlord_id = :user_id
                  ORDER BY b.created_at DESC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user['id']);
        
    } else if ($user['role'] === 'tenant') {
        // Tenant sees their own bookings
        $query = "SELECT 
                    b.*,
                    p.title as property_title,
                    p.city as property_city,
                    p.address as property_address,
                    pr.room_number,
                    pr.room_type,
                    pr.price as room_price,
                    landlord.name as landlord_name,
                    landlord.email as landlord_email,
                    (SELECT COUNT(*) FROM reviews WHERE booking_id = b.id) as has_review
                  FROM bookings b
                  JOIN properties p ON b.property_id = p.id
                  JOIN property_rooms pr ON b.room_id = pr.id
                  JOIN users landlord ON p.landlord_id = landlord.id
                  WHERE b.tenant_id = :user_id
                  ORDER BY b.created_at DESC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user['id']);
        
    } else {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Access denied. Tenant or landlord access required."]);
        exit();
    }
    
    $stmt->execute();
    $bookings = $stmt->fetchAll();
    
    // Format dates and add status classes for frontend
    foreach ($bookings as &$booking) {
        $booking['status_class'] = strtolower($booking['status']);
        
        // Calculate if booking can be reviewed
        $booking['can_review'] = false;
        if ($booking['status'] === 'completed') {
            $checkOut = new DateTime($booking['check_out']);
            $today = new DateTime();
            $booking['can_review'] = $checkOut < $today && !$booking['has_review'];
        }
    }
    
    echo json_encode([
        "success" => true,
        "data" => $bookings
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>