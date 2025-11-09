<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");

// Enable error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>Database Connection Test</h1>";

try {
    // Test the database path that auth.php uses
    $db_path = __DIR__ . '/../../config/database.php';
    echo "Database file path: " . $db_path . "<br>";
    echo "Database file exists: " . (file_exists($db_path) ? 'YES' : 'NO') . "<br>";
    
    if (file_exists($db_path)) {
        require_once $db_path;
        echo "Database.php loaded successfully<br>";
        
        // Test database connection
        $database = new Database();
        $conn = $database->getConnection();
        
        echo "Database connection: SUCCESS<br>";
        
        // Test if database exists and is accessible
        $stmt = $conn->query("SELECT DATABASE() as db_name");
        $result = $stmt->fetch();
        echo "Current database: " . $result['db_name'] . "<br>";
        
        // Test if users table exists
        $stmt = $conn->query("SHOW TABLES LIKE 'users'");
        $table_exists = $stmt->rowCount() > 0;
        echo "Users table exists: " . ($table_exists ? 'YES' : 'NO') . "<br>";
        
        if ($table_exists) {
            // Test table structure
            $stmt = $conn->query("DESCRIBE users");
            echo "Users table columns: " . $stmt->rowCount() . "<br>";
        }
        
    } else {
        echo "ERROR: Database.php file not found!<br>";
    }
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "<br>";
}
?>