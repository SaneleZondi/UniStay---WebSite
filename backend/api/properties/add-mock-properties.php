<?php
// add-mock-properties.php
require_once __DIR__ . "/../../config/database.php";
require_once __DIR__ . "/../../includes/functions.php";
require_once __DIR__ . "/../../includes/auth.php";

header('Content-Type: application/json');

// Only allow this in development environment
if ($_SERVER['REMOTE_ADDR'] !== '127.0.0.1' && $_SERVER['REMOTE_ADDR'] !== '::1') {
    jsonResponse(['error' => 'Access denied'], 403);
}

try {
    $conn = getDBConnection();
    
    // Get a landlord user ID (assuming you have at least one landlord)
    $stmt = $conn->prepare("SELECT id FROM users WHERE role = 'landlord' LIMIT 1");
    $stmt->execute();
    $landlord = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$landlord) {
        jsonResponse(['error' => 'No landlord users found'], 400);
    }
    
    $landlordId = $landlord['id'];
    
    // Mock properties data
    $mockProperties = [
        [
            'title' => 'Modern Apartment near Campus',
            'description' => 'Spacious 2-bedroom apartment with modern amenities, just 5 minutes walk from campus. Includes WiFi, kitchen, and laundry facilities.',
            'price' => 4500,
            'address' => '123 University Avenue',
            'city' => 'Johannesburg',
            'bedrooms' => 2,
            'bathrooms' => 1,
            'amenities' => 'WiFi, Kitchen, Laundry, Parking'
        ],
        [
            'title' => 'Cozy Studio for Students',
            'description' => 'Affordable studio apartment perfect for students. Includes all utilities and is furnished with a bed, desk, and kitchenette.',
            'price' => 3200,
            'address' => '456 College Street',
            'city' => 'Cape Town',
            'bedrooms' => 1,
            'bathrooms' => 1,
            'amenities' => 'WiFi, Utilities Included, Furnished'
        ],
        [
            'title' => 'Shared House - Single Room',
            'description' => 'Private room in a shared student house. Common areas include kitchen, living room, and backyard. Great for social students!',
            'price' => 2800,
            'address' => '789 Student Lane',
            'city' => 'Durban',
            'bedrooms' => 1,
            'bathrooms' => 1,
            'amenities' => 'WiFi, Shared Kitchen, Garden, Utilities Included'
        ],
        [
            'title' => 'Luxury Student Accommodation',
            'description' => 'Premium student accommodation with gym, study rooms, and 24/7 security. Perfect for focused students who want comfort.',
            'price' => 5500,
            'address' => '101 Education Road',
            'city' => 'Pretoria',
            'bedrooms' => 1,
            'bathrooms' => 1,
            'amenities' => 'WiFi, Gym, Study Rooms, Security, Cleaning Service'
        ],
        [
            'title' => 'Budget-Friendly Room',
            'description' => 'Simple and affordable room for students on a tight budget. Includes basic furniture and shared bathroom.',
            'price' => 2200,
            'address' => '202 Savings Street',
            'city' => 'Port Elizabeth',
            'bedrooms' => 1,
            'bathrooms' => 1,
            'amenities' => 'WiFi, Basic Furniture, Shared Bathroom'
        ]
    ];
    
    $addedProperties = [];
    
    foreach ($mockProperties as $propertyData) {
        $stmt = $conn->prepare("
            INSERT INTO properties 
            (landlord_id, title, description, price, address, city, bedrooms, bathrooms, amenities, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')
        ");
        
        $stmt->execute([
            $landlordId,
            $propertyData['title'],
            $propertyData['description'],
            $propertyData['price'],
            $propertyData['address'],
            $propertyData['city'],
            $propertyData['bedrooms'],
            $propertyData['bathrooms'],
            $propertyData['amenities']
        ]);
        
        $propertyId = $conn->lastInsertId();
        $propertyData['id'] = $propertyId;
        $addedProperties[] = $propertyData;
    }
    
    jsonResponse([
        'message' => 'Mock properties added successfully',
        'properties' => $addedProperties
    ]);
    
} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    jsonResponse(['error' => 'Database error'], 500);
} catch (Exception $e) {
    error_log("Error: " . $e->getMessage());
    jsonResponse(['error' => 'Server error'], 500);
}
?>