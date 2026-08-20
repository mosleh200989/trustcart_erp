-- Migration: HRM Resignations Table
CREATE TABLE IF NOT EXISTS hr_resignations (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    resignation_date DATE NOT NULL,
    notice_date DATE,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);