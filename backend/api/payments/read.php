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

require_once '../../config/database.php';

try {
    session_start();
    
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Authentication required"]);
        exit();
    }

    $payment_id = $_GET['id'] ?? null;
    
    if (!$payment_id) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Payment ID is required"]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();

    $query = "SELECT p.*, 
                     b.property_id,
                     prop.title as property_title,
                     prop.address as property_address,
                     prop.city as property_city,
                     b.check_in,
                     b.check_out,
                     b.duration,
                     b.total_price as booking_total,
                     b.deposit_amount,
                     COALESCE(tenant.name, b.guest_name) as tenant_name,
                     COALESCE(tenant.email, b.guest_email) as tenant_email,
                     landlord.name as landlord_name
              FROM payments p
              JOIN bookings b ON p.booking_id = b.id
              JOIN properties prop ON b.property_id = prop.id
              LEFT JOIN users tenant ON b.tenant_id = tenant.id
              JOIN users landlord ON prop.landlord_id = landlord.id
              WHERE p.id = :payment_id";

    $stmt = $db->prepare($query);
    $stmt->bindParam(":payment_id", $payment_id);
    $stmt->execute();

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Payment not found"]);
        exit();
    }

    $payment = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "payment" => $payment
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>