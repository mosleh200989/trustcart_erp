-- Migration: HRM Trips Table
CREATE TABLE IF NOT EXISTS hr_trips (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    trip_type VARCHAR(100),
    destination VARCHAR(255),
    start_date DATE,
    end_date DATE,
    purpose TEXT,
    status VARCHAR(50) DEFAULT 'Planned',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);