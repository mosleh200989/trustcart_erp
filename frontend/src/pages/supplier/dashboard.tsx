import AdminLayout from '@/layouts/AdminLayout';

export default function SupplierAccountDashboard() {
  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Supplier Account Dashboard</h1>
        <p className="text-gray-600">
          This is a placeholder for the Supplier Account portal. Here you can later add
          views for purchase orders, invoices, and payment status.
        </p>
      </div>
    </AdminLayout>
  );
}
