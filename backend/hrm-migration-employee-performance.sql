-- Migration: HRM Employee Performance Table
CREATE TABLE IF NOT EXISTS hr_employee_performance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    indicator_id INTEGER REFERENCES hr_performance_indicators(id) ON DELETE SET NULL,
    score INTEGER,
    review_date DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);