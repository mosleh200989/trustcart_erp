# TrustCart ERP - Project Structure Guide

## 📁 Complete Directory Structure

```
trustcart_erp/
├── backend/                           # NestJS Backend API
│   ├── src/
│   │   ├── main.ts                    # Application entry point
│   │   ├── app.module.ts              # Root module with all imports
│   │   ├── config/
│   │   │   ├── database.config.ts     # TypeORM configuration
│   │   │   └── redis.config.ts        # Redis configuration
│   │   ├── modules/                   # Feature modules (14 total)
│   │   │   ├── auth/                  # Authentication & JWT
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.controller.ts
│   │   │   ├── users/                 # User management
│   │   │   ├── customers/             # Customer/CRM module
│   │   │   ├── products/              # Product catalog
│   │   │   ├── sales/                 # Sales orders & invoicing
│   │   │   ├── purchase/              # Purchase orders
│   │   │   ├── inventory/             # Stock management
│   │   │   ├── hr/                    # HR management
│   │   │   ├── payroll/               # Payroll processing
│   │   │   ├── accounting/            # Accounting & financials
│   │   │   ├── project/               # Project management
│   │   │   ├── task/                  # Task management
│   │   │   ├── crm/                   # CRM features
│   │   │   └── support/               # Support ticketing
│   │   ├── common/                    # Shared utilities
│   │   │   ├── decorators/            # Custom decorators
│   │   │   ├── guards/                # Auth guards
│   │   │   ├── interceptors/          # HTTP interceptors
│   │   │   ├── pipes/                 # Validation pipes
│   │   │   └── filters/               # Exception filters
│   │   └── utils/                     # Helper functions
│   ├── package.json                   # Backend dependencies
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── Dockerfile                     # Docker image for backend
│   ├── .dockerignore                  # Docker ignore rules
│   └── .env.example                   # Environment template
│
├── frontend/                          # React/Next.js Frontend
│   ├── src/
│   │   ├── pages/                     # Next.js pages/routes
│   │   │   ├── _app.tsx               # App wrapper
│   │   │   ├── _document.tsx          # Document template
│   │   │   ├── index.tsx              # Home page
│   │   │   ├── dashboard/
│   │   │   ├── customers/
│   │   │   ├── products/
│   │   │   ├── sales/
│   │   │   ├── inventory/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   ├── auth/
│   │   │   └── 404.tsx                # Not found page
│   │   ├── components/                # Reusable React components
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   ├── Footer/
│   │   │   ├── Table/
│   │   │   ├── Form/
│   │   │   ├── Modal/
│   │   │   ├── Card/
│   │   │   └── Loading/
│   │   ├── layouts/                   # Layout components
│   │   │   ├── MainLayout.tsx
│   │   │   ├── AuthLayout.tsx
│   │   │   └── AdminLayout.tsx
│   │   ├── stores/                    # Zustand state management
│   │   │   ├── auth.ts                # Auth state
│   │   │   ├── user.ts                # User state
│   │   │   ├── ui.ts                  # UI state
│   │   │   └── notification.ts        # Notifications state
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useFetch.ts
│   │   │   ├── useForm.ts
│   │   │   └── useNotification.ts
│   │   ├── services/                  # API service layer
│   │   │   ├── api.ts                 # Axios instance
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── customer.service.ts
│   │   │   ├── product.service.ts
│   │   │   └── ...other services
│   │   ├── utils/                     # Utility functions
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   ├── types/                     # TypeScript type definitions
│   │   │   ├── auth.ts
│   │   │   ├── user.ts
│   │   │   ├── customer.ts
│   │   │   ├── product.ts
│   │   │   └── common.ts
│   │   ├── constants/                 # Application constants
│   │   │   ├── api.ts
│   │   │   ├── routes.ts
│   │   │   └── messages.ts
│   │   └── styles/                    # Global styles
│   │       └── globals.css            # Tailwind + custom CSS
│   ├── public/                        # Static assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── favicon.ico
│   ├── package.json                   # Frontend dependencies
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── next.config.js                 # Next.js configuration
│   ├── tailwind.config.js             # Tailwind CSS config
│   ├── postcss.config.js              # PostCSS configuration
│   ├── Dockerfile                     # Docker image for frontend
│   ├── .dockerignore                  # Docker ignore rules
│   └── .env.example                   # Environment template
│
├── docker/                            # Docker & DevOps
│   ├── setup.sh                       # Docker setup script
│   ├── backup.sh                      # Database backup script
│   └── restore.sh                     # Database restore script
│
├── docs/                              # Documentation
│   ├── SETUP_GUIDE.md                 # Complete setup instructions
│   ├── trustcart-erp-schema.sql       # Complete database schema (2147 lines)
│   ├── trustcart-database-architecture.md      # Architecture overview
│   ├── trustcart-database-documentation.md     # Field documentation
│   ├── IMPLEMENTATION_GUIDE.md        # Implementation guide
│   └── COMPLETE_ERP_DATABASE_SUMMARY.md        # Module summary
│
├── .env.example                       # Environment variables template
├── .gitignore                         # Git ignore rules
├── README.md                          # Project overview
├── docker-compose.yml                 # Docker Compose orchestration
└── package.json                       # Root package.json (optional)
```

---

## 📋 Module Breakdown

### Backend Modules (14 total)

| Module | Purpose | Key Files | Tables |
|--------|---------|-----------|--------|
| **Auth** | JWT/OAuth2 authentication | auth.service.ts, auth.controller.ts | - |
| **Users** | User management | users.service.ts, users.entity.ts | users, roles, permissions |
| **Customers** | CRM & customer tracking | customers.service.ts | customers, contacts, segments |
| **Products** | Product catalog | products.service.ts | products, categories, batches |
| **Sales** | Sales orders & invoicing | sales.service.ts | sales_orders, sales_items |
| **Purchase** | Purchase management | purchase.service.ts | purchase_orders, suppliers |
| **Inventory** | Stock management | inventory.service.ts | stock_levels, adjustments |
| **HR** | Employee management | hr.service.ts | employees, departments, attendance |
| **Payroll** | Salary processing | payroll.service.ts | payroll, salary_components |
| **Accounting** | Financial management | accounting.service.ts | invoices, journal_entries |
| **Project** | Project tracking | project.service.ts | projects, project_tasks |
| **Task** | Task management | task.service.ts | tasks, task_comments |
| **CRM** | Customer relationship | crm.service.ts | leads, opportunities, activities |
| **Support** | Support ticketing | support.service.ts | support_tickets, comments |

---

## 🎨 Frontend Structure

### Pages (Route Structure)
- `/` - Home/Landing page
- `/dashboard` - Main dashboard
- `/customers` - Customer list & management
- `/products` - Product catalog
- `/sales` - Sales orders & invoicing
- `/inventory` - Stock management
- `/hr` - HR management
- `/payroll` - Payroll processing
- `/accounting` - Financial reports
- `/projects` - Project management
- `/tasks` - Task management
- `/reports` - Analytics & reporting
- `/settings` - Configuration
- `/auth/login` - Login page
- `/auth/register` - Registration page

### Component Hierarchy
```
App
├── Header
├── Sidebar
├── MainContent
│   ├── Dashboard
│   │   ├── SalesChart
│   │   ├── InventoryWidget
│   │   └── RevenueCard
│   ├── Table
│   │   ├── TableHeader
│   │   ├── TableBody
│   │   └── TableFooter
│   └── Form
│       ├── FormField
│       ├── FormSelect
│       └── FormButton
└── Footer
```

---

## 🗄️ Database Schema Overview

**Total Tables**: 95+
**Total Views**: 10+
**Total Triggers**: 15+
**Total Indexes**: 40+

### Core Entity Relationships

```
Users (roles, permissions)
  ↓
  ├─→ Customers (contacts, segments)
  │    ├─→ Sales Orders
  │    ├─→ ECommerce Orders
  │    └─→ CRM (leads, opportunities)
  │
  ├─→ Products (categories, batches)
  │    ├─→ Sales Items
  │    ├─→ Purchase Items
  │    └─→ Inventory
  │
  ├─→ Suppliers
  │    └─→ Purchase Orders
  │
  ├─→ Employees (departments, designations)
  │    ├─→ Payroll
  │    └─→ Attendance
  │
  ├─→ Projects
  │    └─→ Project Tasks
  │
  └─→ Chart of Accounts
       └─→ Journal Entries
```

---

## 🔧 Configuration Files

### Backend Config
```
backend/
├── tsconfig.json          # TypeScript settings
├── package.json           # Dependencies
├── .env                   # Environment variables
└── src/
    └── config/
        ├── database.config.ts
        ├── redis.config.ts
        └── app.config.ts
```

### Frontend Config
```
frontend/
├── tsconfig.json          # TypeScript settings
├── next.config.js         # Next.js configuration
├── tailwind.config.js     # Tailwind CSS
├── postcss.config.js      # PostCSS plugins
├── package.json           # Dependencies
└── .env.local             # Environment variables
```

### Docker Config
```
├── docker-compose.yml     # Services orchestration
├── .env                   # Docker environment
├── backend/Dockerfile     # Backend image
└── frontend/Dockerfile    # Frontend image
```

---

## 🚀 Service Dependencies

### Backend Services
```
Frontend (Port 5173)
    ↓
API Gateway / Load Balancer
    ↓
NestJS Backend (Port 3000)
    ├─→ PostgreSQL (Port 5432)
    ├─→ Redis (Port 6379)
    └─→ External APIs (Payment, SMS, etc.)
```

### Data Flow
```
Client Request
    ↓
Controller (HTTP handling)
    ↓
Service (Business logic)
    ↓
Repository (Data access)
    ↓
TypeORM Entities
    ↓
PostgreSQL Database
    ↓
Cache Layer (Redis)
```

---

## 🔐 Security Architecture

### Authentication Flow
```
User Login
    ↓
Validate Credentials
    ↓
Generate JWT Token
    ↓
Return Token to Client
    ↓
Client Stores Token (localStorage)
    ↓
Include Token in API Requests
    ↓
Backend Validates Token
    ↓
Grant/Deny Access
```

### Role-Based Access Control (RBAC)
```
Admin
├─→ All permissions

Supervisor
├─→ Manage team
├─→ Assign tasks
└─→ View reports

Executive
├─→ View customer data
├─→ Generate invoices
└─→ View own records

Customer
└─→ View own orders
```

---

## 📦 Module Dependencies

### Backend Module Imports
```
AppModule
├─→ ConfigModule (Global)
├─→ TypeOrmModule (Database)
├─→ RedisModule (Caching)
└─→ Feature Modules
    ├─→ AuthModule
    ├─→ UsersModule
    ├─→ CustomersModule
    ├─→ ProductsModule
    └─→ [10 more modules]
```

### Frontend Dependencies
```
App (_app.tsx)
├─→ Zustand Stores
├─→ React Query (Data fetching)
├─→ Axios (API client)
├─→ Next.js (Routing)
└─→ Tailwind CSS (Styling)
```

---

## 🔄 Development Workflow

### Creating a New Feature

#### Backend
1. Create entity in `src/entities/`
2. Create module folder in `src/modules/`
3. Create service for business logic
4. Create controller for HTTP handling
5. Create DTO for validation
6. Register module in `app.module.ts`
7. Create API documentation

#### Frontend
1. Create page in `src/pages/` or component in `src/components/`
2. Create API service in `src/services/`
3. Create Zustand store if needed
4. Create TypeScript types in `src/types/`
5. Add routing if new page
6. Add to navigation menu

---

## 📚 Key Technologies

### Backend Stack
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 12+
- **ORM**: TypeORM
- **Cache**: Redis
- **Authentication**: JWT + Passport.js
- **Real-time**: Socket.io
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator
- **Testing**: Jest

### Frontend Stack
- **Framework**: React 18+
- **Build**: Next.js
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Data Fetching**: React Query
- **Forms**: React Hook Form
- **Icons**: React Icons
- **Testing**: Jest + React Testing Library

---

## 🔍 File Naming Conventions

### Backend
- **Entities**: `*.entity.ts` (e.g., `user.entity.ts`)
- **Services**: `*.service.ts` (e.g., `user.service.ts`)
- **Controllers**: `*.controller.ts` (e.g., `user.controller.ts`)
- **Modules**: `*.module.ts` (e.g., `user.module.ts`)
- **DTOs**: `*.dto.ts` (e.g., `create-user.dto.ts`)
- **Guards**: `*.guard.ts` (e.g., `jwt.guard.ts`)
- **Interceptors**: `*.interceptor.ts`
- **Filters**: `*.filter.ts`

### Frontend
- **Pages**: PascalCase (e.g., `Dashboard.tsx`)
- **Components**: PascalCase (e.g., `UserCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.ts`)
- **Stores**: camelCase with Store suffix (e.g., `authStore.ts`)
- **Services**: camelCase with `.service` suffix (e.g., `user.service.ts`)
- **Types**: PascalCase (e.g., `User.ts`)
- **Utils**: camelCase (e.g., `formatters.ts`)

---

## ⚙️ Environment & Configuration

### Available Environments
- `development` - Local development with hot reload
- `staging` - Pre-production testing
- `production` - Live environment

### Configuration Priority
1. Environment variables (.env file)
2. Command-line arguments
3. Default values in code

---

## 📊 Monitoring & Logging

### Backend Logging
- Request/Response logging
- Error logging with stack traces
- Database query logging (in development)
- Performance metrics

### Frontend Logging
- Error tracking (Sentry optional)
- Analytics events
- User interactions
- Network requests

---

**Last Updated**: December 11, 2025
**Version**: 1.0.0
**Total Lines of Code**: 2500+
