-- Role-Based Access Control (RBAC) Migration
-- Implements 12 user roles with granular permissions for TrustCart ERP

-- 1. Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0, -- Higher number = more authority
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add columns if table already exists without them
ALTER TABLE roles ADD COLUMN IF NOT EXISTS slug VARCHAR(50) UNIQUE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  module VARCHAR(50) NOT NULL, -- e.g., 'products', 'sales', 'crm', 'inventory'
  action VARCHAR(50) NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'approve'
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

-- 3. Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 4. Create user_roles table (users can have multiple roles)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);

-- 5. Create user_permissions table (for custom permission overrides)
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT TRUE, -- TRUE = granted, FALSE = revoked
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER REFERENCES users(id),
  PRIMARY KEY (user_id, permission_id)
);

-- 6. Add role column to users table (primary role)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS primary_role_id INTEGER REFERENCES roles(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_primary_role ON users(primary_role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- 7. Insert 12 predefined roles (skip if already exists)
INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Super Admin', 'super-admin', 'Full system access. Owner/System Architect with complete control over all modules, settings, and configurations.', 1000, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Admin', 'admin', 'Operations admin with full operational control over Sales, CRM, Inventory, Purchase, Accounts. Can manage daily operations and approve most actions.', 900, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Sales Executive', 'sales-executive', 'CRM agent responsible for leads, customer management, sales pipeline, and sales order creation. No approval or pricing authority.', 500, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Inventory Manager', 'inventory-manager', 'Store keeper with full warehouse and stock control. Manages GRN, stock transfers, reconciliation, and generates stock reports.', 600, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Purchase Manager', 'purchase-manager', 'Procurement officer managing suppliers, purchase orders, quotations, and cost optimization. Requires approval for POs.', 600, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Accounts', 'accounts', 'Finance user handling invoices, payments, ledgers, bank reconciliation, and financial reports. No access to CRM/inventory editing.', 700, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Viewer', 'viewer', 'Read-only analyst access. Can view reports, dashboards, and summaries but cannot create/edit/delete any data.', 100, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('HR Manager', 'hr-manager', 'Human resources manager for employee profiles, attendance, payroll, leave approval, and performance evaluation.', 650, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Delivery Partner', 'delivery-partner', 'Logistics user for delivery management, route tracking, POD updates, and delivery status management. Limited to assigned deliveries only.', 300, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Brand Manager', 'brand-manager', 'Marketing module manager for campaigns, banners, coupons, ads tracking, and customer segmentation. No finance/inventory access.', 550, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Customer Account', 'customer-account', 'MLM member account with profile management, wallet/points view, order history, referral system, and support ticket creation.', 200, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Supplier Account', 'supplier-account', 'Supplier portal access for profile updates, PO management, invoice uploads, and payment tracking. Limited to supplier-specific data.', 250, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Recruiter', 'recruiter', 'HR Recruiter for job posting, applicant screening, interview scheduling, and candidate pipeline management. Cannot approve final hiring or salary.', 640, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Job Applicant', 'job-applicant', 'Candidate account for job applications, profile management, resume upload, interview tracking, and offer letter download. Limited to own data only.', 150, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

INSERT INTO roles (name, slug, description, priority, is_active) VALUES
('Sales Team Leader', 'sales-team-leader', 'CRM supervisor for lead assignment, team monitoring, escalation handling, and performance tracking. Cannot approve sales orders or edit prices/inventory.', 520, TRUE)
ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug, description = EXCLUDED.description, priority = EXCLUDED.priority, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP;

-- 8. Insert granular permissions (organized by module)

-- SYSTEM PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('View System Settings', 'view-system-settings', 'system', 'read', 'View system-wide configuration'),
('Manage System Settings', 'manage-system-settings', 'system', 'update', 'Edit tax, currency, brand settings, invoice templates'),
('Manage API Keys', 'manage-api-keys', 'system', 'update', 'Configure API keys and integrations'),
('View Audit Logs', 'view-audit-logs', 'system', 'read', 'View system audit logs'),
('Manage Backups', 'manage-backups', 'system', 'update', 'Backup and restore data')
ON CONFLICT (slug) DO NOTHING;

-- USER MANAGEMENT PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Create Users', 'create-users', 'users', 'create', 'Create new user accounts'),
('View Users', 'view-users', 'users', 'read', 'View user list and details'),
('Edit Users', 'edit-users', 'users', 'update', 'Edit user information'),
('Delete Users', 'delete-users', 'users', 'delete', 'Delete user accounts'),
('Assign Roles', 'assign-roles', 'users', 'update', 'Assign roles and permissions to users'),
('View Own Profile', 'view-own-profile', 'users', 'read', 'View own user profile'),
('Edit Own Profile', 'edit-own-profile', 'users', 'update', 'Edit own profile information')
ON CONFLICT (slug) DO NOTHING;

-- PRODUCT MANAGEMENT PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Create Products', 'create-products', 'products', 'create', 'Create new products'),
('View Products', 'view-products', 'products', 'read', 'View product list and details'),
('Edit Products', 'edit-products', 'products', 'update', 'Edit product information'),
('Delete Products', 'delete-products', 'products', 'delete', 'Delete products'),
('Manage Product Prices', 'manage-product-prices', 'products', 'update', 'Update product pricing'),
('Approve Price Changes', 'approve-price-changes', 'products', 'approve', 'Approve product price modifications'),
('Manage Categories', 'manage-categories', 'products', 'update', 'Create and edit product categories'),
('View Product Reports', 'view-product-reports', 'products', 'read', 'View product analytics and reports')
ON CONFLICT (slug) DO NOTHING;

-- INVENTORY PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Inventory', 'view-inventory', 'inventory', 'read', 'View stock levels and inventory'),
('Manage Stock', 'manage-stock', 'inventory', 'update', 'Update stock quantities'),
('Create GRN', 'create-grn', 'inventory', 'create', 'Create Goods Receive Notes'),
('Stock Transfer', 'stock-transfer', 'inventory', 'update', 'Transfer stock between warehouses'),
('Stock Adjustment', 'stock-adjustment', 'inventory', 'update', 'Create stock adjustment requests'),
('Approve Stock Adjustment', 'approve-stock-adjustment', 'inventory', 'approve', 'Approve stock adjustments'),
('Manage Warehouses', 'manage-warehouses', 'inventory', 'update', 'Create and edit warehouse settings'),
('View Stock Reports', 'view-stock-reports', 'inventory', 'read', 'View stock ledger and reports'),
('Batch Tracking', 'batch-tracking', 'inventory', 'read', 'View batch and expiry tracking')
ON CONFLICT (slug) DO NOTHING;
-- SALES PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Create Sales Orders', 'create-sales-orders', 'sales', 'create', 'Create sales orders and drafts'),
('View Sales Orders', 'view-sales-orders', 'sales', 'read', 'View sales order list and details'),
('Edit Sales Orders', 'edit-sales-orders', 'sales', 'update', 'Edit sales order information'),
('Delete Sales Orders', 'delete-sales-orders', 'sales', 'delete', 'Delete sales orders'),
('Approve Sales Orders', 'approve-sales-orders', 'sales', 'approve', 'Approve and finalize sales orders'),
('View Sales Reports', 'view-sales-reports', 'sales', 'read', 'View sales analytics and reports'),
('Manage Discounts', 'manage-discounts', 'sales', 'update', 'Apply discounts and offers'),
('Process Returns', 'process-returns', 'sales', 'update', 'Process sales returns and refunds')
ON CONFLICT (slug) DO NOTHING;
-- PURCHASE PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Create Purchase Orders', 'create-purchase-orders', 'purchase', 'create', 'Create purchase orders'),
('View Purchase Orders', 'view-purchase-orders', 'purchase', 'read', 'View purchase order list'),
('Edit Purchase Orders', 'edit-purchase-orders', 'purchase', 'update', 'Edit purchase orders'),
('Delete Purchase Orders', 'delete-purchase-orders', 'purchase', 'delete', 'Delete purchase orders'),
('Approve Purchase Orders', 'approve-purchase-orders', 'purchase', 'approve', 'Approve purchase orders'),
('Manage Suppliers', 'manage-suppliers', 'purchase', 'update', 'Create and edit supplier information'),
('View Supplier Bills', 'view-supplier-bills', 'purchase', 'read', 'View supplier bills and payments'),
('Manage Quotations', 'manage-quotations', 'purchase', 'update', 'Manage supplier quotations'),
('View Purchase Reports', 'view-purchase-reports', 'purchase', 'read', 'View purchase analytics')
ON CONFLICT (slug) DO NOTHING;

-- CRM PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Create Leads', 'create-leads', 'crm', 'create', 'Create new leads'),
('View Leads', 'view-leads', 'crm', 'read', 'View leads and pipeline'),
('Edit Leads', 'edit-leads', 'crm', 'update', 'Edit lead information'),
('Delete Leads', 'delete-leads', 'crm', 'delete', 'Delete leads'),
('Create Customers', 'create-customers', 'crm', 'create', 'Create customer accounts'),
('View Customers', 'view-customers', 'crm', 'read', 'View customer list and details'),
('Edit Customers', 'edit-customers', 'crm', 'update', 'Edit customer information'),
('Delete Customers', 'delete-customers', 'crm', 'delete', 'Delete customer accounts'),
('Manage Call Logs', 'manage-call-logs', 'crm', 'update', 'Create and edit call logs'),
('Manage Follow-ups', 'manage-follow-ups', 'crm', 'update', 'Schedule and manage follow-ups'),
('View CRM Reports', 'view-crm-reports', 'crm', 'read', 'View CRM analytics and reports')
ON CONFLICT (slug) DO NOTHING;

-- ACCOUNTS/FINANCE PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Create Invoices', 'create-invoices', 'accounts', 'create', 'Generate customer invoices'),
('View Invoices', 'view-invoices', 'accounts', 'read', 'View invoice list and details'),
('Edit Invoices', 'edit-invoices', 'accounts', 'update', 'Edit invoice information'),
('Manage Payments', 'manage-payments', 'accounts', 'update', 'Record payments and receipts'),
('View Ledgers', 'view-ledgers', 'accounts', 'read', 'View ledger entries'),
('Manage Ledgers', 'manage-ledgers', 'accounts', 'update', 'Create and edit ledger entries'),
('Bank Reconciliation', 'bank-reconciliation', 'accounts', 'update', 'Perform bank reconciliation'),
('View Financial Reports', 'view-financial-reports', 'accounts', 'read', 'View P&L, balance sheet, cash flow'),
('Manage Expenses', 'manage-expenses', 'accounts', 'update', 'Record and track expenses'),
('Process Refunds', 'process-refunds', 'accounts', 'update', 'Process customer refunds'),
('View Customer Dues', 'view-customer-dues', 'accounts', 'read', 'Track customer outstanding payments')
ON CONFLICT (slug) DO NOTHING;

-- HR PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Create Employees', 'create-employees', 'hr', 'create', 'Create employee profiles'),
('View Employees', 'view-employees', 'hr', 'read', 'View employee list and details'),
('Edit Employees', 'edit-employees', 'hr', 'update', 'Edit employee information'),
('Delete Employees', 'delete-employees', 'hr', 'delete', 'Delete employee records'),
('Manage Attendance', 'manage-attendance', 'hr', 'update', 'Record and edit attendance'),
('Approve Leave', 'approve-leave', 'hr', 'approve', 'Approve employee leave requests'),
('Process Payroll', 'process-payroll', 'hr', 'update', 'Process salary and payroll'),
('Generate Payslips', 'generate-payslips', 'hr', 'create', 'Generate employee payslips'),
('View HR Reports', 'view-hr-reports', 'hr', 'read', 'View HR analytics and reports'),
('Performance Evaluation', 'performance-evaluation', 'hr', 'update', 'Manage performance reviews')
ON CONFLICT (slug) DO NOTHING;

-- DELIVERY/LOGISTICS PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Assigned Deliveries', 'view-assigned-deliveries', 'delivery', 'read', 'View assigned delivery list'),
('Update Delivery Status', 'update-delivery-status', 'delivery', 'update', 'Update delivery status and POD'),
('Manage Delivery Routes', 'manage-delivery-routes', 'delivery', 'update', 'Manage delivery route planning'),
('View Delivery Reports', 'view-delivery-reports', 'delivery', 'read', 'View delivery analytics')
ON CONFLICT (slug) DO NOTHING;

-- MARKETING PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Create Campaigns', 'create-campaigns', 'marketing', 'create', 'Create marketing campaigns'),
('View Campaigns', 'view-campaigns', 'marketing', 'read', 'View campaign list and analytics'),
('Edit Campaigns', 'edit-campaigns', 'marketing', 'update', 'Edit campaign information'),
('Delete Campaigns', 'delete-campaigns', 'marketing', 'delete', 'Delete campaigns'),
('Manage Banners', 'manage-banners', 'marketing', 'update', 'Upload and manage banners/sliders'),
('Create Coupons', 'create-coupons', 'marketing', 'create', 'Create coupon codes'),
('View Marketing Reports', 'view-marketing-reports', 'marketing', 'read', 'View marketing analytics'),
('Customer Segmentation', 'customer-segmentation', 'marketing', 'read', 'View customer segments'),
('Send Broadcasts', 'send-broadcasts', 'marketing', 'create', 'Send SMS/Email broadcasts')
ON CONFLICT (slug) DO NOTHING;

-- MLM PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Own MLM Tree', 'view-own-mlm-tree', 'mlm', 'read', 'View own MLM team structure'),
('View Own Wallet', 'view-own-wallet', 'mlm', 'read', 'View wallet balance and points'),
('View Own Orders', 'view-own-orders', 'mlm', 'read', 'View own order history'),
('Create Support Tickets', 'create-support-tickets', 'mlm', 'create', 'Create support tickets'),
('Share Referral Link', 'share-referral-link', 'mlm', 'read', 'Access referral link and share'),
('View MLM Reports', 'view-mlm-reports', 'mlm', 'read', 'View MLM commission reports'),
('Manage MLM Settings', 'manage-mlm-settings', 'mlm', 'update', 'Configure MLM plans and commissions')
ON CONFLICT (slug) DO NOTHING;

-- RECRUITMENT MANAGEMENT PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Create Job Posts', 'create-job-posts', 'recruitment', 'create', 'Create and publish job postings'),
('View Job Posts', 'view-job-posts', 'recruitment', 'read', 'View all job postings'),
('Edit Job Posts', 'edit-job-posts', 'recruitment', 'update', 'Edit job posting details'),
('Close Job Posts', 'close-job-posts', 'recruitment', 'update', 'Close job postings'),
('Publish Unpublish Jobs', 'publish-unpublish-jobs', 'recruitment', 'update', 'Publish or unpublish job posts'),
('View Applicants', 'view-applicants', 'recruitment', 'read', 'View applicant list and details'),
('View Applicant CV', 'view-applicant-cv', 'recruitment', 'read', 'View and download applicant resumes'),
('Shortlist Applicants', 'shortlist-applicants', 'recruitment', 'update', 'Shortlist job applicants'),
('Reject Applicants', 'reject-applicants', 'recruitment', 'update', 'Reject job applicants'),
('Hold Applicants', 'hold-applicants', 'recruitment', 'update', 'Put applicants on hold'),
('Tag Applicants', 'tag-applicants', 'recruitment', 'update', 'Tag candidates as Hot/Average/Future'),
('Schedule Interviews', 'schedule-interviews', 'recruitment', 'create', 'Schedule online/offline interviews'),
('Update Interview Status', 'update-interview-status', 'recruitment', 'update', 'Update interview status and progress'),
('Add Interview Feedback', 'add-interview-feedback', 'recruitment', 'create', 'Add interview feedback and notes'),
('View Interview Feedback', 'view-interview-feedback', 'recruitment', 'read', 'View interview feedback'),
('Approve Final Hiring', 'approve-final-hiring', 'recruitment', 'approve', 'Approve final candidate hiring'),
('Approve Salary Offer', 'approve-salary-offer', 'recruitment', 'approve', 'Approve candidate salary offer'),
('View Recruitment Reports', 'view-recruitment-reports', 'recruitment', 'read', 'View recruitment analytics and reports'),
('Apply For Jobs', 'apply-for-jobs', 'recruitment', 'create', 'Apply for job openings'),
('View Own Applications', 'view-own-applications', 'recruitment', 'read', 'View own job applications'),
('Update Own Applicant Profile', 'update-own-applicant-profile', 'recruitment', 'update', 'Update own candidate profile'),
('Upload Resume', 'upload-resume', 'recruitment', 'create', 'Upload and update resume'),
('View Own Interview Status', 'view-own-interview-status', 'recruitment', 'read', 'Track own interview status'),
('Download Offer Letter', 'download-offer-letter', 'recruitment', 'read', 'Download offer letter if selected')
ON CONFLICT (slug) DO NOTHING;

-- SALES TEAM LEADER PERMISSIONS (Enhanced CRM)
INSERT INTO permissions (name, slug, module, action, description) VALUES
('Receive New Leads', 'receive-new-leads', 'crm', 'read', 'Receive and view new incoming leads'),
('Set Lead Priority', 'set-lead-priority', 'crm', 'update', 'Set lead priority Hot/Warm/Cold'),
('Assign Leads To Team', 'assign-leads-to-team', 'crm', 'update', 'Assign leads to sales executives'),
('Reassign Customers', 'reassign-customers', 'crm', 'update', 'Reassign customers between team members'),
('View Team Follow-ups', 'view-team-follow-ups', 'crm', 'read', 'View team member follow-up history'),
('Handle Escalations', 'handle-escalations', 'crm', 'update', 'Handle escalated customer issues'),
('View Team Performance', 'view-team-performance', 'crm', 'read', 'View team member performance metrics'),
('View Call Summary', 'view-call-summary', 'crm', 'read', 'Review team call summaries'),
('Flag Unresponsive Agents', 'flag-unresponsive-agents', 'crm', 'update', 'Flag unresponsive team members'),
('View Customer Behavior', 'view-customer-behavior', 'crm', 'read', 'View customer behavior analytics'),
('Tag Upsell Opportunities', 'tag-upsell-opportunities', 'crm', 'update', 'Tag customers for upsell opportunities'),
('Analyze Lost Deals', 'analyze-lost-deals', 'crm', 'read', 'Analyze lost deal reasons'),
('View Team Leader Dashboard', 'view-team-leader-dashboard', 'crm', 'read', 'Access team leader dashboard'),
('Monitor Missed Follow-ups', 'monitor-missed-follow-ups', 'crm', 'read', 'Monitor missed follow-up alerts')
ON CONFLICT (slug) DO NOTHING;

-- SUPPLIER PORTAL PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Own Supplier Profile', 'view-own-supplier-profile', 'supplier', 'read', 'View own supplier profile'),
('Edit Own Supplier Profile', 'edit-own-supplier-profile', 'supplier', 'update', 'Edit own company profile'),
('View Received POs', 'view-received-pos', 'supplier', 'read', 'View purchase orders received'),
('Update PO Status', 'update-po-status', 'supplier', 'update', 'Accept/reject POs and update delivery dates'),
('Upload Invoices', 'upload-invoices', 'supplier', 'create', 'Upload supplier invoices'),
('View Payment Status', 'view-payment-status', 'supplier', 'read', 'Track payment status'),
('Chat with Purchase Manager', 'chat-with-purchase-manager', 'supplier', 'create', 'Send messages to purchase team')
ON CONFLICT (slug) DO NOTHING;

-- DASHBOARD PERMISSIONS
INSERT INTO permissions (name, slug, module, action, description) VALUES
('View Dashboard', 'view-dashboard', 'dashboard', 'read', 'Access main dashboard'),
('View All Reports', 'view-all-reports', 'dashboard', 'read', 'View all report sections'),
('Export Reports', 'export-reports', 'dashboard', 'read', 'Export reports to Excel/PDF'),
('View Analytics', 'view-analytics', 'dashboard', 'read', 'View business analytics')
ON CONFLICT (slug) DO NOTHING;

-- Clear existing mappings to avoid conflicts
DELETE FROM role_permissions;

-- 9. Map permissions to roles

-- SUPER ADMIN (ALL PERMISSIONS)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'super-admin'),
  id
FROM permissions
ON CONFLICT DO NOTHING;
-- ADMIN (Operations control - most permissions except system-level)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'admin'),
  id
FROM permissions
WHERE slug NOT IN (
  'manage-api-keys',
  'manage-backups',
  'delete-users',
  'manage-system-settings'
)
ON CONFLICT DO NOTHING;

-- SALES EXECUTIVE
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'sales-executive'),
  id
FROM permissions
WHERE slug IN (
  'view-own-profile',
  'edit-own-profile',
  'view-products',
  'view-customers',
  'create-customers',
  'edit-customers',
  'create-leads',
  'view-leads',
  'edit-leads',
  'manage-call-logs',
  'manage-follow-ups',
  'view-crm-reports',
  'create-sales-orders',
  'view-sales-orders',
  'view-sales-reports',
  'view-mlm-reports',
  'view-dashboard'
)
ON CONFLICT DO NOTHING;

-- INVENTORY MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'inventory-manager'),
  id
FROM permissions
WHERE slug IN (
  'view-own-profile',
  'edit-own-profile',
  'view-products',
  'view-inventory',
  'manage-stock',
  'create-grn',
  'stock-transfer',
  'stock-adjustment',
  'manage-warehouses',
  'view-stock-reports',
  'batch-tracking',
  'view-dashboard'
)
ON CONFLICT DO NOTHING;

-- PURCHASE MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'purchase-manager'),
  id
FROM permissions
WHERE slug IN (
  'view-own-profile',
  'edit-own-profile',
  'view-products',
  'create-purchase-orders',
  'view-purchase-orders',
  'edit-purchase-orders',
  'manage-suppliers',
  'view-supplier-bills',
  'manage-quotations',
  'view-purchase-reports',
  'view-inventory',
  'view-stock-reports',
  'chat-with-purchase-manager',
  'view-dashboard'
)
ON CONFLICT DO NOTHING;

-- ACCOUNTS
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'accounts'),
  id
FROM permissions
WHERE slug IN (
  'view-own-profile',
  'edit-own-profile',
  'create-invoices',
  'view-invoices',
  'edit-invoices',
  'manage-payments',
  'view-ledgers',
  'manage-ledgers',
  'bank-reconciliation',
  'view-financial-reports',
  'manage-expenses',
  'process-refunds',
  'view-customer-dues',
  'view-sales-orders',
  'view-purchase-orders',
  'view-supplier-bills',
  'view-dashboard',
  'view-all-reports',
  'export-reports'
)
ON CONFLICT DO NOTHING;

-- VIEWER (Read-only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'viewer'),
  id
FROM permissions
WHERE action = 'read'
ON CONFLICT DO NOTHING;

-- HR MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'hr-manager'),
  id
FROM permissions
WHERE slug IN (
  'view-own-profile',
  'edit-own-profile',
  'create-employees',
  'view-employees',
  'edit-employees',
  'manage-attendance',
  'approve-leave',
  'process-payroll',
  'generate-payslips',
  'view-hr-reports',
  'performance-evaluation',
  'view-dashboard'
)
ON CONFLICT DO NOTHING;
-- DELIVERY PARTNER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'delivery-partner'),
  id
FROM permissions
WHERE slug IN (
  'view-own-profile',
  'edit-own-profile',
  'view-assigned-deliveries',
  'update-delivery-status',
  'manage-delivery-routes',
  'view-delivery-reports'
)
ON CONFLICT DO NOTHING;

-- BRAND MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'brand-manager'),
  id
FROM permissions
WHERE slug IN (
  'view-own-profile',
  'edit-own-profile',
  'view-products',
  'view-customers',
  'create-campaigns',
  'view-campaigns',
  'edit-campaigns',
  'delete-campaigns',
  'manage-banners',
  'create-coupons',
  'view-marketing-reports',
  'customer-segmentation',
  'send-broadcasts',
  'view-crm-reports',
  'view-sales-reports',
  'view-dashboard'
)
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'customer-account'),
  id
FROM permissions
WHERE slug IN (
  'view-own-profile',
  'edit-own-profile',
  'view-own-mlm-tree',
  'view-own-wallet',
  'view-own-orders',
  'create-support-tickets',
  'share-referral-link',
  'view-products'
)
ON CONFLICT DO NOTHING;

-- SUPPLIER ACCOUNT
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'supplier-account'),
  id
FROM permissions
WHERE slug IN (
  'view-own-supplier-profile',
  'edit-own-supplier-profile',
  'view-received-pos',
  'update-po-status',
  'upload-invoices',
  'view-payment-status',
  'chat-with-purchase-manager'
)
ON CONFLICT DO NOTHING;

-- RECRUITER (HR Recruiter)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'recruiter'),
  id
FROM permissions
WHERE slug IN (
  'view-own-profile',
  'edit-own-profile',
  'create-job-posts',
  'view-job-posts',
  'edit-job-posts',
  'close-job-posts',
  'publish-unpublish-jobs',
  'view-applicants',
  'view-applicant-cv',
  'shortlist-applicants',
  'reject-applicants',
  'hold-applicants',
  'tag-applicants',
  'schedule-interviews',
  'update-interview-status',
  'add-interview-feedback',
  'view-interview-feedback',
  'view-recruitment-reports',
  'view-employees',
  'view-hr-reports',
  'view-dashboard'
)
ON CONFLICT DO NOTHING;

-- JOB APPLICANT (Candidate Account)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'job-applicant'),
  id
FROM permissions
WHERE slug IN (
  'view-own-profile',
  'edit-own-profile',
  'view-job-posts',
  'apply-for-jobs',
  'view-own-applications',
  'update-own-applicant-profile',
  'upload-resume',
  'view-own-interview-status',
  'download-offer-letter'
)
ON CONFLICT DO NOTHING;

-- SALES TEAM LEADER (CRM Supervisor)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE slug = 'sales-team-leader'),
  id
FROM permissions
WHERE slug IN (
  'view-own-profile',
  'edit-own-profile',
  'view-products',
  'view-customers',
  'create-customers',
  'edit-customers',
  'create-leads',
  'view-leads',
  'edit-leads',
  'delete-leads',
  'receive-new-leads',
  'set-lead-priority',
  'assign-leads-to-team',
  'reassign-customers',
  'manage-call-logs',
  'manage-follow-ups',
  'view-team-follow-ups',
  'handle-escalations',
  'view-team-performance',
  'view-call-summary',
  'flag-unresponsive-agents',
  'view-customer-behavior',
  'tag-upsell-opportunities',
  'analyze-lost-deals',
  'view-team-leader-dashboard',
  'monitor-missed-follow-ups',
  'view-crm-reports',
  'view-sales-orders',
  'view-sales-reports',
  'view-mlm-reports',
  'view-dashboard',
  'view-all-reports'
)
ON CONFLICT DO NOTHING;

-- 10. Create activity log table for audit trail
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  role_slug VARCHAR(50),
  module VARCHAR(50),
  action VARCHAR(50),
  resource_type VARCHAR(50),
  resource_id INTEGER,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

-- Verify the RBAC setup
SELECT 'Total Roles:', COUNT(*) FROM roles;
SELECT 'Total Permissions:', COUNT(*) FROM permissions;
SELECT 'Total Role-Permission Mappings:', COUNT(*) FROM role_permissions;

-- Show role summary with permission counts
SELECT 
  r.name as role_name,
  r.priority,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name, r.priority
ORDER BY r.priority DESC;

-- Show permissions by module
SELECT 
  module,
  COUNT(*) as permission_count,
  STRING_AGG(DISTINCT action, ', ') as actions
FROM permissions
GROUP BY module
ORDER BY module;
