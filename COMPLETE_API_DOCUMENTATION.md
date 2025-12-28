# TrustCart ERP - Complete API Documentation

**Version:** 1.0.0  
**Last Updated:** December 24, 2025  
**Base URL:** `http://localhost:3001/api`

---

## Table of Contents

1. [Authentication Module](#authentication-module)
2. [Users Module](#users-module)
3. [Customers Module](#customers-module)
4. [Customer Data Management (CDM)](#customer-data-management-cdm)
5. [Products Module](#products-module)
6. [Sales Module](#sales-module)
7. [Order Management Module](#order-management-module)
8. [Purchase Module](#purchase-module)
9. [Inventory Module](#inventory-module)
10. [HR Module](#hr-module)
11. [Payroll Module](#payroll-module)
12. [Accounting Module](#accounting-module)
13. [Project Module](#project-module)
14. [Task Module](#task-module)
15. [CRM Module](#crm-module)
16. [CRM Automation Module](#crm-automation-module)
17. [Support Module](#support-module)
18. [Blog Module](#blog-module)
19. [Combo Deals Module](#combo-deals-module)
20. [Reviews Module](#reviews-module)
21. [Email Subscribers Module](#email-subscribers-module)
22. [Product Views Module](#product-views-module)
23. [RBAC Module](#rbac-module)
24. [Recruitment Module](#recruitment-module)
25. [Loyalty Program Module](#loyalty-program-module)
26. [Offers Module](#offers-module)

---

## Authentication Module

### Overview
Handles user authentication, registration, and token validation.

### Endpoints

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "admin@trustcart.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@trustcart.com",
    "role": "admin"
  }
}
```

#### POST /api/auth/register
Register a new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepass123",
  "phone": "01712345678"
}
```

#### POST /api/auth/validate
Validate an authentication token.

**Headers:**
```
Authorization: Bearer {token}
```

---

## Users Module

### Overview
Manages system users, their profiles, and permissions.

### Endpoints

#### GET /api/users
Get all users.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Admin User",
    "email": "admin@trustcart.com",
    "phone": "01712345678",
    "role": "admin",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

#### GET /api/users/:id
Get user by ID.

#### POST /api/users
Create a new user.

**Request:**
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "password123",
  "phone": "01712345678",
  "role": "staff"
}
```

#### PUT /api/users/:id
Update user information.

#### DELETE /api/users/:id
Delete a user.

---

## Customers Module

### Overview
Manages customer accounts, profiles, and addresses.

### Endpoints

#### GET /api/customers
Get all customers with pagination and filters.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `search` - Search by name, email, or phone

#### GET /api/customers/:id
Get customer details by ID.

#### POST /api/customers
Create a new customer.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "01712345678",
  "address": "123 Main St, Dhaka",
  "customer_type": "regular",
  "lifecycle_stage": "new"
}
```

#### PUT /api/customers/:id
Update customer information.

#### DELETE /api/customers/:id
Delete a customer.

### Customer Addresses

#### GET /api/customer-addresses
Get all addresses for authenticated customer.

#### GET /api/customer-addresses/:id
Get specific address.

#### POST /api/customer-addresses
Add new address.

**Request:**
```json
{
  "customer_id": 1,
  "label": "Home",
  "address_line_1": "House 12, Road 5",
  "address_line_2": "Dhanmondi",
  "city": "Dhaka",
  "state": "Dhaka",
  "postal_code": "1205",
  "country": "Bangladesh",
  "is_default": true
}
```

#### PUT /api/customer-addresses/:id
Update address.

#### PUT /api/customer-addresses/:id/set-default
Set address as default.

#### DELETE /api/customer-addresses/:id
Delete address.

---

## Customer Data Management (CDM)

### Overview
Advanced customer data management with 360-degree customer view, family tracking, interactions, behavior analytics, and AI recommendations.

### Customer 360 View

#### GET /api/cdm/customer360/:customerId
Get complete 360-degree view of a customer.

**Response:**
```json
{
  "customer": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "customer_type": "vip",
    "lifecycle_stage": "loyal",
    "temperature": "hot"
  },
  "family_members": [...],
  "interactions": [...],
  "recent_behaviors": [...],
  "purchase_history": [...],
  "loyalty_points": 1500,
  "ai_insights": {...}
}
```

#### GET /api/cdm/customer360
Get all customers with 360 view (paginated).

### Family Management

#### GET /api/cdm/family/:customerId
Get family members of a customer.

#### POST /api/cdm/family
Add family member.

**Request:**
```json
{
  "customer_id": 1,
  "name": "Jane Doe",
  "relationship": "spouse",
  "birth_date": "1990-05-15",
  "preferences": "Organic products, no dairy"
}
```

#### PUT /api/cdm/family/:id
Update family member.

#### DELETE /api/cdm/family/:id
Remove family member.

### Customer Interactions

#### GET /api/cdm/interactions/:customerId
Get all interactions for a customer.

#### POST /api/cdm/interactions
Log a new interaction.

**Request:**
```json
{
  "customer_id": 1,
  "interaction_type": "call",
  "channel": "phone",
  "subject": "Product inquiry",
  "notes": "Asked about organic rice availability",
  "sentiment": "positive",
  "performed_by": 5
}
```

#### GET /api/cdm/interactions/:customerId/stats
Get interaction statistics.

### Customer Behavior Analytics

#### POST /api/cdm/behavior
Track customer behavior.

**Request:**
```json
{
  "customer_id": 1,
  "action_type": "product_view",
  "product_id": 123,
  "session_id": "sess_abc123",
  "page_url": "/products/organic-rice",
  "time_spent": 45,
  "device_type": "mobile"
}
```

#### GET /api/cdm/behavior/:customerId
Get behavior history.

#### GET /api/cdm/behavior/:customerId/stats
Get behavior statistics.

#### GET /api/cdm/behavior/:customerId/most-viewed
Get most viewed products by customer.

### Cart Abandonment & Recovery

#### POST /api/cdm/dropoff
Track cart abandonment.

**Request:**
```json
{
  "customer_id": 1,
  "dropoff_stage": "checkout",
  "cart_value": 2500.00,
  "cart_items": [
    {
      "product_id": 123,
      "quantity": 2,
      "price": 1250.00
    }
  ],
  "reason": "high_delivery_charge"
}
```

#### GET /api/cdm/dropoff/:customerId
Get dropoff history.

#### PUT /api/cdm/dropoff/:dropoffId/recover
Mark dropoff as recovered.

#### GET /api/cdm/dropoff/stats/all
Get dropoff statistics and analytics.

### Event-Based Marketing

#### GET /api/cdm/events/birthdays
Get upcoming birthdays (next 30 days).

#### GET /api/cdm/events/anniversaries
Get upcoming anniversaries.

#### GET /api/cdm/events/today
Get all events happening today.

### AI-Powered Recommendations

#### GET /api/cdm/ai/recommendations
Get AI-powered customer recommendations (top priority customers).

#### GET /api/cdm/ai/top-priority
Get top priority customers for outreach.

#### GET /api/cdm/ai/recommendation/:customerId
Get personalized recommendations for a customer.

### Segmentation

#### GET /api/cdm/lifecycle/:stage
Get customers by lifecycle stage.

**Stages:** `new`, `active`, `at_risk`, `churned`, `loyal`, `vip`

#### GET /api/cdm/type/:type
Get customers by type.

**Types:** `regular`, `vip`, `wholesale`, `corporate`

#### GET /api/cdm/temperature/:temperature
Get customers by temperature score.

**Temperatures:** `hot`, `warm`, `cold`

#### GET /api/cdm/stats/dashboard
Get CDM dashboard statistics.

**Response:**
```json
{
  "total_customers": 5000,
  "new_this_month": 150,
  "hot_leads": 45,
  "at_risk_customers": 23,
  "average_lifetime_value": 15000.00,
  "churn_rate": 5.2,
  "engagement_score": 7.8
}
```

---

## Products Module

### Overview
Manages product catalog, categories, pricing, and inventory.

### Endpoints

#### GET /api/products
Get all products with filters.

**Query Parameters:**
- `category` - Filter by category
- `min_price` - Minimum price
- `max_price` - Maximum price
- `in_stock` - Only in-stock items (true/false)
- `search` - Search by name or SKU

#### GET /api/products/:id
Get product by ID.

#### GET /api/products/by-slug/:slug
Get product by slug.

#### GET /api/products/search
Search products.

**Query Parameters:**
- `q` - Search query (name, description, SKU)

**Response:**
```json
[
  {
    "id": 123,
    "name_en": "Organic Basmati Rice 5kg",
    "name_bn": "অর্গানিক বাসমতি চাল ৫ কেজি",
    "slug": "organic-basmati-rice-5kg",
    "sku": "RICE-001",
    "price": 650.00,
    "stock_quantity": 100,
    "category": "Rice & Grains",
    "image_url": "/uploads/products/rice-001.jpg"
  }
]
```

#### POST /api/products
Create a new product.

**Request:**
```json
{
  "name_en": "Organic Honey 500g",
  "name_bn": "অর্গানিক মধু ৫০০ গ্রাম",
  "slug": "organic-honey-500g",
  "sku": "HON-001",
  "category_id": 5,
  "price": 450.00,
  "cost_price": 300.00,
  "stock_quantity": 50,
  "description_en": "Pure organic honey from local beekeepers",
  "is_active": true,
  "is_featured": true
}
```

#### PUT /api/products/:id
Update product.

#### DELETE /api/products/:id
Delete product.

### Featured Products

#### GET /api/products/featured/deal-of-day
Get deal of the day.

#### GET /api/products/featured/popular
Get popular products.

#### GET /api/products/featured/new-arrivals
Get new arrivals.

#### GET /api/products/featured/featured
Get featured products.

#### GET /api/products/featured/suggested
Get suggested products.

#### GET /api/products/featured/recently-viewed
Get recently viewed products.

#### GET /api/products/related/:productId
Get related products.

### Categories

#### GET /api/products/categories
Get all product categories.

**Response:**
```json
[
  {
    "id": 1,
    "name_en": "Rice & Grains",
    "name_bn": "চাল ও শস্য",
    "slug": "rice-grains",
    "product_count": 45
  }
]
```

---

## Sales Module

### Overview
Manages sales orders, order processing, and customer purchases.

### Endpoints

#### GET /api/sales
Get all sales orders.

**Response:**
```json
[
  {
    "id": 1,
    "order_number": "SO-1735017600-001",
    "customer_id": 1,
    "customer_name": "Customer #1",
    "total_amount": 1850.00,
    "status": "pending",
    "order_date": "2025-12-22T06:00:00Z",
    "shipping_address": "House 12, Road 5, Dhanmondi, Dhaka-1205",
    "created_at": "2025-12-22T06:00:00Z"
  }
]
```

#### GET /api/sales/:id
Get order by ID.

#### GET /api/sales/:id/items
Get order items.

#### POST /api/sales
Create a new order.

**Request:**
```json
{
  "customer_id": 1,
  "items": [
    {
      "product_id": 123,
      "quantity": 2,
      "unit_price": 650.00
    }
  ],
  "shipping_address": "House 12, Road 5, Dhanmondi, Dhaka-1205",
  "notes": "Please deliver between 9-11 AM",
  "tracking": {
    "user_ip": "103.92.84.123",
    "geo_location": {
      "country": "Bangladesh",
      "city": "Dhaka"
    },
    "browser_info": "Chrome 120",
    "device_type": "mobile",
    "operating_system": "Android",
    "traffic_source": "facebook_ads",
    "utm_source": "facebook",
    "utm_medium": "cpc",
    "utm_campaign": "winter_sale_2025"
  }
}
```

#### PUT /api/sales/:id
Update order.

#### DELETE /api/sales/:id
Delete order.

---

## Order Management Module

### Overview
Advanced order management with product editing, status tracking, courier integration, activity logs, and tracking information.

### Order Items Management

#### GET /api/order-management/:orderId/items
Get all items in an order.

#### POST /api/order-management/:orderId/items
Add item to order.

**Request:**
```json
{
  "product_id": 123,
  "product_name": "Organic Basmati Rice 5kg",
  "quantity": 2,
  "unit_price": 650.00
}
```

#### PUT /api/order-management/items/:itemId
Update order item.

**Request:**
```json
{
  "quantity": 3,
  "unit_price": 650.00
}
```

#### DELETE /api/order-management/items/:itemId
Remove item from order.

### Order Status Management

#### POST /api/order-management/:orderId/approve
Approve an order.

**Request:**
```json
{
  "userId": 1,
  "userName": "Admin User",
  "ipAddress": "192.168.1.100"
}
```

#### POST /api/order-management/:orderId/hold
Put order on hold.

**Request:**
```json
{
  "userId": 1,
  "userName": "Admin User",
  "ipAddress": "192.168.1.100"
}
```

#### POST /api/order-management/:orderId/cancel
Cancel an order.

**Request:**
```json
{
  "reason": "customer_request",
  "userId": 1,
  "userName": "Admin User",
  "ipAddress": "192.168.1.100"
}
```

**Cancel Reasons:**
- `customer_request`
- `payment_failed`
- `fraud_suspected`
- `out_of_stock`
- `duplicate_order`

### Courier Integration

#### POST /api/order-management/:orderId/ship
Ship an order with courier.

**Request:**
```json
{
  "courierCompany": "Steadfast",
  "courierOrderId": "ST-2025-123456",
  "trackingId": "ST-2025-123456",
  "userId": 1,
  "userName": "Admin User",
  "ipAddress": "192.168.1.100"
}
```

**Courier Companies:**
- Sundarban
- Pathao
- Steadfast
- RedX
- PaperFly
- SA Paribahan
- Janani

#### POST /api/order-management/:orderId/courier-status
Update courier delivery status.

**Request:**
```json
{
  "status": "in_transit",
  "location": "Dhaka Distribution Center",
  "remarks": "Package in transit to delivery location",
  "userId": 1,
  "userName": "Admin User"
}
```

**Courier Statuses:**
- `picked` - Picked from warehouse
- `in_transit` - In transit
- `out_for_delivery` - Out for delivery
- `delivered` - Successfully delivered
- `failed` - Delivery failed
- `returned` - Returned to warehouse

#### GET /api/order-management/:orderId/courier-tracking
Get courier tracking history.

**Response:**
```json
[
  {
    "id": 1,
    "courier_company": "Steadfast",
    "tracking_id": "ST-2025-123456",
    "status": "picked",
    "location": "Dhaka Hub",
    "remarks": "Package picked up from warehouse",
    "updated_at": "2025-12-20T10:00:00Z"
  },
  {
    "id": 2,
    "status": "in_transit",
    "location": "Gazipur Distribution Center",
    "remarks": "Package in transit",
    "updated_at": "2025-12-21T14:30:00Z"
  }
]
```

### Order Notes Management

#### PUT /api/order-management/:orderId/notes
Update order notes.

**Request:**
```json
{
  "shipping_address": "Updated address",
  "courier_notes": "Handle with care",
  "rider_instructions": "Call 15 minutes before delivery",
  "internal_notes": "VIP customer - priority handling",
  "userId": 1,
  "userName": "Admin User"
}
```

### Activity Logs

#### GET /api/order-management/:orderId/activity-logs
Get complete activity log for an order.

**Response:**
```json
[
  {
    "id": 1,
    "action_type": "order_created",
    "action_description": "Order created by customer",
    "performed_by_name": "System",
    "ip_address": "103.92.84.123",
    "old_value": null,
    "new_value": {"status": "pending"},
    "created_at": "2025-12-20T10:00:00Z"
  },
  {
    "id": 2,
    "action_type": "approved",
    "action_description": "Order approved by admin",
    "performed_by": 1,
    "performed_by_name": "Admin User",
    "ip_address": "192.168.1.100",
    "old_value": {"status": "pending"},
    "new_value": {"status": "approved"},
    "created_at": "2025-12-20T11:30:00Z"
  }
]
```

### Order Details & Tracking

#### GET /api/order-management/:orderId/details
Get complete order details with all information.

**Response:**
```json
{
  "order": {
    "id": 1,
    "order_number": "SO-1735017600-001",
    "customer_id": 1,
    "status": "shipped",
    "total_amount": 1850.00,
    "shipping_address": "House 12, Road 5, Dhanmondi",
    "courier_company": "Steadfast",
    "tracking_id": "ST-2025-123456",
    "courier_status": "in_transit"
  },
  "items": [...],
  "tracking": {
    "user_ip": "103.92.84.123",
    "geo_location": {"country": "Bangladesh", "city": "Dhaka"},
    "browser_info": "Chrome 120",
    "device_type": "mobile",
    "traffic_source": "facebook_ads"
  },
  "courier_tracking": [...],
  "activity_logs": [...]
}
```

#### PUT /api/order-management/:orderId/tracking
Update order tracking information.

**Request:**
```json
{
  "user_ip": "103.92.84.123",
  "geo_location": {
    "country": "Bangladesh",
    "city": "Dhaka",
    "latitude": 23.8103,
    "longitude": 90.4125
  },
  "browser_info": "Chrome 120",
  "device_type": "mobile",
  "operating_system": "Android",
  "traffic_source": "google_ads",
  "referrer_url": "https://google.com",
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "organic_products"
}
```

---

## Purchase Module

### Overview
Manages purchase orders, supplier orders, and procurement.

### Endpoints

#### GET /api/purchase
Get all purchase orders.

#### GET /api/purchase/:id
Get purchase order by ID.

#### POST /api/purchase
Create purchase order.

#### PUT /api/purchase/:id
Update purchase order.

#### DELETE /api/purchase/:id
Delete purchase order.

---

## Inventory Module

### Overview
Manages product inventory, stock levels, and warehouse management.

### Endpoints

#### GET /api/inventory
Get all inventory items.

#### GET /api/inventory/:id
Get inventory item by ID.

#### POST /api/inventory
Create inventory record.

#### PUT /api/inventory/:id
Update inventory.

#### DELETE /api/inventory/:id
Delete inventory record.

---

## HR Module

### Overview
Manages human resources, employee records, and HR operations.

### Endpoints

#### GET /api/hr
Get all HR records.

#### GET /api/hr/:id
Get HR record by ID.

#### POST /api/hr
Create HR record.

#### PUT /api/hr/:id
Update HR record.

#### DELETE /api/hr/:id
Delete HR record.

---

## Payroll Module

### Overview
Manages employee payroll, salaries, and payment processing.

### Endpoints

#### GET /api/payroll
Get all payroll records.

#### GET /api/payroll/:id
Get payroll record by ID.

#### POST /api/payroll
Create payroll record.

#### PUT /api/payroll/:id
Update payroll record.

#### DELETE /api/payroll/:id
Delete payroll record.

---

## Accounting Module

### Overview
Manages financial accounting, ledgers, and financial records.

### Endpoints

#### GET /api/accounting
Get all accounting records.

#### GET /api/accounting/:id
Get accounting record by ID.

#### POST /api/accounting
Create accounting record.

#### PUT /api/accounting/:id
Update accounting record.

#### DELETE /api/accounting/:id
Delete accounting record.

---

## Project Module

### Overview
Manages projects, project tracking, and deliverables.

### Endpoints

#### GET /api/projects
Get all projects.

#### GET /api/projects/:id
Get project by ID.

#### POST /api/projects
Create project.

#### PUT /api/projects/:id
Update project.

#### DELETE /api/projects/:id
Delete project.

---

## Task Module

### Overview
Manages tasks, task assignments, and task tracking.

### Endpoints

#### GET /api/tasks
Get all tasks.

#### GET /api/tasks/:id
Get task by ID.

#### POST /api/tasks
Create task.

#### PUT /api/tasks/:id
Update task.

#### DELETE /api/tasks/:id
Delete task.

---

## CRM Module

### Overview
Customer Relationship Management with team management, lead tracking, and sales pipeline.

### Basic CRM Operations

#### GET /api/crm
Get all CRM records.

#### GET /api/crm/:id
Get CRM record by ID.

#### POST /api/crm
Create CRM record.

#### PUT /api/crm/:id
Update CRM record.

#### DELETE /api/crm/:id
Delete CRM record.

### Team Management

#### POST /api/crm/team/leads/:customerId/assign
Assign lead to agent.

**Request:**
```json
{
  "agent_id": 5,
  "priority": "high",
  "notes": "VIP customer, high value potential"
}
```

#### PUT /api/crm/team/leads/:customerId/reassign
Reassign lead to different agent.

#### PUT /api/crm/team/leads/:customerId/priority
Update lead priority.

**Request:**
```json
{
  "priority": "high"
}
```

**Priorities:** `low`, `medium`, `high`, `urgent`

#### GET /api/crm/team/leads
Get all leads with filters.

#### GET /api/crm/team/agent/:agentId/customers
Get customers assigned to an agent.

#### GET /api/crm/team/performance
Get team performance metrics.

#### GET /api/crm/team/escalations
Get escalated leads.

#### GET /api/crm/team/dashboard
Get team dashboard data.

#### GET /api/crm/team/lead-aging
Get leads by age.

#### GET /api/crm/team/missed-followups
Get missed follow-ups.

#### GET /api/crm/team/teams
Get all sales teams.

#### POST /api/crm/team/teams
Create sales team.

**Request:**
```json
{
  "team_name": "North Zone Sales",
  "team_leader_id": 10,
  "region": "Dhaka North",
  "target_monthly": 500000.00
}
```

#### POST /api/crm/team/teams/:teamId/assign-agent
Assign agent to team.

---

## CRM Automation Module

### Overview
Automated CRM operations with AI-powered recommendations, call task management, and marketing campaigns.

### Call Task Management

#### GET /api/crm/automation/tasks/today
Get today's call tasks.

#### PUT /api/crm/automation/tasks/:id/status
Update task status.

**Request:**
```json
{
  "status": "completed",
  "notes": "Customer confirmed order"
}
```

**Statuses:** `pending`, `completed`, `failed`, `rescheduled`

#### PUT /api/crm/automation/tasks/:id/assign
Assign task to agent.

#### POST /api/crm/automation/tasks/generate
Generate automated call tasks.

### Customer Intelligence

#### GET /api/crm/automation/intelligence/:customerId
Get AI-powered customer intelligence.

**Response:**
```json
{
  "customer_score": 85,
  "purchase_probability": 0.75,
  "recommended_products": [...],
  "best_contact_time": "10:00 AM - 12:00 PM",
  "communication_preference": "phone",
  "next_best_action": "Call with product recommendation"
}
```

#### GET /api/crm/automation/customers/hot
Get hot leads (high conversion probability).

#### GET /api/crm/automation/customers/warm
Get warm leads.

#### GET /api/crm/automation/customers/cold
Get cold leads.

### Product Recommendations

#### GET /api/crm/automation/recommendations/:customerId
Get personalized product recommendations.

#### GET /api/crm/automation/recommendation-rules
Get all recommendation rules.

#### POST /api/crm/automation/recommendation-rules
Create recommendation rule.

**Request:**
```json
{
  "rule_name": "Bundle Recommendation",
  "conditions": {
    "purchased_category": "Rice",
    "min_order_value": 1000
  },
  "recommendations": {
    "products": [123, 456],
    "discount": 10
  },
  "is_active": true
}
```

#### PUT /api/crm/automation/recommendation-rules/:id
Update recommendation rule.

#### DELETE /api/crm/automation/recommendation-rules/:id
Delete recommendation rule.

### Engagement Tracking

#### POST /api/crm/automation/engagement
Log customer engagement.

**Request:**
```json
{
  "customer_id": 1,
  "engagement_type": "email_opened",
  "campaign_id": 5,
  "engagement_date": "2025-12-20T10:30:00Z"
}
```

#### GET /api/crm/automation/engagement/:customerId
Get engagement history.

#### GET /api/crm/automation/engagement/:customerId/stats
Get engagement statistics.

### Marketing Campaigns

#### GET /api/crm/automation/campaigns
Get all campaigns.

#### GET /api/crm/automation/campaigns/active
Get active campaigns.

#### POST /api/crm/automation/campaigns
Create marketing campaign.

**Request:**
```json
{
  "campaign_name": "Winter Sale 2025",
  "campaign_type": "email",
  "target_segment": "all_customers",
  "start_date": "2025-12-25T00:00:00Z",
  "end_date": "2025-12-31T23:59:59Z",
  "message_template": "Dear {customer_name}, check out our winter sale!",
  "is_active": true
}
```

#### PUT /api/crm/automation/campaigns/:id
Update campaign.

#### PUT /api/crm/automation/campaigns/:id/toggle
Activate/deactivate campaign.

#### DELETE /api/crm/automation/campaigns/:id
Delete campaign.

#### GET /api/crm/automation/campaigns/:id/stats
Get campaign statistics.

### Agent Performance

#### GET /api/crm/automation/agent/performance
Get all agent performance metrics.

#### GET /api/crm/automation/agent/:id/dashboard
Get agent-specific dashboard.

#### GET /api/crm/automation/agent/:id/next-action
Get next recommended action for agent.

---

## Support Module

### Overview
Customer support ticket management system.

### Endpoints

#### GET /api/support
Get support tickets for authenticated customer.

#### GET /api/support/all
Get all support tickets (admin).

#### GET /api/support/:id
Get ticket by ID.

#### POST /api/support
Create new support ticket.

**Request:**
```json
{
  "customer_id": 1,
  "subject": "Order not received",
  "description": "I ordered 3 days ago but haven't received my package",
  "priority": "high",
  "category": "delivery_issue"
}
```

**Priorities:** `low`, `medium`, `high`, `urgent`  
**Categories:** `order_issue`, `delivery_issue`, `payment_issue`, `product_quality`, `general_inquiry`, `complaint`

#### PUT /api/support/:id
Update ticket.

#### DELETE /api/support/:id
Delete ticket.

#### PUT /api/support/:id/reply
Add reply to ticket.

**Request:**
```json
{
  "reply": "We apologize for the delay. Your package is on the way.",
  "replied_by": 5,
  "is_internal": false
}
```

#### PUT /api/support/:id/status
Update ticket status.

**Request:**
```json
{
  "status": "resolved"
}
```

**Statuses:** `open`, `in_progress`, `pending_customer`, `resolved`, `closed`

#### PUT /api/support/:id/priority
Update ticket priority.

#### PUT /api/support/:id/assign
Assign ticket to agent.

**Request:**
```json
{
  "assigned_to": 5
}
```

---

## Blog Module

### Overview
Content management for blog posts, categories, and tags.

### Blog Posts

#### GET /api/blog/posts
Get all blog posts.

**Query Parameters:**
- `category` - Filter by category slug
- `tag` - Filter by tag
- `status` - Filter by status (draft/published)
- `limit` - Number of posts (default: 10)

**Response:**
```json
[
  {
    "id": 1,
    "title_en": "10 Benefits of Organic Food",
    "title_bn": "অর্গানিক খাবারের ১০টি উপকারিতা",
    "slug": "10-benefits-of-organic-food",
    "excerpt_en": "Discover why organic food is better for your health",
    "author": "Admin User",
    "published_at": "2025-12-01T00:00:00Z",
    "featured_image": "/uploads/blog/organic-food.jpg",
    "category": {
      "name_en": "Health Tips",
      "slug": "health-tips"
    },
    "tags": ["organic", "health", "nutrition"]
  }
]
```

#### GET /api/blog/posts/slug/:slug
Get post by slug.

#### GET /api/blog/posts/category/:categorySlug
Get posts by category.

#### GET /api/blog/posts/tag/:tagSlug
Get posts by tag.

#### GET /api/blog/posts/:id/related
Get related posts.

### Blog Categories

#### GET /api/blog/categories
Get all blog categories.

**Response:**
```json
[
  {
    "id": 1,
    "name_en": "Health Tips",
    "name_bn": "স্বাস্থ্য টিপস",
    "slug": "health-tips",
    "post_count": 15
  }
]
```

### Blog Tags

#### GET /api/blog/tags
Get all blog tags.

---

## Combo Deals Module

### Overview
Manages product combo deals and bundle offers.

### Endpoints

#### GET /api/combos
Get all combo deals.

**Response:**
```json
[
  {
    "id": 1,
    "title_en": "Family Rice Pack",
    "title_bn": "পরিবার চাল প্যাক",
    "slug": "family-rice-pack",
    "description_en": "5kg Basmati + 5kg Premium Rice",
    "original_price": 1500.00,
    "combo_price": 1200.00,
    "discount_percentage": 20,
    "products": [
      {"product_id": 123, "quantity": 1},
      {"product_id": 124, "quantity": 1}
    ],
    "is_active": true
  }
]
```

#### GET /api/combos/:slug
Get combo by slug.

#### POST /api/combos
Create combo deal.

**Request:**
```json
{
  "title_en": "Breakfast Bundle",
  "title_bn": "সকালের নাস্তা বান্ডেল",
  "slug": "breakfast-bundle",
  "description_en": "Complete breakfast essentials",
  "products": [
    {"product_id": 10, "quantity": 1},
    {"product_id": 20, "quantity": 2},
    {"product_id": 30, "quantity": 1}
  ],
  "combo_price": 850.00,
  "valid_from": "2025-12-25T00:00:00Z",
  "valid_until": "2025-12-31T23:59:59Z",
  "is_active": true
}
```

#### PUT /api/combos/:id
Update combo deal.

#### DELETE /api/combos/:id
Delete combo deal.

---

## Reviews Module

### Overview
Manages product reviews and ratings.

### Endpoints

#### GET /api/reviews
Get all reviews.

#### GET /api/reviews/featured
Get featured reviews.

#### GET /api/reviews/product/:productId
Get reviews for a product.

**Response:**
```json
[
  {
    "id": 1,
    "customer_name": "John Doe",
    "product_id": 123,
    "product_name": "Organic Basmati Rice",
    "rating": 5,
    "review_text": "Excellent quality rice, very satisfied!",
    "is_verified_purchase": true,
    "created_at": "2025-12-20T10:00:00Z"
  }
]
```

#### POST /api/reviews
Create a review.

**Request:**
```json
{
  "customer_id": 1,
  "product_id": 123,
  "order_id": 456,
  "rating": 5,
  "review_text": "Great product, highly recommended!",
  "images": ["/uploads/reviews/img1.jpg"]
}
```

---

## Email Subscribers Module

### Overview
Manages newsletter subscriptions.

### Endpoints

#### GET /api/subscribers
Get all subscribers (admin).

#### POST /api/subscribers/subscribe
Subscribe to newsletter.

**Request:**
```json
{
  "email": "customer@example.com",
  "name": "John Doe"
}
```

#### POST /api/subscribers/unsubscribe
Unsubscribe from newsletter.

**Request:**
```json
{
  "email": "customer@example.com"
}
```

---

## Product Views Module

### Overview
Tracks product view history for analytics.

### Endpoints

#### POST /api/product-views/track
Track product view.

**Request:**
```json
{
  "product_id": 123,
  "customer_id": 1,
  "session_id": "sess_abc123"
}
```

#### GET /api/product-views/recent
Get recently viewed products.

---

## RBAC Module

### Overview
Role-Based Access Control for permissions and authorization.

### Roles

#### GET /api/rbac/roles
Get all roles.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Administrator",
    "slug": "admin",
    "description": "Full system access",
    "permissions": [...]
  }
]
```

#### GET /api/rbac/roles/:slug
Get role by slug.

### Permissions

#### GET /api/rbac/permissions
Get all permissions.

**Response:**
```json
[
  {
    "id": 1,
    "name": "View Products",
    "slug": "products.view",
    "module": "products"
  }
]
```

### User Role Management

#### GET /api/rbac/users/:userId/permissions
Get user's permissions.

#### GET /api/rbac/users/:userId/roles
Get user's roles.

#### GET /api/rbac/users/:userId/check/:permissionSlug
Check if user has specific permission.

#### POST /api/rbac/users/:userId/roles
Assign role to user.

**Request:**
```json
{
  "role_id": 2
}
```

#### DELETE /api/rbac/users/:userId/roles/:roleId
Remove role from user.

#### POST /api/rbac/users/:userId/permissions
Grant direct permission to user.

#### DELETE /api/rbac/users/:userId/permissions/:permissionId
Revoke permission from user.

### Activity Logs

#### GET /api/rbac/activity-logs
Get activity logs.

#### POST /api/rbac/activity-logs
Create activity log entry.

---

## Recruitment Module

### Overview
Job posting and application management system.

### Job Posts

#### GET /api/recruitment/jobs
Get all job posts (admin).

#### GET /api/recruitment/jobs/published
Get published job posts (public).

**Response:**
```json
[
  {
    "id": 1,
    "title": "Sales Executive",
    "slug": "sales-executive",
    "department": "Sales",
    "location": "Dhaka",
    "employment_type": "full_time",
    "experience_required": "2-3 years",
    "salary_range": "৳30,000 - ৳40,000",
    "description": "We are looking for experienced sales professionals...",
    "requirements": "Bachelor's degree, 2+ years experience...",
    "status": "published",
    "application_deadline": "2025-12-31T23:59:59Z",
    "published_at": "2025-12-01T00:00:00Z"
  }
]
```

#### GET /api/recruitment/jobs/:id
Get job post by ID.

#### GET /api/recruitment/jobs/slug/:slug
Get job post by slug.

#### POST /api/recruitment/jobs
Create job post.

**Request:**
```json
{
  "title": "Marketing Manager",
  "slug": "marketing-manager",
  "department": "Marketing",
  "location": "Dhaka",
  "employment_type": "full_time",
  "experience_required": "3-5 years",
  "salary_range": "৳50,000 - ৳70,000",
  "description": "Job description...",
  "requirements": "Requirements...",
  "responsibilities": "Responsibilities...",
  "benefits": "Benefits...",
  "application_deadline": "2025-12-31T23:59:59Z"
}
```

#### PUT /api/recruitment/jobs/:id
Update job post.

#### PUT /api/recruitment/jobs/:id/publish
Publish job post.

#### PUT /api/recruitment/jobs/:id/unpublish
Unpublish job post.

#### PUT /api/recruitment/jobs/:id/close
Close job post (stop accepting applications).

#### DELETE /api/recruitment/jobs/:id
Delete job post.

### Job Applications

#### POST /api/recruitment/jobs/:jobId/apply
Apply for a job.

**Request (multipart/form-data):**
```
name: John Doe
email: john@example.com
phone: 01712345678
cover_letter: I am interested in this position...
resume: [file upload]
portfolio_url: https://johndoe.com
expected_salary: 60000
available_from: 2025-01-01
```

#### GET /api/recruitment/applications
Get all applications (admin).

**Query Parameters:**
- `job_id` - Filter by job
- `status` - Filter by status
- `from_date` - Applications from date
- `to_date` - Applications until date

#### GET /api/recruitment/applications/my
Get my applications (applicant).

#### GET /api/recruitment/applications/:id
Get application by ID.

#### PUT /api/recruitment/applications/:id/shortlist
Shortlist an application.

#### PUT /api/recruitment/applications/:id/reject
Reject an application.

**Request:**
```json
{
  "rejection_reason": "Experience does not match requirements"
}
```

#### PUT /api/recruitment/applications/:id/hold
Put application on hold.

#### PUT /api/recruitment/applications/:id/tag
Add tags to application.

**Request:**
```json
{
  "tags": ["experienced", "good_communication"]
}
```

### Interview Management

#### POST /api/recruitment/applications/:applicationId/interviews
Schedule interview.

**Request:**
```json
{
  "interview_type": "phone",
  "scheduled_at": "2025-12-25T10:00:00Z",
  "interviewer_id": 5,
  "location": "Office - Conference Room A",
  "notes": "Initial screening call"
}
```

**Interview Types:** `phone`, `video`, `in_person`, `technical`

#### GET /api/recruitment/applications/:applicationId/interviews
Get interviews for application.

#### GET /api/recruitment/interviews/my
Get my scheduled interviews.

#### PUT /api/recruitment/interviews/:id/status
Update interview status.

**Request:**
```json
{
  "status": "completed"
}
```

**Statuses:** `scheduled`, `completed`, `cancelled`, `rescheduled`, `no_show`

#### PUT /api/recruitment/interviews/:id/feedback
Add interview feedback.

**Request:**
```json
{
  "feedback": "Strong candidate, good communication skills",
  "rating": 4,
  "recommendation": "proceed_to_next_round"
}
```

### Recruitment Reports

#### GET /api/recruitment/reports/stats
Get recruitment statistics.

**Response:**
```json
{
  "total_jobs": 15,
  "active_jobs": 8,
  "total_applications": 245,
  "applications_this_month": 45,
  "shortlisted": 30,
  "interviews_scheduled": 12,
  "offers_made": 5,
  "average_time_to_hire": 21
}
```

#### GET /api/recruitment/reports/job-wise
Get job-wise application statistics.

---

## Loyalty Program Module

### Overview
Customer loyalty program with membership tiers, loyalty points, referrals, and benefits.

### Membership Management

#### GET /api/loyalty/membership/:customerId
Get customer membership details.

**Response:**
```json
{
  "customer_id": 1,
  "tier": "gold",
  "points_balance": 1500,
  "lifetime_points": 5000,
  "tier_benefits": {
    "discount_percentage": 10,
    "free_delivery": true,
    "priority_support": true,
    "exclusive_deals": true
  },
  "joined_at": "2024-01-01T00:00:00Z",
  "tier_upgraded_at": "2024-06-15T00:00:00Z"
}
```

**Membership Tiers:**
- `bronze` - 0-999 points
- `silver` - 1000-2499 points
- `gold` - 2500-4999 points
- `platinum` - 5000+ points

#### GET /api/loyalty/memberships
Get all memberships (admin).

#### PUT /api/loyalty/membership/:customerId/tier
Update customer tier (admin).

**Request:**
```json
{
  "tier": "platinum"
}
```

### Loyalty Wallet

#### GET /api/loyalty/wallet/:customerId
Get loyalty wallet balance.

#### POST /api/loyalty/wallet/:customerId/credit
Add points to wallet.

**Request:**
```json
{
  "points": 100,
  "reason": "order_purchase",
  "reference_id": 123,
  "notes": "Points earned from order #123"
}
```

#### POST /api/loyalty/wallet/:customerId/debit
Deduct points from wallet.

**Request:**
```json
{
  "points": 50,
  "reason": "points_redeemed",
  "reference_id": 456,
  "notes": "Points used for discount on order #456"
}
```

#### GET /api/loyalty/wallet/:customerId/transactions
Get transaction history.

**Response:**
```json
[
  {
    "id": 1,
    "transaction_type": "credit",
    "points": 100,
    "balance_after": 1500,
    "reason": "order_purchase",
    "reference_id": 123,
    "created_at": "2025-12-20T10:00:00Z"
  }
]
```

### Referral Program

#### POST /api/loyalty/referral
Create referral.

**Request:**
```json
{
  "referrer_id": 1,
  "referred_customer_email": "friend@example.com",
  "referred_customer_name": "Friend Name",
  "referral_code": "REF123"
}
```

#### GET /api/loyalty/referrals/:customerId
Get customer's referrals.

#### PUT /api/loyalty/referral/:referralId/complete
Mark referral as completed (when referred customer makes first purchase).

#### GET /api/loyalty/referrals/:customerId/stats
Get referral statistics.

**Response:**
```json
{
  "total_referrals": 10,
  "completed_referrals": 7,
  "pending_referrals": 3,
  "points_earned": 700,
  "conversion_rate": 70
}
```

### Grocery Lists & Subscriptions

#### GET /api/loyalty/grocery-lists/:customerId
Get customer's grocery lists.

#### POST /api/loyalty/grocery-list
Create grocery list.

**Request:**
```json
{
  "customer_id": 1,
  "list_name": "Monthly Essentials",
  "is_recurring": true,
  "recurrence_frequency": "monthly"
}
```

#### GET /api/loyalty/grocery-list/:listId/items
Get items in list.

#### POST /api/loyalty/grocery-list/:listId/item
Add item to list.

**Request:**
```json
{
  "product_id": 123,
  "quantity": 2,
  "notes": "Prefer organic variety"
}
```

#### PUT /api/loyalty/grocery-list/item/:itemId
Update list item.

#### DELETE /api/loyalty/grocery-list/item/:itemId
Remove item from list.

#### PUT /api/loyalty/grocery-list/:listId/subscription
Set list as subscription.

**Request:**
```json
{
  "is_recurring": true,
  "recurrence_frequency": "weekly",
  "next_delivery_date": "2025-12-28T00:00:00Z",
  "is_active": true
}
```

**Recurrence Frequencies:** `weekly`, `biweekly`, `monthly`

#### GET /api/loyalty/subscriptions/due-today
Get subscriptions due for processing today.

### Price Lock Feature

#### POST /api/loyalty/price-lock
Lock product price for customer.

**Request:**
```json
{
  "customer_id": 1,
  "product_id": 123,
  "locked_price": 650.00,
  "lock_duration_days": 30
}
```

#### GET /api/loyalty/price-locks/:customerId
Get customer's price locks.

#### GET /api/loyalty/price-locks/:customerId/savings
Calculate total savings from price locks.

### Loyalty KPIs & Analytics

#### GET /api/loyalty/kpis
Get loyalty program KPIs.

**Response:**
```json
{
  "total_members": 5000,
  "active_members": 3500,
  "bronze_members": 2000,
  "silver_members": 1500,
  "gold_members": 800,
  "platinum_members": 200,
  "total_points_issued": 500000,
  "total_points_redeemed": 350000,
  "active_subscriptions": 450,
  "referral_conversion_rate": 65.5
}
```

#### GET /api/loyalty/benefits/:customerId
Get customer's available benefits.

#### GET /api/loyalty/dashboard
Get loyalty program dashboard.

---

## Offers Module

### Overview
Dynamic offer management system with conditions, rewards, and usage tracking.

### Offer Management

#### GET /api/offers
Get all offers.

**Response:**
```json
[
  {
    "id": 1,
    "title_en": "Winter Sale - 20% Off",
    "title_bn": "শীতকালীন বিক্রয় - ২০% ছাড়",
    "slug": "winter-sale-20-off",
    "offer_type": "percentage_discount",
    "discount_value": 20,
    "valid_from": "2025-12-25T00:00:00Z",
    "valid_until": "2025-12-31T23:59:59Z",
    "max_usage_per_customer": 3,
    "total_usage_limit": 1000,
    "min_purchase_amount": 1000,
    "is_active": true,
    "conditions": [...],
    "rewards": [...]
  }
]
```

**Offer Types:**
- `percentage_discount` - Percentage off
- `fixed_discount` - Fixed amount off
- `free_shipping` - Free delivery
- `buy_x_get_y` - BOGO offers
- `cashback` - Cashback offer

#### GET /api/offers/:id
Get offer by ID.

#### POST /api/offers
Create offer.

**Request:**
```json
{
  "title_en": "New Year Flash Sale",
  "title_bn": "নববর্ষ ফ্ল্যাশ সেল",
  "slug": "new-year-flash-sale",
  "description_en": "Limited time offer",
  "offer_type": "percentage_discount",
  "discount_value": 25,
  "valid_from": "2025-12-31T00:00:00Z",
  "valid_until": "2025-12-31T23:59:59Z",
  "min_purchase_amount": 2000,
  "max_discount_amount": 500,
  "max_usage_per_customer": 1,
  "total_usage_limit": 500,
  "conditions": [
    {
      "condition_type": "min_cart_value",
      "value": "2000"
    },
    {
      "condition_type": "category",
      "value": "5"
    }
  ],
  "is_active": true
}
```

#### PUT /api/offers/:id
Update offer.

#### DELETE /api/offers/:id
Delete offer.

#### GET /api/offers/:id/stats
Get offer statistics.

**Response:**
```json
{
  "offer_id": 1,
  "total_usage": 245,
  "unique_customers": 180,
  "total_discount_given": 45000,
  "total_revenue": 225000,
  "conversion_rate": 35.5
}
```

### Active Offers

#### GET /api/offers/active/list
Get currently active offers.

### Offer Evaluation

#### POST /api/offers/evaluate
Evaluate applicable offers for cart.

**Request:**
```json
{
  "customer_id": 1,
  "cart_items": [
    {
      "product_id": 123,
      "quantity": 2,
      "price": 650.00
    }
  ],
  "cart_total": 1300.00
}
```

**Response:**
```json
{
  "applicable_offers": [
    {
      "offer_id": 1,
      "title": "Winter Sale - 20% Off",
      "discount_amount": 260.00,
      "final_amount": 1040.00
    }
  ],
  "best_offer": {
    "offer_id": 1,
    "discount_amount": 260.00
  }
}
```

#### POST /api/offers/best
Get best offer for cart.

### Offer Usage Tracking

#### POST /api/offers/usage
Record offer usage.

**Request:**
```json
{
  "offer_id": 1,
  "customer_id": 1,
  "order_id": 456,
  "discount_amount": 260.00
}
```

---

## Data Models

### Common Field Patterns

Most entities include these standard fields:
- `id` - Primary key (auto-increment)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp (if applicable)
- `created_by` - User ID who created the record (if applicable)
- `updated_by` - User ID who last updated (if applicable)

### Naming Conventions

- **Database columns:** `snake_case` (e.g., `customer_name`, `order_date`)
- **TypeScript properties:** `camelCase` (e.g., `customerName`, `orderDate`)
- **API endpoints:** `kebab-case` (e.g., `/order-management`, `/customer-addresses`)

---

## Error Handling

### Standard Error Response

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Unprocessable Entity
- `500` - Internal Server Error

---

## Authentication & Authorization

### Bearer Token Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Role-Based Access

Different endpoints require different permission levels:
- **Public:** No authentication required
- **Customer:** Authenticated customer
- **Staff:** Employee/staff member
- **Admin:** Administrator access
- **Super Admin:** Full system access

---

## Pagination

### Standard Pagination Parameters

```
GET /api/customers?page=1&limit=20
```

### Pagination Response Format

```json
{
  "data": [...],
  "meta": {
    "total": 500,
    "page": 1,
    "limit": 20,
    "total_pages": 25
  }
}
```

---

## Filtering & Sorting

### Query Parameters

- `sort` - Sort field (prefix with `-` for descending)
- `filter[field]` - Filter by field value
- `search` - Search across multiple fields

**Example:**
```
GET /api/products?sort=-created_at&filter[category]=5&search=rice&min_price=500
```

---

## Webhooks

### Webhook Events

The system can send webhooks for the following events:
- `order.created`
- `order.updated`
- `order.cancelled`
- `payment.received`
- `shipment.dispatched`
- `shipment.delivered`

### Webhook Payload

```json
{
  "event": "order.created",
  "timestamp": "2025-12-20T10:00:00Z",
  "data": {
    "order_id": 123,
    "order_number": "SO-1735017600-001",
    "customer_id": 1,
    "total_amount": 1850.00
  }
}
```

---

## Rate Limiting

- **Default:** 100 requests per minute per IP
- **Authenticated:** 1000 requests per minute per user
- **Admin:** No rate limit

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1735017660
```

---

## Best Practices

### API Usage Guidelines

1. **Use appropriate HTTP methods**
   - GET for retrieving data
   - POST for creating resources
   - PUT for full updates
   - PATCH for partial updates (where supported)
   - DELETE for removing resources

2. **Handle errors gracefully**
   - Check status codes
   - Parse error messages
   - Implement retry logic for transient errors

3. **Optimize requests**
   - Use pagination for large datasets
   - Include only necessary fields
   - Cache responses where appropriate

4. **Security**
   - Never expose API tokens
   - Use HTTPS in production
   - Validate input data
   - Implement rate limiting

5. **Monitoring**
   - Log API requests
   - Track response times
   - Monitor error rates
   - Set up alerts for anomalies

---

## SDK & Client Libraries

### JavaScript/TypeScript Example

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Login
const login = async (email: string, password: string) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
};

// Get products
const getProducts = async () => {
  const response = await apiClient.get('/products');
  return response.data;
};

// Create order
const createOrder = async (orderData: any) => {
  const response = await apiClient.post('/sales', orderData);
  return response.data;
};
```

---

## Support & Contact

For API support and questions:
- **Email:** support@trustcart.com
- **Documentation:** http://localhost:3001/api/docs (Swagger)
- **GitHub:** [Repository URL]

---

## Changelog

### Version 1.0.0 (December 24, 2025)
- Initial API documentation
- All modules documented
- Complete endpoint reference
- Example requests and responses

---

**End of Documentation**
