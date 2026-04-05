import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import PageSizeSelector from '@/components/admin/PageSizeSelector';
import { FaPlus, FaSearch, FaTicketAlt, FaTimes, FaTrash, FaEdit, FaCheck, FaUsers, FaUpload, FaLock, FaGlobe } from 'react-icons/fa';
import apiClient from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

// ─── Types ─────────────────────────────────────────────────────
interface CouponCampaign {
  id: number;
  name: string;
  code?: string | null;
  description?: string;
  triggerProductId?: number | null;
  trigger_product_id?: number | null;
  discountType: string;
  discount_type?: string;
  discountValue: number;
  discount_value?: number;
  minOrderAmount: number;
  min_order_amount?: number;
  maxDiscountAmount?: number | null;
  max_discount_amount?: number | null;
  maxUses?: number | null;
  max_uses?: number | null;
  perCustomerLimit?: number;
  per_customer_limit?: number;
  usageCount?: number;
  usage_count?: number;
  expiryDays: number;
  expiry_days?: number;
  validFrom?: string | null;
  valid_from?: string | null;
  validUntil?: string | null;
  valid_until?: string | null;
  isRestricted?: boolean;
  is_restricted?: boolean;
  isActive: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
}

interface CampaignCustomer {
  id: number;
  campaignId: number;
  campaign_id?: number;
  customerId?: number | null;
  customer_id?: number | null;
  customerPhone?: string | null;
  customer_phone?: string | null;
  customerName?: string | null;
  customer_name?: string | null;
  timesUsed: number;
  times_used?: number;
  lastUsedAt?: string | null;
  last_used_at?: string | null;
  lastUsedOrderId?: number | null;
  last_used_order_id?: number | null;
  isActive: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  campaign?: CouponCampaign;
}

const g = (obj: any, ...keys: string[]) => {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  return undefined;
};

export default function CouponsPage() {
  const { showToast } = useToast();

  // ─── Tab ───────────────────────────────────────────────────
  const [tab, setTab] = useState<'campaigns' | 'customers'>('campaigns');

  // ─── Campaign state ────────────────────────────────────────
  const [campaigns, setCampaigns] = useState<CouponCampaign[]>([]);
  const [camTotal, setCamTotal] = useState(0);
  const [camPage, setCamPage] = useState(1);
  const [camLimit, setCamLimit] = useState(20);
  const [camLoading, setCamLoading] = useState(false);
  const [camSearch, setCamSearch] = useState('');
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState<CouponCampaign | null>(null);
  const [camForm, setCamForm] = useState({
    name: '', code: '', description: '', triggerProductId: '',
    discountType: 'fixed', discountValue: '', minOrderAmount: '0',
    maxDiscountAmount: '', maxUses: '', perCustomerLimit: '1',
    expiryDays: '30', validFrom: '', validUntil: '',
    isRestricted: false, isActive: true,
  });

  // ─── Customer assignment state ─────────────────────────────
  const [customers, setCustomers] = useState<CampaignCustomer[]>([]);
  const [custTotal, setCustTotal] = useState(0);
  const [custPage, setCustPage] = useState(1);
  const [custLimit, setCustLimit] = useState(20);
  const [custLoading, setCustLoading] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [custFilterCampaign, setCustFilterCampaign] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [addCustForm, setAddCustForm] = useState({ campaignId: '', customerId: '', customerPhone: '', customerName: '' });
  const [bulkForm, setBulkForm] = useState({ campaignId: '', phones: '' });
  const [bulkLoading, setBulkLoading] = useState(false);

  // ─── Product search state ──────────────────────────────────
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [productNameMap, setProductNameMap] = useState<Record<number, string>>({});

  const searchProducts = async (query: string) => {
    setProductSearch(query);
    if (!query || query.length < 2) { setProductResults([]); setShowProductDropdown(false); return; }
    try {
      const res = await apiClient.get(`/products?search=${encodeURIComponent(query)}`);
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setProductResults(list.slice(0, 15));
      setShowProductDropdown(true);
    } catch { setProductResults([]); }
  };

  const selectProduct = (product: any) => {
    setSelectedProduct(product);
    setCamForm(f => ({ ...f, triggerProductId: String(product.id) }));
    setProductSearch(product.name_en || product.name || '');
    setShowProductDropdown(false);
    setProductNameMap(prev => ({ ...prev, [product.id]: product.name_en || product.name || `Product #${product.id}` }));
  };

  const clearProduct = () => {
    setSelectedProduct(null);
    setCamForm(f => ({ ...f, triggerProductId: '' }));
    setProductSearch('');
    setProductResults([]);
    setShowProductDropdown(false);
  };

  const loadProductNames = useCallback(async (cams: CouponCampaign[]) => {
    const ids = cams
      .map(c => g(c, 'triggerProductId', 'trigger_product_id'))
      .filter((id): id is number => id != null && !productNameMap[id]);
    if (ids.length === 0) return;
    const unique = [...new Set(ids)];
    for (const id of unique) {
      try {
        const res = await apiClient.get(`/products/${id}`);
        const p = res.data;
        setProductNameMap(prev => ({ ...prev, [id]: p?.name_en || p?.name || `Product #${id}` }));
      } catch {
        setProductNameMap(prev => ({ ...prev, [id]: `Product #${id}` }));
      }
    }
  }, [productNameMap]);

  // ─── Data fetching ─────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    setCamLoading(true);
    try {
      const res = await apiClient.get('/coupons/campaigns', {
        params: { page: camPage, limit: camLimit, search: camSearch || undefined },
      });
      const d = (res as any)?.data;
      const list = d?.data || [];
      setCampaigns(list);
      setCamTotal(d?.total || 0);
      loadProductNames(list);
    } catch { setCampaigns([]); }
    setCamLoading(false);
  }, [camPage, camLimit, camSearch, loadProductNames]);

  const fetchCustomers = useCallback(async () => {
    setCustLoading(true);
    try {
      const res = await apiClient.get('/coupons/customers', {
        params: {
          page: custPage, limit: custLimit,
          search: custSearch || undefined,
          campaignId: custFilterCampaign || undefined,
        },
      });
      const d = (res as any)?.data;
      setCustomers(d?.data || []);
      setCustTotal(d?.total || 0);
    } catch { setCustomers([]); }
    setCustLoading(false);
  }, [custPage, custLimit, custSearch, custFilterCampaign]);

  useEffect(() => { if (tab === 'campaigns') fetchCampaigns(); }, [tab, fetchCampaigns]);
  useEffect(() => { if (tab === 'customers') { fetchCustomers(); fetchCampaigns(); } }, [tab, fetchCustomers]);

  // ─── Campaign CRUD ─────────────────────────────────────────
  const openCreateCampaign = () => {
    setEditCampaign(null);
    setCamForm({
      name: '', code: '', description: '', triggerProductId: '',
      discountType: 'fixed', discountValue: '', minOrderAmount: '0',
      maxDiscountAmount: '', maxUses: '', perCustomerLimit: '1',
      expiryDays: '30', validFrom: '', validUntil: '',
      isRestricted: false, isActive: true,
    });
    setSelectedProduct(null);
    setProductSearch('');
    setProductResults([]);
    setShowProductDropdown(false);
    setShowCampaignModal(true);
  };

  const openEditCampaign = (c: CouponCampaign) => {
    setEditCampaign(c);
    const trigProdId = g(c, 'triggerProductId', 'trigger_product_id');
    setCamForm({
      name: c.name || '',
      code: c.code || '',
      description: c.description || '',
      triggerProductId: String(trigProdId || ''),
      discountType: g(c, 'discountType', 'discount_type') || 'fixed',
      discountValue: String(g(c, 'discountValue', 'discount_value') || ''),
      minOrderAmount: String(g(c, 'minOrderAmount', 'min_order_amount') || '0'),
      maxDiscountAmount: String(g(c, 'maxDiscountAmount', 'max_discount_amount') || ''),
      maxUses: String(g(c, 'maxUses', 'max_uses') || ''),
      perCustomerLimit: String(g(c, 'perCustomerLimit', 'per_customer_limit') || '1'),
      expiryDays: String(g(c, 'expiryDays', 'expiry_days') || '30'),
      validFrom: g(c, 'validFrom', 'valid_from') ? new Date(g(c, 'validFrom', 'valid_from')).toISOString().split('T')[0] : '',
      validUntil: g(c, 'validUntil', 'valid_until') ? new Date(g(c, 'validUntil', 'valid_until')).toISOString().split('T')[0] : '',
      isRestricted: g(c, 'isRestricted', 'is_restricted') === true,
      isActive: g(c, 'isActive', 'is_active') !== false,
    });
    if (trigProdId) {
      setProductSearch(productNameMap[trigProdId] || `Product #${trigProdId}`);
      setSelectedProduct({ id: trigProdId, name_en: productNameMap[trigProdId] || `Product #${trigProdId}` });
    } else {
      setProductSearch('');
      setSelectedProduct(null);
    }
    setProductResults([]);
    setShowProductDropdown(false);
    setShowCampaignModal(true);
  };

  const saveCampaign = async () => {
    try {
      const payload = {
        name: camForm.name,
        code: camForm.code.trim() || null,
        description: camForm.description || null,
        triggerProductId: camForm.triggerProductId ? Number(camForm.triggerProductId) : null,
        discountType: camForm.discountType,
        discountValue: Number(camForm.discountValue) || 0,
        minOrderAmount: Number(camForm.minOrderAmount) || 0,
        maxDiscountAmount: camForm.maxDiscountAmount ? Number(camForm.maxDiscountAmount) : null,
        maxUses: camForm.maxUses ? Number(camForm.maxUses) : null,
        perCustomerLimit: Number(camForm.perCustomerLimit) || 1,
        expiryDays: Number(camForm.expiryDays) || 30,
        validFrom: camForm.validFrom || null,
        validUntil: camForm.validUntil || null,
        isRestricted: camForm.isRestricted,
        isActive: camForm.isActive,
      };
      if (editCampaign) {
        await apiClient.put(`/coupons/campaigns/${editCampaign.id}`, payload);
        showToast('Campaign updated', 'success');
      } else {
        await apiClient.post('/coupons/campaigns', payload);
        showToast('Campaign created', 'success');
      }
      setShowCampaignModal(false);
      fetchCampaigns();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to save campaign', 'error');
    }
  };

  const deleteCampaign = async (id: number) => {
    if (!confirm('Delete this campaign and all associated customer records?')) return;
    try {
      await apiClient.delete(`/coupons/campaigns/${id}`);
      showToast('Campaign deleted', 'success');
      fetchCampaigns();
    } catch { showToast('Delete failed', 'error'); }
  };

  // ─── Customer assignment handlers ──────────────────────────
  const openAddCustomer = () => {
    setAddCustForm({ campaignId: custFilterCampaign || '', customerId: '', customerPhone: '', customerName: '' });
    setShowAddCustomerModal(true);
  };

  const addCustomer = async () => {
    if (!addCustForm.campaignId) { showToast('Select a campaign', 'error'); return; }
    if (!addCustForm.customerPhone && !addCustForm.customerId) { showToast('Enter phone or customer ID', 'error'); return; }
    try {
      await apiClient.post('/coupons/customers/assign', {
        campaignId: Number(addCustForm.campaignId),
        customerId: addCustForm.customerId ? Number(addCustForm.customerId) : null,
        customerPhone: addCustForm.customerPhone || null,
        customerName: addCustForm.customerName || null,
      });
      showToast('Customer assigned', 'success');
      setShowAddCustomerModal(false);
      fetchCustomers();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to assign customer', 'error');
    }
  };

  const openBulkAdd = () => {
    setBulkForm({ campaignId: custFilterCampaign || '', phones: '' });
    setShowBulkAddModal(true);
  };

  const bulkAddCustomers = async () => {
    if (!bulkForm.campaignId) { showToast('Select a campaign', 'error'); return; }
    const lines = bulkForm.phones.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { showToast('Enter at least one phone number', 'error'); return; }
    setBulkLoading(true);
    try {
      const customers = lines.map(line => ({ customerPhone: line }));
      const res = await apiClient.post('/coupons/customers/bulk-assign', {
        campaignId: Number(bulkForm.campaignId),
        customers,
      });
      const result = res.data;
      showToast(`Added: ${result.added}, Skipped: ${result.skipped} (total: ${result.total})`, 'success');
      setShowBulkAddModal(false);
      fetchCustomers();
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Bulk add failed', 'error');
    }
    setBulkLoading(false);
  };

  const removeCustomer = async (id: number) => {
    if (!confirm('Remove this customer from the campaign?')) return;
    try {
      await apiClient.delete(`/coupons/customers/${id}`);
      showToast('Customer removed', 'success');
      fetchCustomers();
    } catch { showToast('Remove failed', 'error'); }
  };

  // ─── Pagination ────────────────────────────────────────────
  const camPages = Math.ceil(camTotal / camLimit) || 1;
  const custPages = Math.ceil(custTotal / custLimit) || 1;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaTicketAlt className="text-orange-500" /> Coupon Management
          </h1>
          <p className="text-sm text-gray-500">Create campaigns with coupon codes and manage customer access</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button onClick={() => setTab('campaigns')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === 'campaigns' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Campaigns
          </button>
          <button onClick={() => setTab('customers')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === 'customers' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <FaUsers className="inline mr-1" /> Customers
          </button>
        </div>

        {/* ═══════ CAMPAIGNS TAB ═══════ */}
        {tab === 'campaigns' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={camSearch} onChange={(e) => { setCamSearch(e.target.value); setCamPage(1); }}
                  placeholder="Search campaigns or codes..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <button onClick={openCreateCampaign} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium">
                <FaPlus /> New Campaign
              </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              {camLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : campaigns.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No campaigns found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coupon Code</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Validity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Access</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {campaigns.map((c) => {
                        const dtype = g(c, 'discountType', 'discount_type') || 'fixed';
                        const dval = g(c, 'discountValue', 'discount_value') || 0;
                        const usageCount = g(c, 'usageCount', 'usage_count') || 0;
                        const maxUses = g(c, 'maxUses', 'max_uses');
                        const perCustLimit = g(c, 'perCustomerLimit', 'per_customer_limit') || 1;
                        const restricted = g(c, 'isRestricted', 'is_restricted') === true;
                        const active = g(c, 'isActive', 'is_active') !== false;
                        const validFrom = g(c, 'validFrom', 'valid_from');
                        const validUntil = g(c, 'validUntil', 'valid_until');
                        const code = c.code;

                        return (
                          <tr key={c.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 text-sm">{c.name}</div>
                              {c.description && <div className="text-xs text-gray-500 truncate max-w-[200px]">{c.description}</div>}
                            </td>
                            <td className="px-4 py-3">
                              {code ? (
                                <span className="font-mono text-sm font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded">{code}</span>
                              ) : (
                                <span className="text-xs text-gray-400">No code</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {dtype === 'percentage' ? `${dval}%` : `৳${dval}`}
                              {g(c, 'minOrderAmount', 'min_order_amount') > 0 && (
                                <div className="text-xs text-gray-500">Min ৳{g(c, 'minOrderAmount', 'min_order_amount')}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <span className="font-medium">{usageCount}</span>
                              {maxUses ? ` / ${maxUses}` : ''}
                              <div className="text-xs text-gray-500">{perCustLimit}x per customer</div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {validFrom || validUntil ? (
                                <div className="text-xs">
                                  {validFrom && <div>From: {new Date(validFrom).toLocaleDateString()}</div>}
                                  {validUntil && <div>Until: {new Date(validUntil).toLocaleDateString()}</div>}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">No date limit</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {restricted ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                  <FaLock className="text-[10px]" /> Restricted
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                  <FaGlobe className="text-[10px]" /> Open
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button onClick={() => openEditCampaign(c)} className="text-blue-600 hover:text-blue-800" title="Edit"><FaEdit /></button>
                                <button onClick={() => deleteCampaign(c.id)} className="text-red-600 hover:text-red-800" title="Delete"><FaTrash /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {camTotal > camLimit && (
                <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between text-sm">
                  <div className="text-gray-600">Page {camPage} of {camPages} ({camTotal} campaigns)</div>
                  <div className="flex items-center gap-2">
                    <PageSizeSelector value={camLimit} onChange={(s) => { setCamLimit(s); setCamPage(1); }} options={[10, 20, 50]} />
                    <button disabled={camPage <= 1} onClick={() => setCamPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">Prev</button>
                    <button disabled={camPage >= camPages} onClick={() => setCamPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════ CUSTOMERS TAB ═══════ */}
        {tab === 'customers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap flex-1">
                <div className="relative min-w-[200px] max-w-sm flex-1">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={custSearch} onChange={(e) => { setCustSearch(e.target.value); setCustPage(1); }}
                    placeholder="Search phone or name..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <select value={custFilterCampaign} onChange={(e) => { setCustFilterCampaign(e.target.value); setCustPage(1); }}
                  className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">All Campaigns</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={openBulkAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                  <FaUpload /> Bulk Add
                </button>
                <button onClick={openAddCustomer} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                  <FaPlus /> Add Customer
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              {custLoading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : customers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No customer assignments found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Times Used</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {customers.map((cc) => {
                        const custId = g(cc, 'customerId', 'customer_id');
                        const phone = g(cc, 'customerPhone', 'customer_phone');
                        const custName = g(cc, 'customerName', 'customer_name');
                        const timesUsed = g(cc, 'timesUsed', 'times_used') || 0;
                        const lastUsed = g(cc, 'lastUsedAt', 'last_used_at');
                        const lastOrder = g(cc, 'lastUsedOrderId', 'last_used_order_id');
                        const active = g(cc, 'isActive', 'is_active') !== false;
                        const campName = cc.campaign?.name || `Campaign #${g(cc, 'campaignId', 'campaign_id')}`;

                        return (
                          <tr key={cc.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{campName}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {custName || (custId ? `Customer #${custId}` : '—')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">{phone || '—'}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`font-medium ${timesUsed > 0 ? 'text-green-700' : 'text-gray-400'}`}>{timesUsed}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {lastUsed ? (
                                <div>
                                  <div>{new Date(lastUsed).toLocaleDateString()}</div>
                                  {lastOrder && <div className="text-xs text-gray-500">Order #{lastOrder}</div>}
                                </div>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => removeCustomer(cc.id)} className="text-red-600 hover:text-red-800" title="Remove"><FaTrash /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {custTotal > custLimit && (
                <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between text-sm">
                  <div className="text-gray-600">Page {custPage} of {custPages} ({custTotal} customers)</div>
                  <div className="flex items-center gap-2">
                    <PageSizeSelector value={custLimit} onChange={(s) => { setCustLimit(s); setCustPage(1); }} options={[10, 20, 50, 100]} />
                    <button disabled={custPage <= 1} onClick={() => setCustPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">Prev</button>
                    <button disabled={custPage >= custPages} onClick={() => setCustPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-100">Next</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════ CAMPAIGN CREATE/EDIT MODAL ═══════ */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editCampaign ? 'Edit Campaign' : 'New Campaign'}</h2>
              <button onClick={() => setShowCampaignModal(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name *</label>
                <input value={camForm.name} onChange={(e) => setCamForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="e.g. Summer Sale 2026" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
                <input value={camForm.code} onChange={(e) => setCamForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="e.g. SAVE100, SUMMER20" />
                <p className="text-xs text-gray-500 mt-1">This is the code customers will enter at checkout to get the discount</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={camForm.description} onChange={(e) => setCamForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" rows={2} />
              </div>

              {/* Trigger Product */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Product (optional)</label>
                <div className="relative">
                  <div className="flex items-center border rounded-lg focus-within:ring-2 focus-within:ring-orange-400">
                    <FaSearch className="ml-3 text-gray-400 flex-shrink-0" />
                    <input value={productSearch} onChange={(e) => searchProducts(e.target.value)}
                      onFocus={() => { if (productResults.length > 0) setShowProductDropdown(true); }}
                      className="flex-1 px-3 py-2 text-sm outline-none rounded-lg" placeholder="Search product by name..." />
                    {selectedProduct && (
                      <button type="button" onClick={clearProduct} className="mr-2 text-gray-400 hover:text-gray-600"><FaTimes /></button>
                    )}
                  </div>
                  {showProductDropdown && productResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {productResults.map((product) => (
                        <button key={product.id} type="button" onClick={() => selectProduct(product)}
                          className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 text-left ${selectedProduct?.id === product.id ? 'bg-orange-50' : ''}`}>
                          {selectedProduct?.id === product.id && <FaCheck className="text-orange-500 flex-shrink-0" />}
                          {product.image_url && <img src={product.image_url} alt={product.name_en} className="w-10 h-10 object-cover rounded flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{product.name_en || product.name}</p>
                            <p className="text-xs text-gray-500">SKU: {product.sku || '—'} | ৳{Number(product.base_price || 0).toFixed(2)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedProduct && (
                  <div className="mt-2 p-2 bg-orange-50 rounded-lg text-sm text-orange-800 flex items-center gap-2">
                    <FaCheck className="text-orange-500" /> Selected: {selectedProduct.name_en || selectedProduct.name}
                  </div>
                )}
              </div>

              {/* Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                  <select value={camForm.discountType} onChange={(e) => setCamForm(f => ({ ...f, discountType: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    <option value="fixed">Fixed Amount (৳)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value *</label>
                  <input value={camForm.discountValue} onChange={(e) => setCamForm(f => ({ ...f, discountValue: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" type="number" step="0.01"
                    placeholder={camForm.discountType === 'percentage' ? 'e.g. 10' : 'e.g. 100'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount (৳)</label>
                  <input value={camForm.minOrderAmount} onChange={(e) => setCamForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" type="number" step="0.01" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (৳)</label>
                  <input value={camForm.maxDiscountAmount} onChange={(e) => setCamForm(f => ({ ...f, maxDiscountAmount: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" type="number" step="0.01" placeholder="For % type (optional)" />
                </div>
              </div>

              {/* Usage limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Total Uses</label>
                  <input value={camForm.maxUses} onChange={(e) => setCamForm(f => ({ ...f, maxUses: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" type="number" placeholder="Unlimited" />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uses Per Customer</label>
                  <input value={camForm.perCustomerLimit} onChange={(e) => setCamForm(f => ({ ...f, perCustomerLimit: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" type="number" placeholder="1" />
                </div>
              </div>

              {/* Validity dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                  <input value={camForm.validFrom} onChange={(e) => setCamForm(f => ({ ...f, validFrom: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" type="date" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input value={camForm.validUntil} onChange={(e) => setCamForm(f => ({ ...f, validUntil: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" type="date" />
                </div>
              </div>

              {/* Restricted + Active */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={camForm.isRestricted} onChange={(e) => setCamForm(f => ({ ...f, isRestricted: e.target.checked }))}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-400" />
                  <span className="font-medium">Restricted to assigned customers only</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={camForm.isActive} onChange={(e) => setCamForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-400" />
                  Active
                </label>
              </div>
              {camForm.isRestricted && (
                <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded-lg">
                  <FaLock className="inline mr-1" /> Only customers you add in the &quot;Customers&quot; tab will be able to use this coupon code.
                </p>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowCampaignModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={saveCampaign} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 font-medium">
                {editCampaign ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ ADD CUSTOMER MODAL ═══════ */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Add Customer to Campaign</h2>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign *</label>
                <select value={addCustForm.campaignId} onChange={(e) => setAddCustForm(f => ({ ...f, campaignId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Select campaign</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone *</label>
                <input value={addCustForm.customerPhone} onChange={(e) => setAddCustForm(f => ({ ...f, customerPhone: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="e.g. 01712345678" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input value={addCustForm.customerName} onChange={(e) => setAddCustForm(f => ({ ...f, customerName: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                <input value={addCustForm.customerId} onChange={(e) => setAddCustForm(f => ({ ...f, customerId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" type="number" placeholder="Optional (for registered customers)" />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowAddCustomerModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={addCustomer} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 font-medium">Add Customer</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ BULK ADD MODAL ═══════ */}
      {showBulkAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Bulk Add Customers</h2>
              <button onClick={() => setShowBulkAddModal(false)} className="text-gray-400 hover:text-gray-600"><FaTimes /></button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign *</label>
                <select value={bulkForm.campaignId} onChange={(e) => setBulkForm(f => ({ ...f, campaignId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">Select campaign</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Numbers (one per line) *</label>
                <textarea value={bulkForm.phones} onChange={(e) => setBulkForm(f => ({ ...f, phones: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono"
                  rows={8} placeholder={"01712345678\n01812345678\n01912345678"} />
                <p className="text-xs text-gray-500 mt-1">
                  {bulkForm.phones.split('\n').filter(l => l.trim()).length} phone numbers entered. Duplicates will be automatically skipped.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowBulkAddModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={bulkAddCustomers} disabled={bulkLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium disabled:opacity-50">
                {bulkLoading ? 'Adding...' : 'Add All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
