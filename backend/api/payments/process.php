<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include required files
require_once '../../config/database.php';
require_once '../../config/constants.php';

class PaymentProcessor {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    public function processPayment($paymentData, $user) {
        // Validate payment data
        $validation = $this->validatePaymentData($paymentData);
        if (!$validation['success']) {
            return $validation;
        }
        
        // Check if booking exists and get details
        $booking = $this->getBooking($paymentData['booking_id']);
        if (!$booking) {
            return ["success" => false, "error" => "Booking not found"];
        }
        
        // DEBUG: Log booking and user info
        error_log("Payment Debug - Booking ID: " . $paymentData['booking_id']);
        error_log("Payment Debug - User: " . json_encode($user));
        error_log("Payment Debug - Booking Tenant ID: " . $booking['tenant_id']);
        error_log("Payment Debug - Booking Guest Email: " . $booking['guest_email']);
        
        // Check if user has permission to pay for this booking
        $authCheck = $this->canUserPayForBooking($booking, $user);
        if (!$authCheck['authorized']) {
            return ["success" => false, "error" => $authCheck['error']];
        }
        
        // Check if deposit is already paid
        if ($this->depositPaid($paymentData['booking_id'])) {
            return ["success" => false, "error" => "Deposit already paid for this booking"];
        }
        
        // Process payment based on method
        if ($paymentData['payment_method'] === 'card') {
            return $this->processCardPayment($paymentData, $booking, $user);
        } else if ($paymentData['payment_method'] === 'bank') {
            return $this->processBankTransfer($paymentData, $booking, $user);
        } else {
            return ["success" => false, "error" => "Invalid payment method"];
        }
    }
    
    private function validatePaymentData($data) {
        if (empty($data['booking_id'])) {
            return ["success" => false, "error" => "Booking ID is required"];
        }
        
        if (empty($data['payment_method'])) {
            return ["success" => false, "error" => "Payment method is required"];
        }
        
        if ($data['payment_method'] === 'card') {
            $required = ['card_number', 'expiry_date', 'cvc', 'card_holder'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    return ["success" => false, "error" => "Missing required field: $field"];
                }
            }
            
            // Validate card number
            $card_number = preg_replace('/\s+/', '', $data['card_number']);
            if (!preg_match('/^\d{16}$/', $card_number)) {
                return ["success" => false, "error" => "Invalid card number format. Must be 16 digits."];
            }
            
            // Validate expiry date
            if (!preg_match('/^(0[1-9]|1[0-2])\/([0-9]{2})$/', $data['expiry_date'])) {
                return ["success" => false, "error" => "Invalid expiry date format (MM/YY)"];
            }
        }
        
        return ["success" => true];
    }
    
    private function getBooking($booking_id) {
        $query = "SELECT b.*, p.title as property_title, p.landlord_id, 
                         b.monthly_rate, b.subtotal, b.service_fee, b.total_price, b.deposit_amount,
                         u.name as landlord_name, b.guest_email, b.tenant_id,
                         t.email as tenant_email
                  FROM bookings b 
                  JOIN properties p ON b.property_id = p.id 
                  JOIN users u ON p.landlord_id = u.id
                  LEFT JOIN users t ON b.tenant_id = t.id
                  WHERE b.id = :booking_id";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":booking_id", $booking_id);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            return null;
        }
        
        return $stmt->fetch();
    }
    
    private function canUserPayForBooking($booking, $user) {
        error_log("Authorization Check - Booking Tenant ID: " . $booking['tenant_id'] . ", User ID: " . $user['id']);
        error_log("Authorization Check - Booking Guest Email: " . $booking['guest_email'] . ", User Email: " . $user['email']);
        
        // Admin can pay for any booking
        if ($user['role'] === 'admin') {
            return ['authorized' => true];
        }
        
        // Case 1: Authenticated tenant paying for their own booking (ID match)
        if ($user['role'] === 'tenant' && $booking['tenant_id'] == $user['id']) {
            return ['authorized' => true];
        }
        
        // Case 2: Authenticated tenant paying for their own booking (email match)
        if ($user['role'] === 'tenant' && $booking['tenant_email'] === $user['email']) {
            return ['authorized' => true];
        }
        
        // Case 3: Guest paying for guest booking (email match)
        if ($user['role'] === 'guest' && !$booking['tenant_id'] && $booking['guest_email'] === $user['email']) {
            return ['authorized' => true];
        }
        
        // Case 4: Authenticated user paying for guest booking by email match
        if ($user['role'] === 'tenant' && !$booking['tenant_id'] && $booking['guest_email'] === $user['email']) {
            return ['authorized' => true];
        }
        
        // Debug information for troubleshooting
        $debug_info = [
            'booking_tenant_id' => $booking['tenant_id'],
            'booking_guest_email' => $booking['guest_email'],
            'booking_tenant_email' => $booking['tenant_email'],
            'user_id' => $user['id'],
            'user_email' => $user['email'],
            'user_role' => $user['role']
        ];
        
        error_log("Authorization Failed: " . json_encode($debug_info));
        
        return [
            'authorized' => false,
            'error' => "You are not authorized to pay for this booking. " .
                      "Booking belongs to: " . 
                      ($booking['tenant_id'] ? "User ID " . $booking['tenant_id'] : "Guest " . $booking['guest_email']) .
                      ", but you are: " . 
                      ($user['role'] === 'guest' ? "Guest " . $user['email'] : "User ID " . $user['id'] . " (" . $user['email'] . ")")
        ];
    }
    
    private function depositPaid($booking_id) {
        $query = "SELECT id FROM payments 
                  WHERE booking_id = :booking_id 
                  AND payment_type = 'deposit' 
                  AND status = 'completed'";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":booking_id", $booking_id);
        $stmt->execute();
        
        return $stmt->rowCount() > 0;
    }
    
    private function processCardPayment($paymentData, $booking, $user) {
        // Process mock card payment
        $paymentResult = $this->processMockCardPayment($paymentData, $booking['deposit_amount']);
        
        if ($paymentResult['status'] === PAYMENT_SUCCESS) {
            return $this->completeDepositPayment($paymentData, $booking, $user, $paymentResult);
        } else {
            return $this->handleFailedPayment($paymentData, $booking, $paymentResult);
        }
    }
    
    private function processBankTransfer($paymentData, $booking, $user) {
        try {
            // Create pending bank transfer payment
            $paymentQuery = "INSERT INTO payments 
                            (booking_id, amount, payment_method, payment_type, status, created_at) 
                            VALUES 
                            (:booking_id, :amount, 'bank_transfer', 'deposit', 'pending', NOW())";
            
            $paymentStmt = $this->db->prepare($paymentQuery);
            $paymentStmt->bindParam(":booking_id", $paymentData['booking_id']);
            $paymentStmt->bindParam(":amount", $booking['deposit_amount']);
            $paymentStmt->execute();
            
            $payment_id = $this->db->lastInsertId();
            
            return [
                "success" => true,
                "message" => "Bank transfer initiated. Please transfer R" . $booking['deposit_amount'] . 
                           " to the provided bank details. Your booking will be confirmed once payment is received.",
                "payment_id" => $payment_id,
                "bank_details" => [
                    "bank" => "UniStay Bank",
                    "account_number" => "123456789",
                    "branch_code" => "123456",
                    "reference" => "UNISTAY" . $paymentData['booking_id']
                ]
            ];
            
        } catch (Exception $e) {
            throw $e;
        }
    }
    
    private function processMockCardPayment($paymentData, $amount) {
        $card_number = preg_replace('/\s+/', '', $paymentData['card_number']);
        
        // Check against mock cards
        foreach (MOCK_CARDS as $type => $card) {
            if ($card_number === $card['number'] && 
                $paymentData['expiry_date'] === $card['expiry'] &&
                $paymentData['cvc'] === $card['cvc']) {
                
                switch ($type) {
                    case 'success':
                        return [
                            'status' => PAYMENT_SUCCESS,
                            'message' => 'Payment processed successfully',
                            'transaction_id' => 'TXN_' . uniqid(),
                            'card_type' => $this->detectCardType($card_number)
                        ];
                        
                    case 'insufficient_funds':
                        return [
                            'status' => PAYMENT_INSUFFICIENT_FUNDS,
                            'message' => 'Insufficient funds. Available balance: R' . $card['balance'],
                            'card_type' => $this->detectCardType($card_number)
                        ];
                        
                    case 'declined':
                        return [
                            'status' => PAYMENT_DECLINED,
                            'message' => 'Card declined by bank',
                            'card_type' => $this->detectCardType($card_number)
                        ];
                        
                    case 'expired_card':
                        return [
                            'status' => PAYMENT_EXPIRED_CARD,
                            'message' => 'Card has expired',
                            'card_type' => $this->detectCardType($card_number)
                        ];
                        
                    case 'invalid_card':
                        return [
                            'status' => PAYMENT_INVALID_CARD,
                            'message' => 'Invalid card details',
                            'card_type' => $this->detectCardType($card_number)
                        ];
                }
            }
        }
        
        // If no mock card matches, treat as generic failure
        return [
            'status' => PAYMENT_DECLINED,
            'message' => 'Payment failed. Please check your card details.',
            'card_type' => $this->detectCardType($card_number)
        ];
    }
    
    private function detectCardType($card_number) {
        if (preg_match('/^4/', $card_number)) return 'Visa';
        if (preg_match('/^5[1-5]/', $card_number)) return 'MasterCard';
        if (preg_match('/^3[47]/', $card_number)) return 'American Express';
        return 'Unknown';
    }
    
    private function completeDepositPayment($paymentData, $booking, $user, $paymentResult) {
        try {
            // Create payment record for deposit
            $paymentQuery = "INSERT INTO payments 
                            (booking_id, amount, payment_method, transaction_id, status, payment_type, payment_date, created_at) 
                            VALUES 
                            (:booking_id, :amount, 'card', :transaction_id, 'completed', 'deposit', NOW(), NOW())";
            
            $paymentStmt = $this->db->prepare($paymentQuery);
            $paymentStmt->bindParam(":booking_id", $paymentData['booking_id']);
            $paymentStmt->bindParam(":amount", $booking['deposit_amount']);
            $paymentStmt->bindParam(":transaction_id", $paymentResult['transaction_id']);
            $paymentStmt->execute();
            
            $payment_id = $this->db->lastInsertId();
            
            // Update booking status to approved (since deposit is paid)
            $bookingQuery = "UPDATE bookings SET status = 'approved' WHERE id = :booking_id";
            $bookingStmt = $this->db->prepare($bookingQuery);
            $bookingStmt->bindParam(":booking_id", $paymentData['booking_id']);
            $bookingStmt->execute();
            
            // Update property status to booked
            $propertyQuery = "UPDATE properties SET status = 'booked' WHERE id = :property_id";
            $propertyStmt = $this->db->prepare($propertyQuery);
            $propertyStmt->bindParam(":property_id", $booking['property_id']);
            $propertyStmt->execute();
            
            return [
                "success" => true,
                "message" => "Deposit payment successful! Your booking is now confirmed.",
                "payment_id" => $payment_id,
                "transaction_id" => $paymentResult['transaction_id'],
                "amount_paid" => $booking['deposit_amount'],
                "balance_due" => $booking['total_price'] - $booking['deposit_amount'],
                "booking_status" => "approved"
            ];
            
        } catch (Exception $e) {
            throw $e;
        }
    }
    
    private function handleFailedPayment($paymentData, $booking, $paymentResult) {
        // Create failed payment record
        $query = "INSERT INTO payments 
                 (booking_id, amount, payment_method, status, error_message, created_at) 
                 VALUES 
                 (:booking_id, :amount, 'card', 'failed', :error_message, NOW())";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":booking_id", $paymentData['booking_id']);
        $stmt->bindParam(":amount", $booking['deposit_amount']);
        $stmt->bindParam(":error_message", $paymentResult['message']);
        $stmt->execute();
        
        return [
            "success" => false,
            "error" => $paymentResult['message'],
            "payment_status" => $paymentResult['status']
        ];
    }
}

try {
    // Get the raw input data first
    $input = file_get_contents("php://input");
    $data = json_decode($input, true);
    
    if (!$data) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Invalid JSON data"]);
        exit();
    }

    // Start session and check authentication
    session_start();
    
    // DEBUG: Log session data
    error_log("=== PAYMENT SESSION DEBUG ===");
    error_log("Session ID: " . session_id());
    error_log("Session Data: " . json_encode($_SESSION));
    error_log("Payment Data Received: " . json_encode($data));
    
    $user = null;
    
    // CASE 1: User is logged in via session (primary method)
    if (isset($_SESSION['user_id']) && !empty($_SESSION['user_id'])) {
        $user = [
            'id' => $_SESSION['user_id'],
            'email' => $_SESSION['user_email'],
            'role' => $_SESSION['user_role']
        ];
        error_log("✅ User authenticated via session: " . json_encode($user));
    }
    // CASE 2: User data sent from frontend (fallback)
    else if (!empty($data['user_id']) && !empty($data['user_email'])) {
        $user = [
            'id' => $data['user_id'],
            'email' => $data['user_email'],
            'role' => $data['user_role'] ?? 'tenant'
        ];
        error_log("✅ User authenticated via frontend data: " . json_encode($user));
    }
    // CASE 3: Guest payment with guest email
    else if (!empty($data['guest_email'])) {
        $user = [
            'id' => null,
            'email' => $data['guest_email'],
            'role' => 'guest'
        ];
        error_log("✅ User treated as guest: " . json_encode($user));
    }
    // CASE 4: Try to get user from booking data
    else {
        $database = new Database();
        $db = $database->getConnection();
        
        $bookingQuery = "SELECT tenant_id, guest_email, t.email as tenant_email 
                        FROM bookings b 
                        LEFT JOIN users t ON b.tenant_id = t.id 
                        WHERE b.id = :booking_id";
        $bookingStmt = $db->prepare($bookingQuery);
        $bookingStmt->bindParam(":booking_id", $data['booking_id']);
        $bookingStmt->execute();
        
        if ($bookingStmt->rowCount() > 0) {
            $booking = $bookingStmt->fetch();
            
            // If it's a guest booking, use guest email
            if (!$booking['tenant_id'] && !empty($booking['guest_email'])) {
                $user = [
                    'id' => null,
                    'email' => $booking['guest_email'],
                    'role' => 'guest'
                ];
                error_log("✅ User determined from booking guest email: " . json_encode($user));
            }
            // If it's a tenant booking, use tenant email
            else if (!empty($booking['tenant_email'])) {
                $user = [
                    'id' => $booking['tenant_id'],
                    'email' => $booking['tenant_email'],
                    'role' => 'tenant'
                ];
                error_log("✅ User determined from booking tenant email: " . json_encode($user));
            }
        }
    }
    
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            "success" => false, 
            "error" => "Authentication required. Please login or provide guest email.",
            "debug" => [
                "session_user_id" => $_SESSION['user_id'] ?? 'not set',
                "data_user_id" => $data['user_id'] ?? 'not set',
                "guest_email" => $data['guest_email'] ?? 'not set'
            ]
        ]);
        exit();
    }

    $database = new Database();
    $db = $database->getConnection();
    
    $paymentProcessor = new PaymentProcessor($db);
    $result = $paymentProcessor->processPayment($data, $user);
    
    if ($result['success']) {
        echo json_encode($result);
    } else {
        http_response_code(400);
        echo json_encode($result);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
    error_log("Payment Processing Error: " . $e->getMessage());
}
?>