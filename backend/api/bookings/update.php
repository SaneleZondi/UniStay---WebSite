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

require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../config/database.php';

try {
    $auth = new Auth();
    $user = $auth->authenticateRequestWithFallback();

    if (!$user) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Unauthorized - Please login again"]);
        exit();
    }

    $input = file_get_contents("php://input");
    $data = json_decode($input, true);

    if (!$data || json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON data");
    }

    // Validate required fields - ONLY booking_id is required for status updates
    if (empty($data['booking_id'])) {
        throw new Exception("Booking ID is required");
    }

    $database = new Database();
    $db = $database->getConnection();

    // Get booking details to verify permissions
    $booking_query = "SELECT b.*, p.landlord_id, p.id as property_id 
                     FROM bookings b 
                     JOIN properties p ON b.property_id = p.id 
                     WHERE b.id = :booking_id";
    
    $booking_stmt = $db->prepare($booking_query);
    $booking_stmt->bindParam(":booking_id", $data['booking_id']);
    $booking_stmt->execute();

    if ($booking_stmt->rowCount() === 0) {
        throw new Exception("Booking not found");
    }

    $booking = $booking_stmt->fetch();

    // Check permissions - landlord can only update their own property bookings
    $canUpdate = false;
    
    if ($user['role'] === 'admin') {
        $canUpdate = true;
    } else if ($user['role'] === 'landlord' && $booking['landlord_id'] == $user['id']) {
        $canUpdate = true;
    } else if ($user['role'] === 'tenant' && $booking['tenant_id'] == $user['id']) {
        // Tenants can only cancel their own bookings
        if (isset($data['status']) && $data['status'] === 'cancelled') {
            $canUpdate = true;
        }
    }

    if (!$canUpdate) {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Access denied"]);
        exit();
    }

    // Build update query based on provided fields
    $update_fields = [];
    $update_params = [":booking_id" => $data['booking_id']];

    // Status update
    if (isset($data['status'])) {
        $allowed_statuses = ['pending', 'approved', 'rejected', 'completed', 'cancelled'];
        if (in_array($data['status'], $allowed_statuses)) {
            $update_fields[] = "status = :status";
            $update_params[":status"] = $data['status'];
        }
    }

    // Rejection reason
    if (isset($data['rejection_reason'])) {
        $update_fields[] = "rejection_reason = :rejection_reason";
        $update_params[":rejection_reason"] = $data['rejection_reason'];
    }

    // Notes/remarks
    if (isset($data['admin_notes'])) {
        $update_fields[] = "admin_notes = :admin_notes";
        $update_params[":admin_notes"] = $data['admin_notes'];
    }

    if (empty($update_fields)) {
        throw new Exception("No valid fields to update");
    }

    $update_query = "UPDATE bookings SET " . implode(", ", $update_fields) . " WHERE id = :booking_id";
    $update_stmt = $db->prepare($update_query);

    foreach ($update_params as $param => $value) {
        $update_stmt->bindValue($param, $value);
    }

    if ($update_stmt->execute()) {
        // If booking is approved, update room status
        if (isset($data['status']) && $data['status'] === 'approved') {
            try {
                $update_room = "UPDATE property_rooms SET status = 'occupied' WHERE id = :room_id";
                $room_stmt = $db->prepare($update_room);
                $room_stmt->bindValue(":room_id", $booking['room_id']);
                $room_stmt->execute();
            } catch (Exception $e) {
                // Log but don't fail the request
                error_log("Room status update failed: " . $e->getMessage());
            }
        }

        // If booking is cancelled or rejected, make room available again
        if (isset($data['status']) && in_array($data['status'], ['cancelled', 'rejected'])) {
            try {
                $update_room = "UPDATE property_rooms SET status = 'available' WHERE id = :room_id";
                $room_stmt = $db->prepare($update_room);
                $room_stmt->bindValue(":room_id", $booking['room_id']);
                $room_stmt->execute();
            } catch (Exception $e) {
                // Log but don't fail the request
                error_log("Room status update failed: " . $e->getMessage());
            }
        }

        echo json_encode([
            "success" => true,
            "message" => "Booking updated successfully"
        ]);
    } else {
        $errorInfo = $update_stmt->errorInfo();
        throw new Exception("Database error: " . $errorInfo[2]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>