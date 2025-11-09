<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Simple routing based on URL patterns and parameters
if ($method === 'GET') {
    if (strpos($path, '/properties/my') !== false) {
        include 'my.php';
    } else if (isset($_GET['search']) || isset($_GET['city']) || isset($_GET['min_price']) || isset($_GET['max_price'])) {
        include 'search.php';
    } else {
        include 'read.php';
    }
} else if ($method === 'POST') {
    if (strpos($path, '/properties/upload-image') !== false) {
        include 'upload-image.php';
    } else {
        include 'create.php';
    }
} else if ($method === 'PUT') {
    include 'update.php';
} else if ($method === 'DELETE') {
    include 'delete.php';
} else {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method not allowed"]);
}
?>