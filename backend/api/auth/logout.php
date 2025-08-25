<?php
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');

// Destroy session
session_unset();
session_destroy();

jsonResponse(['message' => 'Logged out successfully']);
?>