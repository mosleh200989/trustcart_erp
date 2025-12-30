-- Migration: HRM Warnings Table
CREATE TABLE IF NOT EXISTS hr_warnings (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    warning_type VARCHAR(100),
    warning_date DATE,
    subject VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);