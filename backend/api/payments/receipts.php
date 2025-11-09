<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../config/database.php';
require_once '../../config/constants.php';

try {
    session_start();
    
    // DEBUG: Log session data
    error_log("=== RECEIPT SESSION DEBUG ===");
    error_log("Session ID: " . session_id());
    error_log("Session Data: " . json_encode($_SESSION));
    
    $user = null;
    
    // CASE 1: User is logged in via session
    if (isset($_SESSION['user_id']) && !empty($_SESSION['user_id'])) {
        $user = [
            'id' => $_SESSION['user_id'],
            'email' => $_SESSION['user_email'],
            'role' => $_SESSION['user_role']
        ];
        error_log("✅ User authenticated via session: " . json_encode($user));
    }
    // CASE 2: Check for user data in GET parameters (fallback)
    else if (!empty($_GET['user_id']) && !empty($_GET['user_email'])) {
        $user = [
            'id' => $_GET['user_id'],
            'email' => $_GET['user_email'],
            'role' => $_GET['user_role'] ?? 'tenant'
        ];
        error_log("✅ User authenticated via GET parameters: " . json_encode($user));
    }
    
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            "success" => false, 
            "error" => "Authentication required",
            "debug" => [
                "session_user_id" => $_SESSION['user_id'] ?? 'not set',
                "session_user_email" => $_SESSION['user_email'] ?? 'not set'
            ]
        ]);
        exit();
    }

    $payment_id = $_GET['id'] ?? null;
    
    if (!$payment_id) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Payment ID is required"]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();

    // Updated query to include guest_email for guest bookings
    $query = "SELECT p.*, b.check_in, b.check_out, b.guests, b.total_price as booking_total,
                     b.tenant_id, b.guest_email,
                     prop.title as property_title, prop.address as property_address, prop.city as property_city,
                     prop.landlord_id,
                     tenant.name as tenant_name, tenant.email as tenant_email,
                     landlord.name as landlord_name, landlord.email as landlord_email
              FROM payments p
              JOIN bookings b ON p.booking_id = b.id
              JOIN properties prop ON b.property_id = prop.id
              LEFT JOIN users tenant ON b.tenant_id = tenant.id
              JOIN users landlord ON prop.landlord_id = landlord.id
              WHERE p.id = :payment_id";

    $stmt = $db->prepare($query);
    $stmt->bindParam(":payment_id", $payment_id);
    $stmt->execute();

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(["success" => false, "error" => "Payment not found"]);
        exit();
    }

    $receipt = $stmt->fetch();

    // Check permissions - UPDATED with better logic
    $canView = false;
    
    // Admin can view everything
    if ($user['role'] === 'admin') {
        $canView = true;
    } 
    // Landlord can view payments for their properties
    else if ($user['role'] === 'landlord' && $receipt['landlord_id'] == $user['id']) {
        $canView = true;
    } 
    // Tenant can view their own payments
    else if ($user['role'] === 'tenant' && $receipt['tenant_id'] == $user['id']) {
        $canView = true;
    }
    // Tenant can view payments by email match (even if tenant_id doesn't match)
    else if ($user['role'] === 'tenant' && $receipt['tenant_email'] === $user['email']) {
        $canView = true;
    }
    // Guest can view their payments by email match
    else if (!$receipt['tenant_id'] && $receipt['guest_email'] === $user['email']) {
        $canView = true;
    }
    // User can view payments where their email matches booking guest email
    else if ($receipt['guest_email'] === $user['email']) {
        $canView = true;
    }

    error_log("Permission Check - User: " . json_encode($user) . ", Receipt Tenant ID: " . $receipt['tenant_id'] . ", Guest Email: " . $receipt['guest_email'] . ", Can View: " . ($canView ? 'YES' : 'NO'));

    if (!$canView) {
        http_response_code(403);
        echo json_encode([
            "success" => false, 
            "error" => "Access denied to this receipt",
            "debug" => [
                "user_role" => $user['role'],
                "user_id" => $user['id'],
                "user_email" => $user['email'],
                "receipt_tenant_id" => $receipt['tenant_id'],
                "receipt_guest_email" => $receipt['guest_email'],
                "receipt_tenant_email" => $receipt['tenant_email']
            ]
        ]);
        exit();
    }

    // Format receipt data
    $receiptData = [
        'receipt_number' => 'RCPT-' . str_pad($receipt['id'], 6, '0', STR_PAD_LEFT),
        'payment_date' => $receipt['payment_date'],
        'transaction_id' => $receipt['transaction_id'],
        'amount' => $receipt['amount'],
        'status' => $receipt['status'],
        'payment_method' => $receipt['payment_method'],
        'property' => [
            'title' => $receipt['property_title'],
            'address' => $receipt['property_address'],
            'city' => $receipt['property_city']
        ],
        'booking' => [
            'check_in' => $receipt['check_in'],
            'check_out' => $receipt['check_out'],
            'guests' => $receipt['guests'],
            'total_price' => $receipt['booking_total']
        ],
        'tenant' => [
            'name' => $receipt['tenant_name'] ?: 'Guest',
            'email' => $receipt['tenant_email'] ?: $receipt['guest_email']
        ],
        'landlord' => [
            'name' => $receipt['landlord_name'],
            'email' => $receipt['landlord_email']
        ]
    ];

    echo json_encode([
        "success" => true,
        "receipt" => $receiptData
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
    error_log("Receipt Error: " . $e->getMessage());
}
?>