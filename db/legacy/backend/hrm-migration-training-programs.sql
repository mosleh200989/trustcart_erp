-- Migration: HRM Training Programs Table
CREATE TABLE IF NOT EXISTS hr_training_programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    training_type_id INTEGER REFERENCES hr_training_types(id) ON DELETE SET NULL,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);