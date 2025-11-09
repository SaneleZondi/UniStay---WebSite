<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Simple test endpoint
echo json_encode([
    "success" => true,
    "message" => "API is working!",
    "timestamp" => date('Y-m-d H:i:s'),
    "data" => [
        "property_id" => $_GET['property_id'] ?? null,
        "test_value" => "This is a test response"
    ]
]);
?>