import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { products as productsApi, stockLevels, warehouses } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { FaBoxes, FaEdit, FaSearch, FaSync, FaTimes, FaWarehouse } from 'react-icons/fa';

type ProductRow = {
  id: number;
  name: string;
  sku?: string;
  status?: string;
  stock?: number;
  categoryId?: number;
};

export default function AvailableProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [warehouseList, setWarehouseList] = useState<any[]>([]);
  const [warehouseMap, setWarehouseMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    warehouse_id: '',
    quantity: '0',
    reserved_quantity: '0',
    damaged_quantity: '0',
    cost_price: '',
    location_id: '',
    batch_id: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [productData, levelData, warehouseData] = await Promise.all([
        productsApi.listAll(),
        stockLevels.list(),
        warehouses.list(),
      ]);
      setProducts(Array.isArray(productData) ? productData : []);
      setLevels(Array.isArray(levelData) ? levelData : []);
      setWarehouseList(Array.isArray(warehouseData) ? warehouseData : []);
      const map: Record<number, string> = {};
      warehouseData.forEach((warehouse: any) => { map[warehouse.id] = warehouse.name; });
      setWarehouseMap(map);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load available products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openEdit = async (product: ProductRow) => {
    setEditingProduct(product);
    setEditLoading(true);
    try {
      const productLevels = await stockLevels.byProduct(product.id);
      const primaryLevel = Array.isArray(productLevels) && productLevels.length > 0 ? productLevels[0] : null;
      setEditForm({
        warehouse_id: String(primaryLevel?.warehouse_id || warehouseList[0]?.id || ''),
        quantity: String(primaryLevel?.quantity ?? 0),
        reserved_quantity: String(primaryLevel?.reserved_quantity ?? 0),
        damaged_quantity: String(primaryLevel?.damaged_quantity ?? 0),
        cost_price: primaryLevel?.cost_price != null ? String(primaryLevel.cost_price) : '',
        location_id: primaryLevel?.location_id != null ? String(primaryLevel.location_id) : '',
        batch_id: primaryLevel?.batch_id != null ? String(primaryLevel.batch_id) : '',
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load inventory details');
      setEditingProduct(null);
    } finally {
      setEditLoading(false);
    }
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditingProduct(null);
  };

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingProduct) return;
    setEditSaving(true);
    try {
      await stockLevels.upsert({
        product_id: editingProduct.id,
        warehouse_id: Number(editForm.warehouse_id),
        quantity: Number(editForm.quantity || 0),
        reserved_quantity: Number(editForm.reserved_quantity || 0),
        damaged_quantity: Number(editForm.damaged_quantity || 0),
        cost_price: editForm.cost_price === '' ? null : Number(editForm.cost_price),
        location_id: editForm.location_id === '' ? null : Number(editForm.location_id),
        batch_id: editForm.batch_id === '' ? null : Number(editForm.batch_id),
      });
      toast.success('Inventory stock updated successfully');
      setEditingProduct(null);
      await loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to update inventory stock');
    } finally {
      setEditSaving(false);
    }
  };

  const stockByProduct = useMemo(() => {
    const map = new Map<number, { total: number; available: number; reserved: number; warehouses: any[] }>();
    levels.forEach((level: any) => {
      const productId = Number(level.product_id);
      const current = map.get(productId) || { total: 0, available: 0, reserved: 0, warehouses: [] };
      const total = Number(level.quantity ?? level.total_quantity ?? 0);
      const reserved = Number(level.reserved_quantity ?? 0);
      const available = Number(level.available_quantity ?? level.available ?? Math.max(0, total - reserved));
      current.total += total;
      current.available += available;
      current.reserved += reserved;
      current.warehouses.push({ ...level, total, available, reserved });
      map.set(productId, current);
    });
    return map;
  }, [levels]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .map((product) => {
        const stock = stockByProduct.get(product.id) || { total: Number(product.stock || 0), available: Number(product.stock || 0), reserved: 0, warehouses: [] };
        return { product, stock };
      })
      .filter(({ product, stock }) => {
        if (status !== 'all' && product.status !== status) return false;
        if (availability === 'available' && stock.available <= 0) return false;
        if (availability === 'out' && stock.available > 0) return false;
        if (!query) return true;
        return `${product.name} ${product.sku || ''} ${product.id}`.toLowerCase().includes(query);
      });
  }, [availability, products, search, status, stockByProduct]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.products += 1;
        acc.available += row.stock.available;
        acc.reserved += row.stock.reserved;
        if (row.stock.available <= 0) acc.out += 1;
        return acc;
      },
      { products: 0, available: 0, reserved: 0, out: 0 },
    );
  }, [rows]);

  return (
    <AdminLayout>
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaBoxes className="text-blue-600" /> Available Products
          </h1>
          <button onClick={loadData} className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
            <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Metric label="Products" value={totals.products} />
          <Metric label="Available Units" value={totals.available} tone="green" />
          <Metric label="Reserved Units" value={totals.reserved} tone="amber" />
          <Metric label="Out of Stock" value={totals.out} tone="red" />
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_180px] gap-3">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" placeholder="Search product name, SKU, or ID" />
            </div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="draft">Draft</option>
            </select>
            <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
              <option value="all">All availability</option>
              <option value="available">Available stock</option>
              <option value="out">Out of stock</option>
            </select>
          </div>
        </div>

        <div className="bg-white border rounded-lg overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading products...</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No products match the current filters</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Reserved</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map(({ product, stock }) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{product.name}</div>
                      <div className="text-xs text-gray-400">SKU: {product.sku || 'N/A'} | ID: {product.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {product.status || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{stock.total}</td>
                    <td className="px-4 py-3 text-right">{stock.reserved}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${stock.available > 0 ? 'text-green-700' : 'text-red-600'}`}>{stock.available}</td>
                    <td className="px-4 py-3 min-w-[260px]">
                      {stock.warehouses.length === 0 ? (
                        <span className="text-gray-400">No warehouse stock</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {stock.warehouses.slice(0, 4).map((level: any, index: number) => (
                            <span key={`${product.id}-${level.warehouse_id}-${index}`} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">
                              <FaWarehouse /> {warehouseMap[level.warehouse_id] || `#${level.warehouse_id}`}: {level.available}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(product)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        title="Edit product"
                      >
                        <FaEdit /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editingProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Edit Inventory Stock</h2>
                <p className="text-sm text-gray-500">{editingProduct.name} {editingProduct.sku ? `- ${editingProduct.sku}` : ''}</p>
              </div>
              <button type="button" onClick={closeEdit} className="rounded p-2 text-gray-500 hover:bg-gray-100" title="Close">
                <FaTimes />
              </button>
            </div>

            {editLoading ? (
              <div className="p-8 text-center text-gray-500">Loading inventory details...</div>
            ) : (
              <form onSubmit={saveEdit} className="space-y-4 p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Warehouse</span>
                    <select
                      value={editForm.warehouse_id}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, warehouse_id: e.target.value }))}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Select warehouse</option>
                      {warehouseList.map((warehouse: any) => (
                        <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Stock Quantity</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, quantity: e.target.value }))}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Reserved Quantity</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editForm.reserved_quantity}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, reserved_quantity: e.target.value }))}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Damaged Quantity</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editForm.damaged_quantity}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, damaged_quantity: e.target.value }))}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Cost Price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.cost_price}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, cost_price: e.target.value }))}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Location ID</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editForm.location_id}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, location_id: e.target.value }))}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700">Batch ID</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={editForm.batch_id}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, batch_id: e.target.value }))}
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                  <button type="button" onClick={closeEdit} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50" disabled={editSaving}>
                    Cancel
                  </button>
                  <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60" disabled={editSaving}>
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}

function Metric({ label, value, tone = 'blue' }: { label: string; value: number; tone?: 'blue' | 'green' | 'amber' | 'red' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  };
  return (
    <div className={`border rounded-lg p-4 ${tones[tone]}`}>
      <p className="text-xs uppercase font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
    </div>
  );
}
