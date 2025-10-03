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
    
    // Check if specific property ID is requested
    if (isset($_GET['id'])) {
        $property_id = $_GET['id'];
        
        $query = "SELECT p.*, u.name as landlord_name, u.email as landlord_email,
                         GROUP_CONCAT(pi.image_path) as images
                  FROM properties p 
                  JOIN users u ON p.landlord_id = u.id 
                  LEFT JOIN property_images pi ON p.id = pi.property_id
                  WHERE p.id = :id 
                  GROUP BY p.id";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":id", $property_id);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(["success" => false, "error" => "Property not found"]);
            exit();
        }
        
        $property = $stmt->fetch();
        
        // Process images
        if ($property['images']) {
            $property['images'] = array_map(function($path) {
                return 'http://localhost/UniStay---Website/backend/uploads/' . $path;
            }, explode(',', $property['images']));
        } else {
            $property['images'] = [];
        }
        
        echo json_encode([
            "success" => true,
            "property" => $property
        ]);
        
    } else {
        // Return all properties with pagination
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $limit = isset($_GET['limit']) ? min(max(1, intval($_GET['limit'])), 50) : 10;
        $offset = ($page - 1) * $limit;
        
        // Build WHERE clause for filters
        $where_conditions = ["p.status = 'available'"];
        $params = [];
        
        // City filter
        if (isset($_GET['city']) && !empty(trim($_GET['city']))) {
            $where_conditions[] = "p.city LIKE :city";
            $params[':city'] = '%' . trim($_GET['city']) . '%';
        }
        
        // Price filters
        if (isset($_GET['min_price']) && is_numeric($_GET['min_price']) && $_GET['min_price'] > 0) {
            $where_conditions[] = "p.price >= :min_price";
            $params[':min_price'] = floatval($_GET['min_price']);
        }
        
        if (isset($_GET['max_price']) && is_numeric($_GET['max_price']) && $_GET['max_price'] > 0) {
            $where_conditions[] = "p.price <= :max_price";
            $params[':max_price'] = floatval($_GET['max_price']);
        }
        
        // Bedrooms filter
        if (isset($_GET['bedrooms']) && is_numeric($_GET['bedrooms']) && $_GET['bedrooms'] > 0) {
            $where_conditions[] = "p.bedrooms = :bedrooms";
            $params[':bedrooms'] = intval($_GET['bedrooms']);
        }
        
        // Search filter - FIXED: Use unique parameter names for each field
        if (isset($_GET['search']) && !empty(trim($_GET['search']))) {
            $search_term = trim($_GET['search']);
            $where_conditions[] = "(p.title LIKE :search_title OR p.description LIKE :search_desc OR p.city LIKE :search_city OR p.address LIKE :search_address)";
            $params[':search_title'] = '%' . $search_term . '%';
            $params[':search_desc'] = '%' . $search_term . '%';
            $params[':search_city'] = '%' . $search_term . '%';
            $params[':search_address'] = '%' . $search_term . '%';
        }
        
        $where_clause = implode(' AND ', $where_conditions);
        
        // Get total count
        $count_query = "SELECT COUNT(*) as total FROM properties p WHERE $where_clause";
        $count_stmt = $db->prepare($count_query);
        foreach ($params as $key => $value) {
            $count_stmt->bindValue($key, $value);
        }
        $count_stmt->execute();
        $total = $count_stmt->fetch()['total'];
        
        // Get properties
        $query = "SELECT p.*, u.name as landlord_name,
                         (SELECT image_path FROM property_images WHERE property_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
                  FROM properties p 
                  JOIN users u ON p.landlord_id = u.id 
                  WHERE $where_clause 
                  ORDER BY p.created_at DESC 
                  LIMIT :limit OFFSET :offset";
        
        $stmt = $db->prepare($query);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $properties = $stmt->fetchAll();
        
        // Process images
        foreach ($properties as &$property) {
            if ($property['primary_image']) {
                $property['primary_image'] = 'http://localhost/UniStay---Website/backend/uploads/' . $property['primary_image'];
            } else {
                $property['primary_image'] = 'http://localhost/UniStay---Website/assets/default-property.jpg';
            }
        }
        
        echo json_encode([
            "success" => true,
            "data" => $properties,
            "total" => $total,
            "page" => $page,
            "limit" => $limit,
            "total_pages" => ceil($total / $limit)
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>