<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/constants.php';

class Auth {
    private $db;
    private $max_login_attempts = 5;
    private $lockout_time = 900; // 15 minutes

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    public function authenticateRequest() {
        if (!isset($_SERVER['HTTP_AUTHORIZATION'])) {
            return null;
        }

        $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
        if (!preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
            return null;
        }

        $token = $matches[1];
        return $this->validateSessionToken($token);
    }

    /**
     * Authenticate user from session token
     */
    public function authenticate() {
        // Check for session token in cookies first
        if (isset($_COOKIE['session_token'])) {
            $sessionToken = $_COOKIE['session_token'];
            return $this->validateSessionToken($sessionToken);
        }
        
        // Check for Authorization header
        $headers = getallheaders();
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                $sessionToken = $matches[1];
                return $this->validateSessionToken($sessionToken);
            }
        }
        
        return false;
    }
    
    /**
     * Validate session token from database - KEEP THIS ONE
     */
    public function validateSessionToken($token) {
        $query = "SELECT u.* FROM user_sessions us 
                  JOIN users u ON us.user_id = u.id 
                  WHERE us.session_token = :token AND us.expires_at > NOW()";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":token", $token);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            return null;
        }
        
        $user = $stmt->fetch();
        unset($user['password']);
        unset($user['verification_token']);
        
        return $user;
    }

    public function register($name, $email, $password, $role) {
        // Check if email exists
        $query = "SELECT id FROM users WHERE email = :email";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();
        
        if ($stmt->rowCount() > 0) {
            return ["success" => false, "error" => "Email already registered"];
        }

        // Hash password
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        $verification_token = bin2hex(random_bytes(32));
        
        // Insert user
        $query = "INSERT INTO users (name, email, password, role, verification_token, created_at) 
                  VALUES (:name, :email, :password, :role, :token, NOW())";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":name", $name);
        $stmt->bindParam(":email", $email);
        $stmt->bindParam(":password", $hashed_password);
        $stmt->bindParam(":role", $role);
        $stmt->bindParam(":token", $verification_token);
        
        if ($stmt->execute()) {
            // Get the inserted user ID
            $user_id = $this->db->lastInsertId();
            
            // Send verification email
            $email_sent = $this->sendVerificationEmail($email, $verification_token, $name);
            
            if ($email_sent) {
                return [
                    "success" => true, 
                    "message" => "Registration successful. Please check your email for verification instructions."
                ];
            } else {
                // Email failed, but user was created
                return [
                    "success" => true,
                    "message" => "Registration successful, but verification email failed to send. Please use the resend verification feature.",
                    "needs_verification_resend" => true
                ];
            }
        }
        
        return ["success" => false, "error" => "Registration failed"];
    }

    private function sendVerificationEmail($email, $token, $name) {
        require_once __DIR__ . '/EmailService.php';
        $emailService = new EmailService();
        
        return $emailService->sendVerificationEmail($email, $token, $name);
    }

    public function login($email, $password) {
        // Check login attempts
        if ($this->isAccountLocked($email)) {
            return ["success" => false, "error" => "Account locked due to too many failed attempts. Try again later."];
        }

        // Get user
        $query = "SELECT * FROM users WHERE email = :email";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();
        
        if ($stmt->rowCount() == 0) {
            $this->recordFailedAttempt($email);
            return ["success" => false, "error" => "Invalid credentials"];
        }
        
        $user = $stmt->fetch();
        
        // Check if verified
        if (!$user['is_verified']) {
            return [
                "success" => false, 
                "error" => "Please verify your email before logging in. Check your email for the verification link.",
                "needs_verification" => true,
                "email" => $email
            ];
        }
        
        // Check if account is locked
        if ($user['is_locked'] && strtotime($user['locked_until']) > time()) {
            return ["success" => false, "error" => "Account locked. Try again later."];
        }
        
        // Verify password
        if (password_verify($password, $user['password'])) {
            // Reset failed attempts
            $this->resetFailedAttempts($email);
            
            // Update last login
            $this->updateLastLogin($user['id']);
            
            // Generate session token
            $session_token = bin2hex(random_bytes(32));
            $this->storeSessionToken($user['id'], $session_token);
            
            // Remove sensitive data
            unset($user['password']);
            unset($user['verification_token']);
            unset($user['reset_token']);
            
            return [
                "success" => true, 
                "user" => $user,
                "session_token" => $session_token
            ];
        } else {
            $this->recordFailedAttempt($email);
            $attempts = $this->getFailedAttempts($email);
            
            if ($attempts >= $this->max_login_attempts) {
                $this->lockAccount($email);
                return ["success" => false, "error" => "Account locked due to too many failed attempts."];
            }
            
            return ["success" => false, "error" => "Invalid credentials. " . ($this->max_login_attempts - $attempts) . " attempts remaining."];
        }
    }

    private function isAccountLocked($email) {
        $query = "SELECT attempt_time FROM login_attempts 
                  WHERE email = :email AND success = 0 
                  AND attempt_time > DATE_SUB(NOW(), INTERVAL :lockout_time SECOND)
                  ORDER BY attempt_time DESC 
                  LIMIT :max_attempts";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(":email", $email);
        $stmt->bindValue(":lockout_time", $this->lockout_time, PDO::PARAM_INT);
        $stmt->bindValue(":max_attempts", $this->max_login_attempts, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->rowCount() >= $this->max_login_attempts;
    }

    private function recordFailedAttempt($email) {
        $query = "INSERT INTO login_attempts (email, success, ip_address, user_agent, attempt_time) 
                  VALUES (:email, 0, :ip_address, :user_agent, NOW())";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->bindValue(":ip_address", $_SERVER['REMOTE_ADDR'] ?? '');
        $stmt->bindValue(":user_agent", $_SERVER['HTTP_USER_AGENT'] ?? '');
        $stmt->execute();
    }

    private function getFailedAttempts($email) {
        $query = "SELECT COUNT(*) as attempts FROM login_attempts 
                  WHERE email = :email AND success = 0 
                  AND attempt_time > DATE_SUB(NOW(), INTERVAL :lockout_time SECOND)";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindValue(":email", $email);
        $stmt->bindValue(":lockout_time", $this->lockout_time, PDO::PARAM_INT);
        $stmt->execute();
        
        $result = $stmt->fetch();
        return $result['attempts'];
    }

    private function resetFailedAttempts($email) {
        $query = "UPDATE users SET failed_login_attempts = 0, is_locked = 0 WHERE email = :email";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();
    }

    private function lockAccount($email) {
        $lock_until = date('Y-m-d H:i:s', time() + $this->lockout_time);
        $query = "UPDATE users SET is_locked = 1, locked_until = :lock_until WHERE email = :email";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->bindParam(":lock_until", $lock_until);
        $stmt->execute();
    }

    private function updateLastLogin($user_id) {
        $query = "UPDATE users SET last_login = NOW() WHERE id = :user_id";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();
    }

    private function storeSessionToken($user_id, $token) {
        $expires_at = date('Y-m-d H:i:s', time() + (7 * 24 * 60 * 60)); // 7 days
        
        // Remove existing sessions for this user
        $delete_query = "DELETE FROM user_sessions WHERE user_id = :user_id";
        $delete_stmt = $this->db->prepare($delete_query);
        $delete_stmt->bindParam(":user_id", $user_id);
        $delete_stmt->execute();
        
        // Store new session
        $query = "INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at) 
                  VALUES (:user_id, :token, :ip_address, :user_agent, :expires_at)";
        
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->bindParam(":token", $token);
        $stmt->bindValue(":ip_address", $_SERVER['REMOTE_ADDR'] ?? '');
        $stmt->bindValue(":user_agent", $_SERVER['HTTP_USER_AGENT'] ?? '');
        $stmt->bindParam(":expires_at", $expires_at);
        $stmt->execute();
    }

    public function logout($token) {
        $query = "DELETE FROM user_sessions WHERE session_token = :token";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":token", $token);
        return $stmt->execute();
    }

    public function resendVerificationEmail($email) {
        $query = "SELECT id, name, verification_token FROM users WHERE email = :email AND is_verified = 0";
        $stmt = $this->db->prepare($query);
        $stmt->bindParam(":email", $email);
        $stmt->execute();
        
        if ($stmt->rowCount() === 0) {
            return ["success" => false, "error" => "No unverified account found with this email."];
        }
        
        $user = $stmt->fetch();
        
        // Generate new token if none exists
        if (empty($user['verification_token'])) {
            $new_token = bin2hex(random_bytes(32));
            $update_query = "UPDATE users SET verification_token = :token WHERE id = :id";
            $update_stmt = $this->db->prepare($update_query);
            $update_stmt->bindParam(":token", $new_token);
            $update_stmt->bindParam(":id", $user['id']);
            $update_stmt->execute();
            $user['verification_token'] = $new_token;
        }
        
        $email_sent = $this->sendVerificationEmail($email, $user['verification_token'], $user['name']);
        
        if ($email_sent) {
            return ["success" => true, "message" => "Verification email sent successfully."];
        } else {
            return ["success" => false, "error" => "Failed to send verification email."];
        }
    }

    public function authenticateRequestWithFallback() {
        // First try Bearer token from Authorization header
        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
            if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
                $token = $matches[1];
                $user = $this->validateSessionToken($token);
                if ($user) {
                    return $user;
                }
            }
        }
        
        // If Bearer token failed, try session cookie
        if (isset($_COOKIE['session_token'])) {
            $user = $this->validateSessionToken($_COOKIE['session_token']);
            if ($user) {
                return $user;
            }
        }
        
        return null;
    }
}
?>