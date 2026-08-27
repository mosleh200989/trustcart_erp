import { Fragment, useCallback, useEffect, useState } from 'react';
import { FaSyncAlt } from 'react-icons/fa';
import AutomationLayout from '@/layouts/AutomationLayout';
import { useAutomationUnlocked } from '@/hooks/useAutomationGate';
import { useToast } from '@/contexts/ToastContext';
import { automation, AutomationEvent } from '@/services/automation';
import {
  Badge,
  Card,
  EmptyState,
  buttonSecondaryClass,
  errorMessage,
  formatWhen,
  inputClass,
} from '@/components/automation/AutomationUI';

const PAGE_SIZE = 50;

/**
 * The raw webhook log — every delivery Meta made, what we decided, and why.
 * This is the first place to look when "the bot did not reply".
 */
export default function AutomationEventsPage() {
  const toast = useToast();
  const unlocked = useAutomationUnlocked();
  const [rows, setRows] = useState<AutomationEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [eventType, setEventType] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    // Never call the panel API while the gate is closed: the request is
    // guaranteed to 403 and the error toast lands behind the password screen.
    if (!unlocked) return;
    setLoading(true);
    try {
      const result = await automation.listEvents({
        status: status || undefined,
        event_type: eventType || undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setRows(result.rows);
      setTotal(result.total);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load events'));
    } finally {
      setLoading(false);
    }
  }, [status, eventType, page, toast, unlocked]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AutomationLayout
      title="Events"
      subtitle="Every webhook Meta delivered, in order, with the decision we made."
      actions={
        <button onClick={load} className={buttonSecondaryClass} disabled={loading}>
          <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      }
    >
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            className={inputClass}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All statuses</option>
            <option value="handled">Handled</option>
            <option value="skipped">Skipped</option>
            <option value="received">Received</option>
            <option value="failed">Failed</option>
          </select>

          <select
            className={inputClass}
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value);
              setPage(0);
            }}
          >
            <option value="">All types</option>
            <option value="comment">Comment</option>
            <option value="comment_edit">Comment edit</option>
            <option value="message">Message</option>
            <option value="message_echo">Message echo</option>
            <option value="postback">Postback</option>
            <option value="reaction">Reaction</option>
          </select>

          <div className="flex items-center justify-end gap-2 text-sm text-slate-600">
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
        <EmptyState
          message="No events"
          hint="Nothing has arrived from Meta yet, or your filters exclude everything."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">When</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Reason</th>
                  <th className="py-2">Signed</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((event) => (
                  <Fragment key={event.id}>
                    <tr>
                      <td className="py-2 text-xs text-slate-500">
                        {formatWhen(event.received_at)}
                      </td>
                      <td className="py-2">{event.event_type}</td>
                      <td className="py-2">
                        <Badge value={event.status} />
                      </td>
                      <td className="max-w-[320px] py-2">
                        <span className="block truncate text-xs text-slate-600">
                          {event.skip_reason || event.error || '—'}
                        </span>
                      </td>
                      <td className="py-2">
                        {event.signature_valid ? (
                          <span className="text-xs text-emerald-600">yes</span>
                        ) : (
                          <span className="text-xs text-amber-600">no</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          {expanded === event.id ? 'Hide' : 'Payload'}
                        </button>
                      </td>
                    </tr>
                    {expanded === event.id && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50 p-3">
                          <pre className="max-h-72 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                          <p className="mt-2 font-mono text-xs text-slate-500">
                            id {event.meta_event_id}
                          </p>
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
