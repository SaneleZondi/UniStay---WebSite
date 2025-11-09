<?php
header("Content-Type: text/html; charset=UTF-8");
echo "<h1>MySQL Connection Test</h1>";

$host = "localhost";
$username = "root";
$passwords = ['', 'root']; // Common XAMPP passwords
$ports = [3306, 3307]; // Common MySQL ports

foreach ($ports as $port) {
    echo "<h2>Testing port $port:</h2>";
    
    foreach ($passwords as $password) {
        try {
            $conn = new PDO("mysql:host=$host;port=$port", $username, $password);
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            echo "✓ SUCCESS: Port $port with password '" . ($password ?: 'empty') . "'<br>";
            
            // Check if unistay database exists
            $stmt = $conn->query("SHOW DATABASES LIKE 'unistay'");
            if ($stmt->rowCount() > 0) {
                echo "✓ Unistay database exists<br>";
            } else {
                echo "✗ Unistay database does not exist<br>";
            }
            
        } catch(PDOException $e) {
            echo "✗ FAILED: Port $port with password '" . ($password ?: 'empty') . "' - " . $e->getMessage() . "<br>";
        }
    }
    echo "<br>";
}
?>