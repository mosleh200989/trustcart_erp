-- Migration: HRM Performance Indicators Table
CREATE TABLE IF NOT EXISTS hr_performance_indicators (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES hr_performance_indicator_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    max_score INTEGER DEFAULT 10,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);