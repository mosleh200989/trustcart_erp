import { useCallback, useEffect, useState } from 'react';
import { FaBan, FaRedo, FaSyncAlt } from 'react-icons/fa';
import AutomationLayout from '@/layouts/AutomationLayout';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { automation, AutomationOutboxRow } from '@/services/automation';
import {
  Badge,
  Card,
  EmptyState,
  buttonDangerClass,
  buttonSecondaryClass,
  errorMessage,
  formatWhen,
  inputClass,
} from '@/components/automation/AutomationUI';

const PAGE_SIZE = 50;

/**
 * Outgoing Graph API actions and their retry state.
 * Anything sitting in `failed` is a message a customer never received.
 */
export default function AutomationOutboxPage() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('manage-automation');

  const [rows, setRows] = useState<AutomationOutboxRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await automation.listOutbox({
        status: status || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load the outbox'));
    } finally {
      setLoading(false);
    }
  }, [status, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = async (id: number) => {
    try {
      await automation.retryOutbox(id);
      toast.success('Retried');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const cancel = async (id: number) => {
    try {
      await automation.cancelOutbox(id);
      toast.success('Cancelled');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AutomationLayout
      title="Outbox"
      subtitle="Everything queued for Facebook, with attempts and errors."
      actions={
        <button onClick={load} className={buttonSecondaryClass} disabled={loading}>
          <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      }
    >
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className={`${inputClass} max-w-[220px]`}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <div className="ml-auto flex items-center gap-2 text-sm text-slate-600">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className={buttonSecondaryClass}
            >
              Previous
            </button>
            <span>
              {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of{' '}
              {total}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * PAGE_SIZE >= total}
              className={buttonSecondaryClass}
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      {loading && rows.length === 0 ? (
        <EmptyState message="Loading…" />
      ) : rows.length === 0 ? (
        <EmptyState message="Outbox is empty" hint="Nothing is queued or has failed." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Created</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Attempts</th>
                  <th className="py-2">Next try</th>
                  <th className="py-2">Error</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 text-xs text-slate-500">{formatWhen(row.created_at)}</td>
                    <td className="py-2 font-mono text-xs">{row.action}</td>
                    <td className="py-2">
                      <Badge value={row.status} />
                    </td>
                    <td className="py-2 text-slate-600">
                      {row.attempts}/{row.max_attempts}
                    </td>
                    <td className="py-2 text-xs text-slate-500">
                      {row.status === 'pending' ? formatWhen(row.next_attempt_at) : '—'}
                    </td>
                    <td className="max-w-[300px] py-2">
                      <span className="block truncate text-xs text-red-600">
                        {row.last_error || '—'}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {canManage && row.status !== 'sent' && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => retry(row.id)} className={buttonSecondaryClass}>
                            <FaRedo /> Retry
                          </button>
                          {row.status === 'pending' && (
                            <button onClick={() => cancel(row.id)} className={buttonDangerClass}>
                              <FaBan />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AutomationLayout>
  );
}
