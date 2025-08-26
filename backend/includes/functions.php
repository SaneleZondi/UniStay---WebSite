<?php
// backend/includes/functions.php
require_once __DIR__ . '/../config/constants.php';
require_once __DIR__ . '/../config/database.php';

// Basic sanitization function
function sanitizeInput($data) {
    if (is_array($data)) {
        return array_map('sanitizeInput', $data);
    }
    return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
}

// Generate random token
function generateToken($length = 32) {
    return bin2hex(random_bytes($length));
}

// Send email function
function sendEmail($to, $subject, $body) {
    $headers = "From: " . EMAIL_FROM_NAME . " <" . EMAIL_FROM . ">\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    return mail($to, $subject, $body, $headers);
}

// Verify user is logged in
function verifyLogin() {
    if (!isset($_SESSION['user_id'])) {
        header("HTTP/1.1 401 Unauthorized");
        die(json_encode(['error' => 'Authentication required']));
    }
}

// Verify user role
function verifyRole($allowedRoles) {
    verifyLogin();
    if (!in_array($_SESSION['user_role'], $allowedRoles)) {
        header("HTTP/1.1 403 Forbidden");
        die(json_encode(['error' => 'Insufficient permissions']));
    }
}

// Get current user ID
function getCurrentUserId() {
    verifyLogin();
    return $_SESSION['user_id'];
}

// Enhanced error handling
function handlePDOException(PDOException $e) {
    $errorInfo = $e->errorInfo ?? [];
    error_log(sprintf(
        "Database Error [%s]: %s\n%s",
        $errorInfo[0] ?? '0',
        $errorInfo[2] ?? $e->getMessage(),
        $e->getTraceAsString()
    ));
    jsonResponse(['error' => 'A database error occurred'], 500);
}

// Standardized JSON response
function jsonResponse($data, $statusCode = 200, $headers = []) {
    $requestId = bin2hex(random_bytes(8));
    header("X-Request-ID: $requestId");
    http_response_code($statusCode);
    header('Content-Type: application/json');
    
    foreach ($headers as $header) {
        header($header);
    }
    
    $response = [
        'success' => $statusCode < 400,
        'request_id' => $requestId,
        'timestamp' => time(),
    ];
    
    if ($statusCode < 400) {
        $response['data'] = $data;
    } else {
        $response['error'] = $data;
    }
    
    echo json_encode($response);
    exit;
}

// Check if email exists
function emailExists($email) {
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = :email");
    $stmt->bindParam(':email', $email);
    $stmt->execute();
    return $stmt->fetch() !== false;
}

// Get user by ID
function getUserById($id) {
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT id, name, email, role, profile_image FROM users WHERE id = :id");
    $stmt->bindParam(':id', $id);
    $stmt->execute();
    return $stmt->fetch(PDO::FETCH_ASSOC);
}
?>