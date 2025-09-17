<?php
require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../includes/funtions.php';

header('Content-Type: application/json');

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Get search term from query string
$searchTerm = isset($_GET['q']) ? trim($_GET['q']) : '';

if (empty($searchTerm)) {
    jsonResponse(['error' => 'Search term is required.'], 400);
}

// Define which columns to search
$searchFields = ['title', 'description', 'location'];

// Build search query
$searchQuery = buildSearchQuery($searchFields, $searchTerm);

// Prepare SQL
$conn = getDatabaseConnection();
$sql = "SELECT id, title, description, price, location FROM properties WHERE {$searchQuery['clause']}";
$stmt = $conn->prepare($sql);

// Bind parameters
$types = str_repeat('s', count($searchQuery['params']));
$stmt->bind_param($types, ...$searchQuery['params']);

$stmt->execute();
$result = $stmt->get_result();

$properties = [];
while ($row = $result->fetch_assoc()) {
    $properties[] = $row;
}

$stmt->close();
$conn->close();

jsonResponse($properties);
?>