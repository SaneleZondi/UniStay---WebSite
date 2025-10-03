<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../../includes/auth.php';
require_once '../../includes/functions.php';
require_once '../../includes/UploadHandler.php';

try {
    // Check authentication
    $auth = new Auth();
    $user = $auth->authenticateRequest();

    if (!$user) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Unauthorized"]);
        exit();
    }

    // Check if files were uploaded
    if (empty($_FILES['images'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "No images uploaded"]);
        exit();
    }

    $uploader = new UploadHandler();
    $result = $uploader->uploadPropertyImages($_FILES['images']);

    if ($result['success']) {
        // Convert paths to full URLs
        $image_urls = array_map(function($path) {
            return 'http://localhost/UniStay---Website/backend/uploads/' . $path;
        }, $result['paths']);

        echo json_encode([
            "success" => true,
            "message" => "Images uploaded successfully",
            "image_urls" => $image_urls,
            "paths" => $result['paths']
        ]);
    } else {
        http_response_code(400);
        echo json_encode($result);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}
?>