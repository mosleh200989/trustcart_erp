import { useState, useEffect } from 'react';
import apiClient from '@/services/api';
import { 
  FaTimes, FaEdit, FaTrash, FaPlus, FaSave, FaCheck, FaPause, FaBan, 
  FaShippingFast, FaMapMarkerAlt, FaStickyNote, FaHistory, FaGlobe, 
  FaMobile, FaDesktop, FaChrome, FaExclamationTriangle 
} from 'react-icons/fa';

interface OrderDetailsModalProps {
  orderId: number;
  onClose: () => void;
  onUpdate: () => void;
}

export default function AdminOrderDetailsModal({ orderId, onClose, onUpdate }: OrderDetailsModalProps) {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [courierTracking, setCourierTracking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');
  
  // Edit states
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editItemData, setEditItemData] = useState<any>({});
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ productId: '', productName: '', quantity: 1, unitPrice: 0 });
  
  // Notes
  const [shippingAddress, setShippingAddress] = useState('');
  const [courierNotes, setCourierNotes] = useState('');
  const [riderInstructions, setRiderInstructions] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  
  // Courier
  const [showShipModal, setShowShipModal] = useState(false);
  const [courierData, setCourierData] = useState({ courierCompany: '', courierOrderId: '', trackingId: '' });
  
  // Cancel
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadOrderDetails();
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/order-management/${orderId}/details`);
      const data = response.data;
      
      setOrder(data);
      setItems(data.items || []);
      setActivityLogs(data.activityLogs || []);
      setCourierTracking(data.courierTracking || []);
      
      setShippingAddress(data.shippingAddress || '');
      setCourierNotes(data.courierNotes || '');
      setRiderInstructions(data.riderInstructions || '');
      setInternalNotes(data.internalNotes || '');
    } catch (error) {
      console.error('Error loading order details:', error);
      alert('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  // ==================== ITEM MANAGEMENT ====================
  
  const startEditItem = (item: any) => {
    setEditingItem(item.id);
    setEditItemData({ quantity: item.quantity, unitPrice: item.unitPrice });
  };

  const saveEditItem = async (itemId: number) => {
    try {
      await apiClient.put(`/order-management/items/${itemId}`, editItemData);
      alert('Item updated successfully');
      loadOrderDetails();
      setEditingItem(null);
      onUpdate();
    } catch (error) {
      alert('Failed to update item');
    }
  };

  const deleteItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await apiClient.delete(`/order-management/items/${itemId}`);
      alert('Item deleted successfully');
      loadOrderDetails();
      onUpdate();
    } catch (error) {
      alert('Failed to delete item');
    }
  };

  const addNewProduct = async () => {
    if (!newProduct.productName || newProduct.quantity < 1 || newProduct.unitPrice <= 0) {
      alert('Please fill all product details');
      return;
    }

    try {
      await apiClient.post(`/order-management/${orderId}/items`, {
        productId: newProduct.productId || null,
        productName: newProduct.productName,
        quantity: newProduct.quantity,
        unitPrice: newProduct.unitPrice,
      });
      alert('Product added successfully');
      loadOrderDetails();
      setShowAddProduct(false);
      setNewProduct({ productId: '', productName: '', quantity: 1, unitPrice: 0 });
      onUpdate();
    } catch (error) {
      alert('Failed to add product');
    }
  };

  // ==================== STATUS MANAGEMENT ====================

  const approveOrder = async () => {
    if (!confirm('Approve this order?')) return;
    
    try {
      await apiClient.post(`/order-management/${orderId}/approve`);
      alert('Order approved');
      loadOrderDetails();
      onUpdate();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to approve order');
    }
  };

  const holdOrder = async () => {
    if (!confirm('Put this order on hold?')) return;
    
    try {
      await apiClient.post(`/order-management/${orderId}/hold`);
      alert('Order put on hold');
      loadOrderDetails();
      onUpdate();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to hold order');
    }
  };

  const cancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('Please select a cancel reason');
      return;
    }

    try {
      await apiClient.post(`/order-management/${orderId}/cancel`, { cancelReason });
      alert('Order cancelled');
      setShowCancelModal(false);
      loadOrderDetails();
      onUpdate();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  // ==================== COURIER ====================

  const shipOrder = async () => {
    if (!courierData.courierCompany || !courierData.trackingId) {
      alert('Please fill courier company and tracking ID');
      return;
    }

    try {
      await apiClient.post(`/order-management/${orderId}/ship`, courierData);
      alert('Order marked as shipped');
      setShowShipModal(false);
      loadOrderDetails();
      onUpdate();
    } catch (error) {
      alert('Failed to ship order');
    }
  };

  // ==================== NOTES ====================

  const saveNotes = async () => {
    try {
      await apiClient.put(`/order-management/${orderId}/notes`, {
        shippingAddress,
        courierNotes,
        riderInstructions,
        internalNotes,
      });
      alert('Notes updated successfully');
      loadOrderDetails();
      onUpdate();
    } catch (error) {
      alert('Failed to update notes');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg">
          <p className="text-xl">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const canHoldOrCancel = !order.courierStatus || !['picked', 'in_transit', 'delivered'].includes(order.courierStatus);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 flex justify-between items-center rounded-t-lg">
          <div>
            <h2 className="text-2xl font-bold">Order #{order.salesOrderNumber}</h2>
            <p className="text-blue-100 text-sm">Status: <span className="font-semibold uppercase">{order.status}</span></p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-700 p-2 rounded-full transition">
            <FaTimes size={24} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-b bg-gray-50 flex gap-3 flex-wrap">
          {order.status !== 'approved' && order.status !== 'shipped' && order.status !== 'delivered' && (
            <button onClick={approveOrder} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
              <FaCheck /> Approve
            </button>
          )}
          
          {canHoldOrCancel && order.status !== 'hold' && (
            <button onClick={holdOrder} className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center gap-2">
              <FaPause /> Hold
            </button>
          )}
          
          {canHoldOrCancel && order.status !== 'cancelled' && (
            <button onClick={() => setShowCancelModal(true)} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2">
              <FaBan /> Cancel
            </button>
          )}
          
          {order.status === 'approved' && !order.shippedAt && (
            <button onClick={() => setShowShipModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <FaShippingFast /> Ship Order
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-1 p-2 bg-gray-50">
            {['items', 'delivery', 'notes', 'tracking', 'logs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-t-lg font-semibold transition ${
                  activeTab === tab 
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* ITEMS TAB */}
          {activeTab === 'items' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Order Products</h3>
                {!showAddProduct && (
                  <button onClick={() => setShowAddProduct(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <FaPlus /> Add Product
                  </button>
                )}
              </div>

              {/* Add Product Form */}
              {showAddProduct && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4 border-2 border-blue-200">
                  <h4 className="font-bold mb-3">Add New Product</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder="Product Name *"
                      value={newProduct.productName}
                      onChange={(e) => setNewProduct({ ...newProduct, productName: e.target.value })}
                      className="border px-3 py-2 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Quantity *"
                      value={newProduct.quantity}
                      onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) })}
                      className="border px-3 py-2 rounded"
                      min="1"
                    />
                    <input
                      type="number"
                      placeholder="Unit Price *"
                      value={newProduct.unitPrice}
                      onChange={(e) => setNewProduct({ ...newProduct, unitPrice: parseFloat(e.target.value) })}
                      className="border px-3 py-2 rounded"
                      min="0"
                      step="0.01"
                    />
                    <div className="flex gap-2">
                      <button onClick={addNewProduct} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex-1">
                        <FaSave className="inline mr-1" /> Save
                      </button>
                      <button onClick={() => setShowAddProduct(false)} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-3 text-left">Product</th>
                      <th className="border p-3 text-center">Quantity</th>
                      <th className="border p-3 text-right">Unit Price</th>
                      <th className="border p-3 text-right">Subtotal</th>
                      <th className="border p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="border p-3">{item.productName}</td>
                        <td className="border p-3 text-center">
                          {editingItem === item.id ? (
                            <input
                              type="number"
                              value={editItemData.quantity}
                              onChange={(e) => setEditItemData({ ...editItemData, quantity: parseInt(e.target.value) })}
                              className="w-20 border px-2 py-1 rounded text-center"
                              min="1"
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td className="border p-3 text-right">
                          {editingItem === item.id ? (
                            <input
                              type="number"
                              value={editItemData.unitPrice}
                              onChange={(e) => setEditItemData({ ...editItemData, unitPrice: parseFloat(e.target.value) })}
                              className="w-24 border px-2 py-1 rounded text-right"
                              min="0"
                              step="0.01"
                            />
                          ) : (
                            `৳${parseFloat(item.unitPrice).toFixed(2)}`
                          )}
                        </td>
                        <td className="border p-3 text-right font-semibold">৳{parseFloat(item.subtotal).toFixed(2)}</td>
                        <td className="border p-3 text-center">
                          <div className="flex gap-2 justify-center">
                            {editingItem === item.id ? (
                              <>
                                <button onClick={() => saveEditItem(item.id)} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                                  <FaSave />
                                </button>
                                <button onClick={() => setEditingItem(null)} className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500">
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEditItem(item)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                                  <FaEdit />
                                </button>
                                <button onClick={() => deleteItem(item.id)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                                  <FaTrash />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td colSpan={3} className="border p-3 text-right">Total Amount:</td>
                      <td className="border p-3 text-right text-xl text-blue-600">৳{parseFloat(order.totalAmount || 0).toFixed(2)}</td>
                      <td className="border p-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* DELIVERY TAB */}
          {activeTab === 'delivery' && (
            <div className="space-y-6">
              <div>
                <label className="block font-bold mb-2 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-blue-600" /> Shipping Address
                </label>
                <textarea
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full border p-3 rounded-lg"
                  rows={3}
                  placeholder="Enter complete delivery address..."
                />
              </div>

              <div>
                <label className="block font-bold mb-2 flex items-center gap-2">
                  <FaStickyNote className="text-blue-600" /> Courier Notes
                </label>
                <textarea
                  value={courierNotes}
                  onChange={(e) => setCourierNotes(e.target.value)}
                  className="w-full border p-3 rounded-lg"
                  rows={2}
                  placeholder="Special instructions for courier service..."
                />
              </div>

              <div>
                <label className="block font-bold mb-2 flex items-center gap-2">
                  <FaShippingFast className="text-blue-600" /> Rider Instructions
                </label>
                <textarea
                  value={riderInstructions}
                  onChange={(e) => setRiderInstructions(e.target.value)}
                  className="w-full border p-3 rounded-lg"
                  rows={2}
                  placeholder="Instructions specifically for delivery rider..."
                />
              </div>

              <button onClick={saveNotes} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <FaSave /> Save Delivery Information
              </button>

              {/* Courier Info */}
              {order.courierCompany && (
                <div className="mt-6 bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <h4 className="font-bold text-green-800 mb-2">Courier Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><strong>Company:</strong> {order.courierCompany}</div>
                    <div><strong>Tracking ID:</strong> {order.trackingId}</div>
                    <div><strong>Status:</strong> <span className="uppercase font-semibold">{order.courierStatus}</span></div>
                    <div><strong>Shipped At:</strong> {order.shippedAt ? new Date(order.shippedAt).toLocaleString() : 'N/A'}</div>
                  </div>
                </div>
              )}

              {/* Tracking History */}
              {courierTracking.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-bold mb-3">Courier Tracking History</h4>
                  <div className="space-y-2">
                    {courierTracking.map((track, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-semibold uppercase">{track.status}</span>
                            {track.location && <span className="text-gray-600 ml-2">- {track.location}</span>}
                            {track.remarks && <p className="text-sm text-gray-600 mt-1">{track.remarks}</p>}
                          </div>
                          <span className="text-xs text-gray-500">{new Date(track.updatedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div>
                <label className="block font-bold mb-2 flex items-center gap-2">
                  <FaStickyNote className="text-red-600" /> Internal Notes (Team Only)
                </label>
                <div className="bg-red-50 border-2 border-red-200 p-3 rounded-lg mb-2">
                  <p className="text-sm text-red-800">
                    <FaExclamationTriangle className="inline mr-2" />
                    These notes are visible only to team members. Customers cannot see this.
                  </p>
                </div>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  className="w-full border p-3 rounded-lg"
                  rows={6}
                  placeholder="Add internal notes for team: follow-ups, issues, special handling, etc..."
                />
              </div>

              <button onClick={saveNotes} className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <FaSave /> Save Internal Notes
              </button>
            </div>
          )}

          {/* TRACKING TAB */}
          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold mb-4">Order Source & User Tracking</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <FaGlobe /> Location & IP
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>IP Address:</strong> {order.userIp || 'N/A'}</div>
                    {order.geoLocation && (
                      <>
                        <div><strong>Country:</strong> {order.geoLocation.country || 'N/A'}</div>
                        <div><strong>City:</strong> {order.geoLocation.city || 'N/A'}</div>
                        <div><strong>Coordinates:</strong> {order.geoLocation.latitude}, {order.geoLocation.longitude}</div>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                    {order.deviceType === 'mobile' ? <FaMobile /> : <FaDesktop />} Device & Browser
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Device Type:</strong> <span className="uppercase">{order.deviceType || 'N/A'}</span></div>
                    <div><strong>Operating System:</strong> {order.operatingSystem || 'N/A'}</div>
                    <div><strong>Browser:</strong> {order.browserInfo || 'N/A'}</div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-bold text-purple-800 mb-3">Traffic Source</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Source:</strong> <span className="uppercase">{order.trafficSource || 'N/A'}</span></div>
                    {order.referrerUrl && <div><strong>Referrer:</strong> {order.referrerUrl}</div>}
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-bold text-yellow-800 mb-3">UTM Parameters</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>UTM Source:</strong> {order.utmSource || 'N/A'}</div>
                    <div><strong>UTM Medium:</strong> {order.utmMedium || 'N/A'}</div>
                    <div><strong>UTM Campaign:</strong> {order.utmCampaign || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FaHistory /> Activity Log / Audit Trail
              </h3>
              
              <div className="space-y-3">
                {activityLogs.map((log) => (
                  <div key={log.id} className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-semibold text-blue-800 uppercase">{log.actionType.replace(/_/g, ' ')}</span>
                        <p className="text-gray-700 mt-1">{log.actionDescription}</p>
                      </div>
                      <span className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                      <span><strong>Performed by:</strong> {log.performedByName || 'System'}</span>
                      {log.ipAddress && <span><strong>IP:</strong> {log.ipAddress}</span>}
                    </div>
                    
                    {(log.oldValue || log.newValue) && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-blue-600 hover:underline">View Details</summary>
                        <div className="mt-2 bg-white p-2 rounded border">
                          {log.oldValue && (
                            <div className="mb-2">
                              <strong>Old Value:</strong>
                              <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(log.oldValue, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.newValue && (
                            <div>
                              <strong>New Value:</strong>
                              <pre className="text-xs bg-green-50 p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(log.newValue, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
                
                {activityLogs.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No activity logs found</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ship Modal */}
        {showShipModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Ship Order</h3>
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold mb-1">Courier Company *</label>
                  <select
                    value={courierData.courierCompany}
                    onChange={(e) => setCourierData({ ...courierData, courierCompany: e.target.value })}
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Select Courier</option>
                    <option value="Sundarban Courier">Sundarban Courier</option>
                    <option value="Pathao">Pathao</option>
                    <option value="Steadfast">Steadfast</option>
                    <option value="RedX">RedX</option>
                    <option value="PaperFly">PaperFly</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Courier Order ID</label>
                  <input
                    type="text"
                    value={courierData.courierOrderId}
                    onChange={(e) => setCourierData({ ...courierData, courierOrderId: e.target.value })}
                    className="w-full border p-2 rounded"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tracking ID *</label>
                  <input
                    type="text"
                    value={courierData.trackingId}
                    onChange={(e) => setCourierData({ ...courierData, trackingId: e.target.value })}
                    className="w-full border p-2 rounded"
                    placeholder="Enter tracking number"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={shipOrder} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex-1">
                  Confirm Ship
                </button>
                <button onClick={() => setShowShipModal(false)} className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-md w-full">
              <h3 className="text-xl font-bold mb-4 text-red-600">Cancel Order</h3>
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold mb-1">Cancel Reason *</label>
                  <select
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full border p-2 rounded"
                  >
                    <option value="">Select Reason</option>
                    <option value="customer_request">Customer Request</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="wrong_address">Wrong Address</option>
                    <option value="payment_issue">Payment Issue</option>
                    <option value="duplicate_order">Duplicate Order</option>
                    <option value="fraud_detected">Fraud Detected</option>
                    <option value="customer_unreachable">Customer Unreachable</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={cancelOrder} className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 flex-1">
                  Confirm Cancel
                </button>
                <button onClick={() => setShowCancelModal(false)} className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
