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

require_once '../../includes/auth.php';

try {
    $auth = new Auth();
    $user = $auth->authenticateRequest();

    if (!$user || $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Admin access required"]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();

    $user_id = $_GET['user_id'] ?? null;
    $action = $_GET['action'] ?? null;
    $limit = min($_GET['limit'] ?? 50, 100); // Max 100 records
    $page = max($_GET['page'] ?? 1, 1);
    $offset = ($page - 1) * $limit;

    // Build query
    $whereConditions = [];
    $params = [];
    
    if ($user_id) {
        $whereConditions[] = "al.user_id = :user_id";
        $params[':user_id'] = $user_id;
    }
    
    if ($action) {
        $whereConditions[] = "al.action = :action";
        $params[':action'] = $action;
    }
    
    $whereClause = $whereConditions ? "WHERE " . implode(" AND ", $whereConditions) : "";

    // Get total count
    $countQuery = "SELECT COUNT(*) as total FROM activity_log al $whereClause";
    $countStmt = $db->prepare($countQuery);
    foreach ($params as $key => $value) {
        $countStmt->bindValue($key, $value);
    }
    $countStmt->execute();
    $total = $countStmt->fetch()['total'];

    // Get activity logs
    $query = "SELECT al.*, u.name as user_name, u.email as user_email 
              FROM activity_log al 
              LEFT JOIN users u ON al.user_id = u.id 
              $whereClause 
              ORDER BY al.created_at DESC 
              LIMIT :limit OFFSET :offset";
    
    $stmt = $db->prepare($query);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    
    $logs = $stmt->fetchAll();

    echo json_encode([
        "success" => true,
        "logs" => $logs,
        "pagination" => [
            "total" => $total,
            "page" => $page,
            "limit" => $limit,
            "total_pages" => ceil($total / $limit)
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>