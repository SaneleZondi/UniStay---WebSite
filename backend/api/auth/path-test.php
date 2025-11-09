<?php
echo "<h1>Path Debug Test</h1>";

// Test current directory
echo "<h2>Current Directory Info:</h2>";
echo "__DIR__: " . __DIR__ . "<br>";
echo "getcwd(): " . getcwd() . "<br>";

// Test the path we're trying to include
$test_path = __DIR__ . '/../../includes/auth.php';
echo "<h2>Testing auth.php path:</h2>";
echo "Path: " . $test_path . "<br>";
echo "File exists: " . (file_exists($test_path) ? 'YES' : 'NO') . "<br>";

if (file_exists($test_path)) {
    echo "Path is CORRECT!<br>";
} else {
    echo "Path is WRONG!<br>";
    
    // Let's try to find the file
    echo "<h2>Searching for auth.php:</h2>";
    $search_path = __DIR__;
    for ($i = 0; $i < 5; $i++) {
        $search_path = dirname($search_path);
        $test_auth = $search_path . '/includes/auth.php';
        echo "Trying: " . $test_auth . " - " . (file_exists($test_auth) ? 'FOUND' : 'Not found') . "<br>";
        
        if (file_exists($test_auth)) {
            echo "<strong>CORRECT PATH SHOULD BE: require_once __DIR__ . '" . str_replace(__DIR__, '', $test_auth) . "';</strong><br>";
            break;
        }
    }
}

// Test database.php path
echo "<h2>Testing database.php path from auth.php perspective:</h2>";
$auth_dir = __DIR__ . '/../../includes/';
$test_db_path = $auth_dir . '../config/database.php';
echo "Auth.php directory: " . $auth_dir . "<br>";
echo "Database.php path: " . $test_db_path . "<br>";
echo "Database.php exists: " . (file_exists($test_db_path) ? 'YES' : 'NO') . "<br>";

// List directory structure
echo "<h2>Directory Structure:</h2>";
function listDirectories($path, $depth = 0) {
    if ($depth > 3) return; // Limit depth
    if (!is_dir($path)) return;
    
    $items = scandir($path);
    foreach ($items as $item) {
        if ($item == '.' || $item == '..') continue;
        $fullPath = $path . '/' . $item;
        echo str_repeat('&nbsp;', $depth * 4) . $item . "<br>";
        if (is_dir($fullPath)) {
            listDirectories($fullPath, $depth + 1);
        }
    }
}

listDirectories(__DIR__ . '/../..');
?>