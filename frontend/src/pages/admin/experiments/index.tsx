// Storefronts → Experiments: A/B tests between two landing pages.
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaPlus, FaFlask, FaPlay, FaTrash, FaTrophy, FaChevronDown, FaChevronUp } from 'react-icons/fa';

interface PageRef { id: number; title: string; slug: string }
interface Experiment {
  id: number;
  name: string;
  status: 'draft' | 'running' | 'completed';
  variant_a_page_id: number;
  variant_b_page_id: number;
  traffic_split: number;
  winner_page_id: number | null;
  started_at: string | null;
  ended_at: string | null;
  variant_a: PageRef | null;
  variant_b: PageRef | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  running: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
};

const percent = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(2)}%`);
const taka = (n: number) => `৳${Number(n || 0).toLocaleString('en-US')}`;

export default function ExperimentsIndex() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [pages, setPages] = useState<PageRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [stats, setStats] = useState<Record<number, any>>({});
  const [form, setForm] = useState({ name: '', variant_a_page_id: '', variant_b_page_id: '', traffic_split: 50 });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expRes, lpRes] = await Promise.all([
        apiClient.get('/lp-experiments'),
        apiClient.get('/landing-pages'),
      ]);
      setExperiments(expRes.data || []);
      setPages((lpRes.data || []).map((p: any) => ({ id: p.id, title: p.title, slug: p.slug })));
    } catch (err) {
      console.error('Failed to load experiments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const loadStats = async (id: number) => {
    try {
      const res = await apiClient.get(`/lp-experiments/${id}/stats`);
      setStats((s) => ({ ...s, [id]: res.data }));
    } catch (err) { console.error(err); }
  };

  const toggleExpand = (id: number) => {
    const next = expanded === id ? null : id;
    setExpanded(next);
    if (next) loadStats(next);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await apiClient.post('/lp-experiments', {
        name: form.name,
        variant_a_page_id: Number(form.variant_a_page_id),
        variant_b_page_id: Number(form.variant_b_page_id),
        traffic_split: Number(form.traffic_split),
      });
      setShowCreate(false);
      setForm({ name: '', variant_a_page_id: '', variant_b_page_id: '', traffic_split: 50 });
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create the experiment');
    } finally {
      setCreating(false);
    }
  };

  const start = async (id: number) => {
    if (!confirm('Start this experiment? Traffic on the primary URL will be split immediately.')) return;
    try { await apiClient.post(`/lp-experiments/${id}/start`); fetchData(); loadStats(id); }
    catch (err: any) { alert(err?.response?.data?.message || 'Failed to start'); }
  };

  const declareWinner = async (experiment: Experiment, winnerId: number) => {
    const winnerIsB = winnerId === experiment.variant_b_page_id;
    const promote = winnerIsB
      ? confirm('Variant B won. Swap the two pages\' URLs so the winner takes over the primary URL your ads point at?\n\nOK = swap · Cancel = keep URLs as they are')
      : false;
    try {
      await apiClient.post(`/lp-experiments/${experiment.id}/complete`, { winner_page_id: winnerId, promote });
      fetchData();
      setStats((s) => ({ ...s, [experiment.id]: undefined }));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to complete');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this experiment? The pages themselves are untouched.')) return;
    try { await apiClient.delete(`/lp-experiments/${id}`); fetchData(); }
    catch (err: any) { alert(err?.response?.data?.message || 'Failed to delete'); }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FaFlask className="text-brand" /> Experiments
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-button flex items-center gap-2 text-sm font-medium"
          >
            <FaPlus /> New Experiment
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-6 max-w-3xl">
          Split traffic between two landing pages on one URL (variant A&apos;s). Assignment is sticky per visitor;
          orders and revenue are measured from real sales within the run window.
        </p>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading experiments…</div>
        ) : experiments.length === 0 ? (
          <div className="bg-white rounded-card border border-gray-200 p-12 text-center text-gray-500">
            No experiments yet. Duplicate a page in LP Maker, change one thing, and test it here.
          </div>
        ) : (
          <div className="space-y-3">
            {experiments.map((experiment) => {
              const s = stats[experiment.id];
              const isOpen = expanded === experiment.id;
              return (
                <div key={experiment.id} className="bg-white rounded-card border border-gray-200">
                  <button
                    onClick={() => toggleExpand(experiment.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{experiment.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-badge font-medium ${STATUS_STYLES[experiment.status]}`}>
                          {experiment.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        A: {experiment.variant_a?.title || '?'} <span className="font-mono">/{experiment.variant_a?.slug}</span>
                        {'  ·  '}B: {experiment.variant_b?.title || '?'} <span className="font-mono">/{experiment.variant_b?.slug}</span>
                        {'  ·  '}{experiment.traffic_split}% / {100 - experiment.traffic_split}%
                      </div>
                    </div>
                    {experiment.status === 'draft' && (
                      <span
                        onClick={(e) => { e.stopPropagation(); start(experiment.id); }}
                        className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-button font-medium cursor-pointer"
                      >
                        <FaPlay size={9} /> Start
                      </span>
                    )}
                    {experiment.status !== 'running' && (
                      <span
                        onClick={(e) => { e.stopPropagation(); remove(experiment.id); }}
                        className="p-2 text-gray-300 hover:text-red-600 cursor-pointer"
                        title="Delete"
                      >
                        <FaTrash size={13} />
                      </span>
                    )}
                    {isOpen ? <FaChevronUp className="text-gray-300" /> : <FaChevronDown className="text-gray-300" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-5 py-4">
                      {!s ? (
                        <p className="text-sm text-gray-400 py-4 text-center">Loading stats…</p>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[['A', s.a], ['B', s.b]].map(([label, v]: any) => {
                              const isWinner = experiment.winner_page_id === v.page_id;
                              return (
                                <div
                                  key={label}
                                  className={`rounded-card border p-4 ${isWinner ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Variant {label}</span>
                                    {isWinner && <span className="text-xs text-amber-600 font-semibold flex items-center gap-1"><FaTrophy size={10} /> Winner</span>}
                                  </div>
                                  <div className="font-medium text-gray-900 text-sm mb-3 truncate">{v.title}</div>
                                  <div className="grid grid-cols-4 gap-2 text-center">
                                    <div><div className="text-lg font-bold text-gray-900">{v.views}</div><div className="text-[10px] text-gray-400 uppercase">Views</div></div>
                                    <div><div className="text-lg font-bold text-gray-900">{v.orders}</div><div className="text-[10px] text-gray-400 uppercase">Orders</div></div>
                                    <div><div className="text-lg font-bold text-gray-900">{percent(v.cvr)}</div><div className="text-[10px] text-gray-400 uppercase">CVR</div></div>
                                    <div><div className="text-lg font-bold text-gray-900">{taka(v.revenue)}</div><div className="text-[10px] text-gray-400 uppercase">Revenue</div></div>
                                  </div>
                                  {experiment.status === 'running' && (
                                    <button
                                      onClick={() => declareWinner(experiment, v.page_id)}
                                      className="mt-3 w-full text-xs border border-gray-300 hover:border-amber-400 hover:text-amber-600 rounded-button py-1.5 font-medium"
                                    >
                                      Declare winner
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-3 text-xs text-gray-500 flex flex-wrap gap-x-6 gap-y-1">
                            {s.uplift != null && (
                              <span>
                                B vs A uplift:{' '}
                                <b className={s.uplift >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {(s.uplift * 100).toFixed(1)}%
                                </b>
                              </span>
                            )}
                            <span>
                              Significance: <b>{s.significance?.note}</b>
                              {s.significance?.p_value != null && ` (p = ${s.significance.p_value})`}
                            </span>
                            {experiment.started_at && (
                              <span>Started {new Date(experiment.started_at).toLocaleString()}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <form onSubmit={create} className="bg-white rounded-card shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">New A/B experiment</h2>

              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-card px-3 py-2 mb-3 text-sm"
                placeholder="e.g. Hair oil — new headline"
                required
              />

              <label className="block text-sm font-medium text-gray-700 mb-1">
                Variant A <span className="text-gray-400 font-normal">(its URL receives the traffic)</span>
              </label>
              <select
                value={form.variant_a_page_id}
                onChange={(e) => setForm((f) => ({ ...f, variant_a_page_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-card px-3 py-2 mb-3 text-sm bg-white"
                required
              >
                <option value="">— pick a page —</option>
                {pages.map((p) => <option key={p.id} value={p.id}>{p.title} (/{p.slug})</option>)}
              </select>

              <label className="block text-sm font-medium text-gray-700 mb-1">Variant B (the challenger)</label>
              <select
                value={form.variant_b_page_id}
                onChange={(e) => setForm((f) => ({ ...f, variant_b_page_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-card px-3 py-2 mb-3 text-sm bg-white"
                required
              >
                <option value="">— pick a page —</option>
                {pages
                  .filter((p) => String(p.id) !== form.variant_a_page_id)
                  .map((p) => <option key={p.id} value={p.id}>{p.title} (/{p.slug})</option>)}
              </select>

              <label className="block text-sm font-medium text-gray-700 mb-1">
                Traffic to A: {form.traffic_split}% <span className="text-gray-400 font-normal">(B gets {100 - form.traffic_split}%)</span>
              </label>
              <input
                type="range" min={10} max={90} step={5}
                value={form.traffic_split}
                onChange={(e) => setForm((f) => ({ ...f, traffic_split: Number(e.target.value) }))}
                className="w-full mb-4"
              />

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-button text-sm font-medium disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create draft'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
