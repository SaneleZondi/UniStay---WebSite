<?php
// backend/api/auth/login.php
session_start();

require_once __DIR__ . "/../../config/database.php";
require_once __DIR__ . "/../../includes/functions.php";

try {
    // Read raw JSON input
    $raw = file_get_contents("php://input");
    $input = json_decode($raw, true);

    if (!$input || !isset($input['email'], $input['password'])) {
        jsonResponse("Email and password are required", 400);
    }

    $email = trim($input['email']);
    $password = $input['password'];

    // Get DB connection
    $conn = getDBConnection();

    // Query user
    $stmt = $conn->prepare("SELECT id, name, email, password, role, is_verified 
                            FROM users WHERE email = :email LIMIT 1");
    $stmt->bindParam(':email', $email);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($password, $user['password'])) {
        jsonResponse("Invalid credentials", 401);
    }

    // Optional: check email verification
    // if (!$user['is_verified']) {
    //     jsonResponse("Please verify your email before logging in.", 403);
    // }

    // Set session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_role'] = $user['role'];

    // Success response
    jsonResponse([
        "id"    => $user['id'],
        "name"  => $user['name'],
        "email" => $user['email'],
        "role"  => $user['role']
    ]);

} catch (PDOException $e) {
    handlePDOException($e);
} catch (Exception $e) {
    jsonResponse("Server error: " . $e->getMessage(), 500);
}
