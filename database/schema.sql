CREATE TABLE spots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    number VARCHAR(3) NOT NULL UNIQUE,
    apartment_hash VARCHAR(255) NOT NULL,
    phone_encrypted TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE spot_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spot_id INT NOT NULL,
    day_of_week TINYINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE,
    UNIQUE KEY unique_spot_day (spot_id, day_of_week)
);

CREATE TABLE spot_trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spot_id INT NOT NULL,
    depart_at DATETIME NOT NULL,
    return_at DATETIME NOT NULL,
    cancelled_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
);

CREATE TABLE active_parkings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spot_id INT NOT NULL UNIQUE,
    parked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parked_by_spot_number VARCHAR(3) NULL,
    FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
);

CREATE TABLE spot_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    spot_id INT NOT NULL,
    message VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dismissed_at DATETIME NULL,
    FOREIGN KEY (spot_id) REFERENCES spots(id) ON DELETE CASCADE
);

CREATE TABLE auth_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success TINYINT NOT NULL DEFAULT 0,
    INDEX idx_ip_time (ip_address, attempted_at)
);
