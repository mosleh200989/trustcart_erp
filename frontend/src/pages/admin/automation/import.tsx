import { useCallback, useEffect, useState } from 'react';
import { FaBan, FaDownload, FaStar, FaSyncAlt } from 'react-icons/fa';
import AutomationLayout from '@/layouts/AutomationLayout';
import { useAutomationUnlocked } from '@/hooks/useAutomationGate';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  automation,
  AutomationChannel,
  AutomationHistoryMessage,
  AutomationImportRun,
} from '@/services/automation';
import {
  Badge,
  Card,
  EmptyState,
  Field,
  StatTile,
  buttonClass,
  buttonDangerClass,
  buttonSecondaryClass,
  errorMessage,
  formatWhen,
  inputClass,
} from '@/components/automation/AutomationUI';

/**
 * Imports past Messenger conversations so the bot can learn how the team writes.
 *
 * Every message is masked before it is stored — prices, phone numbers and order
 * numbers become placeholders — so nothing here can put a stale figure into a
 * reply. Facts always come from the live ERP lookup instead.
 */
export default function AutomationImportPage() {
  const toast = useToast();
  const unlocked = useAutomationUnlocked();
  const { hasPermission } = useAuth();
  const canImport = hasPermission('import-automation-history');

  const [channels, setChannels] = useState<AutomationChannel[]>([]);
  const [runs, setRuns] = useState<AutomationImportRun[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<AutomationHistoryMessage[]>([]);
  const [total, setTotal] = useState(0);

  const [channelId, setChannelId] = useState<number | ''>('');
  const [sinceDays, setSinceDays] = useState(180);
  const [direction, setDirection] = useState<'' | 'inbound' | 'outbound'>('outbound');
  const [onlyExamples, setOnlyExamples] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!unlocked) return;
    setLoading(true);
    try {
      const [channelRows, runRows, statRow, messageRows] = await Promise.all([
        automation.listChannels(),
        automation.listImportRuns(),
        automation.historyStats(),
        automation.listHistoryMessages({
          direction: direction || undefined,
          only_examples: onlyExamples ? 'true' : undefined,
          search: search || undefined,
          limit: 50,
        }),
      ]);
      setChannels(channelRows);
      setRuns(runRows);
      setStats(statRow);
      setMessages(messageRows.rows);
      setTotal(messageRows.total);
      if (channelRows.length > 0) setChannelId((prev) => (prev === '' ? channelRows[0].id : prev));
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load the import page'));
    } finally {
      setLoading(false);
    }
  }, [toast, unlocked, direction, onlyExamples, search]);

  useEffect(() => {
    load();
  }, [load]);

  // A run happens in the background, so poll while one is in flight.
  useEffect(() => {
    const active = runs.some((r) => r.status === 'running' || r.status === 'pending');
    if (!active) return;
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [runs, load]);

  const startImport = async () => {
    if (channelId === '') return;
    try {
      await automation.startImport(Number(channelId), sinceDays);
      toast.success('Import started — it runs in the background');
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not start the import'));
    }
  };

  const cancelRun = async (id: number) => {
    try {
      await automation.cancelImport(id);
      toast.info('Import will stop after the current page');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const toggleExample = async (message: AutomationHistoryMessage) => {
    try {
      await automation.setHistoryExample(message.id, !message.is_example);
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, is_example: !m.is_example } : m)),
      );
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AutomationLayout
      title="History import"
      subtitle="Past conversations, with every figure masked. Teaches the bot how your team writes — never what is true."
      actions={
        <button onClick={load} className={buttonSecondaryClass} disabled={loading}>
          <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatTile label="Threads" value={stats.threads ?? 0} />
          <StatTile label="Messages" value={stats.messages ?? 0} />
          <StatTile label="From customers" value={stats.inbound ?? 0} />
          <StatTile label="From your team" value={stats.outbound ?? 0} tone="good" />
          <StatTile
            label="Picked as examples"
            value={stats.examples ?? 0}
            tone={(stats.examples ?? 0) > 0 ? 'good' : 'neutral'}
            hint="Aim for 20–30"
          />
        </div>

        {canImport && (
          <Card
            title="Import conversations"
            subtitle="Runs in the background and can be resumed. Re-running is safe — already-imported messages are skipped."
          >
            <div className="grid gap-3 md:grid-cols-[1fr_200px_auto] md:items-end">
              <Field label="Channel">
                <select
                  className={inputClass}
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value ? Number(e.target.value) : '')}
                >
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="How far back (days)">
                <input
                  type="number"
                  min={1}
                  max={730}
                  className={inputClass}
                  value={sinceDays}
                  onChange={(e) => setSinceDays(Number(e.target.value))}
                />
              </Field>
              <button onClick={startImport} className={buttonClass} disabled={channelId === ''}>
                <FaDownload /> Start import
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Requires a page token with <code>pages_read_engagement</code>. Prices, phone numbers,
              order numbers and weights are replaced with placeholders before anything is written —
              the original figures are never stored.
            </p>
          </Card>
        )}

        <Card title="Import runs">
          {runs.length === 0 ? (
            <EmptyState message="No imports yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Started</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Threads</th>
                    <th className="py-2">Messages</th>
                    <th className="py-2">Pages</th>
                    <th className="py-2">Error</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td className="py-2 text-xs text-slate-500">{formatWhen(run.created_at)}</td>
                      <td className="py-2">
                        <Badge value={run.status === 'completed' ? 'sent' : run.status} >
                          {run.status}
                        </Badge>
                      </td>
                      <td className="py-2">{run.threads_imported}</td>
                      <td className="py-2">{run.messages_imported}</td>
                      <td className="py-2 text-slate-500">{run.pages_fetched}</td>
                      <td className="max-w-[260px] py-2">
                        <span className="block truncate text-xs text-red-600">
                          {run.error || '—'}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {canImport && (run.status === 'running' || run.status === 'pending') && (
                          <button onClick={() => cancelRun(run.id)} className={buttonDangerClass}>
                            <FaBan /> Stop
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title={`Imported messages (${total})`}
          subtitle="Star the replies that sound most like your team. Starred ones become the style examples for the AI."
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
            <select
              className={inputClass}
              value={direction}
              onChange={(e) => setDirection(e.target.value as any)}
            >
              <option value="outbound">From your team</option>
              <option value="inbound">From customers</option>
              <option value="">Everything</option>
            </select>
            <input
              className={inputClass}
              placeholder="Search the masked text…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={onlyExamples}
                onChange={(e) => setOnlyExamples(e.target.checked)}
              />
              Starred only
            </label>
          </div>

          {messages.length === 0 ? (
            <EmptyState
              message="Nothing imported yet"
              hint="Run an import above, then read what your team actually wrote."
            />
          ) : (
            <ul className="space-y-2">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    message.is_example ? 'border-amber-300 bg-amber-50' : 'border-slate-200'
                  }`}
                >
                  {canImport && (
                    <button
                      onClick={() => toggleExample(message)}
                      title={message.is_example ? 'Remove from examples' : 'Use as a style example'}
                      className={`mt-0.5 shrink-0 ${
                        message.is_example ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'
                      }`}
                    >
                      <FaStar />
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap text-sm text-slate-800">{message.text}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <Badge value={message.direction === 'outbound' ? 'rule' : 'bot'}>
                        {message.direction === 'outbound' ? 'your team' : 'customer'}
                      </Badge>
                      <span>{formatWhen(message.sent_at)}</span>
                      {Object.entries(message.masked_counts || {}).map(([token, count]) => (
                        <span key={token} className="rounded bg-slate-100 px-1.5 py-0.5">
                          {token} ×{count}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AutomationLayout>
  );
}
