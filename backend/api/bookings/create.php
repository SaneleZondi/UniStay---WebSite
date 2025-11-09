<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../config/database.php';

try {
    $auth = new Auth();
    $user = $auth->authenticateRequestWithFallback();
    
    $is_guest = false;
    $tenant_id = null;
    
    if ($user) {
        $tenant_id = $user['id'];
        $user_role = $user['role'];
        
        if ($user_role !== 'tenant') {
            http_response_code(403);
            echo json_encode(["success" => false, "error" => "Only tenants can book rooms"]);
            exit();
        }
    } else {
        $is_guest = true;
    }

    $input = file_get_contents("php://input");
    if (empty($input)) {
        throw new Exception("No input data received");
    }
    
    $data = json_decode($input, true);
    
    if (!$data || json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("Invalid JSON data");
    }

    $required_fields = ['room_id', 'check_in', 'duration', 'guests'];
    foreach ($required_fields as $field) {
        if (empty($data[$field])) {
            throw new Exception("Missing required field: $field");
        }
    }

    if ($is_guest) {
        $guest_required = ['guest_name', 'guest_email'];
        foreach ($guest_required as $field) {
            if (empty($data[$field])) {
                throw new Exception("Missing required field for guest booking: $field");
            }
        }
        
        if (!filter_var($data['guest_email'], FILTER_VALIDATE_EMAIL)) {
            throw new Exception("Invalid guest email format");
        }
    }

    $database = new Database();
    $db = $database->getConnection();

    if (!$db) {
        throw new Exception("Database connection failed");
    }

    $room_query = "SELECT pr.*, p.id as property_id, p.title as property_title, 
                          p.address, p.city, p.landlord_id,
                          u.name as landlord_name, u.email as landlord_email 
                   FROM property_rooms pr 
                   JOIN properties p ON pr.property_id = p.id 
                   JOIN users u ON p.landlord_id = u.id 
                   WHERE pr.id = :room_id";
    
    $room_stmt = $db->prepare($room_query);
    $room_stmt->bindValue(":room_id", $data['room_id'], PDO::PARAM_INT);
    $room_stmt->execute();

    if ($room_stmt->rowCount() === 0) {
        throw new Exception("Room not found with ID: " . $data['room_id']);
    }

    $room = $room_stmt->fetch();
    $property_id = $room['property_id'];

    if ($room['status'] !== 'available') {
        throw new Exception("Room is not available for booking. Current status: " . $room['status']);
    }

    $check_in = new DateTime($data['check_in']);
    $duration = intval($data['duration']);
    
    if ($duration < 1 || $duration > 24) {
        throw new Exception("Duration must be between 1 and 24 months");
    }
    
    $check_out = clone $check_in;
    $check_out->modify("+{$duration} months");
    
    $monthly_rate = floatval($room['price']);
    $subtotal = $monthly_rate * $duration;
    $deposit_rate = 0.3;
    $deposit_amount = $subtotal * $deposit_rate;
    $service_fee = $subtotal * 0.05;
    $total_amount = $subtotal + $service_fee;

    $today = new DateTime();
    $today->setTime(0, 0, 0);
    $min_check_in = clone $today;
    $min_check_in->modify('+1 day');
    
    if ($check_in < $min_check_in) {
        throw new Exception("Check-in date must be at least tomorrow");
    }

    $conflict_query = "SELECT id FROM bookings 
                      WHERE room_id = :room_id 
                      AND status IN ('pending', 'approved')
                      AND (
                          (check_in <= :check_out AND check_out >= :check_in)
                      )";
    
    $conflict_stmt = $db->prepare($conflict_query);
    $check_in_str = $check_in->format('Y-m-d');
    $check_out_str = $check_out->format('Y-m-d');
    
    $conflict_stmt->bindValue(":room_id", $data['room_id'], PDO::PARAM_INT);
    $conflict_stmt->bindValue(":check_in", $check_in_str, PDO::PARAM_STR);
    $conflict_stmt->bindValue(":check_out", $check_out_str, PDO::PARAM_STR);
    $conflict_stmt->execute();

    if ($conflict_stmt->rowCount() > 0) {
        throw new Exception("This room is not available for the selected dates. Please choose different dates.");
    }

    if ($is_guest) {
        $guest_name = trim($data['guest_name']);
        $guest_email = trim($data['guest_email']);
        $guest_phone = isset($data['guest_phone']) ? trim($data['guest_phone']) : null;
    } else {
        if (isset($data['guest_name']) && !empty(trim($data['guest_name']))) {
            $guest_name = trim($data['guest_name']);
        } else {
            $user_query = "SELECT name, email, phone FROM users WHERE id = :user_id";
            $user_stmt = $db->prepare($user_query);
            $user_stmt->bindValue(":user_id", $tenant_id, PDO::PARAM_INT);
            $user_stmt->execute();
            
            if ($user_stmt->rowCount() > 0) {
                $user_profile = $user_stmt->fetch();
                $guest_name = $user_profile['name'];
                $guest_email = $user_profile['email'];
                $guest_phone = $user_profile['phone'];
            } else {
                throw new Exception("User profile not found");
            }
        }
        
        if (!isset($guest_email) && isset($data['guest_email']) && !empty(trim($data['guest_email']))) {
            $guest_email = trim($data['guest_email']);
        }
        
        if (!isset($guest_phone) && isset($data['guest_phone']) && !empty(trim($data['guest_phone']))) {
            $guest_phone = trim($data['guest_phone']);
        }
    }

    if (!isset($guest_phone)) {
        $guest_phone = isset($data['guest_phone']) ? trim($data['guest_phone']) : null;
    }

    if (empty($guest_name) || strlen($guest_name) < 2) {
        throw new Exception("Guest name must be at least 2 characters long");
    }
    
    if (empty($guest_email) || !filter_var($guest_email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception("Invalid email format");
    }
    
    if ($guest_phone) {
        $cleaned_phone = preg_replace('/[\s\-\(\)]/', '', $guest_phone);
        
        if (!preg_match('/^(\+?27|0)[1-9][0-9]{8}$/', $cleaned_phone)) {
            throw new Exception("Invalid phone number format. Please use a valid South African number like: +27 12 345 6789 or 012 345 6789");
        }
    }

    $special_requests = isset($data['special_requests']) ? trim($data['special_requests']) : null;

    $booking_query = "INSERT INTO bookings 
                     (property_id, room_id, tenant_id, guest_name, guest_email, guest_phone, 
                      check_in, check_out, guests, duration, monthly_rate, subtotal, 
                      deposit_amount, service_fee, total_price, special_requests, status) 
                     VALUES 
                     (:property_id, :room_id, :tenant_id, :guest_name, :guest_email, :guest_phone, 
                      :check_in, :check_out, :guests, :duration, :monthly_rate, :subtotal, 
                      :deposit_amount, :service_fee, :total_price, :special_requests, 'pending')";

    $booking_stmt = $db->prepare($booking_query);

    $booking_stmt->bindValue(":property_id", $property_id, PDO::PARAM_INT);
    $booking_stmt->bindValue(":room_id", $data['room_id'], PDO::PARAM_INT);
    $booking_stmt->bindValue(":tenant_id", $tenant_id, $tenant_id ? PDO::PARAM_INT : PDO::PARAM_NULL);
    $booking_stmt->bindValue(":guest_name", $guest_name, PDO::PARAM_STR);
    $booking_stmt->bindValue(":guest_email", $guest_email, PDO::PARAM_STR);
    $booking_stmt->bindValue(":guest_phone", !empty($guest_phone) ? $guest_phone : null, !empty($guest_phone) ? PDO::PARAM_STR : PDO::PARAM_NULL);
    $booking_stmt->bindValue(":check_in", $check_in_str, PDO::PARAM_STR);
    $booking_stmt->bindValue(":check_out", $check_out_str, PDO::PARAM_STR);
    $booking_stmt->bindValue(":guests", $data['guests'], PDO::PARAM_INT);
    $booking_stmt->bindValue(":duration", $duration, PDO::PARAM_INT);
    $booking_stmt->bindValue(":monthly_rate", $monthly_rate);
    $booking_stmt->bindValue(":subtotal", $subtotal);
    $booking_stmt->bindValue(":deposit_amount", $deposit_amount);
    $booking_stmt->bindValue(":service_fee", $service_fee);
    $booking_stmt->bindValue(":total_price", $total_amount);
    $booking_stmt->bindValue(":special_requests", !empty($special_requests) ? $special_requests : null, !empty($special_requests) ? PDO::PARAM_STR : PDO::PARAM_NULL);

    if ($booking_stmt->execute()) {
        $booking_id = $db->lastInsertId();
        
        try {
            $update_room = "UPDATE property_rooms SET status = 'booked' WHERE id = :room_id";
            $update_stmt = $db->prepare($update_room);
            $update_stmt->bindValue(":room_id", intval($data['room_id']), PDO::PARAM_INT);
            $update_stmt->execute();
        } catch (Exception $e) {
        }
        
        try {
            $update_property_rooms = "UPDATE properties 
                                     SET available_rooms = (
                                         SELECT COUNT(*) FROM property_rooms 
                                         WHERE property_id = :property_id AND status = 'available'
                                     ) 
                                     WHERE id = :property_id";
            $update_prop_stmt = $db->prepare($update_property_rooms);
            $update_prop_stmt->bindValue(":property_id", $property_id, PDO::PARAM_INT);
            $update_prop_stmt->execute();
        } catch (Exception $e) {
        }
        
        $response_data = [
            "success" => true,
            "message" => "Booking created successfully. Please pay the deposit to confirm.",
            "booking_id" => $booking_id,
            "booking_details" => [
                "property_title" => $room['property_title'],
                "room_number" => $room['room_number'],
                "room_type" => $room['room_type'],
                "check_in" => $check_in_str,
                "check_out" => $check_out_str,
                "duration" => $duration,
                "guests" => $data['guests'],
                "monthly_rate" => $monthly_rate,
                "subtotal" => $subtotal,
                "deposit_amount" => $deposit_amount,
                "service_fee" => $service_fee,
                "total_amount" => $total_amount,
                "guest_name" => $guest_name,
                "guest_email" => $guest_email,
                "guest_phone" => $guest_phone,
                "special_requests" => $special_requests
            ]
        ];
        
        if ($is_guest) {
            $response_data['guest_booking'] = true;
            $response_data['message'] = "Booking created successfully! Please check your email for confirmation and payment instructions.";
        } else {
            $response_data['guest_booking'] = false;
        }
        
        echo json_encode($response_data);
        
    } else {
        $errorInfo = $booking_stmt->errorInfo();
        throw new Exception("Database error: " . $errorInfo[2]);
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
?>