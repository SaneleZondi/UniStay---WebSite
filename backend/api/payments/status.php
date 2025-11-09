<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");

require_once '../../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $booking_id = $_GET['booking_id'] ?? null;
    
    if (!$booking_id) {
        echo json_encode(["success" => false, "error" => "Booking ID required"]);
        exit();
    }
    
    $query = "SELECT p.*, b.total_price, b.deposit_amount 
              FROM payments p 
              JOIN bookings b ON p.booking_id = b.id 
              WHERE p.booking_id = :booking_id 
              ORDER BY p.created_at DESC 
              LIMIT 1";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":booking_id", $booking_id);
    $stmt->execute();
    
    if ($stmt->rowCount() > 0) {
        $payment = $stmt->fetch();
        echo json_encode(["success" => true, "payment" => $payment]);
    } else {
        echo json_encode(["success" => false, "error" => "No payment found"]);
    }
    
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>