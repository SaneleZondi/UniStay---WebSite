<?php
// filepath: c:\Users\Eazy E\Documents\UniStay---WebSite\backend\api\auth\forgot-password.php

header('Content-Type: application/json');
require_once '../../config/config.php';
require_once '../../includes/functions.php'; // or funtions.php if that's the correct one

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Get posted email
$data = json_decode(file_get_contents('php://input'), true);
$email = isset($data['email']) ? trim($data['email']) : '';

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid email is required.']);
    exit;
}

// Check if user exists
require_once '../../config/database.php';
$conn = getDatabaseConnection();

$stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows === 0) {
    // For security, don't reveal if email exists
    echo json_encode(['message' => 'If this email is registered, a reset link will be sent.']);
    exit;
}

// Generate token and expiry
$token = bin2hex(random_bytes(32));
$expires = date('Y-m-d H:i:s', strtotime('+1 hour'));

// Store token in DB
$stmt->close();
$stmt = $conn->prepare("UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?");
$stmt->bind_param("sss", $token, $expires, $email);
$stmt->execute();

// TODO: Send email with reset link (implement your mail logic here)
$resetLink = "https://yourdomain.com/reset-password?token=$token";
sendPasswordResetEmail($email, $resetLink); // Implement this function in includes/functions.php

echo json_encode(['message' => 'If this email is registered, a reset link will be sent.']);
exit;