import { useState, useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { supplierPortal } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { FaBox, FaClipboardList, FaUser, FaCheck, FaTruck, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

interface PO {
  id: number;
  po_number: string;
  status: string;
  order_date: string;
  expected_delivery_date: string;
  total_amount: number;
  warehouse_name: string;
}

interface CatalogItem {
  id: number;
  product_name: string;
  product_sku: string;
  supplier_sku: string;
  unit_price: number;
  min_order_quantity: number;
  lead_time_days: number;
  is_preferred: boolean;
}

export default function SupplierDashboard() {
  const toast = useToast();
  const [tab, setTab] = useState<'orders' | 'catalog' | 'profile'>('orders');
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<PO[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});
  const [confirmingPo, setConfirmingPo] = useState<number | null>(null);
  const [confirmDate, setConfirmDate] = useState('');
  const [confirmNotes, setConfirmNotes] = useState('');

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'orders') {
        const data = await supplierPortal.getPurchaseOrders();
        setOrders(Array.isArray(data) ? data : data?.data || []);
      } else if (tab === 'catalog') {
        setCatalog(await supplierPortal.getCatalog());
      } else {
        const p = await supplierPortal.getProfile();
        setProfile(p);
        setProfileForm(p);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPo = async (poId: number) => {
    try {
      await supplierPortal.confirmPurchaseOrder(poId, {
        expected_delivery_date: confirmDate || undefined,
        notes: confirmNotes || undefined,
      });
      toast.success('Purchase order confirmed');
      setConfirmingPo(null);
      setConfirmDate('');
      setConfirmNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to confirm');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await supplierPortal.updateProfile(profileForm);
      toast.success('Profile updated');
      setEditingProfile(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update');
    }
  };

  const statusColor = (s: string) => {
    const colors: Record<string, string> = {
      approved: 'bg-blue-100 text-blue-800',
      sent: 'bg-purple-100 text-purple-800',
      confirmed: 'bg-green-100 text-green-800',
      partial_received: 'bg-yellow-100 text-yellow-800',
      received: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[s] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Supplier Portal</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          {[
            { key: 'orders', label: 'Purchase Orders', icon: FaClipboardList },
            { key: 'catalog', label: 'My Catalog', icon: FaBox },
            { key: 'profile', label: 'Profile', icon: FaUser },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                tab === t.key ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="text-sm" />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : tab === 'orders' ? (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No purchase orders found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">PO Number</th>
                      <th className="text-left p-3">Date</th>
                      <th className="text-left p-3">Warehouse</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-right p-3">Amount</th>
                      <th className="text-left p-3">Expected Delivery</th>
                      <th className="text-center p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((po) => (
                      <tr key={po.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{po.po_number}</td>
                        <td className="p-3">{po.order_date?.split('T')[0]}</td>
                        <td className="p-3">{po.warehouse_name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(po.status)}`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">${Number(po.total_amount || 0).toFixed(2)}</td>
                        <td className="p-3">{po.expected_delivery_date?.split('T')[0] || '—'}</td>
                        <td className="p-3 text-center">
                          {(po.status === 'approved' || po.status === 'sent') && (
                            confirmingPo === po.id ? (
                              <div className="flex items-center gap-2 justify-center">
                                <input
                                  type="date"
                                  value={confirmDate}
                                  onChange={(e) => setConfirmDate(e.target.value)}
                                  className="border rounded px-2 py-1 text-xs"
                                />
                                <button onClick={() => handleConfirmPo(po.id)} className="text-green-600 hover:text-green-800"><FaCheck /></button>
                                <button onClick={() => setConfirmingPo(null)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmingPo(po.id)}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded hover:bg-green-100 text-xs"
                              >
                                <FaCheck /> Confirm
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : tab === 'catalog' ? (
          <div className="overflow-x-auto">
            {catalog.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No catalog items found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Product</th>
                    <th className="text-left p-3">SKU</th>
                    <th className="text-left p-3">Supplier SKU</th>
                    <th className="text-right p-3">Unit Price</th>
                    <th className="text-right p-3">Min Order Qty</th>
                    <th className="text-right p-3">Lead Time (days)</th>
                    <th className="text-center p-3">Preferred</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {catalog.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{item.product_name}</td>
                      <td className="p-3">{item.product_sku}</td>
                      <td className="p-3">{item.supplier_sku}</td>
                      <td className="p-3 text-right">${Number(item.unit_price).toFixed(2)}</td>
                      <td className="p-3 text-right">{item.min_order_quantity}</td>
                      <td className="p-3 text-right">{item.lead_time_days}</td>
                      <td className="p-3 text-center">{item.is_preferred ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          /* Profile Tab */
          <div className="max-w-2xl">
            {profile && (
              <div className="bg-white rounded-lg border p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Company Profile</h2>
                  {!editingProfile ? (
                    <button onClick={() => { setEditingProfile(true); setProfileForm(profile); }} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
                      <FaEdit /> Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={handleUpdateProfile} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"><FaSave /> Save</button>
                      <button onClick={() => setEditingProfile(false)} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">Cancel</button>
                    </div>
                  )}
                </div>
                {[
                  { label: 'Company Name', key: 'company_name', disabled: true },
                  { label: 'Contact Person', key: 'contact_person' },
                  { label: 'Email', key: 'email' },
                  { label: 'Phone', key: 'phone' },
                  { label: 'Address', key: 'address' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-gray-600 mb-1">{f.label}</label>
                    {editingProfile && !f.disabled ? (
                      <input
                        type="text"
                        value={profileForm[f.key] || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, [f.key]: e.target.value })}
                        className="w-full border rounded px-3 py-2 text-sm"
                      />
                    ) : (
                      <p className="text-sm text-gray-800">{profile[f.key] || '—'}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
