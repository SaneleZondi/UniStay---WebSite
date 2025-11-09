-- Enhanced database schema with all required tables
CREATE DATABASE IF NOT EXISTS unistay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE unistay;

-- Users table with enhanced security
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('tenant', 'landlord', 'admin') NOT NULL DEFAULT 'tenant',
    phone VARCHAR(20),
    profile_image VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(64),
    reset_token VARCHAR(64),
    reset_token_expires DATETIME,
    failed_login_attempts INT DEFAULT 0,
    last_failed_login DATETIME,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_until DATETIME,
    last_login DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User profiles table for extended user information
CREATE TABLE user_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    occupation VARCHAR(100),
    institution VARCHAR(255),
    student_number VARCHAR(50),  -- Only student number, no student_id
    course VARCHAR(100),
    address TEXT,
    province VARCHAR(100),
    country VARCHAR(100),
    state_province VARCHAR(100),
    company VARCHAR(255),
    id_number VARCHAR(20),
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    profile_completed BOOLEAN DEFAULT FALSE,
    completion_percentage INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_profile_completed (profile_completed)
);

-- Login attempts tracking
CREATE TABLE login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    success BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Session management
CREATE TABLE user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(64) NOT NULL UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Properties table
CREATE TABLE properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    bedrooms INT NOT NULL,
    bathrooms INT NOT NULL,
    amenities TEXT,
    status ENUM('available', 'pending', 'booked', 'unavailable') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_city (city),
    INDEX idx_price (price),
    INDEX idx_status (status)
);

-- Property images
CREATE TABLE property_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Bookings table - UPDATED WITH DEPOSIT FIELDS
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    tenant_id INT,
    guest_name VARCHAR(100),
    guest_email VARCHAR(255),
    guest_phone VARCHAR(20),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests INT NOT NULL DEFAULT 1,
    duration INT NOT NULL,
    -- DEPOSIT SYSTEM FIELDS ADDED
    monthly_rate DECIMAL(10, 2),
    subtotal DECIMAL(10, 2),
    deposit_amount DECIMAL(10, 2),
    service_fee DECIMAL(10, 2),
    total_price DECIMAL(10, 2) NOT NULL,
    special_requests TEXT,
    status ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed') DEFAULT 'pending',
    -- REVIEW TRACKING FIELD ADDED
    has_review BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_check_in (check_in),
    INDEX idx_check_out (check_out),
    INDEX idx_status (status),
    INDEX idx_has_review (has_review)
);

-- Payments table - UPDATED WITH PAYMENT TYPE
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method ENUM('card', 'bank_transfer', 'other') NOT NULL,
    -- PAYMENT TYPE FIELD ADDED FOR DEPOSIT SYSTEM
    payment_type ENUM('deposit', 'full', 'balance') DEFAULT 'deposit',
    transaction_id VARCHAR(255),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    INDEX idx_payment_type (payment_type)
);

-- Reviews table
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    tenant_id INT NOT NULL,
    booking_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    landlord_response TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    UNIQUE KEY unique_booking_review (booking_id)
);

-- Messages table
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    property_id INT,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

-- Activity log table
CREATE TABLE activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    reference_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admin_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES 
('site_maintenance', 'false', 'boolean', 'Enable site maintenance mode'),
('registration_enabled', 'true', 'boolean', 'Allow new user registrations'),
('max_properties_per_landlord', '5', 'number', 'Maximum properties a landlord can list'),
('auto_approve_properties', 'false', 'boolean', 'Automatically approve new properties'),
('booking_approval_required', 'true', 'boolean', 'Require admin approval for bookings'),
('default_commission_rate', '5', 'number', 'Default commission rate for bookings (%)');

-- Insert admin user
INSERT INTO users (name, email, password, role, is_verified, created_at) 
VALUES (
    'System Administrator', 
    'admin@unistay.com', 
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password is "password"
    'admin', 
    1, 
    NOW()
);

-- ADDITIONAL INDEXES FOR PERFORMANCE
CREATE INDEX idx_bookings_tenant_status ON bookings(tenant_id, status);
CREATE INDEX idx_payments_booking_type ON payments(booking_id, payment_type);

-- TRIGGER TO AUTO-UPDATE HAS_REVIEW WHEN REVIEW IS CREATED
DELIMITER //

CREATE TRIGGER after_review_insert 
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    UPDATE bookings 
    SET has_review = TRUE 
    WHERE id = NEW.booking_id;
END//

DELIMITER ;

-- VIEW FOR TENANT BOOKINGS WITH REVIEW ELIGIBILITY
CREATE VIEW tenant_bookings_with_reviews AS
SELECT 
    b.*,
    p.title as property_title,
    p.city as property_city,
    p.address as property_address,
    l.name as landlord_name,
    l.email as landlord_email,
    (SELECT COUNT(*) FROM reviews r WHERE r.booking_id = b.id) as review_count,
    CASE 
        WHEN b.status = 'completed' AND 
             b.check_out < CURDATE() AND 
             (SELECT COUNT(*) FROM reviews r WHERE r.booking_id = b.id) = 0 
        THEN TRUE 
        ELSE FALSE 
    END as can_review
FROM bookings b
JOIN properties p ON b.property_id = p.id
JOIN users l ON p.landlord_id = l.id
LEFT JOIN users t ON b.tenant_id = t.id;

-- FUNCTION TO CALCULATE REMAINING BALANCE
DELIMITER //

CREATE FUNCTION get_booking_balance(booking_id INT) 
RETURNS DECIMAL(10,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE total_price DECIMAL(10,2);
    DECLARE paid_amount DECIMAL(10,2);
    
    SELECT b.total_price INTO total_price
    FROM bookings b WHERE b.id = booking_id;
    
    SELECT COALESCE(SUM(p.amount), 0) INTO paid_amount
    FROM payments p 
    WHERE p.booking_id = booking_id AND p.status = 'completed';
    
    RETURN total_price - paid_amount;
END//

DELIMITER ;

-- SAMPLE DATA FOR TESTING
INSERT INTO users (name, email, password, role, is_verified) VALUES 
('John Tenant', 'tenant@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'tenant', TRUE),
('Sarah Landlord', 'landlord@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'landlord', TRUE),
('Admin User', 'admin@unistay.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', TRUE);

INSERT INTO properties (landlord_id, title, description, price, address, city, bedrooms, bathrooms, amenities) VALUES 
(3, 'Modern Apartment near Campus', 'Spacious 2-bedroom apartment with modern amenities', 5000.00, '123 University Ave', 'Cape Town', 2, 1, 'WiFi, Parking, Laundry'),
(3, 'Cozy Studio Apartment', 'Perfect for students, close to university', 3500.00, '456 Student Street', 'Cape Town', 1, 1, 'WiFi, Furnished');

INSERT INTO bookings (property_id, tenant_id, check_in, check_out, guests, duration, monthly_rate, subtotal, deposit_amount, service_fee, total_price, status) VALUES 
(1, 2, DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 37 DAY), 2, 1, 5000.00, 5000.00, 1500.00, 250.00, 5250.00, 'pending'),
(2, 2, DATE_ADD(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 44 DAY), 1, 1, 3500.00, 3500.00, 1050.00, 175.00, 3675.00, 'approved');