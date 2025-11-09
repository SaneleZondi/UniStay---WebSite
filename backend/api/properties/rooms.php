<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    // Check if specific room ID is requested
    if (isset($_GET['room_id'])) {
        $room_id = $_GET['room_id'];
        
        $query = "SELECT pr.*, p.title as property_title, p.address, p.city, p.landlord_id,
                         u.name as landlord_name, u.email as landlord_email
                  FROM property_rooms pr 
                  JOIN properties p ON pr.property_id = p.id 
                  JOIN users u ON p.landlord_id = u.id
                  WHERE pr.id = :room_id";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":room_id", $room_id);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Room not found"]);
            exit();
        }
        
        $room = $stmt->fetch();
        
        echo json_encode([
            "success" => true,
            "room" => $room
        ]);
        
    } else if (isset($_GET['property_id'])) {
        // Existing functionality for property rooms
        $property_id = $_GET['property_id'];
        
        $query = "SELECT pr.*, p.title as property_title, p.address, p.city 
                  FROM property_rooms pr 
                  JOIN properties p ON pr.property_id = p.id 
                  WHERE pr.property_id = :property_id 
                  ORDER BY pr.room_number";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":property_id", $property_id);
        $stmt->execute();
        
        $rooms = $stmt->fetchAll();
        
        echo json_encode([
            "success" => true,
            "rooms" => $rooms
        ]);
        
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Room ID or Property ID is required"]);
        exit();
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>