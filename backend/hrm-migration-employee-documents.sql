-- Migration: HRM Employee Documents Table
CREATE TABLE IF NOT EXISTS hr_employee_documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    document_type_id INTEGER REFERENCES hr_document_types(id) ON DELETE SET NULL,
    document_url TEXT,
    issue_date DATE,
    expiry_date DATE,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);