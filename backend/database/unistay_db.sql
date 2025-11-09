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
    student_number VARCHAR(50),
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
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    property_type ENUM('apartment', 'house', 'townhouse', 'condo', 'shared_house') DEFAULT 'apartment',
    total_rooms INT NOT NULL DEFAULT 0,
    available_rooms INT NOT NULL DEFAULT 0,
    amenities TEXT,
    status ENUM('available', 'fully_booked', 'unavailable') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_city (city),
    INDEX idx_status (status),
    INDEX idx_property_type (property_type)
);

CREATE TABLE property_rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    room_type ENUM('single', 'double', 'shared', 'studio', 'master') NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    bedrooms INT NOT NULL DEFAULT 1,
    bathrooms INT NOT NULL DEFAULT 1,
    room_amenities TEXT,
    status ENUM('available', 'booked', 'maintenance') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE KEY unique_property_room (property_id, room_number),
    INDEX idx_room_status (status),
    INDEX idx_room_type (room_type)
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
    room_id INT NOT NULL, -- NEW: Specific room being booked
    tenant_id INT,
    guest_name VARCHAR(100),
    guest_email VARCHAR(255),
    guest_phone VARCHAR(20),
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests INT NOT NULL DEFAULT 1,
    duration INT NOT NULL,
    monthly_rate DECIMAL(10, 2),
    subtotal DECIMAL(10, 2),
    deposit_amount DECIMAL(10, 2),
    service_fee DECIMAL(10, 2),
    total_price DECIMAL(10, 2) NOT NULL,
    special_requests TEXT,
    status ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed') DEFAULT 'pending',
    has_review BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES property_rooms(id) ON DELETE CASCADE,
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

-- Admin settings table
CREATE TABLE admin_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- NEW: System logs table for debugging and monitoring
CREATE TABLE system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info',
    component VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_level (level),
    INDEX idx_component (component),
    INDEX idx_created (created_at)
);

-- NEW: Email templates table for automated communications
CREATE TABLE email_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_key VARCHAR(100) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    variables JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- NEW: Backup history table
CREATE TABLE backup_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT,
    backup_type ENUM('full', 'partial') DEFAULT 'full',
    tables_included TEXT,
    status ENUM('completed', 'failed', 'in_progress') DEFAULT 'completed',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type, description) VALUES 
('site_maintenance', 'false', 'boolean', 'Enable site maintenance mode'),
('registration_enabled', 'true', 'boolean', 'Allow new user registrations'),
('max_properties_per_landlord', '5', 'number', 'Maximum properties a landlord can list'),
('auto_approve_properties', 'false', 'boolean', 'Automatically approve new properties'),
('booking_approval_required', 'true', 'boolean', 'Require admin approval for bookings'),
('default_commission_rate', '5', 'number', 'Default commission rate for bookings (%)'),
('site_name', 'UniStay', 'string', 'Website name'),
('site_email', 'admin@unistay.com', 'string', 'System email address'),
('currency', 'ZAR', 'string', 'Default currency'),
('currency_symbol', 'R', 'string', 'Currency symbol'),
('auto_approve_reviews', 'false', 'boolean', 'Automatically approve new reviews'),
('max_images_per_property', '10', 'number', 'Maximum images per property'),
('booking_advance_days', '365', 'number', 'Maximum days in advance for booking'),
('default_landlord_commission', '5', 'number', 'Default commission rate for landlords (%)');

-- Insert email templates
INSERT INTO email_templates (template_key, subject, content, variables) VALUES 
('booking_approved', 'Your Booking Has Been Approved', 'Dear {tenant_name},\n\nYour booking for {property_title} has been approved!\n\nCheck-in: {check_in}\nCheck-out: {check_out}\nTotal: {total_price}\n\nThank you for choosing UniStay!', '["tenant_name", "property_title", "check_in", "check_out", "total_price"]'),
('booking_rejected', 'Booking Request Update', 'Dear {tenant_name},\n\nUnfortunately your booking request for {property_title} could not be approved at this time.\n\nWe apologize for any inconvenience.', '["tenant_name", "property_title"]'),
('user_welcome', 'Welcome to UniStay!', 'Hello {user_name},\n\nWelcome to UniStay! Your account has been created successfully.\n\nYou can now start exploring properties and making bookings.', '["user_name"]'),
('user_verified', 'Account Verified', 'Hello {user_name},\n\nYour UniStay account has been successfully verified!\n\nYou can now access all features of our platform.', '["user_name"]');

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

-- SAMPLE DATA WITH REALISTIC PROPERTY IMAGES

-- Insert sample users
INSERT INTO users (name, email, password, role, is_verified, phone) VALUES 
('John Student', 'john.student@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'tenant', TRUE, '+27 71 234 5678'),
('Sarah Wilson', 'sarah.wilson@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'tenant', TRUE, '+27 72 345 6789'),
('Mike Johnson', 'mike.johnson@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'landlord', TRUE, '+27 73 456 7890'),
('Lisa Chen', 'lisa.chen@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'landlord', TRUE, '+27 74 567 8901'),
('David Brown', 'david.brown@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'landlord', TRUE, '+27 75 678 9012');

-- Insert user profiles
INSERT INTO user_profiles (user_id, first_name, last_name, institution, course, address, province, country, profile_completed, completion_percentage) VALUES 
(2, 'John', 'Student', 'University of Cape Town', 'Computer Science', '45 Main Road, Rondebosch', 'Western Cape', 'South Africa', TRUE, 100),
(3, 'Sarah', 'Wilson', 'Stellenbosch University', 'Business Management', '22 Oak Avenue, Stellenbosch', 'Western Cape', 'South Africa', TRUE, 100),
(4, 'Mike', 'Johnson', NULL, NULL, '78 Beach Road, Sea Point', 'Western Cape', 'South Africa', TRUE, 85),
(5, 'Lisa', 'Chen', NULL, NULL, '15 Kloof Street, Gardens', 'Western Cape', 'South Africa', TRUE, 90),
(6, 'David', 'Brown', NULL, NULL, '33 Long Street, CBD', 'Western Cape', 'South Africa', TRUE, 80);

-- Insert sample properties with realistic image URLs
INSERT INTO properties (landlord_id, title, description, address, city, property_type, total_rooms, available_rooms, amenities) VALUES 
(3, 'Modern Student Residence near UCT', 'Beautiful modern student residence with various room types. Perfect for students looking for comfortable living close to university.', '45 Main Road, Rondebosch', 'Cape Town', 'apartment', 8, 6, 'WiFi, Parking, Security, Kitchen, Laundry, Study Room'),
(3, 'Gardens Shared House', 'Charming shared house in the heart of Gardens. Various room types available for students or working professionals.', '15 Kloof Street, Gardens', 'Cape Town', 'shared_house', 5, 3, 'WiFi, Utilities Included, Security, Near Shops, Garden'),
(4, 'Stellenbosch Student Village', 'Large student accommodation with multiple room options. Perfect for students who prefer community living.', '22 Oak Avenue, Stellenbosch', 'Stellenbosch', 'house', 12, 8, 'Garden, Parking, WiFi, Utilities, Security, Pool');


-- Insert rooms for each property
INSERT INTO property_rooms (property_id, room_number, room_type, price, bedrooms, bathrooms, room_amenities) VALUES 
-- Property 1: Modern Student Residence (8 rooms)
(1, '101', 'single', 4500.00, 1, 1, 'Desk, Chair, Wardrobe, WiFi'),
(1, '102', 'single', 4500.00, 1, 1, 'Desk, Chair, Wardrobe, WiFi'),
(1, '103', 'double', 6200.00, 1, 1, 'Double Bed, Desk, Chair, Wardrobe'),
(1, '104', 'double', 6200.00, 1, 1, 'Double Bed, Desk, Chair, Wardrobe'),
(1, '201', 'shared', 3800.00, 1, 1, 'Shared Bathroom, Desk, Wardrobe'),
(1, '202', 'shared', 3800.00, 1, 1, 'Shared Bathroom, Desk, Wardrobe'),
(1, '203', 'studio', 7500.00, 1, 1, 'Kitchenette, Private Bathroom, Desk'),
(1, '204', 'master', 8500.00, 1, 1, 'En-suite Bathroom, Balcony, Kitchenette'),

(2, 'G01', 'single', 5200.00, 1, 1, 'City View, Desk, Wardrobe'),
(2, 'G02', 'single', 5200.00, 1, 1, 'City View, Desk, Wardrobe'),
(2, 'G03', 'double', 6800.00, 1, 1, 'Garden View, Double Bed'),
(2, 'G04', 'shared', 4200.00, 1, 1, 'Shared Bathroom, Desk'),
(2, 'G05', 'studio', 7800.00, 1, 1, 'Private Entrance, Kitchenette'),

-- Property 3: Stellenbosch Student Village (12 rooms)
(3, 'S101', 'single', 4800.00, 1, 1, 'Garden View, Study Desk'),
(3, 'S102', 'single', 4800.00, 1, 1, 'Garden View, Study Desk'),
(3, 'S103', 'double', 6500.00, 1, 1, 'Double Bed, Study Area'),
(3, 'S104', 'double', 6500.00, 1, 1, 'Double Bed, Study Area'),
(3, 'S105', 'shared', 3500.00, 1, 1, 'Shared Facilities, Desk'),
(3, 'S106', 'shared', 3500.00, 1, 1, 'Shared Facilities, Desk'),
(3, 'S107', 'studio', 7200.00, 1, 1, 'Private Kitchenette, Bathroom'),
(3, 'S108', 'studio', 7200.00, 1, 1, 'Private Kitchenette, Bathroom'),
(3, 'S201', 'master', 8200.00, 1, 1, 'En-suite, Balcony, Kitchenette'),
(3, 'S202', 'master', 8200.00, 1, 1, 'En-suite, Balcony, Kitchenette'),
(3, 'S203', 'single', 4800.00, 1, 1, 'Quiet Area, Study Desk'),
(3, 'S204', 'single', 4800.00, 1, 1, 'Quiet Area, Study Desk');

-- Insert property images with realistic URLs (using placeholder images from Picsum)
INSERT INTO property_images (property_id, image_path, is_primary) VALUES 
-- Property 1 Images
(1, 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&w=800', 1),
(1, 'https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&w=800', 0),
(1, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&w=800', 0),

-- Property 2 Images
(2, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&w=800', 1),
(2, 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?ixlib=rb-4.0.3&w=800', 0),
(2, 'https://images.unsplash.com/photo-1554995207-c18c203602cb?ixlib=rb-4.0.3&w=800', 0),

-- Property 3 Images
(3, 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?ixlib=rb-4.0.3&w=800', 1),
(3, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&w=800', 0),
(3, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&w=800', 0),

-- Property 4 Images
(4, 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&w=800', 1),
(4, 'https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&w=800', 0),
(4, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&w=800', 0),

-- Property 5 Images
(5, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&w=800', 1),
(5, 'https://images.unsplash.com/photo-1556020685-ae41abfc9365?ixlib=rb-4.0.3&w=800', 0),
(5, 'https://images.unsplash.com/photo-1554995207-c18c203602cb?ixlib=rb-4.0.3&w=800', 0),

-- Property 6 Images
(6, 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?ixlib=rb-4.0.3&w=800', 1),
(6, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?ixlib=rb-4.0.3&w=800', 0),
(6, 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?ixlib=rb-4.0.3&w=800', 0);

-- Update property room counts
UPDATE properties SET total_rooms = (SELECT COUNT(*) FROM property_rooms WHERE property_id = properties.id);
UPDATE properties SET available_rooms = (SELECT COUNT(*) FROM property_rooms WHERE property_id = properties.id AND status = 'available');


-- Insert sample bookings
INSERT INTO bookings (property_id, room_id, tenant_id, check_in, check_out, guests, duration, monthly_rate, subtotal, deposit_amount, service_fee, total_price, status) VALUES 
(1, 1, 1, '2025-02-01', '2025-06-01', 1, 4, 4500.00, 18000.00, 5400.00, 900.00, 18900.00, 'approved'),
(1, 3, 2, '2025-02-15', '2025-07-15', 2, 5, 6200.00, 31000.00, 9300.00, 1550.00, 32550.00, 'pending');


-- Update room status for booked rooms
UPDATE property_rooms SET status = 'booked' WHERE id IN (1, 3);

-- Update available room counts
UPDATE properties 
SET available_rooms = (
    SELECT COUNT(*) 
    FROM property_rooms 
    WHERE property_id = properties.id 
    AND status = 'available'
);


-- Insert sample payments

-- Insert sample reviews
INSERT INTO reviews (property_id, tenant_id, booking_id, rating, comment, is_approved) VALUES 
(4, 3, 2, 5, 'Amazing apartment with stunning sea views! The location is perfect and the landlord was very responsive. Highly recommended for students who want to live near the beach.', TRUE),
(1, 2, 1, 4, 'Great apartment close to UCT. The space is comfortable and has all the essentials. Would definitely book again!', TRUE);

-- Insert sample activity logs
INSERT INTO activity_log (user_id, action, description, ip_address) VALUES 
(1, 'admin_login', 'Admin user logged into system', '192.168.1.100'),
(2, 'user_login', 'User logged in successfully', '192.168.1.101'),
(3, 'booking_created', 'New booking created for Sea Point apartment', '192.168.1.102'),
(4, 'property_created', 'New property listed: Modern UCT Apartment', '192.168.1.103'),
(1, 'settings_updated', 'Admin updated system settings', '192.168.1.100');

-- Insert sample system logs
INSERT INTO system_logs (level, component, message, details) VALUES 
('info', 'auth', 'User authentication successful', '{"user_id": 2, "email": "john.student@example.com"}'),
('warning', 'payment', 'Payment processing delay', '{"booking_id": 3, "amount": 4680.00}'),
('info', 'backup', 'Automatic backup completed', '{"tables": 12, "size": "45.2MB"}');

-- ADDITIONAL INDEXES FOR PERFORMANCE
CREATE INDEX idx_users_role_verified ON users(role, is_verified);
CREATE INDEX idx_bookings_dates_status ON bookings(check_in, check_out, status);
CREATE INDEX idx_payments_status_date ON payments(status, created_at);
CREATE INDEX idx_properties_status_city ON properties(status, city);
CREATE INDEX idx_reviews_approved_date ON reviews(is_approved, created_at);
CREATE INDEX idx_activity_log_action_date ON activity_log(action, created_at);
CREATE INDEX idx_users_created_role ON users(created_at, role);

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

-- Enhanced triggers for activity logging
CREATE TRIGGER after_user_insert 
AFTER INSERT ON users 
FOR EACH ROW 
BEGIN
    INSERT INTO activity_log (user_id, action, description) 
    VALUES (NEW.id, 'user_registered', CONCAT('User ', NEW.email, ' registered as ', NEW.role));
END//

CREATE TRIGGER after_property_insert 
AFTER INSERT ON properties 
FOR EACH ROW 
BEGIN
    INSERT INTO activity_log (user_id, action, description) 
    VALUES (NEW.landlord_id, 'property_created', CONCAT('Property "', NEW.title, '" created'));
END//

CREATE TRIGGER after_booking_update 
AFTER UPDATE ON bookings 
FOR EACH ROW 
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO activity_log (user_id, action, description) 
        VALUES (COALESCE(NEW.tenant_id, OLD.tenant_id), 'booking_status_changed', 
                CONCAT('Booking #', NEW.id, ' status changed from ', OLD.status, ' to ', NEW.status));
    END IF;
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

-- View for room availability by property and type
CREATE VIEW property_room_availability AS
SELECT 
    p.id as property_id,
    p.title as property_title,
    pr.room_type,
    COUNT(pr.id) as total_rooms,
    SUM(CASE WHEN pr.status = 'available' THEN 1 ELSE 0 END) as available_rooms,
    MIN(CASE WHEN pr.status = 'available' THEN pr.price END) as min_price,
    MAX(CASE WHEN pr.status = 'available' THEN pr.price END) as max_price
FROM properties p
JOIN property_rooms pr ON p.id = pr.property_id
GROUP BY p.id, p.title, pr.room_type;

CREATE OR REPLACE VIEW property_room_summary AS
SELECT 
    p.id as property_id,
    p.title,
    p.city,
    p.address,
    p.property_type,
    COUNT(pr.id) as total_rooms,
    SUM(CASE WHEN pr.status = 'available' THEN 1 ELSE 0 END) as available_rooms,
    -- Room type breakdown
    SUM(CASE WHEN pr.room_type = 'single' AND pr.status = 'available' THEN 1 ELSE 0 END) as available_singles,
    SUM(CASE WHEN pr.room_type = 'double' AND pr.status = 'available' THEN 1 ELSE 0 END) as available_doubles,
    SUM(CASE WHEN pr.room_type = 'shared' AND pr.status = 'available' THEN 1 ELSE 0 END) as available_shared,
    SUM(CASE WHEN pr.room_type = 'studio' AND pr.status = 'available' THEN 1 ELSE 0 END) as available_studios,
    SUM(CASE WHEN pr.room_type = 'master' AND pr.status = 'available' THEN 1 ELSE 0 END) as available_masters,
    -- Price ranges
    MIN(pr.price) as min_price,
    MAX(pr.price) as max_price
FROM properties p
JOIN property_rooms pr ON p.id = pr.property_id
GROUP BY p.id, p.title, p.city, p.address, p.property_type;

-- Enhanced dashboard statistics view
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM users WHERE role = 'tenant') as total_tenants,
    (SELECT COUNT(*) FROM users WHERE role = 'landlord') as total_landlords,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
    (SELECT COUNT(*) FROM properties) as total_properties,
    (SELECT COUNT(*) FROM properties WHERE status = 'available') as available_properties,
    (SELECT COUNT(*) FROM properties WHERE status = 'booked') as booked_properties,
    (SELECT COUNT(*) FROM bookings) as total_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'approved') as approved_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings,
    (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE status = 'completed') as total_revenue,
    (SELECT COUNT(*) FROM payments WHERE status = 'completed') as completed_payments,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as total_payment_amount;

-- Monthly analytics view for charts
CREATE OR REPLACE VIEW monthly_analytics AS
SELECT 
    DATE_FORMAT(created_at, '%Y-%m') as month,
    DATE_FORMAT(created_at, '%b %Y') as month_display,
    COUNT(*) as new_users,
    (SELECT COUNT(*) FROM properties WHERE DATE_FORMAT(created_at, '%Y-%m') = month) as new_properties,
    (SELECT COUNT(*) FROM bookings WHERE DATE_FORMAT(created_at, '%Y-%m') = month) as new_bookings,
    (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE DATE_FORMAT(created_at, '%Y-%m') = month AND status = 'completed') as monthly_revenue
FROM users 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
ORDER BY month DESC;

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

-- Stored procedure for user statistics
CREATE PROCEDURE GetUserDetailedStats(IN user_id INT)
BEGIN
    SELECT 
        u.*,
        up.first_name,
        up.last_name,
        up.institution,
        up.course,
        (SELECT COUNT(*) FROM properties p WHERE p.landlord_id = u.id) as properties_listed,
        (SELECT COUNT(*) FROM bookings b WHERE b.tenant_id = u.id) as bookings_made,
        (SELECT COUNT(*) FROM reviews r WHERE r.tenant_id = u.id) as reviews_written,
        (SELECT COALESCE(SUM(b.total_price), 0) FROM bookings b WHERE b.tenant_id = u.id AND b.status = 'completed') as total_spent
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.id = user_id;
END//

-- Cleanup procedure
CREATE PROCEDURE CleanupOldData(IN days_old INT)
BEGIN
    -- Delete old activity logs
    DELETE FROM activity_log WHERE created_at < DATE_SUB(NOW(), INTERVAL days_old DAY);
    
    -- Delete old login attempts
    DELETE FROM login_attempts WHERE attempt_time < DATE_SUB(NOW(), INTERVAL days_old DAY);
    
    -- Delete expired sessions
    DELETE FROM user_sessions WHERE expires_at < NOW();
    
    -- Log the cleanup
    INSERT INTO system_logs (level, component, message, details) 
    VALUES ('info', 'cleanup', 'Old data cleanup completed', JSON_OBJECT('days_old', days_old));
END//

DELIMITER ;

-- Insert initial backup record
INSERT INTO backup_history (filename, file_size, backup_type, tables_included, status, created_by) 
VALUES ('unistay_backup_20241014.sql', 45200000, 'full', 'all_tables', 'completed', 1);

DELIMITER //

CREATE PROCEDURE BookRoom(
    IN p_room_id INT,
    IN p_tenant_id INT,
    IN p_check_in DATE,
    IN p_duration INT,
    IN p_guests INT,
    IN p_special_requests TEXT
)
BEGIN
    DECLARE v_room_status VARCHAR(20);
    DECLARE v_property_id INT;
    DECLARE v_monthly_rate DECIMAL(10,2);
    DECLARE v_check_out DATE;
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_deposit_amount DECIMAL(10,2);
    DECLARE v_service_fee DECIMAL(10,2);
    DECLARE v_total_price DECIMAL(10,2);
    
    -- Check room availability
    SELECT status, property_id, price INTO v_room_status, v_property_id, v_monthly_rate
    FROM property_rooms WHERE id = p_room_id;
    
    IF v_room_status != 'available' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Room is not available';
    END IF;
    
    -- Calculate dates and prices
    SET v_check_out = DATE_ADD(p_check_in, INTERVAL p_duration MONTH);
    SET v_subtotal = v_monthly_rate * p_duration;
    SET v_deposit_amount = v_subtotal * 0.3; -- 30% deposit
    SET v_service_fee = v_subtotal * 0.05; -- 5% service fee
    SET v_total_price = v_subtotal + v_service_fee;
    
    -- Create booking
    INSERT INTO bookings (
        property_id, room_id, tenant_id, check_in, check_out, 
        guests, duration, monthly_rate, subtotal, deposit_amount, 
        service_fee, total_price, special_requests, status
    ) VALUES (
        v_property_id, p_room_id, p_tenant_id, p_check_in, v_check_out,
        p_guests, p_duration, v_monthly_rate, v_subtotal, v_deposit_amount,
        v_service_fee, v_total_price, p_special_requests, 'pending'
    );
    
    -- Update room status
    UPDATE property_rooms SET status = 'booked' WHERE id = p_room_id;
    
    -- Update property available room count
    UPDATE properties 
    SET available_rooms = (
        SELECT COUNT(*) FROM property_rooms 
        WHERE property_id = v_property_id AND status = 'available'
    )
    WHERE id = v_property_id;
    
END//

DELIMITER ;