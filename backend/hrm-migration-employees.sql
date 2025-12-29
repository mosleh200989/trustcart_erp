-- Migration: HRM Employees Table
CREATE TABLE IF NOT EXISTS hr_employees (
    id SERIAL PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    branch_id INTEGER REFERENCES hr_branches(id) ON DELETE SET NULL,
    department_id INTEGER REFERENCES hr_departments(id) ON DELETE SET NULL,
    designation_id INTEGER REFERENCES hr_designations(id) ON DELETE SET NULL,
    date_of_joining DATE,
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);