<?php
header('Content-Type: application/json');
require_once '../../includes/config.php';
require_once '../../includes/auth.php';
require_once __DIR__ . '/../../includes/database.php'; 

if (!isLoggedIn()) {
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$required = ['booking_id', 'payment_method', 'amount'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        echo json_encode(['error' => "Missing required field: $field"]);
        exit;
    }
}

try {
    // Verify booking exists and belongs to this user
    $stmt = $pdo->prepare("SELECT b.*, p.price FROM bookings b
                          JOIN properties p ON b.property_id = p.id
                          WHERE b.id = ? AND b.tenant_id = ? AND b.status = 'confirmed'");
    $stmt->execute([$data['booking_id'], $_SESSION['user_id']]);
    $booking = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$booking) {
        echo json_encode(['error' => 'Booking not found or not eligible for payment']);
        exit;
    }
    
    // Verify amount matches booking total
    if ($data['amount'] != $booking['total_price']) {
        echo json_encode(['error' => 'Payment amount does not match booking total']);
        exit;
    }
    
    // Check if payment already exists
    $stmt = $pdo->prepare("SELECT id FROM bookings WHERE id = ? AND payment_status = 'paid'");
    $stmt->execute([$data['booking_id']]);
    if ($stmt->rowCount() > 0) {
        echo json_encode(['error' => 'This booking has already been paid']);
        exit;
    }
    
    // Process payment (simplified - in reality you'd integrate with a payment gateway)
    $paymentSuccess = true; // Assume success for this example
    
    if ($paymentSuccess) {
        // Update booking status
        $stmt = $pdo->prepare("UPDATE bookings 
                              SET payment_status = 'paid', 
                                  payment_method = ?,
                                  payment_receipt = ?,
                                  status = 'paid'
                              WHERE id = ?");
        $stmt->execute([
            $data['payment_method'],
            $data['receipt_data'] ?? null,
            $data['booking_id']
        ]);
        
        logActivity($_SESSION['user_id'], 'payment_success', 'Payment processed for booking: ' . $data['booking_id']);
        
        // Send receipt email (pseudo-code)
        sendReceiptEmail($_SESSION['user_email'], $data['booking_id'], $data['amount']);
        
        echo json_encode(['success' => true]);
    } else {
        logActivity($_SESSION['user_id'], 'payment_failed', 'Payment failed for booking: ' . $data['booking_id']);
        echo json_encode(['error' => 'Payment processing failed']);
    }
} catch(PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}

function sendReceiptEmail($email, $bookingId, $amount) {
    // In a real implementation, you would send an actual email
    // This is just for demonstration
    $stmt = $pdo->prepare("INSERT INTO email_queue (email, subject, body) VALUES (?, ?, ?)");
    $stmt->execute([
        $email,
        "Payment Receipt for Booking #$bookingId",
        "Thank you for your payment of R$amount for booking #$bookingId."
    ]);
}
?>