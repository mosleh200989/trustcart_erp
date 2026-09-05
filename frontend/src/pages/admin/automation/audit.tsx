import { Fragment, useCallback, useEffect, useState } from 'react';
import { FaSyncAlt } from 'react-icons/fa';
import AutomationLayout from '@/layouts/AutomationLayout';
import { useAutomationUnlocked } from '@/hooks/useAutomationGate';
import { useToast } from '@/contexts/ToastContext';
import { automation, AutomationAuditRow } from '@/services/automation';
import {
  Card,
  EmptyState,
  buttonSecondaryClass,
  errorMessage,
  formatWhen,
  inputClass,
} from '@/components/automation/AutomationUI';

const PAGE_SIZE = 50;

const ENTITIES = ['channel', 'rule', 'faq', 'settings', 'conversation', 'message', 'outbox', 'gate'];

/**
 * Who changed what inside this panel.
 *
 * Kept separate from the ERP-wide audit log so the panel is auditable from
 * inside itself. Access tokens and passwords are redacted before they are stored,
 * so this table is safe to read.
 */
export default function AutomationAuditPage() {
  const toast = useToast();
  const unlocked = useAutomationUnlocked();
  const [rows, setRows] = useState<AutomationAuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [entity, setEntity] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    // Never call the panel API while the gate is closed: the request is
    // guaranteed to 403 and the error toast lands behind the password screen.
    if (!unlocked) return;
    setLoading(true);
    try {
      const result = await automation.listAudit({
        entity: entity || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load the history'));
    } finally {
      setLoading(false);
    }
  }, [entity, page, toast, unlocked]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AutomationLayout
      title="History"
      subtitle="Every change made inside the automation panel, and who made it."
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
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Everything</option>
            {ENTITIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
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
        <EmptyState message="No history yet" hint="Changes made in this panel will appear here." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">When</th>
                  <th className="py-2">Who</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Target</th>
                  <th className="py-2">IP</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <Fragment key={row.id}>
                    <tr>
                      <td className="py-2 text-xs text-slate-500">{formatWhen(row.created_at)}</td>
                      <td className="py-2 text-xs text-slate-700">{row.user_email || '—'}</td>
                      <td className="py-2 font-mono text-xs">{row.action}</td>
                      <td className="py-2 text-xs text-slate-600">
                        {row.entity ? `${row.entity}${row.entity_id ? ` #${row.entity_id}` : ''}` : '—'}
                      </td>
                      <td className="py-2 font-mono text-xs text-slate-400">{row.ip || '—'}</td>
                      <td className="py-2 text-right">
                        {(row.before || row.after) && (
                          <button
                            onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            {expanded === row.id ? 'Hide' : 'Details'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === row.id && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50 p-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <p className="mb-1 text-xs font-semibold text-slate-500">Before</p>
                              <pre className="max-h-60 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                                {JSON.stringify(row.before, null, 2) || '—'}
                              </pre>
                            </div>
                            <div>
                              <p className="mb-1 text-xs font-semibold text-slate-500">After</p>
                              <pre className="max-h-60 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                                {JSON.stringify(row.after, null, 2) || '—'}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AutomationLayout>
  );
}
