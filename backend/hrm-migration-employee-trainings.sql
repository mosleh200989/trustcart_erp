-- Migration: HRM Employee Trainings Table
CREATE TABLE IF NOT EXISTS hr_employee_trainings (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    training_session_id INTEGER REFERENCES hr_training_sessions(id) ON DELETE SET NULL,
    completion_status VARCHAR(50) DEFAULT 'Pending',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);