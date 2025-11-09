<?php
// Turn off all error reporting to prevent any output
error_reporting(0);
ini_set('display_errors', 0);

// Start output buffering to catch any stray output
if (ob_get_level()) ob_end_clean();
ob_start();

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$response = ["success" => false, "error" => "Unknown error"];

try {
    // Include files - check if they exist first
    $auth_file = '../../includes/auth.php';
    $database_file = '../../config/database.php';
    
    if (!file_exists($auth_file) || !file_exists($database_file)) {
        throw new Exception("Required files not found");
    }
    
    require_once $auth_file;
    require_once $database_file;

    $auth = new Auth();
    
    // Try multiple authentication methods
    $user = $auth->authenticateRequestWithFallback();
    if (!$user) {
        $user = $auth->authenticate();
    }

    if (!$user) {
        $response = ["success" => false, "error" => "Not authenticated"];
        throw new Exception("Authentication failed");
    }

    if ($user['role'] !== 'tenant') {
        $response = ["success" => false, "error" => "Tenant access required"];
        throw new Exception("Wrong user role");
    }

    // Get and parse input
    $input = file_get_contents("php://input");
    if (empty($input)) {
        $response = ["success" => false, "error" => "No data received"];
        throw new Exception("Empty input");
    }
    
    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $response = ["success" => false, "error" => "Invalid JSON: " . json_last_error_msg()];
        throw new Exception("JSON parse error");
    }

    // Validate required fields
    if (empty($data['booking_id']) || empty($data['rating'])) {
        $response = ["success" => false, "error" => "Missing booking_id or rating"];
        throw new Exception("Missing required fields");
    }

    $database = new Database();
    $db = $database->getConnection();

    // Check booking exists and belongs to user
    $booking_query = "SELECT b.*, p.id as property_id 
                     FROM bookings b 
                     JOIN properties p ON b.property_id = p.id 
                     WHERE b.id = ? AND b.tenant_id = ? 
                     AND (b.status = 'completed' OR b.status = 'approved')";
    
    $booking_stmt = $db->prepare($booking_query);
    $booking_stmt->execute([$data['booking_id'], $user['id']]);

    if ($booking_stmt->rowCount() === 0) {
        $response = ["success" => false, "error" => "Booking not found or not eligible for review"];
        throw new Exception("Booking not found");
    }

    $booking = $booking_stmt->fetch();

    // Check if review already exists
    $review_query = "SELECT id FROM reviews WHERE booking_id = ?";
    $review_stmt = $db->prepare($review_query);
    $review_stmt->execute([$data['booking_id']]);

    if ($review_stmt->rowCount() > 0) {
        $response = ["success" => false, "error" => "Review already exists for this booking"];
        throw new Exception("Duplicate review");
    }

    // Validate rating
    $rating = intval($data['rating']);
    if ($rating < 1 || $rating > 5) {
        $response = ["success" => false, "error" => "Rating must be between 1 and 5"];
        throw new Exception("Invalid rating");
    }

    // Insert review
    $insert_query = "INSERT INTO reviews 
                    (property_id, tenant_id, booking_id, rating, comment, created_at) 
                    VALUES (?, ?, ?, ?, ?, NOW())";
    
    $comment = $data['comment'] ?? '';
    
    $insert_stmt = $db->prepare($insert_query);
    $result = $insert_stmt->execute([
        $booking['property_id'],
        $user['id'], 
        $data['booking_id'],
        $rating,
        $comment
    ]);

    if ($result) {
        $review_id = $db->lastInsertId();
        
        // Update booking to mark as reviewed
        $update_stmt = $db->prepare("UPDATE bookings SET has_review = 1 WHERE id = ?");
        $update_stmt->execute([$data['booking_id']]);
        
        $response = [
            "success" => true,
            "message" => "Review submitted successfully",
            "review_id" => $review_id
        ];
    } else {
        throw new Exception("Database insert failed");
    }

} catch (Exception $e) {
    // Use pre-set response or create error response
    if (!isset($response["success"])) {
        $response = ["success" => false, "error" => $e->getMessage()];
    }
}

// Clear any output and send only JSON
ob_clean();
echo json_encode($response);
ob_end_flush();
exit();
?>