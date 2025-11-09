<?php
header("Content-Type: text/html; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>Final Registration Test</h1>";

try {
    // Use the exact same includes as register.php
    require_once __DIR__ . '/../../config/database.php';
    require_once __DIR__ . '/../../includes/auth.php';
    require_once __DIR__ . '/../../includes/functions.php';
    
    echo "✓ Files included successfully<br>";
    
    // Test the exact registration flow
    $auth = new Auth();
    echo "✓ Auth object created<br>";
    
    $test_email = 'test' . rand(1000, 9999) . '@test.com';
    $result = $auth->register('Test User', $test_email, 'Test123!', 'tenant');
    
    if ($result['success']) {
        echo "✓ REGISTRATION SUCCESS: " . $result['message'] . "<br>";
    } else {
        echo "✗ REGISTRATION FAILED: " . $result['error'] . "<br>";
    }
    
} catch (Exception $e) {
    echo "✗ ERROR: " . $e->getMessage() . "<br>";
    echo "File: " . $e->getFile() . "<br>";
    echo "Line: " . $e->getLine() . "<br>";
}
?>