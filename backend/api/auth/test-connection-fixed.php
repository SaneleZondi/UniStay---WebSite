<?php
header("Content-Type: text/html; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>Fixed Database Connection Test</h1>";

try {
    // Test the exact connection method that database.php uses
    $host = "localhost";
    $port = "3307";
    $db_name = "unistay";
    $username = "root";
    $password = "";
    
    $dsn = "mysql:host=$host;port=$port;dbname=$db_name;charset=utf8mb4";
    echo "Connection string: " . $dsn . "<br>";
    
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    
    $conn = new PDO($dsn, $username, $password, $options);
    echo "✓ Database connection SUCCESS!<br>";
    
    // Test if we can query the users table
    $stmt = $conn->query("SELECT COUNT(*) as user_count FROM users");
    $result = $stmt->fetch();
    echo "✓ Users table accessible. Count: " . $result['user_count'] . " users<br>";
    
    // Test table structure
    $stmt = $conn->query("DESCRIBE users");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "✓ Users table has columns: " . implode(', ', $columns) . "<br>";
    
} catch (PDOException $e) {
    echo "✗ Connection failed: " . $e->getMessage() . "<br>";
    
    // Try alternative connection methods
    echo "<h2>Alternative connection attempts:</h2>";
    
    // Try without port specification
    try {
        $dsn2 = "mysql:host=$host;dbname=$db_name;charset=utf8mb4";
        $conn2 = new PDO($dsn2, $username, $password, $options);
        echo "✓ SUCCESS without port specification<br>";
    } catch (PDOException $e2) {
        echo "✗ Failed without port: " . $e2->getMessage() . "<br>";
    }
    
    // Try with different port syntax
    try {
        $dsn3 = "mysql:host=$host:$port;dbname=$db_name;charset=utf8mb4";
        $conn3 = new PDO($dsn3, $username, $password, $options);
        echo "✓ SUCCESS with host:port syntax<br>";
    } catch (PDOException $e3) {
        echo "✗ Failed with host:port: " . $e3->getMessage() . "<br>";
    }
}
?>