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

require_once '../../config/database.php'; // ADD THIS LINE

try {
    // Reviews can be read by anyone - no authentication required for reading
    $database = new Database();
    $db = $database->getConnection();

    $property_id = $_GET['property_id'] ?? null;
    $booking_id = $_GET['booking_id'] ?? null;
    $user_id = $_GET['user_id'] ?? null;
    
    // Build query based on parameters
    $whereConditions = ["r.is_approved = 1"]; // Only show approved reviews
    $params = [];
    
    if ($property_id) {
        $whereConditions[] = "r.property_id = :property_id";
        $params[':property_id'] = $property_id;
    }
    
    if ($booking_id) {
        $whereConditions[] = "r.booking_id = :booking_id";
        $params[':booking_id'] = $booking_id;
    }
    
    if ($user_id) {
        $whereConditions[] = "r.tenant_id = :user_id";
        $params[':user_id'] = $user_id;
    }
    
    $whereClause = implode(" AND ", $whereConditions);
    
    $query = "SELECT r.*, u.name as tenant_name, p.title as property_title,
                     landlord.name as landlord_name, landlord_response,
                     DATE_FORMAT(r.created_at, '%M %Y') as review_date
              FROM reviews r
              JOIN users u ON r.tenant_id = u.id
              JOIN properties p ON r.property_id = p.id
              JOIN users landlord ON p.landlord_id = landlord.id
              WHERE $whereClause
              ORDER BY r.created_at DESC";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    
    $reviews = $stmt->fetchAll();
    
    // Calculate average rating if property_id is specified
    $average_rating = null;
    if ($property_id) {
        $avgQuery = "SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews 
                     FROM reviews 
                     WHERE property_id = :property_id AND is_approved = 1";
        $avgStmt = $db->prepare($avgQuery);
        $avgStmt->bindParam(":property_id", $property_id);
        $avgStmt->execute();
        $avgResult = $avgStmt->fetch();
        
        $average_rating = [
            'average' => round($avgResult['avg_rating'] ?? 0, 1),
            'total_reviews' => $avgResult['total_reviews'] ?? 0
        ];
    }
    
    echo json_encode([
        "success" => true,
        "reviews" => $reviews,
        "average_rating" => $average_rating
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>