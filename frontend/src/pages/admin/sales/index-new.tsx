import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import Modal from '@/components/admin/Modal';
import FormInput from '@/components/admin/FormInput';
import { FaPlus, FaSearch } from 'react-icons/fa';
import apiClient from '@/services/api';

interface SalesOrder {
  id: number;
  order_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  order_date: string;
}

export default function AdminSales() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    order_number: '',
    customer_id: '',
    customer_name: '',
    total_amount: '',
    status: 'pending',
    order_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await apiClient.get('/sales');
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setOrders([]);
      setOrders([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setModalMode('add');
    setFormData({
      order_number: '',
      customer_id: '',
      customer_name: '',
      total_amount: '',
      status: 'pending',
      order_date: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleEdit = (order: SalesOrder) => {
    setModalMode('edit');
    setSelectedOrder(order);
    setFormData({
      order_number: order.order_number,
      customer_id: '',
      customer_name: order.customer_name,
      total_amount: order.total_amount.toString(),
      status: order.status,
      order_date: order.order_date
    });
    setIsModalOpen(true);
  };

  const handleView = (order: SalesOrder) => {
    setModalMode('view');
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleDelete = async (order: SalesOrder) => {
    if (!confirm(`Are you sure you want to delete order "${order.order_number}"?`)) return;

    try {
      await apiClient.delete(`/sales/${order.id}`);
      setOrders(orders.filter(o => o.id !== order.id));
      alert('Order deleted successfully');
    } catch (error) {
      alert('Failed to delete order');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (modalMode === 'add') {
        const response = await apiClient.post('/sales', formData);
        setOrders([...orders, response.data]);
        alert('Order added successfully');
      } else if (modalMode === 'edit' && selectedOrder) {
        const response = await apiClient.put(`/sales/${selectedOrder.id}`, formData);
        setOrders(orders.map(o => o.id === selectedOrder.id ? response.data : o));
        alert('Order updated successfully');
      }
      setIsModalOpen(false);
      loadOrders();
    } catch (error) {
      alert('Operation failed');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const filteredOrders = orders.filter(o =>
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'order_number', label: 'Order Number' },
    { key: 'customer_name', label: 'Customer' },
    { 
      key: 'total_amount', 
      label: 'Amount',
      render: (value: number) => `৳${value?.toFixed(2) || '0.00'}`
    },
    { key: 'order_date', label: 'Date' },
    { 
      key: 'status', 
      label: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          value === 'completed' ? 'bg-green-100 text-green-800' : 
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
          'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    }
  ];

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Sales Management</h1>
            <p className="text-gray-600 mt-1">Manage your sales orders</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
          >
            <FaPlus />
            Add New Order
          </button>
        </div>

        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders by number or customer..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginatedOrders}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalMode === 'add' ? 'Add New Order' : modalMode === 'edit' ? 'Edit Order' : 'View Order'}
          size="lg"
          footer={
            modalMode !== 'view' ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="order-form"
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md"
                >
                  {modalMode === 'add' ? 'Create' : 'Update'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            )
          }
        >
          {modalMode === 'view' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Order Number</label>
                <p className="mt-1 text-gray-900">{selectedOrder?.order_number}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <p className="mt-1 text-gray-900">{selectedOrder?.customer_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <p className="mt-1 text-gray-900">৳{selectedOrder?.total_amount.toFixed(2)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <p className="mt-1 text-gray-900">{selectedOrder?.order_date}</p>
              </div>
            </div>
          ) : (
            <form id="order-form" onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Order Number"
                name="order_number"
                value={formData.order_number}
                onChange={handleInputChange}
                required
              />
              <FormInput
                label="Customer Name"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleInputChange}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Total Amount"
                  name="total_amount"
                  type="number"
                  value={formData.total_amount}
                  onChange={handleInputChange}
                  required
                />
                <FormInput
                  label="Order Date"
                  name="order_date"
                  type="date"
                  value={formData.order_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <FormInput
                label="Status"
                name="status"
                type="select"
                value={formData.status}
                onChange={handleInputChange}
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' }
                ]}
              />
            </form>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
}
