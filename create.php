<?php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');
verifyLogin();
verifyRole(['tenant']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Invalid request method'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);

// Validate input
$errors = [];
$propertyId = filter_var($data['property_id'] ?? 0, FILTER_VALIDATE_INT);
$checkIn = sanitizeInput($data['check_in'] ?? '');
$checkOut = sanitizeInput($data['check_out'] ?? '');

if ($propertyId === false || $propertyId <= 0) $errors['property_id'] = 'Valid property ID is required';
if (empty($checkIn)) $errors['check_in'] = 'Check-in date is required';
if (empty($checkOut)) $errors['check_out'] = 'Check-out date is required';

// Validate dates
$today = new DateTime();
$checkInDate = DateTime::createFromFormat('Y-m-d', $checkIn);
$checkOutDate = DateTime::createFromFormat('Y-m-d', $checkOut);

if (!$checkInDate || $checkInDate < $today) {
    $errors['check_in'] = 'Valid check-in date is required';
}
if (!$checkOutDate || $checkOutDate <= $checkInDate) {
    $errors['check_out'] = 'Check-out must be after check-in';
}

if (!empty($errors)) {
    jsonResponse(['errors' => $errors], 400);
}

try {
    $conn = getDBConnection();
    $tenantId = 1; 
    
    // Check property availability
    $stmt = $conn->prepare("SELECT id, price, landlord_id FROM properties 
                           WHERE id = :id AND status = 'available'");
    $stmt->bindParam(':id', $propertyId);
    $stmt->execute();
    $property = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$property) {
        jsonResponse(['error' => 'Property not available for booking'], 400);
    }
    
    // Check for overlapping bookings
    $stmt = $conn->prepare("SELECT id FROM bookings 
                           WHERE property_id = :property_id 
                           AND status IN ('pending', 'approved')
                           AND (
                               (check_in <= :check_out AND check_out >= :check_in)
                           )");
    $stmt->bindParam(':property_id', $propertyId);
    $stmt->bindParam(':check_in', $checkIn);
    $stmt->bindParam(':check_out', $checkOut);
    $stmt->execute();
    
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'Property already booked for selected dates'], 409);
    }
    
    // Calculate total price
    $days = $checkInDate->diff($checkOutDate)->days;
    $monthlyPrice = $property['price'];
    $totalPrice = ($monthlyPrice / 30) * $days; // Simplified calculation
    
    // Create booking
    $stmt = $conn->prepare("INSERT INTO bookings 
                          (property_id, tenant_id, check_in, check_out, total_price) 
                          VALUES (:property_id, :tenant_id, :check_in, :check_out, :total_price)");
    
    $stmt->bindParam(':property_id', $propertyId);
    $stmt->bindParam(':tenant_id', $tenantId);
    $stmt->bindParam(':check_in', $checkIn);
    $stmt->bindParam(':check_out', $checkOut);
    $stmt->bindParam(':total_price', $totalPrice);
    $stmt->execute();
    
    $bookingId = $conn->lastInsertId();
    
    // Update property status to pending
    $stmt = $conn->prepare("UPDATE properties SET status = 'pending' WHERE id = :id");
    $stmt->bindParam(':id', $propertyId);
    $stmt->execute();
    
    // Notify landlord (implementation would go here)
    
    jsonResponse([
        'message' => 'Booking request submitted successfully',
        'booking_id' => $bookingId,
        'total_price' => $totalPrice
    ]);
    
} catch (PDOException $e) {
    error_log("Booking creation error: " . $e->getMessage());
    jsonResponse(['error' => 'Database error'], 500);
}
?>