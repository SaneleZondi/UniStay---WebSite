<?php
header("Content-Type: text/html; charset=UTF-8");
echo "<h1>Database Setup Test</h1>";

try {
    // First, try to connect without specifying a database
    $host = "localhost";
    $username = "root";
    $password = ""; // Try empty password (XAMPP default)
    
    echo "Trying to connect to MySQL...<br>";
    
    $conn = new PDO("mysql:host=$host", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "MySQL connection: SUCCESS<br>";
    
    // Check if database exists
    $stmt = $conn->query("SHOW DATABASES LIKE 'unistay'");
    $db_exists = $stmt->rowCount() > 0;
    echo "Unistay database exists: " . ($db_exists ? 'YES' : 'NO') . "<br>";
    
    if (!$db_exists) {
        echo "Database 'unistay' does not exist. You need to create it first.<br>";
        echo "Run the unistay.sql file in phpMyAdmin to create the database and tables.<br>";
    } else {
        // Try to connect to the unistay database
        echo "Trying to connect to unistay database...<br>";
        $conn2 = new PDO("mysql:host=$host;dbname=unistay", $username, $password);
        $conn2->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        echo "Unistay database connection: SUCCESS<br>";
        
        // Check tables
        $stmt = $conn2->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "Tables in database: " . implode(', ', $tables) . "<br>";
    }
    
} catch(PDOException $e) {
    echo "ERROR: " . $e->getMessage() . "<br>";
    
    // Common XAMPP passwords to try
    $passwords_to_try = ['', 'root', 'password'];
    foreach ($passwords_to_try as $pwd) {
        try {
            $test_conn = new PDO("mysql:host=$host", $username, $pwd);
            echo "Found working password: '" . $pwd . "'<br>";
            break;
        } catch(PDOException $e2) {
            // Continue trying
        }
    }
}
?>