<?php
// filepath: c:\Users\Eazy E\Documents\UniStay---WebSite\backend\api\properties\update.php

header('Content-Type: application/json');
require_once '../../config/config.php';
require_once '../../config/database.php';
require_once '../../includes/functions.php'; // For jsonResponse or similar

// Only allow PUT or POST (if you use POST for updates)
if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Get input data
$input = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$property_id = isset($input['id']) ? intval($input['id']) : 0;
$title = isset($input['title']) ? trim($input['title']) : '';
$description = isset($input['description']) ? trim($input['description']) : '';
$price = isset($input['price']) ? floatval($input['price']) : 0;

if (!$property_id || !$title || !$description || !$price) {
    http_response_code(400);
    echo json_encode(['error' => 'All fields are required.']);
    exit;
}

// Update property in DB
$conn = getDatabaseConnection();
$stmt = $conn->prepare("UPDATE properties SET title = ?, description = ?, price = ? WHERE id = ?");
$stmt->bind_param("ssdi", $title, $description, $price, $property_id);

if ($stmt->execute()) {
    echo json_encode(['message' => 'Property updated successfully.']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update property.']);
}

$stmt->close();
$conn->close();