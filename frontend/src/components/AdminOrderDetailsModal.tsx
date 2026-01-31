import { useState, useEffect } from 'react';
import apiClient from '@/services/api';
import { 
  FaTimes, FaEdit, FaTrash, FaPlus, FaSave, FaCheck, FaPause, FaBan, 
  FaShippingFast, FaMapMarkerAlt, FaStickyNote, FaHistory, FaGlobe, 
  FaMobile, FaDesktop, FaChrome, FaExclamationTriangle 
} from 'react-icons/fa';
import PhoneInput, { validateBDPhone } from '@/components/PhoneInput';

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
  const [customer, setCustomer] = useState<any>(null);
  const [customerRecord, setCustomerRecord] = useState<any>(null);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);
  const [productHistory, setProductHistory] = useState<any>(null);
  const [productHistoryLoading, setProductHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');

  const [currentOrderId, setCurrentOrderId] = useState<number>(orderId);
  
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

  // Customer edit
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerActiveTab, setCustomerActiveTab] = useState<'basic' | 'contact' | 'address' | 'crm'>('basic');
  const [customerForm, setCustomerForm] = useState<any>({});

  // Tracking edit
  const [trackingForm, setTrackingForm] = useState<any>({});

  useEffect(() => {
    setCurrentOrderId(orderId);
  }, [orderId]);

  useEffect(() => {
    loadOrderDetails();
  }, [currentOrderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/order-management/${currentOrderId}/details`);
      const data = response.data;

      const normalizeCustomerRecord = (raw: any) => {
        if (!raw) return null;
        const r = { ...raw };
        // Support both camelCase and snake_case payloads
        if (r.preferredContactMethod === undefined && r.preferred_contact_method !== undefined) {
          r.preferredContactMethod = r.preferred_contact_method;
        }
        if (r.totalSpent === undefined && r.total_spent !== undefined) {
          r.totalSpent = r.total_spent;
        }
        if (r.customerLifetimeValue === undefined && r.customer_lifetime_value !== undefined) {
          r.customerLifetimeValue = r.customer_lifetime_value;
        }
        if (r.lastContactDate === undefined && r.last_contact_date !== undefined) {
          r.lastContactDate = r.last_contact_date;
        }
        if (r.nextFollowUp === undefined && r.next_follow_up !== undefined) {
          r.nextFollowUp = r.next_follow_up;
        }
        if (r.companyName === undefined && r.company_name !== undefined) {
          r.companyName = r.company_name;
        }
        if (r.lastName === undefined && r.last_name !== undefined) {
          r.lastName = r.last_name;
        }
        if (r.dateOfBirth === undefined && r.date_of_birth !== undefined) {
          r.dateOfBirth = r.date_of_birth;
        }
        if (r.anniversaryDate === undefined && r.anniversary_date !== undefined) {
          r.anniversaryDate = r.anniversary_date;
        }
        if (r.maritalStatus === undefined && r.marital_status !== undefined) {
          r.maritalStatus = r.marital_status;
        }
        return r;
      };
      const normalizedCustomerRecord = normalizeCustomerRecord(data.customerRecord);
      
      setOrder(data);
      setItems(data.items || []);
      setActivityLogs(data.activityLogs || []);
      setCourierTracking(data.courierTracking || []);
      setCustomer(data.customer || null);
      setCustomerRecord(normalizedCustomerRecord);
      setOrderHistory(Array.isArray(data.orderHistory) ? data.orderHistory : []);
      
      setShippingAddress(data.shippingAddress || '');
      setCourierNotes(data.courierNotes || '');
      setRiderInstructions(data.riderInstructions || '');
      setInternalNotes(data.internalNotes || '');

      // Initialize tracking form for manual completion/edit
      const geo = data.geoLocation || null;
      setTrackingForm({
        userIp: data.userIp || '',
        geoCountry: geo?.country || '',
        geoCity: geo?.city || '',
        geoLatitude: geo?.latitude ?? '',
        geoLongitude: geo?.longitude ?? '',
        browserInfo: data.browserInfo || '',
        deviceType: data.deviceType || '',
        operatingSystem: data.operatingSystem || '',
        trafficSource: data.trafficSource || '',
        referrerUrl: data.referrerUrl || '',
        utmSource: data.utmSource || '',
        utmMedium: data.utmMedium || '',
        utmCampaign: data.utmCampaign || '',
      });
    } catch (error) {
      console.error('Error loading order details:', error);
      alert('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const loadProductHistory = async () => {
    try {
      setProductHistoryLoading(true);
      const res = await apiClient.get(`/order-management/${currentOrderId}/product-history`);
      setProductHistory(res.data);
    } catch (e) {
      console.error('Failed to load product history:', e);
      setProductHistory(null);
    } finally {
      setProductHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'product') {
      loadProductHistory();
    }
  }, [activeTab, currentOrderId]);

  const toInputValue = (v: any) => (v === null || v === undefined ? '' : String(v));
  const displayOrNA = (v: any) => {
    if (v === null || v === undefined) return 'N/A';
    const s = String(v).trim();
    return s.length ? s : 'N/A';
  };

  const startEditCustomer = () => {
    setIsEditingCustomer(true);
    setCustomerActiveTab('basic');
    setCustomerForm({ ...(customerRecord || {}) });
  };

  const cancelEditCustomer = () => {
    setIsEditingCustomer(false);
    setCustomerForm({});
  };

  const sendToSteadfast = async () => {
    if (!confirm('Send this order to Steadfast?')) return;
    try {
      const res = await apiClient.post(`/order-management/${currentOrderId}/steadfast/send`);
      alert(res.data?.message || 'Sent to Steadfast');
      loadOrderDetails();
      onUpdate();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to send to Steadfast');
    }
  };

  const saveCustomer = async () => {
    if (!customerRecord?.id) return;
    try {
      await apiClient.put(`/customers/${customerRecord.id}`, {
        title: customerForm.title || null,
        name: customerForm.name || null,
        lastName: customerForm.lastName || null,
        companyName: customerForm.companyName || null,
        email: customerForm.email || null,
        phone: customerForm.phone || null,
        mobile: customerForm.mobile || null,
        website: customerForm.website || null,
        source: customerForm.source || null,
        rating: customerForm.rating === '' ? null : customerForm.rating,
        total_spent: customerForm.totalSpent === '' ? null : customerForm.totalSpent,
        customer_lifetime_value: customerForm.customerLifetimeValue === '' ? null : customerForm.customerLifetimeValue,
        preferred_contact_method: customerForm.preferredContactMethod || null,
        notes: customerForm.notes || null,
        last_contact_date: customerForm.lastContactDate || null,
        next_follow_up: customerForm.nextFollowUp || null,
        address: customerForm.address || null,
        district: customerForm.district || null,
        city: customerForm.city || null,
        gender: customerForm.gender || null,
        dateOfBirth: customerForm.dateOfBirth || null,
        maritalStatus: customerForm.maritalStatus || null,
        anniversaryDate: customerForm.anniversaryDate || null,
        profession: customerForm.profession || null,
        availableTime: customerForm.availableTime || null,
        customerType: customerForm.customerType || null,
        lifecycleStage: customerForm.lifecycleStage || null,
        status: customerForm.status || null,
        priority: customerForm.priority || null,
      });
      alert('Customer updated successfully');
      setIsEditingCustomer(false);
      loadOrderDetails();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update customer');
    }
  };

  const saveTracking = async () => {
    try {
      await apiClient.put(`/order-management/${currentOrderId}/tracking`, {
        userIp: trackingForm.userIp || null,
        geoLocation: {
          country: trackingForm.geoCountry || null,
          city: trackingForm.geoCity || null,
          latitude: trackingForm.geoLatitude === '' ? null : Number(trackingForm.geoLatitude),
          longitude: trackingForm.geoLongitude === '' ? null : Number(trackingForm.geoLongitude),
        },
        browserInfo: trackingForm.browserInfo || null,
        deviceType: trackingForm.deviceType || null,
        operatingSystem: trackingForm.operatingSystem || null,
        trafficSource: trackingForm.trafficSource || null,
        referrerUrl: trackingForm.referrerUrl || null,
        utmSource: trackingForm.utmSource || null,
        utmMedium: trackingForm.utmMedium || null,
        utmCampaign: trackingForm.utmCampaign || null,
      });
      alert('Tracking updated successfully');
      loadOrderDetails();
      onUpdate();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update tracking');
    }
  };

  // ==================== ITEM MANAGEMENT ====================
  
  const startEditItem = (item: any) => {
    setEditingItem(item.id);
    setEditItemData({ quantity: String(item.quantity ?? ''), unitPrice: String(item.unitPrice ?? '') });
  };

  const saveEditItem = async (itemId: number) => {
    try {
      const qty = Number.parseInt(String(editItemData.quantity ?? ''), 10);
      const unit = Number.parseFloat(String(editItemData.unitPrice ?? ''));
      if (!Number.isFinite(qty) || qty < 1) {
        alert('Quantity must be at least 1');
        return;
      }
      if (!Number.isFinite(unit) || unit < 0) {
        alert('Unit price must be a valid number');
        return;
      }
      await apiClient.put(`/order-management/items/${itemId}`, { quantity: qty, unitPrice: unit });
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
      await apiClient.post(`/order-management/${currentOrderId}/items`, {
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
      await apiClient.post(`/order-management/${currentOrderId}/approve`);
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
      await apiClient.post(`/order-management/${currentOrderId}/hold`);
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
      await apiClient.post(`/order-management/${currentOrderId}/cancel`, { cancelReason });
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
      await apiClient.post(`/order-management/${currentOrderId}/ship`, courierData);
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
      await apiClient.put(`/order-management/${currentOrderId}/notes`, {
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

  const viewCustomer: any = {
    ...(customerRecord || {}),
    id: customerRecord?.id ?? customer?.customerId ?? order?.customerId ?? null,
    name: customerRecord?.name || customer?.customerName || order?.customerName || null,
    lastName: customerRecord?.lastName || null,
    email: customerRecord?.email || customer?.customerEmail || order?.customerEmail || null,
    phone: customerRecord?.phone || customer?.customerPhone || order?.customerPhone || null,
    address: customerRecord?.address || order?.shippingAddress || null,
    district: customerRecord?.district || null,
    city: customerRecord?.city || null,
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

  const itemsSubtotal = items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
  const totalAmount = Number(order.totalAmount || 0);
  const discountAmount = Number(order.discountAmount || order.discount_amount || 0);
  const deliveryCharge = Number.isFinite(Number(order.deliveryCharge || order.delivery_charge))
    ? Number(order.deliveryCharge || order.delivery_charge)
    : Math.max(0, totalAmount - itemsSubtotal + discountAmount);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

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
            <>
              <button
                onClick={() => {
                  setCourierData({ courierCompany: 'Steadfast', courierOrderId: '', trackingId: '' });
                  setShowShipModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                Send this SteadFast
              </button>
              <button
                onClick={() => {
                  setCourierData({ courierCompany: 'Pathao', courierOrderId: '', trackingId: '' });
                  setShowShipModal(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                Send this pathao
              </button>
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-1 p-2 bg-gray-50">
            {['items', 'customer', 'product', 'order history', 'delivery', 'notes', 'tracking', 'logs'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab === 'order history' ? 'order-history' : tab)}
                className={`px-6 py-3 rounded-t-lg font-semibold transition ${
                  activeTab === (tab === 'order history' ? 'order-history' : tab) 
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

              {/* Totals Breakdown */}
              <div className="bg-gray-50 border rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
                  <div>
                    <div className="text-gray-600">Items</div>
                    <div className="font-bold">{items.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Total Quantity</div>
                    <div className="font-bold">{totalQuantity}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Subtotal</div>
                    <div className="font-bold">৳{itemsSubtotal.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Delivery Charge</div>
                    <div className="font-bold">৳{deliveryCharge.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Total</div>
                    <div className="font-bold text-blue-600">৳{totalAmount.toFixed(2)}</div>
                  </div>
                </div>
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
                              value={toInputValue(editItemData.quantity)}
                              onChange={(e) => setEditItemData({ ...editItemData, quantity: e.target.value })}
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
                              value={toInputValue(editItemData.unitPrice)}
                              onChange={(e) => setEditItemData({ ...editItemData, unitPrice: e.target.value })}
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
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={3} className="border p-3 text-right">Delivery Charge:</td>
                      <td className="border p-3 text-right">৳{Number(deliveryCharge || 0).toFixed(2)}</td>
                      <td className="border p-3"></td>
                    </tr>
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={3} className="border p-3 text-right">Discount:</td>
                      <td className="border p-3 text-right">৳{Number(discountAmount || 0).toFixed(2)}</td>
                      <td className="border p-3"></td>
                    </tr>
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

          {/* CUSTOMER TAB */}
          {activeTab === 'customer' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="text-xl font-bold">Customer Information</h3>
                {!isEditingCustomer ? (
                  <button
                    onClick={startEditCustomer}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    disabled={!customerRecord?.id}
                    title={!customerRecord?.id ? 'No customer record matched for this order' : 'Edit customer'}
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={saveCustomer} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                      Save
                    </button>
                    <button onClick={cancelEditCustomer} className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500">
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 border rounded-lg p-3 flex gap-2 flex-wrap">
                {([
                  { key: 'basic', label: 'Basic' },
                  { key: 'contact', label: 'Contact' },
                  { key: 'address', label: 'Address' },
                  { key: 'crm', label: 'CRM' },
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setCustomerActiveTab(t.key)}
                    className={`px-4 py-2 rounded-lg font-semibold ${customerActiveTab === t.key ? 'bg-white text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {!isEditingCustomer && (
                <div className="bg-white border rounded-lg p-4">
                  {customerActiveTab === 'basic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Customer ID</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.id ?? 'Guest')}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">UUID</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.uuid)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Title</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.title)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">First Name</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.name)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Last Name</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.lastName)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Company</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.companyName)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Gender</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.gender)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Date of Birth</div>
                        <div className="font-semibold">{viewCustomer.dateOfBirth ? new Date(viewCustomer.dateOfBirth).toLocaleDateString() : 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Marital Status</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.maritalStatus)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Anniversary Date</div>
                        <div className="font-semibold">{viewCustomer.anniversaryDate ? new Date(viewCustomer.anniversaryDate).toLocaleDateString() : 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Profession</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.profession)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Available Time</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.availableTime)}</div>
                      </div>
                    </div>
                  )}

                  {customerActiveTab === 'contact' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Email</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.email)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Phone</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.phone)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Mobile</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.mobile)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Website</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.website)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Preferred Contact Method</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.preferredContactMethod)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Source</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.source)}</div>
                      </div>
                    </div>
                  )}

                  {customerActiveTab === 'address' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <div className="text-sm text-gray-600">Address</div>
                        <div className="font-semibold whitespace-pre-wrap">{displayOrNA(viewCustomer.address)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">District</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.district)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">City</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.city)}</div>
                      </div>
                    </div>
                  )}

                  {customerActiveTab === 'crm' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Customer Type</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.customerType)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Lifecycle Stage</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.lifecycleStage)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Status</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.status)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Priority</div>
                        <div className="font-semibold">{displayOrNA(viewCustomer.priority)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Last Contact Date</div>
                        <div className="font-semibold">{viewCustomer.lastContactDate ? new Date(viewCustomer.lastContactDate).toLocaleDateString() : 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Next Follow Up</div>
                        <div className="font-semibold">{viewCustomer.nextFollowUp ? new Date(viewCustomer.nextFollowUp).toLocaleDateString() : 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Total Spent</div>
                        <div className="font-semibold">{viewCustomer.totalSpent !== undefined && viewCustomer.totalSpent !== null ? `৳${Number(viewCustomer.totalSpent || 0).toFixed(2)}` : 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Customer Lifetime Value</div>
                        <div className="font-semibold">{viewCustomer.customerLifetimeValue !== undefined && viewCustomer.customerLifetimeValue !== null ? `৳${Number(viewCustomer.customerLifetimeValue || 0).toFixed(2)}` : 'N/A'}</div>
                      </div>
                      <div className="md:col-span-3">
                        <div className="text-sm text-gray-600">Notes</div>
                        <div className="font-semibold whitespace-pre-wrap">{displayOrNA(viewCustomer.notes)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isEditingCustomer && (
                <div className="bg-white border rounded-lg p-4">
                  {customerActiveTab === 'basic' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1">Title</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.title)} onChange={(e) => setCustomerForm({ ...customerForm, title: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">First Name</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.name)} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Last Name</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.lastName)} onChange={(e) => setCustomerForm({ ...customerForm, lastName: e.target.value })} placeholder="N/A" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold mb-1">Company Name</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.companyName)} onChange={(e) => setCustomerForm({ ...customerForm, companyName: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Gender</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.gender)} onChange={(e) => setCustomerForm({ ...customerForm, gender: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Date of Birth</label>
                        <input type="date" className="w-full border p-2 rounded" value={toInputValue(customerForm.dateOfBirth).slice(0, 10)} onChange={(e) => setCustomerForm({ ...customerForm, dateOfBirth: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Marital Status</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.maritalStatus)} onChange={(e) => setCustomerForm({ ...customerForm, maritalStatus: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Anniversary Date</label>
                        <input type="date" className="w-full border p-2 rounded" value={toInputValue(customerForm.anniversaryDate).slice(0, 10)} onChange={(e) => setCustomerForm({ ...customerForm, anniversaryDate: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Profession</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.profession)} onChange={(e) => setCustomerForm({ ...customerForm, profession: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Available Time</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.availableTime)} onChange={(e) => setCustomerForm({ ...customerForm, availableTime: e.target.value })} placeholder="N/A" />
                      </div>
                    </div>
                  )}

                  {customerActiveTab === 'contact' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1">Email</label>
                        <input type="email" className="w-full border p-2 rounded" value={toInputValue(customerForm.email)} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Phone</label>
                        <PhoneInput
                          value={customerForm.phone || ''}
                          onChange={(value) => setCustomerForm({ ...customerForm, phone: value })}
                          placeholder="01712345678"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Mobile</label>
                        <PhoneInput
                          value={customerForm.mobile || ''}
                          onChange={(value) => setCustomerForm({ ...customerForm, mobile: value })}
                          placeholder="01712345678"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Website</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.website)} onChange={(e) => setCustomerForm({ ...customerForm, website: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Preferred Contact Method</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.preferredContactMethod)} onChange={(e) => setCustomerForm({ ...customerForm, preferredContactMethod: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Source</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.source)} onChange={(e) => setCustomerForm({ ...customerForm, source: e.target.value })} placeholder="N/A" />
                      </div>
                    </div>
                  )}

                  {customerActiveTab === 'address' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold mb-1">Address</label>
                        <textarea className="w-full border p-2 rounded" rows={3} value={toInputValue(customerForm.address)} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">District</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.district)} onChange={(e) => setCustomerForm({ ...customerForm, district: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">City</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.city)} onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })} placeholder="N/A" />
                      </div>
                    </div>
                  )}

                  {customerActiveTab === 'crm' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1">Customer Type</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.customerType)} onChange={(e) => setCustomerForm({ ...customerForm, customerType: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Lifecycle Stage</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.lifecycleStage)} onChange={(e) => setCustomerForm({ ...customerForm, lifecycleStage: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Status</label>
                        <input className="w-full border p-2 rounded" value={toInputValue(customerForm.status)} onChange={(e) => setCustomerForm({ ...customerForm, status: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Priority</label>
                        <select className="w-full border p-2 rounded" value={toInputValue(customerForm.priority)} onChange={(e) => setCustomerForm({ ...customerForm, priority: e.target.value })}>
                          <option value="">N/A</option>
                          <option value="hot">hot</option>
                          <option value="warm">warm</option>
                          <option value="cold">cold</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Last Contact Date</label>
                        <input type="date" className="w-full border p-2 rounded" value={toInputValue(customerForm.lastContactDate).slice(0, 10)} onChange={(e) => setCustomerForm({ ...customerForm, lastContactDate: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Next Follow Up</label>
                        <input type="date" className="w-full border p-2 rounded" value={toInputValue(customerForm.nextFollowUp).slice(0, 10)} onChange={(e) => setCustomerForm({ ...customerForm, nextFollowUp: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Total Spent</label>
                        <input type="number" className="w-full border p-2 rounded" value={toInputValue(customerForm.totalSpent)} onChange={(e) => setCustomerForm({ ...customerForm, totalSpent: e.target.value })} placeholder="N/A" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Customer Lifetime Value</label>
                        <input type="number" className="w-full border p-2 rounded" value={toInputValue(customerForm.customerLifetimeValue)} onChange={(e) => setCustomerForm({ ...customerForm, customerLifetimeValue: e.target.value })} placeholder="N/A" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold mb-1">Notes</label>
                        <textarea className="w-full border p-2 rounded" rows={4} value={toInputValue(customerForm.notes)} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} placeholder="N/A" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PRODUCT TAB */}
          {activeTab === 'product' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Product History</h3>

              {productHistoryLoading && (
                <div className="bg-white border rounded-lg p-6 text-center text-gray-600">Loading product history...</div>
              )}

              {!productHistoryLoading && (
                <>
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
                      <div>
                        <div className="text-gray-600">Total Orders</div>
                        <div className="font-bold">{Number(productHistory?.summary?.totalOrders || 0)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Total Spent</div>
                        <div className="font-bold">৳{Number(productHistory?.summary?.totalSpent || 0).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Total Quantity</div>
                        <div className="font-bold">{Number(productHistory?.summary?.totalQuantity || 0)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Unique Products</div>
                        <div className="font-bold">{Number(productHistory?.summary?.uniqueProducts || 0)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Next Follow Up</div>
                        <div className="font-bold">{viewCustomer?.nextFollowUp ? new Date(viewCustomer.nextFollowUp).toLocaleDateString() : 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-3 text-left">Product</th>
                          <th className="border p-3 text-left">SKU</th>
                          <th className="border p-3 text-center">Total Quantity</th>
                          <th className="border p-3 text-center">Orders</th>
                          <th className="border p-3 text-left">Last Purchased</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(productHistory?.products || []).map((p: any) => (
                          <tr key={p.productKey} className="hover:bg-gray-50">
                            <td className="border p-3 font-semibold">{displayOrNA(p.productName)}</td>
                            <td className="border p-3">{displayOrNA(p.sku)}</td>
                            <td className="border p-3 text-center font-semibold">{Number(p.totalQuantity || 0)}</td>
                            <td className="border p-3 text-center">{Number(p.ordersCount || 0)}</td>
                            <td className="border p-3">{p.lastPurchasedAt ? new Date(p.lastPurchasedAt).toLocaleString() : 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(productHistory?.products || []).length === 0 && (
                    <p className="text-gray-500 text-center py-8">No product history found</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ORDER HISTORY TAB */}
          {activeTab === 'order-history' && (
            <div>
              <h3 className="text-xl font-bold mb-4">Order History</h3>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-3 text-left">Order</th>
                      <th className="border p-3 text-left">Date</th>
                      <th className="border p-3 text-left">Status</th>
                      <th className="border p-3 text-right">Amount</th>
                      <th className="border p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderHistory.map((h) => (
                      <tr key={h.id} className={`hover:bg-gray-50 ${Number(h.id) === Number(currentOrderId) ? 'bg-blue-50' : ''}`}>
                        <td className="border p-3 font-semibold">{h.salesOrderNumber ? `#${h.salesOrderNumber}` : `#${h.id}`}</td>
                        <td className="border p-3">{h.orderDate ? new Date(h.orderDate).toLocaleString() : (h.createdAt ? new Date(h.createdAt).toLocaleString() : 'N/A')}</td>
                        <td className="border p-3">
                          <span className="uppercase font-semibold">{h.status || 'N/A'}</span>
                        </td>
                        <td className="border p-3 text-right font-semibold">৳{Number(h.totalAmount || 0).toFixed(2)}</td>
                        <td className="border p-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => {
                                setCurrentOrderId(Number(h.id));
                                setActiveTab('items');
                              }}
                              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                              disabled={Number(h.id) === Number(currentOrderId)}
                              title="View"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {orderHistory.length === 0 && (
                <p className="text-gray-500 text-center py-8">No order history found</p>
              )}

              <div className="mt-6">
                <h4 className="font-bold mb-3">Courier Info (Selected Order)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="bg-gray-50">
                        <td className="border p-3 font-semibold w-64">Courier (company)</td>
                        <td className="border p-3">{displayOrNA(order?.courierCompany)}</td>
                      </tr>
                      <tr>
                        <td className="border p-3 font-semibold">Courier Status</td>
                        <td className="border p-3">{displayOrNA(order?.courierStatus)}</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border p-3 font-semibold">Courier ID</td>
                        <td className="border p-3">{displayOrNA(order?.courierOrderId)}</td>
                      </tr>
                      <tr>
                        <td className="border p-3 font-semibold">Courier tracking id</td>
                        <td className="border p-3">{displayOrNA(order?.trackingId)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
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

              <div className="bg-white border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">IP Address</label>
                    <input className="w-full border p-2 rounded" value={toInputValue(trackingForm.userIp)} onChange={(e) => setTrackingForm({ ...trackingForm, userIp: e.target.value })} placeholder="N/A" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Device Type</label>
                    <input className="w-full border p-2 rounded" value={toInputValue(trackingForm.deviceType)} onChange={(e) => setTrackingForm({ ...trackingForm, deviceType: e.target.value })} placeholder="mobile / desktop" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Operating System</label>
                    <input className="w-full border p-2 rounded" value={toInputValue(trackingForm.operatingSystem)} onChange={(e) => setTrackingForm({ ...trackingForm, operatingSystem: e.target.value })} placeholder="N/A" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Browser</label>
                    <input className="w-full border p-2 rounded" value={toInputValue(trackingForm.browserInfo)} onChange={(e) => setTrackingForm({ ...trackingForm, browserInfo: e.target.value })} placeholder="N/A" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Traffic Source</label>
                    <input className="w-full border p-2 rounded" value={toInputValue(trackingForm.trafficSource)} onChange={(e) => setTrackingForm({ ...trackingForm, trafficSource: e.target.value })} placeholder="N/A" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Referrer URL</label>
                    <input className="w-full border p-2 rounded" value={toInputValue(trackingForm.referrerUrl)} onChange={(e) => setTrackingForm({ ...trackingForm, referrerUrl: e.target.value })} placeholder="N/A" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">UTM Source</label>
                    <input className="w-full border p-2 rounded" value={toInputValue(trackingForm.utmSource)} onChange={(e) => setTrackingForm({ ...trackingForm, utmSource: e.target.value })} placeholder="N/A" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">UTM Medium</label>
                    <input className="w-full border p-2 rounded" value={toInputValue(trackingForm.utmMedium)} onChange={(e) => setTrackingForm({ ...trackingForm, utmMedium: e.target.value })} placeholder="N/A" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">UTM Campaign</label>
                    <input className="w-full border p-2 rounded" value={toInputValue(trackingForm.utmCampaign)} onChange={(e) => setTrackingForm({ ...trackingForm, utmCampaign: e.target.value })} placeholder="N/A" />
                  </div>
                </div>

                <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <FaGlobe /> Geo Location
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Country</label>
                      <input className="w-full border p-2 rounded" value={toInputValue(trackingForm.geoCountry)} onChange={(e) => setTrackingForm({ ...trackingForm, geoCountry: e.target.value })} placeholder="N/A" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">City</label>
                      <input className="w-full border p-2 rounded" value={toInputValue(trackingForm.geoCity)} onChange={(e) => setTrackingForm({ ...trackingForm, geoCity: e.target.value })} placeholder="N/A" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Latitude</label>
                      <input className="w-full border p-2 rounded" value={toInputValue(trackingForm.geoLatitude)} onChange={(e) => setTrackingForm({ ...trackingForm, geoLatitude: e.target.value })} placeholder="N/A" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Longitude</label>
                      <input className="w-full border p-2 rounded" value={toInputValue(trackingForm.geoLongitude)} onChange={(e) => setTrackingForm({ ...trackingForm, geoLongitude: e.target.value })} placeholder="N/A" />
                    </div>
                  </div>
                </div>

                <button onClick={saveTracking} className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <FaSave /> Save Tracking
                </button>
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
                      <span>
                        <strong>Performed by:</strong> {log.performedByName || 'System'}
                        {log.performedByUser?.id ? ` (ID: ${log.performedByUser.id})` : ''}
                      </span>
                      {log.teamLeader?.id && (
                        <span>
                          <strong>Team Leader:</strong> {[log.teamLeader.name, log.teamLeader.lastName].filter(Boolean).join(' ')} (ID: {log.teamLeader.id})
                        </span>
                      )}
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
                    <option value="Pathao">Pathao</option>
                    <option value="Steadfast">Steadfast</option>
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
