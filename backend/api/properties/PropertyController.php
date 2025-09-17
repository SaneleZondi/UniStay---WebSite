<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/funtions.php';

class PropertyController
{
    private $conn;

    public function __construct()
    {
        $this->conn = getDatabaseConnection();
    }

    public function __destruct()
    {
        $this->conn->close();
    }

    /**
     * Search properties by term in specified fields.
     * @param string $searchTerm
     * @param array $fields
     * @return array
     */
    public function search($searchTerm, $fields = ['title', 'description', 'location'])
    {
        $searchQuery = buildSearchQuery($fields, $searchTerm);
        $sql = "SELECT id, title, description, price, location FROM properties WHERE {$searchQuery['clause']}";
        $stmt = $this->conn->prepare($sql);

        if (!$stmt) {
            return [];
        }

        $types = str_repeat('s', count($searchQuery['params']));
        $stmt->bind_param($types, ...$searchQuery['params']);
        $stmt->execute();
        $result = $stmt->get_result();

        $properties = [];
        while ($row = $result->fetch_assoc()) {
            $properties[] = $row;
        }

        $stmt->close();
        return $properties;
    }
}
?>