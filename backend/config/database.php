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

        // Add SSL for production if needed
        if (file_exists('/path/to/ca.pem')) {
            $options[PDO::MYSQL_ATTR_SSL_CA] = '/path/to/ca.pem';
            $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
        }

        $conn = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            $options
        );
        
        return $conn;
    } catch(PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        header("HTTP/1.1 500 Internal Server Error");
        die(json_encode(['error' => 'Database connection failed']));
    }
}
?>