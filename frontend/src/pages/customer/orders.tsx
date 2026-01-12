import { useEffect, useState } from 'react';
import CustomerLayout from '@/layouts/CustomerLayout';
import apiClient, { auth, sales } from '@/services/api';
import { FaEye, FaTimes, FaTruck } from 'react-icons/fa';

interface OrderItem {
  id: number;
  salesOrderNumber: string;
  customerId: number;
  totalAmount: number;
  status: string;
  orderDate: string;
  createdAt: string;
  notes?: string | null;
}

interface OrderProduct {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [orderProducts, setOrderProducts] = useState<OrderProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const getBestOrderDateTime = (order: Partial<OrderItem> | null | undefined): Date => {
    const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
    if (createdAt && !Number.isNaN(createdAt.getTime())) return createdAt;

    const orderDate = order?.orderDate ? new Date(order.orderDate) : null;
    if (orderDate && !Number.isNaN(orderDate.getTime())) return orderDate;

    return new Date(0);
  };

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = await auth.getCurrentUser();
        if (!user) {
          setError('Unable to load orders. Please login again.');
          setLoading(false);
          return;
        }

        const myOrders = await sales.my();
        setOrders(
          (myOrders as any[]).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ),
        );
      } catch (e) {
        console.error('Error loading orders:', e);
        setError('Failed to load order history.');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const handleViewDetails = async (order: OrderItem) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
    setLoadingProducts(true);
    setOrderProducts([]);

    try {
      const response = await apiClient.get(`/sales/${order.id}/items`);
      setOrderProducts(response.data);
    } catch (e) {
      console.error('Error loading order items:', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCancelOrder = async (order: OrderItem) => {
    if (!confirm(`Are you sure you want to cancel order ${order.salesOrderNumber}?`)) {
      return;
    }

    try {
      await sales.cancel(order.id.toString());
      setOrders(orders.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));
      alert('Order cancelled successfully');
    } catch (e) {
      console.error('Error cancelling order:', e);
      alert('Failed to cancel order');
    }
  };

  const handleTrackOrder = (order: OrderItem) => {
    alert(`Tracking order ${order.salesOrderNumber}\nStatus: ${order.status}\nThis feature will be enhanced with real-time tracking.`);
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <CustomerLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <p className="text-gray-600 text-sm">
          View your order history, track orders, and manage your purchases.
        </p>

        {loading && (
          <div className="text-gray-500 text-sm">Loading orders...</div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="bg-white border rounded-lg p-4 text-sm text-gray-500">
            You have no orders yet.
          </div>
        )}

        {!loading && orders.length > 0 && (
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Order Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-800 font-medium">#{o.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{o.salesOrderNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getBestOrderDateTime(o).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 font-semibold">
                        ৳{Number(o.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(o)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
                            title="View Details"
                          >
                            <FaEye /> View
                          </button>
                          <button
                            onClick={() => handleTrackOrder(o)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition"
                            title="Track Order"
                          >
                            <FaTruck /> Track
                          </button>
                          {o.status !== 'cancelled' && o.status !== 'delivered' && o.status !== 'completed' && (
                            <button
                              onClick={() => handleCancelOrder(o)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition"
                              title="Cancel Order"
                            >
                              <FaTimes /> Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Order Details Modal */}
        {showDetailsModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">Order Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Order ID</label>
                    <p className="text-gray-900">#{selectedOrder.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Order Number</label>
                    <p className="text-gray-900">{selectedOrder.salesOrderNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Order Date</label>
                    <p className="text-gray-900">
                      {getBestOrderDateTime(selectedOrder).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBadgeClass(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Total Amount</label>
                    <p className="text-2xl font-bold text-gray-900">
                      ৳{Number(selectedOrder.totalAmount || 0).toFixed(2)}
                    </p>
                  </div>
                  {selectedOrder.notes && (
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Delivery Information</label>
                      <p className="text-gray-900 whitespace-pre-line">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Ordered Products</h3>
                  {loadingProducts ? (
                    <div className="text-sm text-gray-500">Loading products...</div>
                  ) : orderProducts.length === 0 ? (
                    <div className="text-sm text-gray-500">No products found for this order</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Quantity</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Unit Price</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {orderProducts.map((item) => (
                            <tr key={item.id}>
                              <td className="px-4 py-2 text-sm text-gray-800">{item.productName || `Product #${item.productId}`}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">{Number(item.quantity).toFixed(0)}</td>
                              <td className="px-4 py-2 text-sm text-gray-600">৳{Number(item.unitPrice).toFixed(2)}</td>
                              <td className="px-4 py-2 text-sm text-gray-800 font-semibold">৳{Number(item.lineTotal || item.quantity * item.unitPrice).toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 font-semibold">
                            <td colSpan={3} className="px-4 py-2 text-sm text-right text-gray-800">Grand Total:</td>
                            <td className="px-4 py-2 text-sm text-gray-900">৳{Number(selectedOrder.totalAmount).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3">Order Timeline</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• Order placed on {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    {selectedOrder.status === 'processing' && <p>• Order is being processed</p>}
                    {selectedOrder.status === 'shipped' && <p>• Order has been shipped</p>}
                    {selectedOrder.status === 'delivered' && <p>• Order delivered successfully</p>}
                    {selectedOrder.status === 'cancelled' && <p>• Order was cancelled</p>}
                  </div>
                </div>
              </div>

              <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-2">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition"
                >
                  Close
                </button>
                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleTrackOrder(selectedOrder);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition"
                  >
                    Track Order
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}

