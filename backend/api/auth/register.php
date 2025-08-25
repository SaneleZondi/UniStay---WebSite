<?php
require_once __DIR__ . '/../../includes/functions.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: " . APP_URL);
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Invalid request method'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$name = sanitizeInput($data['name'] ?? '');
$email = sanitizeInput($data['email'] ?? '');
$password = sanitizeInput($data['password'] ?? '');
$confirmPassword = sanitizeInput($data['confirmPassword'] ?? '');
$role = sanitizeInput($data['role'] ?? '');

// Validation
$errors = [];
if (empty($name)) $errors['name'] = 'Name is required';
if (empty($email)) $errors['email'] = 'Email is required';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['email'] = 'Invalid email format';
if (empty($password)) $errors['password'] = 'Password is required';
if (strlen($password) < 8) $errors['password'] = 'Password must be at least 8 characters';
if (!preg_match('/[A-Z]/', $password)) $errors['password'] = 'Need at least 1 uppercase letter';
if (!preg_match('/[0-9]/', $password)) $errors['password'] = 'Need at least 1 number';
if ($password !== $confirmPassword) $errors['confirmPassword'] = 'Passwords do not match';
if (!in_array($role, ['tenant', 'landlord'])) $errors['role'] = 'Invalid role selected';

// Additional validations
$domain = explode('@', $email)[1] ?? '';
if (!checkdnsrr($domain, 'MX')) {
    $errors['email'] = 'Invalid email domain';
}

if (!preg_match('/^[a-zA-Z \'-]+$/', $name)) {
    $errors['name'] = 'Invalid characters in name';
}

if (!empty($errors)) {
    jsonResponse(['errors' => $errors], 400);
}

try {
    $conn = getDBConnection();
    
    // Check email existence
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = :email");
    $stmt->bindParam(':email', $email);
    $stmt->execute();
    
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'Email already registered'], 409);
    }
    
    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => PASSWORD_HASH_COST]);
    $verificationToken = generateToken();
    
    // Insert user
    $stmt = $conn->prepare("INSERT INTO users 
                          (name, email, password, role, verification_token) 
                          VALUES (:name, :email, :password, :role, :token)");
    
    $stmt->bindParam(':name', $name);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':password', $hashedPassword);
    $stmt->bindParam(':role', $role);
    $stmt->bindParam(':token', $verificationToken);
    
    if (!$stmt->execute()) {
        throw new PDOException("Failed to create user");
    }
    
    // Send verification email
    $verificationLink = APP_URL . "/verify-email.php?token=" . $verificationToken;
    $emailSubject = "Verify your UniStay account";
    $emailBody = "Hello $name,<br><br>Please click the link below to verify your account:<br><br>
                 <a href='$verificationLink'>$verificationLink</a><br><br>Thanks,<br>The UniStay Team";
    
    if (!sendEmail($email, $emailSubject, $emailBody)) {
        error_log("Failed to send verification email to $email");
    }
    
    jsonResponse(['message' => 'Registration successful. Please check your email to verify your account.']);
    
} catch (PDOException $e) {
    handlePDOException($e);
}
?>