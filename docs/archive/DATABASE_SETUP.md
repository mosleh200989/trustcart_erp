# PostgreSQL Database Setup for TrustCart ERP

## ⚠️ Current Error
The backend is running perfectly but cannot connect to PostgreSQL because the database user doesn't have login permissions.

Error: `role "trustcart_user" is not permitted to log in`

## ✅ Solution: Set up PostgreSQL Database

### Step 1: Start PostgreSQL
Make sure PostgreSQL is running on your system. For XAMPP:
- Open XAMPP Control Panel
- Click "Start" next to MySQL (or PostgreSQL if installed)

### Step 2: Create Database User with Login Rights

Open PostgreSQL command line and run:

```sql
-- Drop old user if exists
DROP ROLE IF EXISTS trustcart_user;

-- Create new user with LOGIN permission
CREATE ROLE trustcart_user WITH 
  LOGIN 
  PASSWORD 'trustcart_secure_password' 
  SUPERUSER 
  CREATEDB;

-- Create database
CREATE DATABASE trustcart_erp OWNER trustcart_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE trustcart_erp TO trustcart_user;
```

### Step 3: Verify Connection

Test the connection using psql:
```bash
psql -U trustcart_user -d trustcart_erp -h localhost
```

### Step 4: Load Database Schema (Optional)

If you want to pre-load the 95+ tables, run:
```bash
psql -U trustcart_user -d trustcart_erp -h localhost -f docs/trustcart-erp-schema.sql
```

## ✅ Using pgAdmin GUI (Easier)

1. Open pgAdmin in browser (usually http://localhost/pgadmin)
2. Create new server connection:
   - Host: localhost
   - Port: 5432
   - Username: postgres
   - Password: (your postgres password)

3. Right-click "Databases" → Create → Database
   - Database: trustcart_erp
   - Owner: trustcart_user

4. Right-click "Roles" → Create → Role
   - Name: trustcart_user
   - Password: trustcart_secure_password
   - Privileges: Check "Login", "Superuser", "Create database"

## 🔄 After Setup

Restart the backend and it will connect automatically:
```powershell
# Press Ctrl+C to stop backend, then:
npm run start:dev
```

You'll see:
```
[Nest] XXXX LOG [TypeOrmModule] Successfully connected to the database
```

## 📝 Connection Details

```
Host:     localhost
Port:     5432
Database: trustcart_erp
Username: trustcart_user
Password: trustcart_secure_password
```

## ✨ What Happens Next

Once connected, TypeORM will automatically:
1. Create database tables for entities (Users, Customers, Products, Sales)
2. Sync schema with entities
3. Make all 70+ endpoints fully functional

---

**Your backend is ready!** Just set up the database and you're good to go.
