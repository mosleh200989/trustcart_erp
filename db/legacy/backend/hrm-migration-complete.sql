-- HRM Complete Migration Script
-- Branches
CREATE TABLE IF NOT EXISTS hr_branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments
CREATE TABLE IF NOT EXISTS hr_departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    branch_id INTEGER REFERENCES hr_branches(id) ON DELETE SET NULL,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Designations
CREATE TABLE IF NOT EXISTS hr_designations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    department_id INTEGER REFERENCES hr_departments(id) ON DELETE SET NULL,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employees
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

-- Award Types
CREATE TABLE IF NOT EXISTS hr_award_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Awards
CREATE TABLE IF NOT EXISTS hr_awards (
    id SERIAL PRIMARY KEY,
    award_type_id INTEGER REFERENCES hr_award_types(id) ON DELETE SET NULL,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date_awarded DATE,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promotions
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

-- Resignations
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

-- Terminations
CREATE TABLE IF NOT EXISTS hr_terminations (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    termination_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Warnings
CREATE TABLE IF NOT EXISTS hr_warnings (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    warning_type VARCHAR(100),
    warning_date DATE,
    subject VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trips
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

-- Complaints
CREATE TABLE IF NOT EXISTS hr_complaints (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    complaint_type VARCHAR(100),
    complaint_date DATE,
    subject VARCHAR(255),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Open',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transfers
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

-- Holidays
CREATE TABLE IF NOT EXISTS hr_holidays (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    holiday_date DATE NOT NULL,
    description TEXT,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Announcements
CREATE TABLE IF NOT EXISTS hr_announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    announcement_date DATE,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training Types
CREATE TABLE IF NOT EXISTS hr_training_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training Programs
CREATE TABLE IF NOT EXISTS hr_training_programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    training_type_id INTEGER REFERENCES hr_training_types(id) ON DELETE SET NULL,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training Sessions
CREATE TABLE IF NOT EXISTS hr_training_sessions (
    id SERIAL PRIMARY KEY,
    training_program_id INTEGER REFERENCES hr_training_programs(id) ON DELETE SET NULL,
    session_title VARCHAR(255) NOT NULL,
    session_date DATE,
    duration INTEGER,
    trainer VARCHAR(255),
    location VARCHAR(255),
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Trainings
CREATE TABLE IF NOT EXISTS hr_employee_trainings (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES hr_employees(id) ON DELETE SET NULL,
    training_session_id INTEGER REFERENCES hr_training_sessions(id) ON DELETE SET NULL,
    completion_status VARCHAR(50) DEFAULT 'Pending',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indicator Categories
CREATE TABLE IF NOT EXISTS hr_performance_indicator_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indicators
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

-- Employee Performance
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

-- Document Types
CREATE TABLE IF NOT EXISTS hr_document_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Documents
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
