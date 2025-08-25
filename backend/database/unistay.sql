-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('tenant', 'landlord', 'admin') NOT NULL,
    phone VARCHAR(20),
    profile_image VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Properties table
CREATE TABLE properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    bedrooms INT,
    bathrooms INT,
    amenities TEXT,
    status ENUM('available', 'pending', 'booked', 'unavailable') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Property images table
CREATE TABLE property_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Bookings table
CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    tenant_id INT NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Payments table
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('credit_card', 'bank_transfer', 'other') NOT NULL,
    transaction_id VARCHAR(100),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    property_id INT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
);

-- Reviews table
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    tenant_id INT NOT NULL,
    booking_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Favorites table
CREATE TABLE favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    property_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (tenant_id, property_id)
);