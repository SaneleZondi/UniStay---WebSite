<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../config/database.php';

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *"); // For development only
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Invalid request method'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
if (!$data) {
    jsonResponse(['success' => false, 'error' => 'No data received'], 400);
}

$name = sanitizeInput($data['name'] ?? '');
$email = sanitizeInput($data['email'] ?? '');
$password = sanitizeInput($data['password'] ?? '');
$confirmPassword = sanitizeInput($data['confirmPassword'] ?? '');
$role = sanitizeInput($data['role'] ?? '');

if ($password !== $confirmPassword) {
    jsonResponse(['success' => false, 'error' => 'Passwords do not match'], 400);
}

if (strlen($password) < 8) {
    jsonResponse(['success' => false, 'error' => 'Password must be at least 8 characters long'], 400);
}

try {
    $conn = getDBConnection();

    $stmt = $conn->prepare("SELECT id FROM users WHERE email = :email");
    $stmt->bindParam(':email', $email);
    $stmt->execute();

    if ($stmt->fetch()) {
        jsonResponse(['success' => false, 'error' => 'Email already registered'], 409);
    }

    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $verificationToken = generateToken();

    $stmt = $conn->prepare("INSERT INTO users (name, email, password, role, verification_token, is_verified) 
                            VALUES (:name, :email, :password, :role, :token, 1)");

    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':password', $hashedPassword);
    $stmt->bindParam(':role', $role);
    $stmt->bindParam(':token', $verificationToken);

    if ($stmt->execute()) {
        jsonResponse([
            'success' => true,
            'message' => 'Registration successful.',
            'user_id' => $conn->lastInsertId()
        ]);
    } else {
        jsonResponse(['success' => false, 'error' => 'Failed to create user'], 500);
    }

} catch (PDOException $e) {
    error_log("PDO Exception: " . $e->getMessage());
    error_log("SQL State: " . $e->getCode());
    jsonResponse([
        'success' => false, 
        'error' => 'Database error: ' . $e->getMessage(),
        'debug' => 'SQL State: ' . $e->getCode()
    ], 500);
}
