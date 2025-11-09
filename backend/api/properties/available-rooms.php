<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once '../../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $property_id = $_GET['property_id'] ?? null;
    
    if (!$property_id) {
        echo json_encode(["success" => false, "error" => "Property ID required"]);
        exit();
    }
    
    // Get available rooms count by type
    $query = "SELECT room_type, COUNT(*) as available_count 
              FROM property_rooms 
              WHERE property_id = :property_id AND status = 'available' 
              GROUP BY room_type";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":property_id", $property_id);
    $stmt->execute();
    
    $available_rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode([
        "success" => true,
        "available_rooms" => $available_rooms
    ]);
    
} catch (Exception $e) {
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>