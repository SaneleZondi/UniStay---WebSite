<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:8000");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/functions.php';

try {
    // Get user from session using Auth class
    $auth = new Auth();
    $user = $auth->authenticateRequestWithFallback();

    if (!$user) {
        http_response_code(401);
        echo json_encode(["success" => false, "error" => "Unauthorized - Please login again"]);
        exit();
    }

    $userId = $user['id'];
    $userRole = $user['role'];

    $db = new Database();
    $pdo = $db->getConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get user profile
        $stmt = $pdo->prepare("
            SELECT 
                u.id, u.name, u.email, u.role, u.phone, u.profile_image, 
                u.is_verified, u.created_at,
                up.first_name, up.last_name, up.date_of_birth, up.gender,
                up.occupation, up.institution, up.student_number, up.course,
                up.company, up.id_number, up.email_notifications, 
                up.sms_notifications, up.marketing_emails,
                up.address, up.province, up.country, up.state_province,
                up.profile_completed, up.completion_percentage,
                up.created_at as profile_created,
                up.updated_at as profile_updated
            FROM users u 
            LEFT JOIN user_profiles up ON u.id = up.user_id 
            WHERE u.id = ?
        ");
        $stmt->execute([$userId]);
        $profile = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($profile) {
            // Calculate completion percentage if not set
            if (!$profile['completion_percentage']) {
                $completion = calculateProfileCompletion($profile, $profile['role']);
                $profile['completion_percentage'] = $completion;
                $profile['profile_completed'] = $completion >= 80;
            }

            echo json_encode([
                "success" => true,
                "profile" => $profile
            ]);
        } else {
            // Get basic user info
            $stmt = $pdo->prepare("SELECT id, name, email, role, phone, is_verified, created_at FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                echo json_encode([
                    "success" => true,
                    "profile" => [
                        "id" => $user['id'],
                        "name" => $user['name'],
                        "email" => $user['email'],
                        "role" => $user['role'],
                        "phone" => $user['phone'] ?? '',
                        "profile_image" => '',
                        "is_verified" => $user['is_verified'],
                        "created_at" => $user['created_at'],
                        "first_name" => '',
                        "last_name" => '',
                        "date_of_birth" => '',
                        "gender" => '',
                        "occupation" => '',
                        "institution" => '',
                        "student_number" => '',
                        "course" => '',
                        "company" => '',
                        "id_number" => '',
                        "address" => '',
                        "province" => '',
                        "country" => '',
                        "state_province" => '',
                        "email_notifications" => true,
                        "sms_notifications" => false,
                        "marketing_emails" => false,
                        "profile_completed" => false,
                        "completion_percentage" => 0
                    ]
                ]);
            } else {
                throw new Exception("User not found");
            }
        }

    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Update user profile
        $data = json_decode(file_get_contents("php://input"), true);
        
        if (!$data) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "Invalid JSON data"]);
            exit();
        }
        
        // Validate required fields
        $errors = validateProfileData($data, $userRole);
        if (!empty($errors)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => implode(", ", $errors)]);
            exit();
        }

        // Start transaction
        $pdo->beginTransaction();

        try {
            // Update main user table - only phone
            $stmt = $pdo->prepare("
                UPDATE users 
                SET phone = ?, updated_at = NOW() 
                WHERE id = ?
            ");
            $stmt->execute([$data['phone'], $userId]);

            // Get the registered name to populate first_name and last_name
            $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $userData = $stmt->fetch(PDO::FETCH_ASSOC);
            $registeredName = $userData['name'] ?? '';
            
            // Split registered name for first_name and last_name
            $nameParts = explode(' ', $registeredName, 2);
            $firstName = $nameParts[0] ?? '';
            $lastName = $nameParts[1] ?? '';

            // Check if profile exists
            $stmt = $pdo->prepare("SELECT id FROM user_profiles WHERE user_id = ?");
            $stmt->execute([$userId]);
            $profileExists = $stmt->fetch();

            // Prepare data for insertion/update - handle all optional fields
            $dateOfBirth = !empty($data['date_of_birth']) ? $data['date_of_birth'] : null;
            $gender = !empty($data['gender']) ? $data['gender'] : null;
            $occupation = !empty($data['occupation']) ? $data['occupation'] : null;
            $institution = !empty($data['institution']) ? $data['institution'] : null;
            $studentNumber = !empty($data['student_number']) ? $data['student_number'] : null;
            $course = !empty($data['course']) ? $data['course'] : null;
            $company = !empty($data['company']) ? $data['company'] : null;
            $idNumber = !empty($data['id_number']) ? $data['id_number'] : null;
            $address = !empty($data['address']) ? $data['address'] : null;
            $province = !empty($data['province']) ? $data['province'] : null;
            $country = !empty($data['country']) ? $data['country'] : null;
            $stateProvince = !empty($data['state_province']) ? $data['state_province'] : null;

            if ($profileExists) {
                // Update existing profile
                $stmt = $pdo->prepare("
                    UPDATE user_profiles 
                    SET first_name = ?, last_name = ?, date_of_birth = ?, gender = ?,
                        occupation = ?, institution = ?, course = ?, student_number = ?,
                        address = ?, province = ?, country = ?, state_province = ?,
                        company = ?, id_number = ?, email_notifications = ?,
                        sms_notifications = ?, marketing_emails = ?,
                        updated_at = NOW()
                    WHERE user_id = ?
                ");
                $stmt->execute([
                    $firstName,
                    $lastName,  
                    $dateOfBirth,
                    $gender,
                    $occupation,
                    $institution,
                    $course,
                    $studentNumber,
                    $address,
                    $province,
                    $country,
                    $stateProvince,
                    $company,
                    $idNumber,
                    $data['email_notifications'] ? 1 : 0,
                    $data['sms_notifications'] ? 1 : 0,
                    $data['marketing_emails'] ? 1 : 0,
                    $userId
                ]);
            } else {
                // Insert new profile
                $stmt = $pdo->prepare("
                    INSERT INTO user_profiles 
                    (user_id, first_name, last_name, date_of_birth, gender,
                     occupation, institution, course, student_number,
                     address, province, country, state_province, company, id_number,
                     email_notifications, sms_notifications, marketing_emails)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $userId,
                    $firstName,
                    $lastName,
                    $dateOfBirth,
                    $gender,
                    $occupation,
                    $institution,
                    $course,
                    $studentNumber,
                    $address,
                    $province,
                    $country,
                    $stateProvince,
                    $company,
                    $idNumber,
                    $data['email_notifications'] ? 1 : 0,
                    $data['sms_notifications'] ? 1 : 0,
                    $data['marketing_emails'] ? 1 : 0
                ]);
            }

            // Calculate completion percentage
            $profileData = [
                'phone' => $data['phone'],
                'institution' => $institution ?? '',
                'id_number' => $idNumber ?? '',
                'address' => $address ?? '',
                'province' => $province ?? '',
                'country' => $country ?? ''
            ];
            $completion = calculateProfileCompletion($profileData, $userRole);
            $profileCompleted = $completion >= 80;

            // Update completion status
            $stmt = $pdo->prepare("
                UPDATE user_profiles 
                SET completion_percentage = ?, profile_completed = ?, updated_at = NOW()
                WHERE user_id = ?
            ");
            $stmt->execute([$completion, $profileCompleted ? 1 : 0, $userId]);

            $pdo->commit();

            // Get updated profile
            $stmt = $pdo->prepare("
                SELECT 
                    u.id, u.name, u.email, u.role, u.phone, u.profile_image, 
                    u.is_verified, u.created_at,
                    up.first_name, up.last_name, up.date_of_birth, up.gender,
                    up.occupation, up.institution, up.student_number, up.course,
                    up.company, up.id_number, up.email_notifications, 
                    up.sms_notifications, up.marketing_emails,
                    up.address, up.province, up.country, up.state_province,
                    up.profile_completed, up.completion_percentage
                FROM users u 
                LEFT JOIN user_profiles up ON u.id = up.user_id 
                WHERE u.id = ?
            ");
            $stmt->execute([$userId]);
            $updatedProfile = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                "success" => true,
                "message" => "Profile updated successfully",
                "profile" => $updatedProfile,
                "completion_percentage" => $completion,
                "profile_completed" => $profileCompleted
            ]);

        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Server error: " . $e->getMessage()]);
}

function validateProfileData($data, $role) {
    $errors = [];

    // Required fields for all users
    if (empty(trim($data['phone']))) {
        $errors[] = "Phone number is required";
    }
    if (empty(trim($data['address']))) {
        $errors[] = "Address is required";
    }
    if (empty(trim($data['province']))) {
        $errors[] = "Province is required";
    }
    if (empty(trim($data['country']))) {
        $errors[] = "Country is required";
    }

    // Role-specific validations
    if ($role === 'tenant' && empty(trim($data['institution']))) {
        $errors[] = "Educational institution is required for students";
    }
    if ($role === 'landlord' && empty(trim($data['id_number']))) {
        $errors[] = "ID number is required for landlords";
    }

    // Phone validation
    if (!empty($data['phone']) && !preg_match('/^\+?[\d\s\-\(\)]{10,}$/', $data['phone'])) {
        $errors[] = "Please enter a valid phone number";
    }

    return $errors;
}

function calculateProfileCompletion($profile, $role) {
    $requiredFields = ['phone', 'address', 'province', 'country'];
    $roleSpecificFields = [];
    
    if ($role === 'tenant') {
        $roleSpecificFields = ['institution'];
    } elseif ($role === 'landlord') {
        $roleSpecificFields = ['id_number'];
    }
    
    $allFields = array_merge($requiredFields, $roleSpecificFields);
    $completed = 0;

    foreach ($allFields as $field) {
        if (!empty($profile[$field]) && trim($profile[$field]) !== '') {
            $completed++;
        }
    }

    return round(($completed / count($allFields)) * 100);
}
?>