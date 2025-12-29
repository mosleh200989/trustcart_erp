-- Migration: HRM Training Sessions Table
CREATE TABLE IF NOT EXISTS hr_training_sessions (
    id SERIAL PRIMARY KEY,
    training_program_id INTEGER REFERENCES hr_training_programs(id) ON DELETE SET NULL,
    session_title VARCHAR(255) NOT NULL,
    session_date DATE,
    duration INTEGER,
    trainer VARCHAR(255),
    location VARCHAR(255),
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);