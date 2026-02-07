import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminLayout from '@/layouts/AdminLayout';
import apiClient from '@/services/api';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function TelephonyReportsPage() {
  const [rangeDays, setRangeDays] = useState<number>(7);
  const [loading, setLoading] = useState<boolean>(false);

  // CDR Pagination
  const [cdrPage, setCdrPage] = useState<number>(1);
  const [cdrLimit, setCdrLimit] = useState<number>(25);

  const [cdr, setCdr] = useState<any>(null);
  const [queues, setQueues] = useState<any>(null);
  const [trunks, setTrunks] = useState<any>(null);
  const [agentCalls, setAgentCalls] = useState<any>(null);
  const [agentPresence, setAgentPresence] = useState<any>(null);
  const [waitHold, setWaitHold] = useState<any>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('rangeDays', String(rangeDays));
    return p.toString();
  }, [rangeDays]);

  const load = async () => {
    setLoading(true);
    try {
      const [cdrRes, queuesRes, trunksRes, agentCallsRes, agentPresenceRes, waitHoldRes] = await Promise.all([
        apiClient.get(`/telephony/reports/cdr?${qs}&limit=${cdrLimit}&page=${cdrPage}`),
        apiClient.get(`/telephony/reports/queues?${qs}`),
        apiClient.get(`/telephony/reports/trunks?${qs}`),
        apiClient.get(`/telephony/reports/agents/calls?${qs}`),
        apiClient.get(`/telephony/reports/agents/presence?${qs}`),
        apiClient.get(`/telephony/reports/wait-hold?${qs}`),
      ]);

      setCdr(cdrRes.data);
      setQueues(queuesRes.data);
      setTrunks(trunksRes.data);
      setAgentCalls(agentCallsRes.data);
      setAgentPresence(agentPresenceRes.data);
      setWaitHold(waitHoldRes.data);
    } catch (err) {
      console.error('Failed to load telephony reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs, cdrPage, cdrLimit]);

  const fmt = (value: any) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const secondsToHuman = (n: any) => {
    const s = Number(n);
    if (!Number.isFinite(s)) return '—';
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}m ${r}s`;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Telephony Reports</h1>
            <p className="text-gray-600 mt-1">CDR, queue/trunk utilization, agent login/break reports</p>
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Range (days)</label>
              <input
                type="number"
                min={1}
                max={3650}
                className="w-28 border rounded px-3 py-2 text-sm"
                value={rangeDays}
                onChange={(e) => setRangeDays(Number(e.target.value || 7))}
              />
            </div>
            <button
              className="mt-5 px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
              disabled={loading}
              onClick={load}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500">CDR Calls (last {rangeDays} days)</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{cdr?.total ?? '—'}</div>
            <div className="text-xs text-gray-600 mt-1">
              {(cdr?.byStatus || []).map((s: any) => (
                <span key={s.status} className="inline-block mr-3">{s.status}: <span className="font-semibold">{s.count}</span></span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500">Queues</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{queues?.items?.length ?? '—'}</div>
            <div className="text-xs text-gray-600 mt-1">Grouped by queue name</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-xs text-gray-500">Trunks</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{trunks?.items?.length ?? '—'}</div>
            <div className="text-xs text-gray-600 mt-1">Utilization assumes 1 channel</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-gray-900">CDR (Call Detail Records)</div>
              <div className="text-sm text-gray-600">Shows queue/trunk/wait/hold when provided by PBX webhooks</div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disposition</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trunk</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wait</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hold</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(cdr?.items || []).map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/admin/telephony/calls/${c.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                        #{c.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{fmt(c.startedAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.direction || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.customerPhone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.agentUserId ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.status || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.disposition || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.queueName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.trunkName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{secondsToHuman(c.waitSeconds)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{secondsToHuman(c.holdSeconds)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{secondsToHuman(c.durationSeconds)}</td>
                  </tr>
                ))}

                {!loading && (cdr?.items || []).length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-4 py-6 text-center text-gray-500">No calls found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* CDR Pagination */}
          {(cdr?.total ?? 0) > 0 && (
            <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Show</span>
                <select
                  value={cdrLimit}
                  onChange={(e) => { setCdrLimit(Number(e.target.value)); setCdrPage(1); }}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">per page</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Page {cdrPage} of {Math.ceil((cdr?.total ?? 0) / cdrLimit)} ({cdr?.total ?? 0} total)
                </span>
                <button
                  onClick={() => setCdrPage(p => Math.max(1, p - 1))}
                  disabled={cdrPage === 1}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 flex items-center gap-1"
                >
                  <FaChevronLeft size={10} /> Previous
                </button>
                <button
                  onClick={() => setCdrPage(p => Math.min(Math.ceil((cdr?.total ?? 0) / cdrLimit), p + 1))}
                  disabled={cdrPage >= Math.ceil((cdr?.total ?? 0) / cdrLimit)}
                  className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 flex items-center gap-1"
                >
                  Next <FaChevronRight size={10} />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b">
              <div className="text-lg font-semibold text-gray-900">Queue Report</div>
              <div className="text-sm text-gray-600">Success/failed counts + averages</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Queue</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Completed</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Failed</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Wait</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Duration</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(queues?.items || []).map((r: any) => (
                    <tr key={r.queueName}>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.queueName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.total}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.completed}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.failed}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{secondsToHuman(r.avgWaitSeconds)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{secondsToHuman(r.avgDurationSeconds)}</td>
                    </tr>
                  ))}
                  {!loading && (queues?.items || []).length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No queue data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b">
              <div className="text-lg font-semibold text-gray-900">Trunk Report</div>
              <div className="text-sm text-gray-600">Utilization = talk time / period (assumes 1 channel)</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trunk</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Talk Time</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilization</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(trunks?.items || []).map((r: any) => (
                    <tr key={r.trunkName}>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.trunkName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.total}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{secondsToHuman(r.totalDurationSeconds)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{(Number(r.utilizationRatioAssumingSingleChannel) * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                  {!loading && (trunks?.items || []).length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No trunk data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b">
              <div className="text-lg font-semibold text-gray-900">Per-Agent Call Report</div>
              <div className="text-sm text-gray-600">Summary counts by agent</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Completed</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Failed</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Talk Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(agentCalls?.items || []).map((r: any) => (
                    <tr key={r.agentUserId}>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.agentUserId}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.total}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.completed}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.failed}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{secondsToHuman(r.totalDurationSeconds)}</td>
                    </tr>
                  ))}
                  {!loading && (agentCalls?.items || []).length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No agent call data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b">
              <div className="text-lg font-semibold text-gray-900">Login/Logout & Break Report</div>
              <div className="text-sm text-gray-600">Durations computed from presence transitions</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Logins</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Logouts</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Breaks</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Online</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">On Call</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Break</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(agentPresence?.items || []).map((r: any) => (
                    <tr key={r.userId}>
                      <td className="px-4 py-3 text-sm text-gray-900">{r.userId}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.loginCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.logoutCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{r.breakCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{secondsToHuman(r.seconds?.online)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{secondsToHuman(r.seconds?.on_call)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 text-right">{secondsToHuman(r.seconds?.break)}</td>
                    </tr>
                  ))}
                  {!loading && (agentPresence?.items || []).length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">No presence events yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-lg font-semibold text-gray-900">Avg Hold/Wait</div>
          <div className="text-sm text-gray-600">Calculated from stored call fields (or derived wait = answered-started)</div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            {(waitHold?.byDirection || []).map((r: any) => (
              <div key={r.direction} className="border rounded p-3">
                <div className="text-xs text-gray-500">{r.direction}</div>
                <div className="text-sm text-gray-800 mt-1">Total calls: <span className="font-semibold">{r.total}</span></div>
                <div className="text-sm text-gray-800">Avg wait: <span className="font-semibold">{secondsToHuman(r.avgWaitSeconds)}</span></div>
                <div className="text-sm text-gray-800">Avg hold: <span className="font-semibold">{secondsToHuman(r.avgHoldSeconds)}</span></div>
              </div>
            ))}
            {!loading && (waitHold?.byDirection || []).length === 0 && (
              <div className="text-gray-500 text-sm">No wait/hold metrics yet</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
