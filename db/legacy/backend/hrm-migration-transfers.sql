-- Migration: HRM Transfers Table
CREATE TABLE IF NOT EXISTS hr_transfers (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    from_branch_id INTEGER REFERENCES hr_branches(id) ON DELETE SET NULL,
    to_branch_id INTEGER REFERENCES hr_branches(id) ON DELETE SET NULL,
    transfer_date DATE,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);