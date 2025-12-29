-- Migration: HRM Holidays Table
CREATE TABLE IF NOT EXISTS hr_holidays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    holiday_date DATE NOT NULL,
    description TEXT,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);