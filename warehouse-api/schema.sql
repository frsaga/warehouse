-- Public schema only; no original account or business records.

CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

CREATE TABLE IF NOT EXISTS products (
                product_id INT AUTO_INCREMENT PRIMARY KEY,
                product_name VARCHAR(100) NOT NULL,
                description TEXT,
                category VARCHAR(50),
                unit VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

CREATE TABLE IF NOT EXISTS inbound_records (
                inbound_id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT,
                quantity INT NOT NULL,
                unit_price DECIMAL(10,2),
                supplier VARCHAR(100),
                operator_id INT,
                inbound_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
                FOREIGN KEY (operator_id) REFERENCES users(user_id)
            );

CREATE TABLE IF NOT EXISTS outbound_records (
                outbound_id INT AUTO_INCREMENT PRIMARY KEY,
                product_id INT,
                quantity INT NOT NULL,
                unit_price DECIMAL(10,2),
                customer VARCHAR(100),
                operator_id INT,
                outbound_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
                FOREIGN KEY (operator_id) REFERENCES users(user_id)
            );

CREATE TABLE IF NOT EXISTS system_logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                action VARCHAR(50),
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            );

CREATE TABLE IF NOT EXISTS system_settings (
            setting_id INT PRIMARY KEY AUTO_INCREMENT,
            system_name VARCHAR(100) NOT NULL DEFAULT '仓库管理系统',
            low_stock_threshold INT NOT NULL DEFAULT 10,
            enable_notifications BOOLEAN NOT NULL DEFAULT TRUE,
            backup_interval INT NOT NULL DEFAULT 24,
            updated_by INT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (updated_by) REFERENCES users(user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
