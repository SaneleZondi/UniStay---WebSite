<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: DELETE, OPTIONS");
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

    $booking_id = $_GET['id'] ?? null;
    
    if (!$booking_id) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Booking ID is required"]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();

    // Get booking details
    $booking_query = "SELECT b.*, p.landlord_id 
                     FROM bookings b 
                     JOIN properties p ON b.property_id = p.id 
                     WHERE b.id = :booking_id";
    
    $booking_stmt = $db->prepare($booking_query);
    $booking_stmt->bindParam(":booking_id", $booking_id);
    $booking_stmt->execute();

    if ($booking_stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Booking not found"]);
        exit();
    }

    $booking = $booking_stmt->fetch();

    // Check permissions
    $canDelete = false;
    if ($user['role'] === 'admin') {
        $canDelete = true;
    } else if ($user['role'] === 'landlord' && $booking['landlord_id'] == $user['id']) {
        $canDelete = true;
    } else if ($user['role'] === 'tenant' && $booking['tenant_id'] == $user['id'] && $booking['status'] === 'pending') {
        $canDelete = true; // Tenants can only delete pending bookings
    }

    if (!$canDelete) {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Access denied"]);
        exit();
    }

    // Check if booking can be deleted (only pending bookings can be deleted)
    if ($booking['status'] !== 'pending' && $user['role'] !== 'admin') {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Only pending bookings can be deleted"]);
        exit();
    }

    // Delete booking
    $delete_query = "DELETE FROM bookings WHERE id = :booking_id";
    $delete_stmt = $db->prepare($delete_query);
    $delete_stmt->bindParam(":booking_id", $booking_id);

    if ($delete_stmt->execute()) {
        // Update property status back to available
        $property_update = "UPDATE properties SET status = 'available' WHERE id = :property_id";
        $property_stmt = $db->prepare($property_update);
        $property_stmt->bindParam(":property_id", $booking['property_id']);
        $property_stmt->execute();
        
        // Log activity
        logActivity($user['id'], "booking_deleted", "Deleted booking #" . $booking_id, $booking_id);
        
        echo json_encode([
            "success" => true,
            "message" => "Booking deleted successfully"
        ]);
    } else {
        throw new Exception("Failed to delete booking");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>