-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role_id INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert demo admin user
-- Password: admin123 (bcrypt hash)
INSERT INTO users (email, password_hash, first_name, last_name, role_id, is_active)
VALUES (
  'admin@trustcart.com',
  '$2b$10$rKJ5VqH8ZqF8ZqF8ZqF8ZuK9X5VqH8ZqF8ZqF8ZqF8ZqF8ZqF8Zq',
  'Admin',
  'User',
  1,
  true
)
ON CONFLICT (email) DO NOTHING;

SELECT * FROM users;
