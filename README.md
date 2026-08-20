# TrustCart ERP - Organic Grocery E-Commerce & Business Management System

A comprehensive Enterprise Resource Planning (ERP) system designed for organic grocery businesses, combining e-commerce capabilities with complete business management.

## 🔧 Operations — start here

The two things you will need and will not remember:

| I want to... | Do this | Details |
| --- | --- | --- |
| **Pull a copy of the live database** | `powershell -ExecutionPolicy Bypass -File scripts\fetch-backup.ps1` | [docs/BACKUPS.md](docs/BACKUPS.md) |
| **Change the database schema** | `cd backend && npm run db:new -- <name>` then `npm run db:up` | [docs/MIGRATIONS.md](docs/MIGRATIONS.md) |

Backups run automatically on the VPS every night at **02:30 Dhaka time**, and
are kept for 14 days. They live on the same server as the database, so pulling a
copy down with `fetch-backup.ps1` is what protects you if that server is lost.

**Never** apply schema changes by hand or with a loose `.sql` file — migrations
are tracked in a ledger, and anything applied outside it goes unrecorded.
`npm run db:check` fails the moment a `.sql` file appears outside `db/migrations`.

## 📋 Project Structure

```
trustcart_erp/
├── backend/              # NestJS Backend API
├── frontend/             # React Frontend
├── docker/               # Docker & Docker Compose files
├── docs/                 # Documentation
├── .env.example          # Environment variables template
├── docker-compose.yml    # Docker Compose configuration
└── README.md             # This file
```

## 🔧 Technology Stack

### Backend
- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL 12+
- **Cache**: Redis
- **ORM**: Prisma / TypeORM
- **API**: RESTful + GraphQL ready

### Frontend
- **Framework**: React 18+
- **State Management**: Redux / Zustand
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

### Infrastructure
- **Container**: Docker & Docker Compose
- **Database**: PostgreSQL
- **Cache**: Redis

## 📦 Modules

### Core Modules
- ✅ User Management & Authentication
- ✅ Customer Management (CRM)
- ✅ Product Management & Inventory
- ✅ Sales & E-Commerce
- ✅ Purchase Management
- ✅ HR & Payroll
- ✅ Accounting & Financial
- ✅ Project Management
- ✅ Task Management
- ✅ Support & Ticketing

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn
- PostgreSQL 12+
- Redis
- Docker (optional)

### Backend Setup

```bash
cd backend
npm install
npm run build
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

### Docker Setup

```bash
docker-compose up
```

## 📖 Documentation

See the `docs/` folder for detailed documentation:
- Architecture
- API Documentation
- Database Schema
- Setup Instructions
- Development Guidelines

## 🔒 Environment Variables

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

## 📝 License

© 2025 TrustCart. All rights reserved.

## 👥 Team

- Development: Backend & Frontend Teams
- Database Architecture: Database Team
- DevOps: Infrastructure Team

## 📧 Support

For support and inquiries, contact the development team.

---

**Status**: 🚀 Development In Progress
**Last Updated**: December 11, 2025
