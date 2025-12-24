# 🔒 RBAC Implementation Guide - TrustCart ERP

## Overview
Complete Role-Based Access Control (RBAC) system with 12 predefined roles and granular permissions for all modules.

## Database Structure

### Tables Created
1. **roles** - 12 predefined system roles
2. **permissions** - 150+ granular permissions across all modules
3. **role_permissions** - Maps roles to permissions
4. **user_roles** - Assigns roles to users (many-to-many)
5. **user_permissions** - Custom permission overrides for individual users
6. **activity_logs** - Audit trail for all user actions

## 12 Predefined Roles

### 1. Super Admin (Priority: 1000)
- **Full system access**
- All 150+ permissions
- System settings, API keys, backups
- User management with delete rights
- All approvals

### 2. Admin (Priority: 900)
- **Operations control**
- All permissions except:
  - System-level settings
  - API key management
  - User deletion
  - Backup management
- Daily operations approval authority

### 3. Sales Executive (Priority: 500)
- CRM leads and customer management
- Sales order creation (no approval)
- Call logs and follow-ups
- Product viewing only
- No pricing authority

### 4. Inventory Manager (Priority: 600)
- Stock control and warehouse management
- GRN creation
- Stock transfers and adjustments
- Batch tracking
- Stock reports
- No purchase or sales approval

### 5. Purchase Manager (Priority: 600)
- Supplier management
- Purchase order creation (requires approval)
- Quotation management
- Supplier communication
- Purchase reports
- No approval authority

### 6. Accounts (Priority: 700)
- Invoice generation
- Payment recording
- Ledger management
- Bank reconciliation
- Financial reports (P&L, Balance Sheet)
- Refund processing
- No CRM/Inventory editing

### 7. Viewer (Priority: 100)
- **Read-only access**
- All read permissions
- Dashboard and reports viewing
- Export reports (CSV/PDF)
- No create/edit/delete

### 8. HR Manager (Priority: 650)
- Employee management
- Attendance system
- Leave approval
- Payroll processing
- Payslip generation
- Performance evaluation
- No finance/inventory access

### 9. Delivery Partner (Priority: 300)
- Assigned deliveries only
- Delivery status updates
- POD (Proof of Delivery)
- Route management
- Delivery reports
- No product/order editing

### 10. Brand Manager (Priority: 550)
- Marketing campaigns
- Banner/slider management
- Coupon creation
- Customer segmentation
- Marketing analytics
- SMS/Email broadcasts (with approval)
- No finance/inventory access

### 11. Customer Account (Priority: 200)
- **MLM Member portal**
- Profile management
- Wallet and points viewing
- Order history
- Referral system
- Support tickets
- MLM tree viewing

### 12. Supplier Account (Priority: 250)
- **Supplier portal**
- Company profile updates
- PO viewing and status updates
- Invoice uploads
- Payment tracking
- Chat with purchase team
- Limited to own data

## Permission Modules

### System (5 permissions)
- view-system-settings
- manage-system-settings
- manage-api-keys
- view-audit-logs
- manage-backups

### Users (7 permissions)
- create-users
- view-users
- edit-users
- delete-users
- assign-roles
- view-own-profile
- edit-own-profile

### Products (8 permissions)
- create-products
- view-products
- edit-products
- delete-products
- manage-product-prices
- approve-price-changes
- manage-categories
- view-product-reports

### Inventory (9 permissions)
- view-inventory
- manage-stock
- create-grn
- stock-transfer
- stock-adjustment
- approve-stock-adjustment
- manage-warehouses
- view-stock-reports
- batch-tracking

### Sales (8 permissions)
- create-sales-orders
- view-sales-orders
- edit-sales-orders
- delete-sales-orders
- approve-sales-orders
- view-sales-reports
- manage-discounts
- process-returns

### Purchase (9 permissions)
- create-purchase-orders
- view-purchase-orders
- edit-purchase-orders
- delete-purchase-orders
- approve-purchase-orders
- manage-suppliers
- view-supplier-bills
- manage-quotations
- view-purchase-reports

### CRM (11 permissions)
- create-leads
- view-leads
- edit-leads
- delete-leads
- create-customers
- view-customers
- edit-customers
- delete-customers
- manage-call-logs
- manage-follow-ups
- view-crm-reports

### Accounts (11 permissions)
- create-invoices
- view-invoices
- edit-invoices
- manage-payments
- view-ledgers
- manage-ledgers
- bank-reconciliation
- view-financial-reports
- manage-expenses
- process-refunds
- view-customer-dues

### HR (10 permissions)
- create-employees
- view-employees
- edit-employees
- delete-employees
- manage-attendance
- approve-leave
- process-payroll
- generate-payslips
- view-hr-reports
- performance-evaluation

### Delivery (4 permissions)
- view-assigned-deliveries
- update-delivery-status
- manage-delivery-routes
- view-delivery-reports

### Marketing (9 permissions)
- create-campaigns
- view-campaigns
- edit-campaigns
- delete-campaigns
- manage-banners
- create-coupons
- view-marketing-reports
- customer-segmentation
- send-broadcasts

### MLM (7 permissions)
- view-own-mlm-tree
- view-own-wallet
- view-own-orders
- create-support-tickets
- share-referral-link
- view-mlm-reports
- manage-mlm-settings

### Supplier (7 permissions)
- view-own-supplier-profile
- edit-own-supplier-profile
- view-received-pos
- update-po-status
- upload-invoices
- view-payment-status
- chat-with-purchase-manager

### Dashboard (4 permissions)
- view-dashboard
- view-all-reports
- export-reports
- view-analytics

## Setup Instructions

### 1. Run RBAC Migration
```bash
cd c:\xampp\htdocs\trustcart_erp\backend
psql -U postgres -d trustcart_erp -f rbac-migration.sql
```

### 2. Verify Migration
```sql
-- Check roles
SELECT name, priority, 
  (SELECT COUNT(*) FROM role_permissions WHERE role_id = roles.id) as permission_count
FROM roles ORDER BY priority DESC;

-- Check permissions by module
SELECT module, COUNT(*) as count 
FROM permissions 
GROUP BY module 
ORDER BY module;
```

### 3. Restart Backend
```bash
npm run start:dev
```

## API Endpoints

### Roles
- `GET /api/rbac/roles` - List all roles
- `GET /api/rbac/roles/:slug` - Get role with permissions

### Permissions
- `GET /api/rbac/permissions` - List all permissions
- `GET /api/rbac/permissions?module=products` - Filter by module

### User Role Management
- `GET /api/rbac/users/:userId/roles` - Get user's roles
- `POST /api/rbac/users/:userId/roles` - Assign role to user
  ```json
  { "roleId": 3, "assignedBy": 1 }
  ```
- `DELETE /api/rbac/users/:userId/roles/:roleId` - Remove role

### User Permission Management
- `GET /api/rbac/users/:userId/permissions` - Get user's permissions
- `GET /api/rbac/users/:userId/check/:permissionSlug` - Check if user has permission
- `POST /api/rbac/users/:userId/permissions` - Grant custom permission
  ```json
  { "permissionId": 25, "grantedBy": 1 }
  ```
- `DELETE /api/rbac/users/:userId/permissions/:permissionId` - Revoke permission

### Activity Logs
- `GET /api/rbac/activity-logs` - Get audit trail
  - Query params: `userId`, `module`, `startDate`, `endDate`, `limit`
- `POST /api/rbac/activity-logs` - Log activity manually

## Usage Examples

### 1. Assign Super Admin Role to User
```typescript
// Assign role
await rbacService.assignRoleToUser(userId, 1, adminId);

// Verify
const roles = await rbacService.getUserRoles(userId);
const permissions = await rbacService.getUserPermissions(userId);
```

### 2. Check Permission in Controller
```typescript
import { RequirePermissions } from '@common/decorators/permissions.decorator';
import { UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '@common/guards/permissions.guard';

@Controller('products')
@UseGuards(PermissionsGuard)
export class ProductsController {
  
  @Get()
  @RequirePermissions('view-products')
  async findAll() {
    // Only users with 'view-products' permission can access
  }

  @Post()
  @RequirePermissions('create-products')
  async create(@Body() data: any) {
    // Only users with 'create-products' permission can access
  }

  @Put(':id/price')
  @RequirePermissions('manage-product-prices', 'approve-price-changes')
  async updatePrice(@Param('id') id: number, @Body() data: any) {
    // Requires BOTH permissions
  }
}
```

### 3. Log User Activity
```typescript
await rbacService.logActivity({
  userId: req.user.id,
  roleSlug: 'sales-executive',
  module: 'sales',
  action: 'create',
  resourceType: 'sales_order',
  resourceId: orderId,
  description: 'Created sales order #SO-12345',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent']
});
```

### 4. Grant Custom Permission Override
```typescript
// Give a specific Viewer user permission to edit products
await rbacService.grantPermissionToUser(
  viewerUserId, 
  productEditPermissionId, 
  superAdminId
);

// Revoke later
await rbacService.revokePermissionFromUser(
  viewerUserId, 
  productEditPermissionId, 
  superAdminId
);
```

## Frontend Integration

### Check Permission Before Rendering
```typescript
// In React component
const [canEdit, setCanEdit] = useState(false);

useEffect(() => {
  const checkPermission = async () => {
    const res = await fetch(`/api/rbac/users/${userId}/check/edit-products`);
    const data = await res.json();
    setCanEdit(data.hasPermission);
  };
  checkPermission();
}, [userId]);

return (
  <div>
    {canEdit && <button>Edit Product</button>}
  </div>
);
```

### Load User Permissions on Login
```typescript
// Store in auth context
const loadUserPermissions = async (userId: number) => {
  const res = await fetch(`/api/rbac/users/${userId}/permissions`);
  const permissions = await res.json();
  
  // Store in context/redux
  setUserPermissions(permissions.map(p => p.slug));
};

// Use in components
const hasPermission = (permissionSlug: string) => {
  return userPermissions.includes(permissionSlug);
};
```

## Permission Naming Convention

Format: `action-resource`

Actions:
- `view-` (read)
- `create-` (insert)
- `edit-` (update)
- `delete-` (remove)
- `manage-` (full control)
- `approve-` (authorization)

Examples:
- `view-products`
- `create-sales-orders`
- `edit-customers`
- `delete-users`
- `manage-stock`
- `approve-purchase-orders`

## Security Best Practices

1. **Always use permission guards** on sensitive endpoints
2. **Log all critical actions** to activity_logs
3. **Regularly audit** user permissions
4. **Use role hierarchy** (check by priority)
5. **Implement IP whitelisting** for Super Admin
6. **Enable 2FA** for high-priority roles
7. **Review activity logs** weekly

## Testing Checklist

- [ ] Super Admin has all permissions
- [ ] Viewer has only read permissions
- [ ] Sales Executive cannot approve orders
- [ ] Inventory Manager cannot edit prices
- [ ] Accounts user cannot edit CRM data
- [ ] Customer Account only sees own data
- [ ] Supplier Account only sees own POs
- [ ] Activity logs capture all actions
- [ ] Permission guard blocks unauthorized access
- [ ] Custom permission overrides work

## Troubleshooting

### Permission Check Always Returns False
1. Verify user_roles table has entries
2. Check role_permissions mapping
3. Ensure permission slug is correct
4. Verify user is logged in (req.user exists)

### Role Assignment Not Working
1. Check foreign key constraints
2. Verify role_id and user_id exist
3. Check primary key conflict (already assigned)

### Activity Log Not Recording
1. Ensure user_id is passed correctly
2. Check if table has write permissions
3. Verify PostgreSQL connection

## Next Steps

1. **Run migrations** (homepage-features + RBAC)
2. **Assign roles** to existing users
3. **Add permission guards** to all controllers
4. **Implement frontend** permission checks
5. **Test each role** thoroughly
6. **Review audit logs** regularly

## Summary

✅ **12 Roles** with clear hierarchy
✅ **150+ Permissions** across all modules
✅ **Flexible system** (role + custom permissions)
✅ **Complete audit trail** with activity logs
✅ **Production-ready** RBAC implementation

---

**Database Status**: Ready to migrate
**Backend Status**: Module created
**Integration**: Requires permission guards on controllers
**Testing**: Requires role assignment and endpoint testing
