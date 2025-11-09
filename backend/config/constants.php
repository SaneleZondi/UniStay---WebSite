<?php
// HTTP Status Codes
define('HTTP_OK', 200);
define('HTTP_CREATED', 201);
define('HTTP_BAD_REQUEST', 400);
define('HTTP_UNAUTHORIZED', 401);
define('HTTP_FORBIDDEN', 403);
define('HTTP_NOT_FOUND', 404);
define('HTTP_METHOD_NOT_ALLOWED', 405);
define('HTTP_INTERNAL_SERVER_ERROR', 500);
define('PAYMENT_SUCCESS', 'success');
define('PAYMENT_DECLINED', 'declined');
define('PAYMENT_INSUFFICIENT_FUNDS', 'insufficient_funds');
define('PAYMENT_EXPIRED_CARD', 'expired_card');
define('PAYMENT_INVALID_CARD', 'invalid_card');

// User Roles
define('ROLE_TENANT', 'tenant');
define('ROLE_LANDLORD', 'landlord');
define('ROLE_ADMIN', 'admin');

// Property Status
define('PROPERTY_AVAILABLE', 'available');
define('PROPERTY_PENDING', 'pending');
define('PROPERTY_BOOKED', 'booked');
define('PROPERTY_UNAVAILABLE', 'unavailable');

// Booking Status
define('BOOKING_PENDING', 'pending');
define('BOOKING_APPROVED', 'approved');
define('BOOKING_REJECTED', 'rejected');
define('BOOKING_CANCELLED', 'cancelled');
define('BOOKING_COMPLETED', 'completed');

// Payment Status
define('PAYMENT_PENDING', 'pending');
define('PAYMENT_COMPLETED', 'completed');
define('PAYMENT_FAILED', 'failed');
define('PAYMENT_REFUNDED', 'refunded');

// Mock test cards
define('MOCK_CARDS', [
    'success' => [
        'number' => '4242424242424242',
        'expiry' => '12/25',
        'cvc' => '123',
        'balance' => 100000.00
    ],
    'insufficient_funds' => [
        'number' => '4000000000009995',
        'expiry' => '12/25', 
        'cvc' => '123',
        'balance' => 50.00
    ],
    'declined' => [
        'number' => '4000000000000002',
        'expiry' => '12/25',
        'cvc' => '123',
        'balance' => 5000.00
    ],
    'expired_card' => [
        'number' => '4000000000000069',
        'expiry' => '12/20',
        'cvc' => '123',
        'balance' => 5000.00
    ],
    'invalid_card' => [
        'number' => '4000000000000127',
        'expiry' => '12/25',
        'cvc' => '999',
        'balance' => 5000.00
    ]
]);
?>