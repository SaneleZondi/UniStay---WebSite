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

    // Get dashboard statistics
    $stats = [];
    
    // Total users
    $query = "SELECT COUNT(*) as total FROM users";
    $stmt = $db->query($query);
    $stats['total_users'] = $stmt->fetch()['total'];
    
    // Total properties
    $query = "SELECT COUNT(*) as total FROM properties";
    $stmt = $db->query($query);
    $stats['total_properties'] = $stmt->fetch()['total'];
    
    // Total bookings
    $query = "SELECT COUNT(*) as total FROM bookings";
    $stmt = $db->query($query);
    $stats['total_bookings'] = $stmt->fetch()['total'];
    
    // Total revenue (placeholder - would need payment integration)
    $query = "SELECT COALESCE(SUM(total_price), 0) as total FROM bookings WHERE status = 'completed'";
    $stmt = $db->query($query);
    $stats['total_revenue'] = $stmt->fetch()['total'];

    // Top properties by bookings
    $query = "SELECT p.title, COUNT(b.id) as booking_count 
              FROM properties p 
              LEFT JOIN bookings b ON p.id = b.property_id 
              GROUP BY p.id 
              ORDER BY booking_count DESC 
              LIMIT 5";
    $stmt = $db->query($query);
    $stats['top_properties'] = $stmt->fetchAll();

    // Monthly analytics (last 6 months)
    $analytics = [
        'labels' => [],
        'bookings' => [],
        'revenue' => []
    ];
    
    for ($i = 5; $i >= 0; $i--) {
        $month = date('M', strtotime("-$i months"));
        $analytics['labels'][] = $month;
        
        // Simulate data - in real app, you'd query the database
        $analytics['bookings'][] = rand(5, 30);
        $analytics['revenue'][] = rand(2000, 15000);
    }

    echo json_encode([
        "success" => true,
        "stats" => $stats,
        "analytics" => $analytics
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>