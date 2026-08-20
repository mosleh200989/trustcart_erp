# Recruitment Management System - Implementation Guide

## Overview
Complete recruitment management system with 3 new roles:
- **Recruiter** (Priority: 640)
- **Job Applicant** (Priority: 150)  
- **Sales Team Leader** (Priority: 520)

## Backend Structure

### Entities Created
1. **JobPost** (`job-post.entity.ts`)
   - Job postings with full details
   - Status: draft, published, closed, archived
   - Supports: full-time, part-time, contract, internship, remote

2. **JobApplication** (`job-application.entity.ts`)
   - Application tracking
   - Status workflow: applied → reviewing → shortlisted → interview_scheduled → selected/rejected
   - Candidate tagging: hot, average, future

3. **Interview** (`interview.entity.ts`)
   - Interview scheduling and management
   - Types: online, offline, phone
   - Rating system and feedback

### Services & Controllers

**RecruitmentService** - 30+ methods:
- Job CRUD operations
- Application management
- Interview scheduling
- Statistics and reports

**CrmTeamService** - Team management:
- Lead assignment
- Team performance tracking
- Escalation handling

### API Endpoints

#### Job Posts
```
POST   /recruitment/jobs                    # Create job
GET    /recruitment/jobs                    # All jobs (recruiter)
GET    /recruitment/jobs/published          # Public jobs
GET    /recruitment/jobs/:id                # Single job
PUT    /recruitment/jobs/:id                # Update job
PUT    /recruitment/jobs/:id/publish        # Publish job
PUT    /recruitment/jobs/:id/unpublish      # Unpublish job
PUT    /recruitment/jobs/:id/close          # Close job
DELETE /recruitment/jobs/:id                # Delete job
```

#### Applications
```
POST   /recruitment/jobs/:jobId/apply       # Apply for job
GET    /recruitment/applications            # All applications (recruiter)
GET    /recruitment/applications/my         # My applications (applicant)
GET    /recruitment/applications/:id        # Application details
PUT    /recruitment/applications/:id/shortlist  # Shortlist
PUT    /recruitment/applications/:id/reject     # Reject
PUT    /recruitment/applications/:id/hold       # Hold
PUT    /recruitment/applications/:id/tag        # Tag candidate
```

#### Interviews
```
POST   /recruitment/applications/:id/interviews      # Schedule interview
GET    /recruitment/applications/:id/interviews      # Get interviews
GET    /recruitment/interviews/my                    # My interviews (applicant)
PUT    /recruitment/interviews/:id/status            # Update status
PUT    /recruitment/interviews/:id/feedback          # Add feedback
```

#### Reports
```
GET    /recruitment/reports/stats           # Overall stats
GET    /recruitment/reports/job-wise        # Job-wise analytics
```

#### CRM Team Management
```
POST   /crm/team/leads/:customerId/assign   # Assign lead
PUT    /crm/team/leads/:customerId/reassign # Reassign
PUT    /crm/team/leads/:customerId/priority # Set priority
GET    /crm/team/leads                      # Team leads
GET    /crm/team/performance                # Team performance
GET    /crm/team/escalations                # Escalated customers
GET    /crm/team/dashboard                  # Team leader dashboard
GET    /crm/team/missed-followups           # Missed follow-ups
```

## Frontend Pages

### Admin Pages

1. **Jobs Management** (`/admin/recruitment/jobs`)
   - Create/edit job posts
   - Publish/unpublish jobs
   - View applications count
   - Close positions

2. **Applications** (`/admin/recruitment/applications`)
   - View all applications
   - Filter by status
   - Shortlist/reject candidates
   - Tag candidates (hot/average/future)
   - View resumes and profiles

3. **Sales Team Dashboard** (`/admin/crm/team-dashboard`)
   - Lead overview
   - Priority breakdown
   - Team performance metrics
   - Recent escalations
   - Quick actions

### Public Pages

4. **Careers Page** (`/careers`)
   - Browse published jobs
   - Filter by category/location/type
   - View job details
   - Apply for positions

## Database Schema

### New Tables

**job_posts**
- Full job posting details
- Status tracking
- View/application counters

**job_applications**
- Application information
- Resume/cover letter URLs
- Status workflow
- Candidate tagging

**interviews**
- Interview scheduling
- Meeting details
- Ratings and feedback

### Modified Tables

**customers**
- `assigned_to` - Sales agent assignment
- `priority` - Lead priority (hot/warm/cold)
- `is_escalated` - Escalation flag
- `escalated_at` - Escalation timestamp

## Permissions

### Recruiter (21 permissions)
- Job management (create, view, edit, close, publish/unpublish)
- Applicant screening (view, shortlist, reject, hold, tag)
- Interview management (schedule, update status, feedback)
- Reports access

### Job Applicant (9 permissions)
- View published jobs
- Apply for jobs
- View own applications
- Upload resume
- Track interview status
- Download offer letter

### Sales Team Leader (34 permissions)
- Lead assignment and reassignment
- Set priorities
- View team performance
- Handle escalations
- Monitor follow-ups
- Access team dashboard
- View reports

## Deployment Steps

1. **Run RBAC Migration**
   ```bash
   psql -U postgres -d trustcart_erp -f backend/rbac-migration.sql
   ```

2. **Run Recruitment Migration**
   ```bash
   psql -U postgres -d trustcart_erp -f backend/recruitment-migration.sql
   ```

3. **Restart Backend**
   ```bash
   cd backend
   npm run start:dev
   ```

4. **Test Endpoints**
   ```bash
   # Get all roles (should show 15)
   curl http://localhost:3001/api/recruitment/jobs/published

   # Get published jobs
   curl http://localhost:3001/api/recruitment/jobs/published
   ```

5. **Access Frontend**
   - Admin: http://localhost:3000/admin/recruitment/jobs
   - Public: http://localhost:3000/careers

## Usage Examples

### Create Job Post (Recruiter)
```javascript
POST /recruitment/jobs
{
  "title": "Senior Developer",
  "description": "...",
  "requirements": "...",
  "category": "Engineering",
  "location": "Dhaka",
  "job_type": "full-time",
  "min_salary": 80000,
  "max_salary": 120000,
  "vacancies": 2
}
```

### Apply for Job (Applicant)
```javascript
POST /recruitment/jobs/123/apply
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "01712345678",
  "years_of_experience": 5,
  "expected_salary": 100000,
  "resume_url": "https://...",
  "skills": ["React", "Node.js"]
}
```

### Assign Lead (Sales Team Leader)
```javascript
POST /crm/team/leads/456/assign
{
  "agentId": 10
}
```

## Features Summary

✅ Complete job posting system
✅ Application tracking with status workflow
✅ Interview scheduling and feedback
✅ Resume/CV management
✅ Candidate tagging system
✅ CRM team hierarchy
✅ Lead assignment and tracking
✅ Team performance dashboard
✅ Escalation handling
✅ Permission-based access control
✅ Public careers page
✅ Admin recruitment portal
✅ Reports and analytics

## Next Steps

1. Add email notifications for:
   - Application received
   - Interview scheduled
   - Application status changes
   - Lead assignments

2. File upload functionality for resumes

3. Calendar integration for interviews

4. Advanced analytics and reporting

5. Applicant portal for profile management
