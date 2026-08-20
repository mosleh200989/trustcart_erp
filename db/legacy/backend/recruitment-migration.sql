-- =====================================================
-- RECRUITMENT MANAGEMENT SYSTEM - DATABASE MIGRATION
-- =====================================================
-- Creates job_posts, job_applications, interviews tables
-- Adds CRM team management columns to customers table
-- =====================================================

-- Job Posts Table
CREATE TABLE IF NOT EXISTS job_posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(250) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  responsibilities TEXT,
  category VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  location VARCHAR(100) NOT NULL,
  job_type VARCHAR(20) DEFAULT 'full-time',
  experience_level VARCHAR(20) DEFAULT 'mid',
  min_salary INTEGER,
  max_salary INTEGER,
  currency VARCHAR(20) DEFAULT 'BDT',
  vacancies INTEGER DEFAULT 1,
  deadline DATE,
  status VARCHAR(20) DEFAULT 'draft',
  required_skills TEXT[],
  benefits TEXT[],
  posted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  views_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job Applications Table
CREATE TABLE IF NOT EXISTS job_applications (
  id SERIAL PRIMARY KEY,
  job_post_id INTEGER REFERENCES job_posts(id) ON DELETE CASCADE,
  applicant_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  current_company VARCHAR(200),
  current_position VARCHAR(100),
  years_of_experience INTEGER DEFAULT 0,
  expected_salary DECIMAL(10, 2),
  resume_url VARCHAR(300),
  cover_letter_url VARCHAR(300),
  cover_letter_text TEXT,
  linkedin_url VARCHAR(300),
  portfolio_url VARCHAR(300),
  skills TEXT[],
  status VARCHAR(30) DEFAULT 'applied',
  tag VARCHAR(20),
  recruiter_notes TEXT,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interviews Table
CREATE TABLE IF NOT EXISTS interviews (
  id SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES job_applications(id) ON DELETE CASCADE,
  interview_type VARCHAR(20) DEFAULT 'offline',
  scheduled_date TIMESTAMP NOT NULL,
  scheduled_time VARCHAR(10),
  duration_minutes INTEGER DEFAULT 60,
  meeting_link VARCHAR(300),
  meeting_address VARCHAR(300),
  interview_notes TEXT,
  interviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'scheduled',
  feedback TEXT,
  technical_rating INTEGER,
  communication_rating INTEGER,
  cultural_fit_rating INTEGER,
  overall_rating INTEGER,
  recommend_for_hiring BOOLEAN DEFAULT FALSE,
  scheduled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add CRM Team Management columns to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS priority VARCHAR(20);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON job_posts(status);
CREATE INDEX IF NOT EXISTS idx_job_posts_slug ON job_posts(slug);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_post ON job_applications(job_post_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_interviews_application ON interviews(application_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customers_priority ON customers(priority);

-- Insert sample job posts
INSERT INTO job_posts (title, slug, description, requirements, responsibilities, category, department, location, job_type, experience_level, min_salary, max_salary, vacancies, status, required_skills, benefits) VALUES
(
  'Senior Full Stack Developer',
  'senior-full-stack-developer-' || FLOOR(RANDOM() * 10000),
  'We are looking for an experienced Full Stack Developer to join our development team. You will be responsible for building scalable web applications using modern technologies.',
  'Bachelor''s degree in Computer Science or related field, 5+ years of experience in full stack development, Strong knowledge of React, Node.js, and PostgreSQL, Experience with TypeScript and NestJS, Understanding of RESTful APIs and microservices',
  'Design and develop web applications, Write clean and maintainable code, Collaborate with cross-functional teams, Participate in code reviews, Mentor junior developers',
  'Engineering',
  'Software Development',
  'Dhaka, Bangladesh',
  'full-time',
  'senior',
  80000,
  120000,
  2,
  'published',
  ARRAY['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'NestJS'],
  ARRAY['Competitive salary', 'Health insurance', 'Flexible working hours', 'Remote work option', 'Learning budget']
),
(
  'Sales Executive',
  'sales-executive-' || FLOOR(RANDOM() * 10000),
  'Join our dynamic sales team as a Sales Executive. You will be responsible for generating leads, managing customer relationships, and achieving sales targets.',
  'Bachelor''s degree in Business or related field, 2+ years of sales experience, Excellent communication skills, Strong negotiation abilities, CRM software experience',
  'Generate and qualify leads, Conduct product demonstrations, Negotiate and close deals, Maintain customer relationships, Achieve monthly sales targets',
  'Sales',
  'Sales & Marketing',
  'Dhaka, Bangladesh',
  'full-time',
  'mid',
  35000,
  50000,
  3,
  'published',
  ARRAY['Sales', 'CRM', 'Communication', 'Negotiation', 'Customer Service'],
  ARRAY['Performance bonus', 'Health insurance', 'Career growth opportunities']
),
(
  'HR Recruiter',
  'hr-recruiter-' || FLOOR(RANDOM() * 10000),
  'We are seeking a passionate HR Recruiter to join our HR team. You will be responsible for end-to-end recruitment, from sourcing candidates to onboarding.',
  'Bachelor''s degree in HR or related field, 2+ years of recruitment experience, Strong understanding of recruitment processes, Excellent interpersonal skills, Experience with ATS systems',
  'Source and screen candidates, Conduct interviews and assessments, Coordinate with hiring managers, Manage job postings, Handle offer negotiations',
  'Human Resources',
  'HR',
  'Dhaka, Bangladesh',
  'full-time',
  'mid',
  40000,
  55000,
  1,
  'published',
  ARRAY['Recruitment', 'Interviewing', 'ATS', 'Communication', 'HR Management'],
  ARRAY['Competitive salary', 'Health insurance', 'Professional development']
);

-- Verification queries
SELECT 'Total Job Posts:', COUNT(*) FROM job_posts;
SELECT 'Published Jobs:', COUNT(*) FROM job_posts WHERE status = 'published';

SELECT 'Job Posts by Status:';
SELECT status, COUNT(*) as count FROM job_posts GROUP BY status;
