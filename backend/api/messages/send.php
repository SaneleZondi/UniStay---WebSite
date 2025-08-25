<?php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');
verifyLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Invalid request method'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);

// Validate input
$errors = [];
$receiverId = filter_var($data['receiver_id'] ?? 0, FILTER_VALIDATE_INT);
$propertyId = filter_var($data['property_id'] ?? null, FILTER_VALIDATE_INT);
$message = sanitizeInput($data['message'] ?? '');

if ($receiverId === false || $receiverId <= 0) $errors['receiver_id'] = 'Valid receiver ID is required';
if (empty($message)) $errors['message'] = 'Message cannot be empty';
if ($propertyId !== null && $propertyId <= 0) $errors['property_id'] = 'Invalid property ID';

if (!empty($errors)) {
    jsonResponse(['errors' => $errors], 400);
}

try {
    $conn = getDBConnection();
    $senderId = getCurrentUserId();
    
    // Check if receiver exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE id = :id");
    $stmt->bindParam(':id', $receiverId);
    $stmt->execute();
    
    if (!$stmt->fetch()) {
        jsonResponse(['error' => 'Receiver not found'], 404);
    }
    
    // Check if property exists (if provided)
    if ($propertyId) {
        $stmt = $conn->prepare("SELECT id FROM properties WHERE id = :id");
        $stmt->bindParam(':id', $propertyId);
        $stmt->execute();
        
        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'Property not found'], 404);
        }
    }
    
    // Insert message
    $stmt = $conn->prepare("INSERT INTO messages 
                          (sender_id, receiver_id, property_id, message) 
                          VALUES (:sender_id, :receiver_id, :property_id, :message)");
    
    $stmt->bindParam(':sender_id', $senderId);
    $stmt->bindParam(':receiver_id', $receiverId);
    $stmt->bindParam(':property_id', $propertyId);
    $stmt->bindParam(':message', $message);
    $stmt->execute();
    
    $messageId = $conn->lastInsertId();
    
    // Notification would be sent here
    
    jsonResponse([
        'message' => 'Message sent successfully',
        'message_id' => $messageId
    ]);
    
} catch (PDOException $e) {
    error_log("Message sending error: " . $e->getMessage());
    jsonResponse(['error' => 'Database error'], 500);
}
?>