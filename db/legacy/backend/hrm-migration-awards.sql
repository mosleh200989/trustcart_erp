-- Migration: HRM Awards Table
CREATE TABLE IF NOT EXISTS hr_awards (
    id SERIAL PRIMARY KEY,
    award_type_id INTEGER REFERENCES hr_award_types(id) ON DELETE SET NULL,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date_awarded DATE,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);