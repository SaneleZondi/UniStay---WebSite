<?php
class UploadHandler {
    private $upload_path;
    private $allowed_types;
    private $max_size;

    public function __construct() {
        $this->upload_path = __DIR__ . '/../uploads/';
        $this->allowed_types = ['image/jpeg', 'image/png', 'image/gif'];
        $this->max_size = 5 * 1024 * 1024; // 5MB
        
        // Create upload directories if they don't exist
        $this->createUploadDirectories();
    }

    private function createUploadDirectories() {
        $directories = ['properties', 'profiles', 'receipts'];
        
        foreach ($directories as $dir) {
            $path = $this->upload_path . $dir;
            if (!is_dir($path)) {
                mkdir($path, 0755, true);
            }
        }
    }

    public function uploadPropertyImages($files) {
        $uploaded_paths = [];
        $errors = [];

        // Handle single file or multiple files
        if (is_array($files['name'])) {
            $file_count = count($files['name']);
            for ($i = 0; $i < $file_count; $i++) {
                $file = [
                    'name' => $files['name'][$i],
                    'type' => $files['type'][$i],
                    'tmp_name' => $files['tmp_name'][$i],
                    'error' => $files['error'][$i],
                    'size' => $files['size'][$i]
                ];
                
                $result = $this->uploadSingleImage($file, 'properties');
                if ($result['success']) {
                    $uploaded_paths[] = $result['path'];
                } else {
                    $errors[] = $result['error'];
                }
            }
        } else {
            $result = $this->uploadSingleImage($files, 'properties');
            if ($result['success']) {
                $uploaded_paths[] = $result['path'];
            } else {
                $errors[] = $result['error'];
            }
        }

        if (!empty($errors)) {
            return [
                'success' => false,
                'errors' => $errors
            ];
        }

        return [
            'success' => true,
            'paths' => $uploaded_paths
        ];
    }

    private function uploadSingleImage($file, $type) {
        // Validate file
        if ($file['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'error' => 'File upload error: ' . $file['error']];
        }

        if ($file['size'] > $this->max_size) {
            return ['success' => false, 'error' => 'File size too large. Maximum size is 5MB.'];
        }

        if (!in_array($file['type'], $this->allowed_types)) {
            return ['success' => false, 'error' => 'Invalid file type. Only JPG, PNG, and GIF are allowed.'];
        }

        // Generate unique filename
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid() . '_' . time() . '.' . $extension;
        $upload_path = $this->upload_path . $type . '/' . $filename;

        // Move uploaded file
        if (move_uploaded_file($file['tmp_name'], $upload_path)) {
            return [
                'success' => true,
                'path' => $type . '/' . $filename
            ];
        } else {
            return ['success' => false, 'error' => 'Failed to move uploaded file.'];
        }
    }

    public function deleteImage($path) {
        $full_path = $this->upload_path . $path;
        if (file_exists($full_path)) {
            return unlink($full_path);
        }
        return false;
    }
}
?>