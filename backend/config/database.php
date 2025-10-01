<?php
class Database {
    private $host = "localhost";
    private $port = "3307";
    private $db_name = "unistay";
    private $username = "root";
    private $password = "";
    public $conn;
    private $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    public function getConnection() {
        $this->conn = null;
        try {
            $dsn = "mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            
            // ❌ REMOVE these echo lines:
            // echo "Attempting to connect with DSN: " . $dsn . "<br>";
            // echo "Database connection successful!<br>";

            // ✅ Use logging instead (goes to PHP error log, not browser)
            error_log("Attempting DB connection: " . $dsn);

            $this->conn = new PDO($dsn, $this->username, $this->password, $this->options);

            error_log("Database connection successful!");
            
        } catch(PDOException $exception) {
            $error_message = "Connection failed: " . $exception->getMessage() . 
                           " (DSN: mysql:host=" . $this->host . ";port=" . $this->port . ";dbname=" . $this->db_name . ")";
            error_log($error_message);
            throw new Exception($error_message);
        }
        return $this->conn;
    }
}
?>
