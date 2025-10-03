<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");

require_once '../../config/database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $search = $_GET['search'] ?? '';
    
    $query = "SELECT p.*, u.name as landlord_name
              FROM properties p 
              JOIN users u ON p.landlord_id = u.id 
              WHERE p.status = 'available' 
              AND (p.title LIKE :search OR p.description LIKE :search OR p.city LIKE :search)
              LIMIT 10";
    
    $stmt = $db->prepare($query);
    $stmt->bindValue(':search', '%' . $search . '%');
    $stmt->execute();
    
    $properties = $stmt->fetchAll();
    
    echo json_encode([
        "success" => true,
        "search_term" => $search,
        "results" => count($properties),
        "data" => $properties
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        "success" => false, 
        "error" => $e->getMessage()
    ]);
}
?>