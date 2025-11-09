<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Use absolute paths with proper directory traversal
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';

try {
    $auth = new Auth();
    $user = $auth->authenticateRequestWithFallback();
    
    if (!$user || $user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Admin access required. Current role: " . ($user['role'] ?? 'none')]);
        exit();
    }
    
    $database = new Database();
    $db = $database->getConnection();
    
    // Get statistics
    $stats = [];
    
    // User statistics
    $user_query = "SELECT 
        COUNT(*) as total_users,
        COALESCE(SUM(role = 'tenant'), 0) as total_tenants,
        COALESCE(SUM(role = 'landlord'), 0) as total_landlords,
        COALESCE(SUM(role = 'admin'), 0) as total_admins,
        COALESCE(SUM(is_verified = 1), 0) as verified_users,
        COALESCE(SUM(is_locked = 1), 0) as locked_users
    FROM users";
    $user_stmt = $db->prepare($user_query);
    $user_stmt->execute();
    $stats['users'] = $user_stmt->fetch();
    
    // Property statistics - FIXED: No price column in properties table
    $property_query = "SELECT 
        COUNT(*) as total_properties,
        COALESCE(SUM(status = 'available'), 0) as available_properties,
        COALESCE(SUM(status = 'fully_booked'), 0) as booked_properties,
        COALESCE(SUM(status = 'unavailable'), 0) as unavailable_properties,
        (SELECT COUNT(*) FROM property_rooms) as total_rooms,
        (SELECT COUNT(*) FROM property_rooms WHERE status = 'available') as available_rooms
    FROM properties";
    $property_stmt = $db->prepare($property_query);
    $property_stmt->execute();
    $stats['properties'] = $property_stmt->fetch();
    
    // Booking statistics
    $booking_query = "SELECT 
        COUNT(*) as total_bookings,
        COALESCE(SUM(status = 'pending'), 0) as pending_bookings,
        COALESCE(SUM(status = 'approved'), 0) as approved_bookings,
        COALESCE(SUM(status = 'completed'), 0) as completed_bookings,
        COALESCE(SUM(status = 'cancelled'), 0) as cancelled_bookings,
        COALESCE(SUM(total_price), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END), 0) as completed_revenue
    FROM bookings";
    $booking_stmt = $db->prepare($booking_query);
    $booking_stmt->execute();
    $stats['bookings'] = $booking_stmt->fetch();
    
    // Payment statistics
    $payment_query = "SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(status = 'completed'), 0) as completed_payments,
        COALESCE(SUM(status = 'pending'), 0) as pending_payments,
        COALESCE(SUM(status = 'failed'), 0) as failed_payments,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as completed_amount
    FROM payments";
    $payment_stmt = $db->prepare($payment_query);
    $payment_stmt->execute();
    $stats['payments'] = $payment_stmt->fetch();
    
    // Recent activity
    $activity_query = "SELECT al.*, u.name as user_name, u.email as user_email 
                      FROM activity_log al 
                      LEFT JOIN users u ON al.user_id = u.id 
                      ORDER BY al.created_at DESC 
                      LIMIT 10";
    $activity_stmt = $db->prepare($activity_query);
    $activity_stmt->execute();
    $stats['recent_activity'] = $activity_stmt->fetchAll();

    // PROPERTY PERFORMANCE ANALYTICS - ADDED SECTION
    // Property Performance Analytics
    $property_performance_query = "
        SELECT 
            p.id,
            p.title,
            p.city,
            COUNT(DISTINCT b.id) as total_bookings,
            COUNT(DISTINCT r.id) as total_reviews,
            COALESCE(AVG(r.rating), 0) as avg_rating,
            COALESCE(SUM(b.total_price), 0) as total_revenue,
            COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as completed_bookings
        FROM properties p
        LEFT JOIN bookings b ON p.id = b.property_id
        LEFT JOIN reviews r ON p.id = r.property_id AND r.is_approved = 1
        GROUP BY p.id, p.title, p.city
        ORDER BY total_revenue DESC
        LIMIT 10
    ";

    $property_performance_stmt = $db->prepare($property_performance_query);
    $property_performance_stmt->execute();
    $stats['property_performance'] = $property_performance_stmt->fetchAll();

    // Review Statistics
    $review_stats_query = "
        SELECT 
            COUNT(*) as total_reviews,
            COALESCE(SUM(is_approved = 1), 0) as approved_reviews,
            COALESCE(SUM(is_approved = 0), 0) as pending_reviews,
            COALESCE(AVG(rating), 0) as avg_site_rating,
            COUNT(DISTINCT property_id) as properties_with_reviews,
            COUNT(DISTINCT tenant_id) as users_who_reviewed
        FROM reviews
    ";

    $review_stats_stmt = $db->prepare($review_stats_query);
    $review_stats_stmt->execute();
    $stats['reviews'] = $review_stats_stmt->fetch();

    // Rating Distribution
    $rating_distribution_query = "
        SELECT 
            rating,
            COUNT(*) as count
        FROM reviews 
        WHERE is_approved = 1
        GROUP BY rating 
        ORDER BY rating DESC
    ";

    $rating_distribution_stmt = $db->prepare($rating_distribution_query);
    $rating_distribution_stmt->execute();
    $rating_distribution = $rating_distribution_stmt->fetchAll();

    // Initialize rating distribution array
    $stats['rating_distribution'] = [
        '5_stars' => 0,
        '4_stars' => 0,
        '3_stars' => 0,
        '2_stars' => 0,
        '1_star' => 0
    ];

    foreach ($rating_distribution as $rating) {
        switch ($rating['rating']) {
            case 5: $stats['rating_distribution']['5_stars'] = (int)$rating['count']; break;
            case 4: $stats['rating_distribution']['4_stars'] = (int)$rating['count']; break;
            case 3: $stats['rating_distribution']['3_stars'] = (int)$rating['count']; break;
            case 2: $stats['rating_distribution']['2_stars'] = (int)$rating['count']; break;
            case 1: $stats['rating_distribution']['1_star'] = (int)$rating['count']; break;
        }
    }
    
    // Enhanced analytics data with real data from database
    $analytics = [];

    // Generate last 6 months labels
    $months = [];
    for ($i = 5; $i >= 0; $i--) {
        $months[] = date('M', strtotime("-$i months"));
    }

    // Initialize analytics arrays
    $analytics = [
        'labels' => $months,
        'users' => array_fill(0, 6, 0),
        'properties' => array_fill(0, 6, 0),
        'bookings' => array_fill(0, 6, 0),
        'revenue' => array_fill(0, 6, 0)
    ];

    // Get real monthly data for users
    $monthly_users_query = "SELECT 
        DATE_FORMAT(created_at, '%b') as month,
        COUNT(*) as count
    FROM users 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
    ORDER BY MIN(created_at) DESC
    LIMIT 6";
    $monthly_users_stmt = $db->prepare($monthly_users_query);
    $monthly_users_stmt->execute();
    $monthly_users = $monthly_users_stmt->fetchAll();

    // Get real monthly data for properties
    $monthly_properties_query = "SELECT 
        DATE_FORMAT(created_at, '%b') as month,
        COUNT(*) as count
    FROM properties 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
    ORDER BY MIN(created_at) DESC
    LIMIT 6";
    $monthly_properties_stmt = $db->prepare($monthly_properties_query);
    $monthly_properties_stmt->execute();
    $monthly_properties = $monthly_properties_stmt->fetchAll();

    // Get real monthly data for bookings
    $monthly_bookings_query = "SELECT 
        DATE_FORMAT(created_at, '%b') as month,
        COUNT(*) as count
    FROM bookings 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
    ORDER BY MIN(created_at) DESC
    LIMIT 6";
    $monthly_bookings_stmt = $db->prepare($monthly_bookings_query);
    $monthly_bookings_stmt->execute();
    $monthly_bookings = $monthly_bookings_stmt->fetchAll();

    // Get real monthly revenue
    $monthly_revenue_query = "SELECT 
        DATE_FORMAT(created_at, '%b') as month,
        COALESCE(SUM(total_price), 0) as revenue
    FROM bookings 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND status = 'completed'
    GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b')
    ORDER BY MIN(created_at) DESC
    LIMIT 6";
    $monthly_revenue_stmt = $db->prepare($monthly_revenue_query);
    $monthly_revenue_stmt->execute();
    $monthly_revenue = $monthly_revenue_stmt->fetchAll();

    // Fill analytics data
    foreach ($monthly_users as $data) {
        $index = array_search($data['month'], $months);
        if ($index !== false) {
            $analytics['users'][$index] = (int)$data['count'];
        }
    }

    foreach ($monthly_properties as $data) {
        $index = array_search($data['month'], $months);
        if ($index !== false) {
            $analytics['properties'][$index] = (int)$data['count'];
        }
    }

    foreach ($monthly_bookings as $data) {
        $index = array_search($data['month'], $months);
        if ($index !== false) {
            $analytics['bookings'][$index] = (int)$data['count'];
        }
    }

    foreach ($monthly_revenue as $data) {
        $index = array_search($data['month'], $months);
        if ($index !== false) {
            $analytics['revenue'][$index] = (float)$data['revenue'];
        }
    }

    // If no real data, use sample data for demonstration
    if (array_sum($analytics['users']) === 0) {
        $analytics['users'] = [10, 15, 12, 18, 22, 25];
    }
    if (array_sum($analytics['properties']) === 0) {
        $analytics['properties'] = [5, 8, 6, 10, 12, 15];
    }
    if (array_sum($analytics['bookings']) === 0) {
        $analytics['bookings'] = [8, 12, 10, 15, 18, 20];
    }
    if (array_sum($analytics['revenue']) === 0) {
        $analytics['revenue'] = [1000, 1500, 1200, 1800, 2200, 2500];
    }
    
    // Clear any output buffers to ensure clean JSON
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    echo json_encode([
        "success" => true,
        "stats" => $stats,
        "analytics" => $analytics
    ]);
    
    exit();
    
} catch (Exception $e) {
    // Clear output buffers
    while (ob_get_level()) {
        ob_end_clean();
    }
    
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
    exit();
}
?>