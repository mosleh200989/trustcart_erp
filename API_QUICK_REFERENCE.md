# TrustCart ERP - API Quick Reference & Testing Guide

## 🚀 Quick Start Commands

```powershell
# Install dependencies
npm install

# Start development server
npm run start:dev

# Build for production
npm run build

# Start production server
npm start
```

## 📡 Testing Endpoints with PowerShell/curl

### 1. Users Module

```powershell
# Get all users
curl http://localhost:3000/users

# Get specific user
curl http://localhost:3000/users/1

# Create new user
curl -X POST http://localhost:3000/users `
  -H "Content-Type: application/json" `
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Update user
curl -X PUT http://localhost:3000/users/1 `
  -H "Content-Type: application/json" `
  -d '{
    "firstName": "Jane"
  }'

# Delete user
curl -X DELETE http://localhost:3000/users/1
```

### 2. Customers Module

```powershell
# Get all customers
curl http://localhost:3000/customers

# Create customer
curl -X POST http://localhost:3000/customers `
  -H "Content-Type: application/json" `
  -d '{
    "name": "ACME Corp",
    "email": "contact@acme.com",
    "phone": "+1-555-123-4567",
    "address": "123 Business St, City, State"
  }'
```

### 3. Products Module

```powershell
# Get all products
curl http://localhost:3000/products

# Create product
curl -X POST http://localhost:3000/products `
  -H "Content-Type: application/json" `
  -d '{
    "name": "Premium Widget",
    "description": "High-quality widget",
    "price": "99.99",
    "quantity": "100"
  }'
```

### 4. Sales Module

```powershell
# Get all sales orders
curl http://localhost:3000/sales

# Create sales order
curl -X POST http://localhost:3000/sales `
  -H "Content-Type: application/json" `
  -d '{
    "orderId": "ORD-001",
    "customerId": "CUST-001",
    "totalAmount": "2500.00",
    "status": "completed",
    "notes": "First order"
  }'
```

### 5. Other Modules (Purchase, Inventory, HR, Payroll, Accounting, Project, Task, CRM, Support)

```powershell
# All modules follow the same pattern:
# GET    /{moduleName}
# POST   /{moduleName}
# PUT    /{moduleName}/:id
# DELETE /{moduleName}/:id

# Examples:
curl http://localhost:3000/purchase
curl http://localhost:3000/inventory
curl http://localhost:3000/hr
curl http://localhost:3000/payroll
curl http://localhost:3000/accounting
curl http://localhost:3000/projects
curl http://localhost:3000/tasks
curl http://localhost:3000/crm
curl http://localhost:3000/support
```

## 🧪 Using Postman

### Import Collection

1. Open Postman
2. Click "Import"
3. Create requests for each endpoint following the pattern above

### Sample Request Structure

```json
{
  "method": "POST",
  "url": "http://localhost:3000/users",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }
}
```

## 🐍 Using Python Requests

```python
import requests

BASE_URL = "http://localhost:3000"

# Get all users
response = requests.get(f"{BASE_URL}/users")
print(response.json())

# Create user
data = {
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
}
response = requests.post(f"{BASE_URL}/users", json=data)
print(response.json())

# Update user
update_data = {"firstName": "Jane"}
response = requests.put(f"{BASE_URL}/users/1", json=update_data)
print(response.json())

# Delete user
response = requests.delete(f"{BASE_URL}/users/1")
print(response.status_code)
```

## 🔗 Using JavaScript/Node.js

```javascript
const BASE_URL = "http://localhost:3000";

// Get all users
fetch(`${BASE_URL}/users`)
  .then(res => res.json())
  .then(data => console.log(data));

// Create user
const newUser = {
  email: "user@example.com",
  password: "password123",
  firstName: "John",
  lastName: "Doe"
};

fetch(`${BASE_URL}/users`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(newUser)
})
  .then(res => res.json())
  .then(data => console.log(data));

// Update user
fetch(`${BASE_URL}/users/1`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ firstName: "Jane" })
})
  .then(res => res.json())
  .then(data => console.log(data));

// Delete user
fetch(`${BASE_URL}/users/1`, { method: "DELETE" })
  .then(res => console.log(res.status));
```

## 📊 Expected Response Format

### Success Response (200)
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### List Response (200)
```json
[
  {
    "id": "uuid-1",
    "email": "user1@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  {
    "id": "uuid-2",
    "email": "user2@example.com",
    "firstName": "Jane",
    "lastName": "Smith"
  }
]
```

### Error Response (400/500)
```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "BadRequest"
}
```

## 🔐 Authentication (Future)

Once authentication endpoints are implemented:

```powershell
# Login
$loginData = @{
  email = "user@example.com"
  password = "password123"
} | ConvertTo-Json

$response = curl -X POST http://localhost:3000/auth/login `
  -H "Content-Type: application/json" `
  -d $loginData

$token = $response.access_token

# Use token in subsequent requests
curl http://localhost:3000/users `
  -H "Authorization: Bearer $token"
```

## 🐛 Common Issues & Solutions

### Issue: Cannot connect to backend
- **Solution:** Ensure backend is running: `npm run start:dev`
- **Check port:** Backend should be on `http://localhost:3000`

### Issue: Database connection error
- **Solution:** Ensure PostgreSQL is running and credentials are correct in `.env`
- **Check:** `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

### Issue: Module not found errors
- **Solution:** Run `npm install` to install all dependencies

### Issue: CORS errors when calling from frontend
- **Solution:** Add CORS configuration to `app.module.ts` (to be added)

## 📝 Module Endpoints Summary

| Module | Endpoint | Status |
|--------|----------|--------|
| Users | `/users` | ✅ TypeORM |
| Customers | `/customers` | ✅ TypeORM |
| Products | `/products` | ✅ TypeORM |
| Sales | `/sales` | ✅ TypeORM |
| Purchase | `/purchase` | ✅ Mock |
| Inventory | `/inventory` | ✅ Mock |
| HR | `/hr` | ✅ Mock |
| Payroll | `/payroll` | ✅ Mock |
| Accounting | `/accounting` | ✅ Mock |
| Project | `/projects` | ✅ Mock |
| Task | `/tasks` | ✅ Mock |
| CRM | `/crm` | ✅ Mock |
| Support | `/support` | ✅ Mock |
| Auth | `/auth` | ⏳ Pending |

## 📖 Further Reading

- NestJS Documentation: https://docs.nestjs.com
- TypeORM Documentation: https://typeorm.io
- RESTful API Best Practices: https://restfulapi.net

---

**Ready for API testing!** Start the backend and begin making requests.
