<?php
// backend/config/database.php
function getDBConnection() {
    try {
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ];

        $conn = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            $options
        );
        
        return $conn;
    } catch(PDOException $e) {
        // Better error message for debugging
        error_log("Database connection failed: " . $e->getMessage());
        die(json_encode([
            'success' => false, 
            'error' => 'Database connection failed: ' . $e->getMessage()
        ]));
    }
}
?>