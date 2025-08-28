<?php
// backend/api/bookings/MainController.php

// --------------------------
// Includes
// --------------------------
require_once __DIR__ . '/../../config/constants.php';    // DB credentials and other constants
require_once __DIR__ . '/../../config/database.php';    // getDBConnection()
require_once __DIR__ . '/../../includes/functions.php'; // helper functions
require_once __DIR__ . '/../../includes/auth.php';      // authentication functions

// --------------------------
// Set JSON response
// --------------------------
header('Content-Type: application/json');

// --------------------------
// Authentication & role check
// --------------------------
verifyLogin();
verifyRole(['tenant']); // Only tenants can use this controller

// --------------------------
// Handle HTTP request
// --------------------------
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        // Include your existing create.php for booking creation
        include __DIR__ . '/create.php';
        break;

    case 'GET':
        // Fetch all bookings for the logged-in tenant
        try {
            $conn = getDBConnection(); // From database.php
            $tenantId = getCurrentUserId();

            $stmt = $conn->prepare("
                SELECT b.id, b.property_id, p.name AS property_name, b.check_in, b.check_out, b.total_price, b.status
                FROM bookings b
                JOIN properties p ON p.id = b.property_id
                WHERE b.tenant_id = :tenant_id
                ORDER BY b.check_in DESC
            ");
            $stmt->bindParam(':tenant_id', $tenantId);
            $stmt->execute();
            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            jsonResponse($bookings);

        } catch (PDOException $e) {
            error_log("Booking fetch error: " . $e->getMessage());
            jsonResponse(['error' => 'Database error'], 500);
        }
        break;

    default:
        jsonResponse(['error' => 'Invalid request method'], 405);
        break;
}
