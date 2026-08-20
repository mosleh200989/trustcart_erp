# TrustCart ERP - Complete Setup Guide

## 📋 Quick Start

### Option 1: Docker Setup (Recommended)

```bash
# Clone the repository
cd trustcart_erp

# Copy environment variables
cp .env.example .env

# Start all services with Docker Compose
docker-compose up -d

# Services will be available at:
# - Frontend: http://localhost:5173
# - Backend: http://localhost:3000
# - API Docs: http://localhost:3000/api/docs
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### Option 2: Manual Setup

#### Prerequisites
- Node.js 16+ (LTS)
- npm or yarn
- PostgreSQL 12+
- Redis Server
- Git

#### Database Setup

1. **Create PostgreSQL Database**
```sql
CREATE DATABASE trustcart_erp;
CREATE USER trustcart_user WITH PASSWORD 'trustcart_secure_password';
ALTER ROLE trustcart_user SET client_encoding TO 'utf8';
ALTER ROLE trustcart_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE trustcart_user SET default_transaction_deferrable TO on;
ALTER ROLE trustcart_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE trustcart_erp TO trustcart_user;
```

2. **Load Database Schema**
```bash
psql -U trustcart_user -d trustcart_erp -f docs/trustcart-erp-schema.sql
```

#### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp ../.env.example .env

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev

# For production
npm run build
npm start
```

Backend will run on: `http://localhost:3000`

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF

# Start development server
npm run dev

# For production build
npm run build
npm start
```

Frontend will run on: `http://localhost:5173`

#### Redis Setup

**Windows:**
1. Download Redis from: https://github.com/microsoftarchive/redis/releases
2. Extract and run `redis-server.exe`

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

---

## 🗄️ Database Schema

The database includes 95+ tables across 18 modules:

### Core Modules
- **User Management**: users, roles, permissions
- **Customer Management**: customers, customer_contacts, customer_segments
- **Product Management**: products, categories, suppliers, batch_tracking
- **Sales Management**: sales_orders, sales_items, sales_team_assignments
- **E-Commerce**: ecommerce_orders, cart_items, product_reviews
- **Purchase Management**: purchase_orders, purchase_items, purchase_invoices
- **Inventory**: stock_levels, inventory_adjustments, warehouse
- **CRM**: leads, opportunities, activities, notes
- **Support**: support_tickets, ticket_comments, ticket_attachments
- **HR**: employees, departments, designations, attendance
- **Payroll**: payroll, salary_components, deductions
- **Accounting**: invoices, journal_entries, chart_of_accounts
- **Projects**: projects, project_tasks, project_time_logs
- **Tasks**: tasks, task_comments, task_dependencies
- **Configuration**: settings, company_info, email_templates
- **Reporting**: report_definitions, report_schedules
- **Audit**: audit_logs
- **Integrations**: integration_configs, webhook_logs

---

## 🔐 Environment Variables

Key environment variables to configure:

```env
# Application
NODE_ENV=development
APP_PORT=3000
FRONTEND_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trustcart_erp
DB_USER=trustcart_user
DB_PASSWORD=trustcart_secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRATION=24h

# Email Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASSWORD=your_app_password

# Payment Gateways
STRIPE_API_KEY=sk_test_...
BKASH_APP_KEY=...
```

---

## 📦 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/validate` - Validate JWT token
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - Logout user

### Users
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Customers
- `GET /customers` - Get all customers
- `GET /customers/:id` - Get customer details
- `POST /customers` - Create customer
- `PUT /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer

### Products
- `GET /products` - Get all products
- `GET /products/:id` - Get product details
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### Sales
- `GET /sales` - Get all sales orders
- `GET /sales/:id` - Get sales order
- `POST /sales` - Create sales order
- `PUT /sales/:id` - Update sales order

### And more for other modules...

See full API documentation at: `http://localhost:3000/api/docs`

---

## 🛠️ Development Workflow

### Backend Development

1. **Create a new module**
```bash
cd backend/src/modules
mkdir my_module
cd my_module
touch my_module.module.ts my_module.service.ts my_module.controller.ts
```

2. **Define entities**
```typescript
// src/entities/my_module.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('my_modules')
export class MyModule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;
}
```

3. **Create service**
```typescript
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MyModule } from '@/entities/my_module.entity';

@Injectable()
export class MyModuleService {
  constructor(
    @InjectRepository(MyModule)
    private repo: Repository<MyModule>,
  ) {}

  async findAll() {
    return this.repo.find();
  }
}
```

4. **Create controller**
```typescript
import { Controller, Get, Post, Body } from '@nestjs/common';
import { MyModuleService } from './my_module.service';

@Controller('my-module')
export class MyModuleController {
  constructor(private service: MyModuleService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }
}
```

5. **Register in module**
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MyModuleService } from './my_module.service';
import { MyModuleController } from './my_module.controller';
import { MyModule } from '@/entities/my_module.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MyModule])],
  controllers: [MyModuleController],
  providers: [MyModuleService],
  exports: [MyModuleService],
})
export class MyModuleModule {}
```

6. **Add to app.module.ts**
```typescript
import { MyModuleModule } from './modules/my_module/my_module.module';

@Module({
  imports: [
    // ... other imports
    MyModuleModule,
  ],
})
export class AppModule {}
```

### Frontend Development

1. **Create a new page**
```typescript
// src/pages/my-page.tsx
import React from 'react';

export default function MyPage() {
  return <div>My Page</div>;
}
```

2. **Create a new component**
```typescript
// src/components/MyComponent.tsx
import React from 'react';

interface MyComponentProps {
  title: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title }) => {
  return <div>{title}</div>;
};
```

3. **Use Zustand store**
```typescript
// src/stores/my_store.ts
import { create } from 'zustand';

interface MyStore {
  count: number;
  increment: () => void;
}

export const useMyStore = create<MyStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

4. **API calls**
```typescript
import apiClient from '@/services/api';

const fetchData = async () => {
  try {
    const response = await apiClient.get('/users');
    return response.data;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## 🐛 Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure database exists: `createdb trustcart_erp`

### Redis Connection Error
- Verify Redis is running: `redis-cli ping`
- Check host and port in `.env`

### Port Already in Use
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different ports
APP_PORT=3001 npm start
```

### Docker Issues
```bash
# Clear containers and volumes
docker-compose down -v

# Rebuild from scratch
docker-compose up --build
```

---

## 📚 Documentation Files

- `docs/trustcart-erp-schema.sql` - Database schema
- `docs/trustcart-database-architecture.md` - Architecture overview
- `docs/trustcart-database-documentation.md` - Detailed field documentation
- `docs/IMPLEMENTATION_GUIDE.md` - Setup instructions
- `docs/COMPLETE_ERP_DATABASE_SUMMARY.md` - Module summary

---

## 🚀 Deployment

### Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Run production containers
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📞 Support & Documentation

For detailed documentation, visit:
- Database Schema: `docs/trustcart-erp-schema.sql`
- API Docs: `http://localhost:3000/api/docs` (when running)
- Backend Setup: `backend/README.md`
- Frontend Setup: `frontend/README.md`

---

## 📄 License

© 2025 TrustCart. All rights reserved.

---

**Last Updated**: December 11, 2025
**Version**: 1.0.0
