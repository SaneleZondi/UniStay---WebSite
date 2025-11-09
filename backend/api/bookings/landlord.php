<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

require_once('../../config/config.php');
require_once('../../includes/auth.php');

session_start();

// ✅ Ensure landlord is logged in
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'landlord') {
    http_response_code(401);
    echo json_encode([
        "success" => false,
        "error" => "Unauthorized. Please login as a landlord."
    ]);
    exit;
}

$landlordId = $_SESSION['user_id'];

try {
    $sql = "
        SELECT 
            b.id,
            b.property_id,
            b.check_in,
            b.check_out,
            b.status,
            b.total_price,
            b.created_at,
            t.id AS tenant_id,
            t.name AS tenant_name,
            t.email AS tenant_email,
            p.title AS property_title,
            p.city AS property_city,
            p.address AS property_address
        FROM bookings b
        INNER JOIN properties p ON b.property_id = p.id
        INNER JOIN users t ON b.tenant_id = t.id
        WHERE p.landlord_id = ?
        ORDER BY b.created_at DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$landlordId]);
    $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "data" => $bookings
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "Server error: " . $e->getMessage()
    ]);
}
