-- Sample Data for HRM Module

-- Branches
INSERT INTO hr_branches (name, code, address, city, state, country, phone, email, status)
VALUES
  ('Main Branch', 'MB001', '123 Main St', 'Metropolis', 'Metro State', 'CountryX', '1234567890', 'main@company.com', TRUE),
  ('North Branch', 'NB001', '456 North Ave', 'North City', 'North State', 'CountryX', '2345678901', 'north@company.com', TRUE);

-- Departments
INSERT INTO hr_departments (name, code, branch_id, status)
VALUES
  ('HR', 'HR01', 1, TRUE),
  ('Sales', 'SA01', 1, TRUE),
  ('IT', 'IT01', 2, TRUE);

-- Designations
INSERT INTO hr_designations (name, code, department_id, status)
VALUES
  ('Manager', 'MG01', 1, TRUE),
  ('Executive', 'EX01', 2, TRUE),
  ('Developer', 'DEV01', 3, TRUE);

-- Employees
INSERT INTO hr_employees (employee_code, first_name, last_name, email, phone, branch_id, department_id, designation_id, date_of_joining, date_of_birth, gender, address, city, state, country, status)
VALUES
  ('EMP001', 'Alice', 'Smith', 'alice.smith@company.com', '5551112222', 1, 1, 1, '2022-01-10', '1990-05-15', 'Female', '123 Main St', 'Metropolis', 'Metro State', 'CountryX', TRUE),
  ('EMP002', 'Bob', 'Johnson', 'bob.johnson@company.com', '5552223333', 1, 2, 2, '2021-03-20', '1988-08-22', 'Male', '456 North Ave', 'North City', 'North State', 'CountryX', TRUE),
  ('EMP003', 'Carol', 'Williams', 'carol.williams@company.com', '5553334444', 2, 3, 3, '2023-07-01', '1995-12-01', 'Female', '789 South Rd', 'South City', 'South State', 'CountryX', TRUE);

-- Award Types
INSERT INTO hr_award_types (name, description, status)
VALUES
  ('Employee of the Month', 'Awarded for outstanding performance', TRUE),
  ('Best Salesperson', 'Awarded for highest sales', TRUE);

-- Awards
INSERT INTO hr_awards (award_type_id, employee_id, title, description, date_awarded, status)
VALUES
  (1, 1, 'January Star', 'Best performer in January', '2023-01-31', TRUE),
  (2, 2, 'Top Seller', 'Highest sales in Q1', '2023-03-31', TRUE);

-- Promotions
INSERT INTO hr_promotions (employee_id, old_designation_id, new_designation_id, promotion_date, remarks, status)
VALUES
  (1, 2, 1, '2023-06-01', 'Promoted to Manager', TRUE);

-- Resignations
INSERT INTO hr_resignations (employee_id, resignation_date, notice_date, reason, status, remarks)
VALUES
  (2, '2024-01-15', '2023-12-15', 'Personal reasons', 'Pending', 'Notice given');

-- Terminations
INSERT INTO hr_terminations (employee_id, termination_date, reason, status, remarks)
VALUES
  (3, '2024-05-10', 'Policy violation', 'Pending', 'Terminated after review');

-- Warnings
INSERT INTO hr_warnings (employee_id, warning_type, warning_date, subject, description, status)
VALUES
  (1, 'Attendance', '2023-09-01', 'Late Arrival', 'Arrived late 3 times in a week', 'Active');

-- Trips
INSERT INTO hr_trips (employee_id, trip_type, destination, start_date, end_date, purpose, status, remarks)
VALUES
  (1, 'Business', 'Capital City', '2023-11-01', '2023-11-05', 'Client meeting', 'Planned', 'Approved by manager');

-- Complaints
INSERT INTO hr_complaints (employee_id, complaint_type, complaint_date, subject, description, status, remarks)
VALUES
  (2, 'Harassment', '2023-10-10', 'Workplace Issue', 'Complaint about team member', 'Open', 'Under investigation');

-- Transfers
INSERT INTO hr_transfers (employee_id, from_branch_id, to_branch_id, transfer_date, reason, status, remarks)
VALUES
  (3, 2, 1, '2024-02-01', 'Project requirement', 'Pending', 'Awaiting approval');

-- Holidays
INSERT INTO hr_holidays (name, holiday_date, description, status)
VALUES
  ('New Year', '2025-01-01', 'New Year Holiday', TRUE),
  ('Independence Day', '2025-08-15', 'National holiday', TRUE);

-- Announcements
INSERT INTO hr_announcements (title, content, announcement_date, status)
VALUES
  ('Office Closed', 'Office will be closed on New Year', '2024-12-31', TRUE);

-- Training Types
INSERT INTO hr_training_types (name, description, status)
VALUES
  ('Technical', 'Technical skill development', TRUE),
  ('Soft Skills', 'Soft skills improvement', TRUE);

-- Training Programs
INSERT INTO hr_training_programs (name, description, training_type_id, status)
VALUES
  ('React Bootcamp', 'Intensive React training', 1, TRUE),
  ('Leadership Workshop', 'Leadership skills', 2, TRUE);

-- Training Sessions
INSERT INTO hr_training_sessions (training_program_id, session_title, session_date, duration, trainer, location, status)
VALUES
  (1, 'React Basics', '2024-03-10', 4, 'Jane Trainer', 'Room 101', TRUE),
  (2, 'Team Building', '2024-04-15', 3, 'John Coach', 'Room 202', TRUE);

-- Employee Trainings
INSERT INTO hr_employee_trainings (employee_id, training_session_id, completion_status, remarks)
VALUES
  (1, 1, 'Completed', 'Excellent performance'),
  (2, 2, 'Pending', 'To be completed');

-- Performance Indicator Categories
INSERT INTO hr_performance_indicator_categories (name, description, status)
VALUES
  ('Productivity', 'Measures output', TRUE),
  ('Teamwork', 'Measures collaboration', TRUE);

-- Performance Indicators
INSERT INTO hr_performance_indicators (category_id, name, description, max_score, status)
VALUES
  (1, 'Tasks Completed', 'Number of tasks finished', 10, TRUE),
  (2, 'Peer Feedback', 'Feedback from team', 10, TRUE);

-- Employee Performance
INSERT INTO hr_employee_performance (employee_id, indicator_id, score, review_date, remarks)
VALUES
  (1, 1, 9, '2024-06-30', 'Consistently high output'),
  (2, 2, 8, '2024-06-30', 'Good team player');

-- Document Types
INSERT INTO hr_document_types (name, description, status)
VALUES
  ('ID Proof', 'Government issued ID', TRUE),
  ('Address Proof', 'Utility bill or similar', TRUE);

-- Employee Documents
INSERT INTO hr_employee_documents (employee_id, document_type_id, document_url, issue_date, expiry_date, status)
VALUES
  (1, 1, 'https://docs.company.com/id/alice.pdf', '2022-01-10', '2032-01-10', TRUE),
  (2, 2, 'https://docs.company.com/address/bob.pdf', '2021-03-20', '2031-03-20', TRUE);
