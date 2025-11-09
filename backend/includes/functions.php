<?php
error_reporting(E_ALL & ~E_WARNING);
require_once __DIR__ . '/../config/database.php';

function validateInput($data, $required_fields = []) {
    $errors = [];
    
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            $errors[] = "$field is required";
        }
    }
    
    if (!empty($errors)) {
        throw new Exception(implode(", ", $errors));
    }
    
    // Sanitize data
    $sanitized = [];
    foreach ($data as $key => $value) {
        if (is_array($value)) {
            $sanitized[$key] = array_map('htmlspecialchars', $value);
        } else {
            $sanitized[$key] = htmlspecialchars(trim($value));
        }
    }
    
    return $sanitized;
}

function logActivity($user_id, $action, $description, $reference_id = null) {
    $database = new Database();
    $db = $database->getConnection();
    
    $query = "INSERT INTO activity_log (user_id, action, description, reference_id, ip_address, user_agent, created_at) 
              VALUES (:user_id, :action, :description, :reference_id, :ip_address, :user_agent, NOW())";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":user_id", $user_id);
    $stmt->bindParam(":action", $action);
    $stmt->bindParam(":description", $description);
    $stmt->bindParam(":reference_id", $reference_id);
    $stmt->bindValue(":ip_address", $_SERVER['REMOTE_ADDR'] ?? '');
    $stmt->bindValue(":user_agent", $_SERVER['HTTP_USER_AGENT'] ?? '');
    
    $stmt->execute();
}

function sendEmail($to, $subject, $message) {
    $headers = "From: UniStay <noreply@unistay.com>\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    
    return mail($to, $subject, $message, $headers);
}

function generateVerificationEmail($email, $token) {
    $verification_url = "http://localhost/UniStay---Website/verify-email.html?token=" . $token;
    
    $message = "
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a237e; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background: #1a237e; color: white; text-decoration: none; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>UniStay Email Verification</h1>
            </div>
            <div class='content'>
                <h2>Welcome to UniStay!</h2>
                <p>Please verify your email address to activate your account.</p>
                <a href='$verification_url' class='button'>Verify Email Address</a>
                <p>Or copy this link: $verification_url</p>
                <p>This link will expire in 24 hours.</p>
            </div>
        </div>
    </body>
    </html>";
    
    return sendEmail($email, "Verify Your UniStay Account", $message);
}

function generateCSRFToken() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCSRFToken($token) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

function formatCurrency($amount) {
    return 'R' . number_format($amount, 2);
}

function getClientIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        return $_SERVER['REMOTE_ADDR'];
    }
}

function validateImage($file) {
    $allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
    $max_size = 5 * 1024 * 1024; // 5MB
    
    if (!in_array($file['type'], $allowed_types)) {
        return "Invalid image type. Only JPG, PNG, and GIF are allowed.";
    }
    
    if ($file['size'] > $max_size) {
        return "Image size too large. Maximum size is 5MB.";
    }
    
    return true;
}
?>