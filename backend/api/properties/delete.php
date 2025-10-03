<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../includes/auth.php';
require_once '../../includes/functions.php';
require_once '../../config/database.php';
try {
    // ✅ Enhanced authentication (same as create.php and update.php)
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

    $property_id = $_GET['id'] ?? null;
    
    if (!$property_id) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Property ID is required"]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();

    // Check if property belongs to user (or user is admin)
    $check_query = "SELECT landlord_id, title FROM properties WHERE id = :id";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(":id", $property_id);
    $check_stmt->execute();

    if ($check_stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Property not found"]);
        exit();
    }

    $property = $check_stmt->fetch();

    if ($property['landlord_id'] != $user['id'] && $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "You can only delete your own properties"]);
        exit();
    }

    // Check if property has active bookings
    $bookings_query = "SELECT id FROM bookings WHERE property_id = :property_id AND status IN ('pending', 'approved')";
    $bookings_stmt = $db->prepare($bookings_query);
    $bookings_stmt->bindParam(":property_id", $property_id);
    $bookings_stmt->execute();

    if ($bookings_stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Cannot delete property with active bookings"]);
        exit();
    }

    // Delete property (cascade will handle related records)
    $delete_query = "DELETE FROM properties WHERE id = :id";
    $delete_stmt = $db->prepare($delete_query);
    $delete_stmt->bindParam(":id", $property_id);

    if ($delete_stmt->execute()) {
        logActivity($user['id'], "property_delete", "Deleted property: " . $property['title'], $property_id);
        
        echo json_encode([
            "success" => true,
            "message" => "Property deleted successfully"
        ]);
    } else {
        throw new Exception("Failed to delete property");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>