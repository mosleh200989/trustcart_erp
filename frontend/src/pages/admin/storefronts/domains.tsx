// Storefronts → Domains: map custom domains to storefronts or landing pages.
// Replaces the hardcoded middleware maps; DNS + nginx + SSL remain server steps.
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import {
  FaPlus, FaTrash, FaGlobe, FaEye, FaEyeSlash, FaExternalLinkAlt, FaSync,
} from 'react-icons/fa';

interface DomainRow {
  id: number;
  domain: string;
  target_type: 'storefront' | 'landing_page';
  storefront_id: number | null;
  landing_page_id: number | null;
  is_active: boolean;
  notes: string | null;
  target_name: string;
  target_slug: string | null;
}

interface DnsResult {
  addresses: string[];
  expected: string | null;
  ok: boolean | null;
  error?: string;
}

export default function StorefrontDomains() {
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [storefronts, setStorefronts] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [dns, setDns] = useState<Record<number, DnsResult | 'checking'>>({});
  const [form, setForm] = useState({
    domain: '', target_type: 'landing_page' as 'landing_page' | 'storefront',
    storefront_id: '', landing_page_id: '', notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [domainsRes, sfRes, lpRes] = await Promise.all([
        apiClient.get('/storefront-domains'),
        apiClient.get('/storefronts'),
        apiClient.get('/landing-pages'),
      ]);
      setRows(domainsRes.data || []);
      setStorefronts(sfRes.data || []);
      setPages(lpRes.data || []);
    } catch (err) {
      console.error('Failed to load domains:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await apiClient.post('/storefront-domains', {
        domain: form.domain,
        target_type: form.target_type,
        storefront_id: form.target_type === 'storefront' ? Number(form.storefront_id) : null,
        landing_page_id: form.target_type === 'landing_page' ? Number(form.landing_page_id) : null,
        notes: form.notes || null,
      });
      setShowCreate(false);
      setForm({ domain: '', target_type: 'landing_page', storefront_id: '', landing_page_id: '', notes: '' });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add the domain mapping');
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (row: DomainRow) => {
    try {
      await apiClient.put(`/storefront-domains/${row.id}`, { is_active: !row.is_active });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const remove = async (id: number) => {
    try {
      await apiClient.delete(`/storefront-domains/${id}`);
      setDeleteConfirm(null);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const checkDns = async (id: number) => {
    setDns((d) => ({ ...d, [id]: 'checking' }));
    try {
      const res = await apiClient.get(`/storefront-domains/${id}/dns-check`);
      setDns((d) => ({ ...d, [id]: res.data }));
    } catch {
      setDns((d) => ({ ...d, [id]: { addresses: [], expected: null, ok: false, error: 'Check failed' } }));
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaGlobe className="text-brand" /> Domains
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-button flex items-center gap-2 text-sm font-medium"
          >
            <FaPlus /> Map Domain
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-6 max-w-3xl">
          Point a domain at a storefront (whole site) or a landing page (root URL). Changes apply within a minute — no deploy.
          DNS records, nginx and the SSL certificate are still one-time server steps per domain (see docs/operations).
        </p>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading domains…</div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-card border border-gray-200 p-12 text-center text-gray-500">
            No domain mappings yet.
          </div>
        ) : (
          <div className="bg-white rounded-card border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Domain</th>
                  <th className="text-left px-4 py-3">Serves</th>
                  <th className="text-left px-4 py-3">DNS</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => {
                  const dnsState = dns[row.id];
                  return (
                    <tr key={row.id} className={row.is_active ? '' : 'opacity-50'}>
                      <td className="px-4 py-3">
                        <a
                          href={`https://${row.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-gray-900 hover:text-brand flex items-center gap-1.5"
                        >
                          {row.domain} <FaExternalLinkAlt className="text-[10px] text-gray-300" />
                        </a>
                        {row.notes && <div className="text-xs text-gray-400">{row.notes}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-badge font-medium mr-2 ${
                            row.target_type === 'storefront'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {row.target_type === 'storefront' ? 'Storefront' : 'Landing page'}
                        </span>
                        <span className="text-gray-800">{row.target_name}</span>
                        {row.target_slug && (
                          <span className="text-xs text-gray-400 font-mono ml-1">/{row.target_slug}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {dnsState === 'checking' ? (
                          <span className="text-xs text-gray-400">Checking…</span>
                        ) : dnsState ? (
                          <span
                            className={`text-xs font-medium ${
                              dnsState.ok === true ? 'text-green-600' : dnsState.ok === false ? 'text-red-600' : 'text-gray-600'
                            }`}
                            title={dnsState.expected ? `Expected ${dnsState.expected}` : undefined}
                          >
                            {dnsState.error
                              ? `✗ ${dnsState.error}`
                              : dnsState.ok === true
                                ? `✓ ${dnsState.addresses.join(', ')}`
                                : dnsState.ok === false
                                  ? `✗ points to ${dnsState.addresses.join(', ') || 'nothing'}`
                                  : dnsState.addresses.join(', ')}
                          </span>
                        ) : (
                          <button onClick={() => checkDns(row.id)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                            <FaSync size={9} /> Check
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-badge font-medium ${row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {row.is_active ? 'Active' : 'Off'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => toggle(row)} className="p-2 text-gray-400 hover:text-gray-900" title={row.is_active ? 'Disable' : 'Enable'}>
                            {row.is_active ? <FaEye size={14} className="text-green-600" /> : <FaEyeSlash size={14} />}
                          </button>
                          {deleteConfirm === row.id ? (
                            <button onClick={() => remove(row.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium">Confirm</button>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(row.id)}
                              onBlur={() => setDeleteConfirm(null)}
                              className="p-2 text-gray-300 hover:text-red-600"
                              title="Delete mapping"
                            >
                              <FaTrash size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleCreate} className="bg-white rounded-card shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Map a domain</h2>

              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <input
                value={form.domain}
                onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value.trim().toLowerCase() }))}
                className="w-full border border-gray-300 rounded-card px-3 py-2 mb-1 text-sm font-mono"
                placeholder="example.com"
                required
              />
              <p className="text-xs text-gray-400 mb-3">Add www.example.com as a second mapping if needed.</p>

              <label className="block text-sm font-medium text-gray-700 mb-1">Serves</label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {([['landing_page', 'Landing page'], ['storefront', 'Storefront']] as const).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setForm((f) => ({ ...f, target_type: value }))}
                    className={`px-3 py-2 rounded-card border text-sm font-medium ${
                      form.target_type === value ? 'border-brand bg-orange-50 text-brand' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {form.target_type === 'storefront' ? (
                <select
                  value={form.storefront_id}
                  onChange={(e) => setForm((f) => ({ ...f, storefront_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-card px-3 py-2 mb-3 text-sm bg-white"
                  required
                >
                  <option value="">— pick a storefront —</option>
                  {storefronts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : (
                <select
                  value={form.landing_page_id}
                  onChange={(e) => setForm((f) => ({ ...f, landing_page_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-card px-3 py-2 mb-3 text-sm bg-white"
                  required
                >
                  <option value="">— pick a landing page —</option>
                  {pages.map((p) => <option key={p.id} value={p.id}>{p.title} (/{p.slug})</option>)}
                </select>
              )}

              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded-card px-3 py-2 mb-4 text-sm"
                placeholder="e.g. Eid campaign domain"
              />

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-button text-sm font-medium disabled:opacity-50"
                >
                  {creating ? 'Adding…' : 'Add mapping'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
