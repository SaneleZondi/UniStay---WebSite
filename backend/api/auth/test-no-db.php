<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>Registration Test (No Database)</h1>";

try {
    // Test if files can be included without database
    require_once __DIR__ . '/../../includes/auth.php';
    echo "✓ Auth.php loaded (but database will fail)<br>";
    
    // Test basic PHP functionality
    echo "✓ PHP is working<br>";
    echo "✓ Server time: " . date('Y-m-d H:i:s') . "<br>";
    
} catch (Exception $e) {
    echo "✗ ERROR: " . $e->getMessage() . "<br>";
}

echo "<h2>MySQL Status Check:</h2>";
// Manual MySQL connection test
$host = 'localhost';
$port = 3307;
$username = 'root';
$password = '';

$connection = @fsockopen($host, $port, $errno, $errstr, 5);

if (is_resource($connection)) {
    echo "✓ MySQL is running on port $port<br>";
    fclose($connection);
    
    // Try PDO connection
    try {
        $pdo = new PDO("mysql:host=$host;port=$port", $username, $password);
        echo "✓ Can connect to MySQL server<br>";
        
        // Check if database exists
        $databases = $pdo->query("SHOW DATABASES")->fetchAll(PDO::FETCH_COLUMN);
        if (in_array('unistay', $databases)) {
            echo "✓ Unistay database exists<br>";
        } else {
            echo "✗ Unistay database does not exist<br>";
        }
    } catch (PDOException $e) {
        echo "✗ PDO Connection failed: " . $e->getMessage() . "<br>";
    }
} else {
    echo "✗ MySQL is NOT running on port $port<br>";
    echo "Error: $errstr (Code: $errno)<br>";
}
?>