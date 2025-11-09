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
require_once '../../config/constants.php';

try {
    // Start session and check authentication
    session_start();
    
    // DEBUG: Log session data for troubleshooting
    error_log("=== PAYMENT HISTORY SESSION DEBUG ===");
    error_log("Session ID: " . session_id());
    error_log("Session Data: " . json_encode($_SESSION));
    
    $user = null;
    
    // Get user from session (primary authentication)
    if (isset($_SESSION['user_id']) && !empty($_SESSION['user_id'])) {
        $user = [
            'id' => $_SESSION['user_id'],
            'email' => $_SESSION['user_email'],
            'role' => $_SESSION['user_role']
        ];
        error_log("✅ User authenticated via session: " . json_encode($user));
    } else {
        http_response_code(401);
        echo json_encode([
            "success" => false, 
            "error" => "Authentication required. Please login.",
            "debug" => [
                "session_user_id" => $_SESSION['user_id'] ?? 'not set',
                "session_user_email" => $_SESSION['user_email'] ?? 'not set'
            ]
        ]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();

    // Build query based on user role
    if ($user['role'] === ROLE_TENANT) {
        // Tenant sees their own payments
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
                         landlord.name as landlord_name
                  FROM payments p
                  JOIN bookings b ON p.booking_id = b.id
                  JOIN properties prop ON b.property_id = prop.id
                  JOIN users landlord ON prop.landlord_id = landlord.id
                  WHERE (b.tenant_id = :user_id OR b.guest_email = :user_email)
                  ORDER BY p.created_at DESC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user['id']);
        $stmt->bindParam(":user_email", $user['email']);
        
    } else if ($user['role'] === ROLE_LANDLORD) {
        // Landlord sees payments for their properties
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
                         COALESCE(tenant.email, b.guest_email) as tenant_email
                  FROM payments p
                  JOIN bookings b ON p.booking_id = b.id
                  JOIN properties prop ON b.property_id = prop.id
                  LEFT JOIN users tenant ON b.tenant_id = tenant.id
                  WHERE prop.landlord_id = :user_id
                  ORDER BY p.created_at DESC";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user['id']);
        
    } else if ($user['role'] === ROLE_ADMIN) {
        // Admin sees all payments
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
                  ORDER BY p.created_at DESC";
        
        $stmt = $db->prepare($query);
    } else {
        http_response_code(403);
        echo json_encode(["success" => false, "error" => "Access denied. Invalid user role."]);
        exit();
    }

    $stmt->execute();
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format the response data
    $formattedPayments = array_map(function($payment) {
        return [
            'id' => $payment['id'],
            'date' => $payment['payment_date'] ?: $payment['created_at'],
            'description' => $this->generatePaymentDescription($payment),
            'type' => $payment['payment_type'] ?: 'deposit',
            'amount' => floatval($payment['amount']),
            'status' => $payment['status'],
            'reference' => $payment['transaction_id'] ?: 'PAY-' . $payment['id'],
            'property' => $payment['property_title'],
            'booking_id' => $payment['booking_id'],
            'payment_method' => $payment['payment_method'],
            'property_details' => [
                'title' => $payment['property_title'],
                'address' => $payment['property_address'],
                'city' => $payment['property_city']
            ],
            'booking_details' => [
                'check_in' => $payment['check_in'],
                'check_out' => $payment['check_out'],
                'duration' => $payment['duration'],
                'total_price' => floatval($payment['booking_total']),
                'deposit_amount' => floatval($payment['deposit_amount'])
            ]
        ];
    }, $payments);

    // Calculate statistics
    $totalPayments = count($formattedPayments);
    $totalAmount = array_sum(array_column($formattedPayments, 'amount'));
    $pendingPayments = count(array_filter($formattedPayments, function($p) {
        return $p['status'] === PAYMENT_PENDING;
    }));
    $completedPayments = count(array_filter($formattedPayments, function($p) {
        return $p['status'] === PAYMENT_COMPLETED;
    }));
    $successRate = $totalPayments > 0 ? round(($completedPayments / $totalPayments) * 100) : 100;

    echo json_encode([
        "success" => true,
        "data" => $formattedPayments,
        "statistics" => [
            "total_payments" => $totalPayments,
            "total_amount" => $totalAmount,
            "pending_payments" => $pendingPayments,
            "completed_payments" => $completedPayments,
            "success_rate" => $successRate
        ],
        "debug" => [
            "user_role" => $user['role'],
            "user_id" => $user['id'],
            "total_records" => $totalPayments
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "error" => "Server error: " . $e->getMessage(),
        "trace" => $e->getTraceAsString()
    ]);
    error_log("Payment History Error: " . $e->getMessage());
}

// Helper function to generate payment description
function generatePaymentDescription($payment) {
    $type = $payment['payment_type'] ?: 'deposit';
    $property = $payment['property_title'];
    
    $typeMap = [
        'deposit' => 'Deposit',
        'monthly' => 'Monthly Rent',
        'full' => 'Full Payment',
        'balance' => 'Balance Payment',
        'service' => 'Service Fee'
    ];
    
    $typeText = $typeMap[$type] ?? ucfirst($type);
    
    return $typeText . ' - ' . $property;
}
?>