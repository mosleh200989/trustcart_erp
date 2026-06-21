import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import AdminDateInput from '@/components/admin/AdminDateInput';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { FaCalculator, FaEdit, FaPlus, FaSave, FaTrash } from 'react-icons/fa';

type LineItem = {
  description: string;
  usdAmount: number;
  exchangeRate: number;
  bankCharge: number;
  vatAmount: number;
  taxAmount: number;
  otherCost: number;
};

type DollarRecord = {
  id: number;
  title: string;
  calculationDate: string;
  vendorName?: string | null;
  referenceNo?: string | null;
  usdAmount: number;
  exchangeRate: number;
  bdtAmount: number;
  bankCharge: number;
  vatAmount: number;
  taxAmount: number;
  otherCost: number;
  totalBdt: number;
  effectiveRate: number;
  lineItems: any[];
  notes?: string | null;
};

const emptyLine: LineItem = {
  description: '',
  usdAmount: 0,
  exchangeRate: 0,
  bankCharge: 0,
  vatAmount: 0,
  taxAmount: 0,
  otherCost: 0,
};

const today = () => new Date().toISOString().slice(0, 10);

const money = (value: any, currency = '৳') => `${currency}${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const usd = (value: any) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;

export default function DollarConsumptionPage() {
  const toast = useToast();
  const { hasAnyPermission } = useAuth();
  const canView = hasAnyPermission(['view-dollar-consumption', 'manage-dollar-consumption']);
  const canCreate = hasAnyPermission(['create-dollar-consumption', 'manage-dollar-consumption']);
  const canEdit = hasAnyPermission(['edit-dollar-consumption', 'manage-dollar-consumption']);
  const canDelete = hasAnyPermission(['delete-dollar-consumption', 'manage-dollar-consumption']);

  const [records, setRecords] = useState<DollarRecord[]>([]);
  const [summary, setSummary] = useState({ count: 0, usdAmount: 0, totalBdt: 0, extraCost: 0, averageEffectiveRate: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filters, setFilters] = useState({ search: '', startDate: '', endDate: '' });
  const [form, setForm] = useState({
    title: '',
    calculationDate: today(),
    vendorName: '',
    referenceNo: '',
    notes: '',
    lineItems: [{ ...emptyLine }],
  });

  const lineTotals = useMemo(() => {
    return form.lineItems.map((line) => {
      const usdAmount = Number(line.usdAmount || 0);
      const exchangeRate = Number(line.exchangeRate || 0);
      const bdtAmount = usdAmount * exchangeRate;
      const extra = Number(line.bankCharge || 0) + Number(line.vatAmount || 0) + Number(line.taxAmount || 0) + Number(line.otherCost || 0);
      return { bdtAmount, totalBdt: bdtAmount + extra };
    });
  }, [form.lineItems]);

  const formTotals = useMemo(() => {
    const usdAmount = form.lineItems.reduce((sum, line) => sum + Number(line.usdAmount || 0), 0);
    const bdtAmount = lineTotals.reduce((sum, line) => sum + line.bdtAmount, 0);
    const totalBdt = lineTotals.reduce((sum, line) => sum + line.totalBdt, 0);
    const extraCost = totalBdt - bdtAmount;
    return {
      usdAmount,
      bdtAmount,
      extraCost,
      totalBdt,
      effectiveRate: usdAmount > 0 ? totalBdt / usdAmount : 0,
    };
  }, [form.lineItems, lineTotals]);

  const loadData = async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: any = {};
      if (filters.search.trim()) params.search = filters.search.trim();
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      const [listRes, summaryRes] = await Promise.all([
        apiClient.get('/accounting/dollar-consumptions', { params }),
        apiClient.get('/accounting/dollar-consumptions/summary'),
      ]);
      setRecords(Array.isArray(listRes.data?.data) ? listRes.data.data : []);
      setSummary(summaryRes.data || summary);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load dollar consumption records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateLine = (index: number, field: keyof LineItem, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((line, i) => (
        i === index ? { ...line, [field]: field === 'description' ? String(value) : Number(value) } : line
      )),
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      calculationDate: today(),
      vendorName: '',
      referenceNo: '',
      notes: '',
      lineItems: [{ ...emptyLine }],
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId ? !canEdit : !canCreate) {
      toast.error('You do not have permission for this action');
      return;
    }
    if (!form.title.trim()) {
      toast.warning('Title is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        lineItems: form.lineItems.filter((line) => line.description.trim() || Number(line.usdAmount || 0) > 0),
      };
      if (editingId) {
        await apiClient.put(`/accounting/dollar-consumptions/${editingId}`, payload);
        toast.success('Dollar consumption calculation updated');
      } else {
        await apiClient.post('/accounting/dollar-consumptions', payload);
        toast.success('Dollar consumption calculation saved');
      }
      resetForm();
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save calculation');
    } finally {
      setSaving(false);
    }
  };

  const editRecord = (record: DollarRecord) => {
    setEditingId(record.id);
    setForm({
      title: record.title || '',
      calculationDate: String(record.calculationDate || today()).slice(0, 10),
      vendorName: record.vendorName || '',
      referenceNo: record.referenceNo || '',
      notes: record.notes || '',
      lineItems: (record.lineItems?.length ? record.lineItems : [{ ...emptyLine }]).map((line: any) => ({
        description: line.description || '',
        usdAmount: Number(line.usdAmount || 0),
        exchangeRate: Number(line.exchangeRate || record.exchangeRate || 0),
        bankCharge: Number(line.bankCharge || 0),
        vatAmount: Number(line.vatAmount || 0),
        taxAmount: Number(line.taxAmount || 0),
        otherCost: Number(line.otherCost || 0),
      })),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteRecord = async (record: DollarRecord) => {
    if (!canDelete) return;
    if (!confirm(`Delete "${record.title}"?`)) return;
    try {
      await apiClient.delete(`/accounting/dollar-consumptions/${record.id}`);
      toast.success('Calculation deleted');
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete calculation');
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-800">
              <FaCalculator className="text-emerald-600" />
              Dollar Consumption
            </h1>
            <p className="mt-1 text-gray-600">Calculate USD usage, conversion value, charges, tax, and final BDT consumption.</p>
          </div>
        </div>

        {!canView ? (
          <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">You do not have permission to view this panel.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="text-sm text-gray-500">Calculations</div>
                <div className="mt-1 text-2xl font-bold text-gray-900">{summary.count}</div>
              </div>
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="text-sm text-gray-500">Total USD</div>
                <div className="mt-1 text-2xl font-bold text-blue-700">{usd(summary.usdAmount)}</div>
              </div>
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="text-sm text-gray-500">Total BDT</div>
                <div className="mt-1 text-2xl font-bold text-emerald-700">{money(summary.totalBdt)}</div>
              </div>
              <div className="rounded-lg bg-white p-5 shadow">
                <div className="text-sm text-gray-500">Avg Effective Rate</div>
                <div className="mt-1 text-2xl font-bold text-purple-700">৳{Number(summary.averageEffectiveRate || 0).toFixed(4)}</div>
              </div>
            </div>

            {(canCreate || (editingId && canEdit)) && (
              <form onSubmit={submit} className="rounded-lg bg-white p-6 shadow space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Calculation Title</label>
                    <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Example: Meta ads spend May" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                    <input type="date" value={form.calculationDate} onChange={(e) => setForm((p) => ({ ...p, calculationDate: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Reference</label>
                    <input value={form.referenceNo} onChange={(e) => setForm((p) => ({ ...p, referenceNo: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Invoice / transaction ID" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Vendor / Purpose</label>
                    <input value={form.vendorName} onChange={(e) => setForm((p) => ({ ...p, vendorName: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Vendor, ad platform, supplier..." />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Notes</label>
                    <input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Optional internal note" />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right">USD</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-right">BDT</th>
                        <th className="px-3 py-2 text-right">Bank</th>
                        <th className="px-3 py-2 text-right">VAT</th>
                        <th className="px-3 py-2 text-right">Tax</th>
                        <th className="px-3 py-2 text-right">Other</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {form.lineItems.map((line, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2"><input value={line.description} onChange={(e) => updateLine(index, 'description', e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1" /></td>
                          <td className="px-3 py-2"><input type="number" step="0.0001" value={line.usdAmount} onChange={(e) => updateLine(index, 'usdAmount', e.target.value)} className="w-24 rounded border border-gray-300 px-2 py-1 text-right" /></td>
                          <td className="px-3 py-2"><input type="number" step="0.0001" value={line.exchangeRate} onChange={(e) => updateLine(index, 'exchangeRate', e.target.value)} className="w-24 rounded border border-gray-300 px-2 py-1 text-right" /></td>
                          <td className="px-3 py-2 text-right font-medium">{money(lineTotals[index]?.bdtAmount)}</td>
                          <td className="px-3 py-2"><input type="number" step="0.01" value={line.bankCharge} onChange={(e) => updateLine(index, 'bankCharge', e.target.value)} className="w-24 rounded border border-gray-300 px-2 py-1 text-right" /></td>
                          <td className="px-3 py-2"><input type="number" step="0.01" value={line.vatAmount} onChange={(e) => updateLine(index, 'vatAmount', e.target.value)} className="w-24 rounded border border-gray-300 px-2 py-1 text-right" /></td>
                          <td className="px-3 py-2"><input type="number" step="0.01" value={line.taxAmount} onChange={(e) => updateLine(index, 'taxAmount', e.target.value)} className="w-24 rounded border border-gray-300 px-2 py-1 text-right" /></td>
                          <td className="px-3 py-2"><input type="number" step="0.01" value={line.otherCost} onChange={(e) => updateLine(index, 'otherCost', e.target.value)} className="w-24 rounded border border-gray-300 px-2 py-1 text-right" /></td>
                          <td className="px-3 py-2 text-right font-semibold">{money(lineTotals[index]?.totalBdt)}</td>
                          <td className="px-3 py-2 text-right">
                            <button type="button" onClick={() => setForm((p) => ({ ...p, lineItems: p.lineItems.filter((_, i) => i !== index) }))} disabled={form.lineItems.length === 1} className="rounded bg-red-50 p-2 text-red-600 disabled:opacity-40">
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <button type="button" onClick={() => setForm((p) => ({ ...p, lineItems: [...p.lineItems, { ...emptyLine }] }))} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">
                    <FaPlus /> Add Line
                  </button>
                  <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                    <div><span className="block text-gray-500">USD</span><strong>{usd(formTotals.usdAmount)}</strong></div>
                    <div><span className="block text-gray-500">BDT</span><strong>{money(formTotals.bdtAmount)}</strong></div>
                    <div><span className="block text-gray-500">Extra Cost</span><strong>{money(formTotals.extraCost)}</strong></div>
                    <div><span className="block text-gray-500">Effective Rate</span><strong>৳{formTotals.effectiveRate.toFixed(4)}</strong></div>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  {editingId && <button type="button" onClick={resetForm} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700">Cancel</button>}
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                    <FaSave /> {saving ? 'Saving...' : editingId ? 'Update Calculation' : 'Save Calculation'}
                  </button>
                </div>
              </form>
            )}

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <input value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))} className="rounded-md border border-gray-300 px-3 py-2 md:col-span-2" placeholder="Search title, vendor, reference" />
                <AdminDateInput value={filters.startDate} onValueChange={(value) => setFilters((p) => ({ ...p, startDate: value }))} className="rounded-md border border-gray-300 px-3 py-2" />
                <div className="flex gap-2">
                  <AdminDateInput value={filters.endDate} onValueChange={(value) => setFilters((p) => ({ ...p, endDate: value }))} className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2" />
                  <button onClick={loadData} className="rounded-md bg-gray-800 px-4 py-2 text-sm font-semibold text-white">Filter</button>
                </div>
              </div>

              {loading ? (
                <div className="py-10 text-center text-gray-500">Loading calculations...</div>
              ) : records.length === 0 ? (
                <div className="py-10 text-center text-gray-500">No dollar consumption calculations found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Title</th>
                        <th className="px-4 py-3 text-left">Vendor</th>
                        <th className="px-4 py-3 text-right">USD</th>
                        <th className="px-4 py-3 text-right">Base BDT</th>
                        <th className="px-4 py-3 text-right">Extra Cost</th>
                        <th className="px-4 py-3 text-right">Total BDT</th>
                        <th className="px-4 py-3 text-right">Eff. Rate</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">{String(record.calculationDate).slice(0, 10)}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900">{record.title}</div>
                            {record.referenceNo && <div className="text-xs text-gray-500">{record.referenceNo}</div>}
                          </td>
                          <td className="px-4 py-3">{record.vendorName || '-'}</td>
                          <td className="px-4 py-3 text-right font-medium">{usd(record.usdAmount)}</td>
                          <td className="px-4 py-3 text-right">{money(record.bdtAmount)}</td>
                          <td className="px-4 py-3 text-right">{money(Number(record.bankCharge || 0) + Number(record.vatAmount || 0) + Number(record.taxAmount || 0) + Number(record.otherCost || 0))}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700">{money(record.totalBdt)}</td>
                          <td className="px-4 py-3 text-right">৳{Number(record.effectiveRate || 0).toFixed(4)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex gap-2">
                              {canEdit && <button onClick={() => editRecord(record)} className="rounded bg-blue-50 p-2 text-blue-600"><FaEdit /></button>}
                              {canDelete && <button onClick={() => deleteRecord(record)} className="rounded bg-red-50 p-2 text-red-600"><FaTrash /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
