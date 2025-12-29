-- Migration: HRM Promotions Table
CREATE TABLE IF NOT EXISTS hr_promotions (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    old_designation_id INTEGER REFERENCES hr_designations(id) ON DELETE SET NULL,
    new_designation_id INTEGER REFERENCES hr_designations(id) ON DELETE SET NULL,
    promotion_date DATE,
    remarks TEXT,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);