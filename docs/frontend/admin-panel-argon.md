# Admin Panel Implementation Guide - Argon Template Style

## Overview
This admin panel has been redesigned with **Argon Dashboard** template styling, featuring:
- ✅ Professional gradient-based UI (Blue theme)
- ✅ Reusable modal popups for CRUD operations
- ✅ Data tables with pagination
- ✅ Modern icons from React Icons
- ✅ Responsive design

## New Components Created

### 1. Modal Component (`/components/admin/Modal.tsx`)
Reusable modal dialog with animations.

**Features:**
- Backdrop with opacity animation
- Slide-up content animation
- ESC key and click-outside to close
- Size variants: `sm`, `md`, `lg`, `xl`
- Custom footer with action buttons

**Usage:**
```tsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Add New Product"
  size="lg"
  footer={
    <>
      <button onClick={() => setIsModalOpen(false)}>Cancel</button>
      <button type="submit" form="my-form">Save</button>
    </>
  }
>
  <form id="my-form">
    {/* Form content */}
  </form>
</Modal>
```

### 2. DataTable Component (`/components/admin/DataTable.tsx`)
Advanced table with pagination and actions.

**Features:**
- Column sorting and rendering
- View, Edit, Delete action buttons
- Loading skeleton
- Empty state
- Pagination controls (Previous/Next)
- Responsive design

**Usage:**
```tsx
const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { 
    key: 'price', 
    label: 'Price',
    render: (value) => `$${value.toFixed(2)}`
  }
];

<DataTable
  columns={columns}
  data={paginatedData}
  loading={loading}
  onView={handleView}
  onEdit={handleEdit}
  onDelete={handleDelete}
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={setCurrentPage}
/>
```

### 3. StatCard Component (`/components/admin/StatCard.tsx`)
Dashboard statistics cards with icons and trends.

**Features:**
- Gradient icon backgrounds
- Color variants: `blue`, `green`, `red`, `yellow`, `purple`, `indigo`
- Optional trend indicator (positive/negative)

**Usage:**
```tsx
<StatCard
  title="Total Products"
  value={250}
  icon={FaBoxes}
  color="blue"
  trend={{ value: '12% from last month', isPositive: true }}
/>
```

### 4. FormInput Component (`/components/admin/FormInput.tsx`)
Unified form input with multiple types.

**Features:**
- Input types: `text`, `email`, `number`, `password`, `date`
- Special types: `textarea`, `select`
- Built-in validation
- Error message display
- Required field indicator

**Usage:**
```tsx
<FormInput
  label="Product Name"
  name="name"
  value={formData.name}
  onChange={handleInputChange}
  required
/>

<FormInput
  label="Description"
  name="description"
  type="textarea"
  value={formData.description}
  onChange={handleInputChange}
  rows={4}
/>

<FormInput
  label="Category"
  name="category"
  type="select"
  value={formData.category}
  onChange={handleInputChange}
  options={[
    { value: '1', label: 'Electronics' },
    { value: '2', label: 'Clothing' }
  ]}
/>
```

## Updated AdminLayout

### Argon Styling Features:
- **Gradient Sidebar**: Blue gradient background (from-blue-600 to-blue-800)
- **Modern Icons**: React Icons instead of emojis
- **Active State**: Blue gradient with left border
- **Hover Effects**: Smooth transitions
- **Collapsible Sidebar**: Toggle button with icons
- **Notification Badge**: Red badge on bell icon
- **Gradient Header**: White to gray gradient
- **Gradient Buttons**: Blue/Red gradients with hover effects

### Navigation Menu:
All 15+ modules included:
- Dashboard
- Products
- Sales
- Customers
- Inventory
- Purchase
- HR
- Payroll
- Accounting
- Projects
- Tasks
- CRM
- Support
- Users
- Recruitment (with submenu)

## New Admin Pages Created

### 1. Products Module (`/admin/products/index-new.tsx`)
**Features:**
- ✅ Data table with pagination (10 items per page)
- ✅ Search by name, SKU
- ✅ Add/Edit/View modals
- ✅ Delete with confirmation
- ✅ Status badges (Active/Inactive)
- ✅ Price formatting

**Endpoints Used:**
- `GET /products` - List products
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### 2. Customers Module (`/admin/customers/index-new.tsx`)
**Features:**
- ✅ Customer database management
- ✅ Search by name, email, phone
- ✅ Full CRUD operations
- ✅ Address and city fields
- ✅ Status management

**Endpoints Used:**
- `GET /customers` - List customers
- `POST /customers` - Create customer
- `PUT /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer

### 3. Sales Module (`/admin/sales/index-new.tsx`)
**Features:**
- ✅ Order management
- ✅ Order status tracking (Pending/Completed/Cancelled)
- ✅ Amount calculation
- ✅ Date filtering
- ✅ Customer association

**Endpoints Used:**
- `GET /sales` - List orders
- `POST /sales` - Create order
- `PUT /sales/:id` - Update order
- `DELETE /sales/:id` - Delete order

### 4. Dashboard (`/admin/dashboard-new.tsx`)
**Features:**
- ✅ 6 stat cards with icons and trends
- ✅ Real-time data from API
- ✅ Recent orders section
- ✅ Top products section
- ✅ Responsive grid layout

## How to Use the New Pages

### Option 1: Rename Files (Recommended)
Replace old files with new ones:

```bash
# Backup old files
mv frontend/src/pages/admin/products/index.tsx frontend/src/pages/admin/products/index-old.tsx
mv frontend/src/pages/admin/customers/index.tsx frontend/src/pages/admin/customers/index-old.tsx
mv frontend/src/pages/admin/sales/index.tsx frontend/src/pages/admin/sales/index-old.tsx
mv frontend/src/pages/admin/dashboard.tsx frontend/src/pages/admin/dashboard-old.tsx

# Activate new files
mv frontend/src/pages/admin/products/index-new.tsx frontend/src/pages/admin/products/index.tsx
mv frontend/src/pages/admin/customers/index-new.tsx frontend/src/pages/admin/customers/index.tsx
mv frontend/src/pages/admin/sales/index-new.tsx frontend/src/pages/admin/sales/index.tsx
mv frontend/src/pages/admin/dashboard-new.tsx frontend/src/pages/admin/dashboard.tsx
```

### Option 2: Direct Access
Access new pages directly:
- Dashboard: `http://localhost:3000/admin/dashboard-new`
- Products: `http://localhost:3000/admin/products/index-new`
- Customers: `http://localhost:3000/admin/customers/index-new`
- Sales: `http://localhost:3000/admin/sales/index-new`

## Creating New Module Pages

Follow this template pattern for other modules:

```tsx
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/admin/Modal';
import FormInput from '@/components/admin/FormInput';
import { FaPlus, FaSearch } from 'react-icons/fa';
import apiClient from '@/services/api';

export default function AdminYourModule() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedItem, setSelectedItem] = useState(null);
  const itemsPerPage = 10;

  // Define your form structure
  const [formData, setFormData] = useState({
    field1: '',
    field2: '',
    // ... more fields
  });

  // Load data
  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await apiClient.get('/your-endpoint');
      setItems(response.data || []);
    } catch (error) {
      console.error('Failed to load:', error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // CRUD handlers
  const handleAdd = () => { /* ... */ };
  const handleEdit = (item) => { /* ... */ };
  const handleView = (item) => { /* ... */ };
  const handleDelete = async (item) => { /* ... */ };
  const handleSubmit = async (e) => { /* ... */ };

  // Define table columns
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    // ... more columns
  ];

  // Pagination
  const filteredItems = items.filter(/* search logic */);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Module Title</h1>
            <p className="text-gray-600 mt-1">Module description</p>
          </div>
          <button onClick={handleAdd} className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg">
            <FaPlus />
            Add New
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={paginatedItems}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'add' ? 'Add New' : modalMode === 'edit' ? 'Edit' : 'View'}
          size="lg"
          footer={/* buttons */}
        >
          {/* Form or view content */}
        </Modal>
      </div>
    </AdminLayout>
  );
}
```

## Remaining Modules to Implement

Using the same pattern, create pages for:

1. **Inventory** (`/admin/inventory/index.tsx`)
   - Stock management
   - Stock in/out tracking
   - Low stock alerts

2. **Purchase** (`/admin/purchase/index.tsx`)
   - Purchase orders
   - Supplier management
   - Payment tracking

3. **HR** (`/admin/hr/index.tsx`)
   - Employee records
   - Attendance tracking
   - Leave management

4. **Payroll** (`/admin/payroll/index.tsx`)
   - Salary processing
   - Payment history
   - Tax calculations

5. **Accounting** (`/admin/accounting/index.tsx`)
   - Accounts
   - Transactions
   - Financial reports

6. **Projects** (`/admin/projects/index.tsx`)
   - Project tracking
   - Milestones
   - Team assignments

7. **Tasks** (`/admin/tasks/index.tsx`)
   - Task management
   - Assignments
   - Status tracking

8. **Support** (`/admin/support/index.tsx`)
   - Ticket management
   - Customer queries
   - Resolution tracking

9. **Users** (`/admin/users/index.tsx`)
   - User management
   - Role assignments
   - Permissions

10. **Recruitment** (`/admin/recruitment/jobs/index.tsx`)
    - Job postings
    - Applications
    - Interview scheduling

## Color Scheme

### Primary Colors (Argon Blue):
- Sidebar: `from-blue-600 via-blue-700 to-blue-800`
- Active: `from-blue-500 to-blue-600`
- Buttons: `from-blue-500 to-blue-600`

### Accent Colors:
- Success/Green: `from-green-500 to-green-600`
- Danger/Red: `from-red-500 to-red-600`
- Warning/Yellow: `from-yellow-500 to-yellow-600`
- Info/Purple: `from-purple-500 to-purple-600`

## API Integration

All pages use the centralized `apiClient` from `/services/api.ts`:

```tsx
import apiClient from '@/services/api';

// GET
const response = await apiClient.get('/endpoint');

// POST
const response = await apiClient.post('/endpoint', data);

// PUT
const response = await apiClient.put('/endpoint/:id', data);

// DELETE
const response = await apiClient.delete('/endpoint/:id');
```

## Testing the Admin Panel

1. **Start Backend:**
```bash
cd backend
npm start
```

2. **Start Frontend:**
```bash
cd frontend
npm run dev
```

3. **Access Admin:**
- Login: `http://localhost:3000/admin/login`
- Dashboard: `http://localhost:3000/admin/dashboard-new`
- Products: `http://localhost:3000/admin/products/index-new`

## Next Steps

1. ✅ Core components created
2. ✅ AdminLayout updated with Argon styling
3. ✅ Sample pages created (Products, Customers, Sales, Dashboard)
4. ⏳ Implement remaining 10+ modules
5. ⏳ Add advanced features (filters, bulk actions, export)
6. ⏳ Add charts and analytics
7. ⏳ Add real-time notifications

## Support

For issues or questions:
1. Check backend API is running on `http://localhost:3001`
2. Check browser console for errors
3. Verify API endpoints match backend routes
4. Check network tab for API responses

---

**Ready to use!** Copy the template and customize for your modules.
