import { useCallback, useEffect, useState } from 'react';
import { FaFlask, FaPlus, FaSyncAlt, FaTrash } from 'react-icons/fa';
import AutomationLayout from '@/layouts/AutomationLayout';
import { useAutomationUnlocked } from '@/hooks/useAutomationGate';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { automation, AutomationChannel, AutomationRule } from '@/services/automation';
import {
  Badge,
  Card,
  EmptyState,
  Field,
  buttonClass,
  buttonDangerClass,
  buttonSecondaryClass,
  errorMessage,
  inputClass,
} from '@/components/automation/AutomationUI';

type Draft = Partial<AutomationRule> & { patternsText?: string };

const EMPTY_DRAFT: Draft = {
  name: '',
  channel_id: null,
  match_type: 'contains',
  patternsText: '',
  applies_to: 'both',
  action: 'reply',
  reply_text: '',
  priority: 100,
  stop_on_match: true,
  is_active: true,
};

const PLACEHOLDERS = [
  '{{product_name}}',
  '{{product_price}}',
  '{{product_stock}}',
  '{{order_number}}',
  '{{order_status}}',
  '{{customer_name}}',
  '{{page_name}}',
];

/**
 * Keyword rules — the layer that answers the common questions for free.
 * Includes a dry-run tester so a rule can be checked without sending anything.
 */
export default function AutomationRulesPage() {
  const toast = useToast();
  const unlocked = useAutomationUnlocked();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('manage-automation');

  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [channels, setChannels] = useState<AutomationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const [testChannel, setTestChannel] = useState<number | ''>('');
  const [testText, setTestText] = useState('');
  const [testType, setTestType] = useState<'comment' | 'message'>('message');
  const [testResult, setTestResult] = useState<any>(null);

  const load = useCallback(async () => {
    // Never call the panel API while the gate is closed: the request is
    // guaranteed to 403 and the error toast lands behind the password screen.
    if (!unlocked) return;
    setLoading(true);
    try {
      const [ruleRows, channelRows] = await Promise.all([
        automation.listRules(),
        automation.listChannels(),
      ]);
      setRules(ruleRows);
      setChannels(channelRows);
      if (channelRows.length > 0) setTestChannel((prev) => (prev === '' ? channelRows[0].id : prev));
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load rules'));
    } finally {
      setLoading(false);
    }
  }, [toast, unlocked]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!draft) return;

    const patterns = String(draft.patternsText ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!draft.name?.trim()) {
      toast.error('Give the rule a name');
      return;
    }
    if (patterns.length === 0) {
      toast.error('Add at least one pattern (one per line)');
      return;
    }
    if ((draft.action ?? 'reply') === 'reply' && !String(draft.reply_text ?? '').trim()) {
      toast.error('A reply rule needs reply text');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: draft.name,
        channel_id: draft.channel_id ?? null,
        match_type: draft.match_type ?? 'contains',
        patterns,
        applies_to: draft.applies_to ?? 'both',
        action: draft.action ?? 'reply',
        priority: Number(draft.priority ?? 100),
        stop_on_match: draft.stop_on_match !== false,
        is_active: draft.is_active !== false,
      };
      if (draft.reply_text) payload.reply_text = draft.reply_text;
      if (draft.private_reply_text) payload.private_reply_text = draft.private_reply_text;

      if (draft.id) {
        await automation.updateRule(draft.id, payload);
        toast.success('Rule updated');
      } else {
        await automation.createRule(payload);
        toast.success('Rule created');
      }
      setDraft(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save the rule'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (rule: AutomationRule) => {
    if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
    try {
      await automation.deleteRule(rule.id);
      toast.success('Rule deleted');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const runTest = async () => {
    if (testChannel === '' || !testText.trim()) return;
    try {
      setTestResult(await automation.testRules(Number(testChannel), testText, testType));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AutomationLayout
      title="Rules"
      subtitle="Keyword replies, checked before the AI. Lower priority runs first."
      actions={
        <>
          <button onClick={load} className={buttonSecondaryClass} disabled={loading}>
            <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {canManage && (
            <button onClick={() => setDraft({ ...EMPTY_DRAFT })} className={buttonClass}>
              <FaPlus /> Add rule
            </button>
          )}
        </>
      }
    >
      <Card
        title="Test a message"
        subtitle="Dry run — shows which rule would fire. Nothing is sent to Facebook."
        className="mb-6"
      >
        <div className="grid gap-3 md:grid-cols-[200px_140px_1fr_auto] md:items-end">
          <Field label="Channel">
            <select
              className={inputClass}
              value={testChannel}
              onChange={(e) => setTestChannel(e.target.value ? Number(e.target.value) : '')}
            >
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="As a">
            <select
              className={inputClass}
              value={testType}
              onChange={(e) => setTestType(e.target.value as any)}
            >
              <option value="message">Message</option>
              <option value="comment">Comment</option>
            </select>
          </Field>
          <Field label="Message text">
            <input
              className={inputClass}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="dam koto?"
              onKeyDown={(e) => e.key === 'Enter' && runTest()}
            />
          </Field>
          <button onClick={runTest} className={buttonClass} disabled={!testText.trim()}>
            <FaFlask /> Test
          </button>
        </div>

        {testResult && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            {testResult.matched.length === 0 ? (
              <p className="text-slate-600">
                No rule matched. This message would go to the AI layer, or be escalated/ignored
                depending on your fallback setting.
              </p>
            ) : (
              <ul className="space-y-2">
                {testResult.matched.map((match: any, index: number) => (
                  <li key={match.id} className="flex flex-wrap items-center gap-2">
                    <Badge value={index === 0 ? 'handled' : 'skipped'}>
                      {index === 0 ? 'would fire' : 'also matches'}
                    </Badge>
                    <span className="font-medium text-slate-800">{match.name}</span>
                    <Badge value={match.action} />
                    {match.would_reply && (
                      <span className="text-slate-600">“{match.would_reply}”</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {draft && (
        <Card
          title={draft.id ? `Edit "${draft.name}"` : 'New rule'}
          className="mb-6"
          actions={
            <>
              <button onClick={() => setDraft(null)} className={buttonSecondaryClass}>
                Cancel
              </button>
              <button onClick={save} className={buttonClass} disabled={saving}>
                {saving ? 'Saving…' : 'Save rule'}
              </button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Rule name">
              <input
                className={inputClass}
                value={draft.name ?? ''}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Price question"
              />
            </Field>

            <Field label="Applies to channel">
              <select
                className={inputClass}
                value={draft.channel_id ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, channel_id: e.target.value ? Number(e.target.value) : null })
                }
              >
                <option value="">All channels</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Match type">
              <select
                className={inputClass}
                value={draft.match_type ?? 'contains'}
                onChange={(e) => setDraft({ ...draft, match_type: e.target.value as any })}
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals exactly</option>
                <option value="starts_with">Starts with</option>
                <option value="regex">Regular expression</option>
              </select>
            </Field>

            <Field label="Applies to">
              <select
                className={inputClass}
                value={draft.applies_to ?? 'both'}
                onChange={(e) => setDraft({ ...draft, applies_to: e.target.value as any })}
              >
                <option value="both">Comments and messages</option>
                <option value="comment">Comments only</option>
                <option value="message">Messenger only</option>
              </select>
            </Field>

            <div className="md:col-span-2">
              <Field label="Patterns" hint="One per line. Any single match fires the rule.">
                <textarea
                  className={`${inputClass} min-h-[90px] font-mono`}
                  value={draft.patternsText ?? ''}
                  onChange={(e) => setDraft({ ...draft, patternsText: e.target.value })}
                  placeholder={'dam koto\nprice\nkoto taka'}
                />
              </Field>
            </div>

            <Field label="Action">
              <select
                className={inputClass}
                value={draft.action ?? 'reply'}
                onChange={(e) => setDraft({ ...draft, action: e.target.value as any })}
              >
                <option value="reply">Reply with text</option>
                <option value="escalate">Hand to a human</option>
                <option value="ignore">Ignore silently</option>
                <option value="ai">Let the AI answer</option>
              </select>
            </Field>

            <Field label="Priority" hint="Lower runs first">
              <input
                type="number"
                className={inputClass}
                value={draft.priority ?? 100}
                onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}
              />
            </Field>

            {(draft.action ?? 'reply') === 'reply' && (
              <>
                <div className="md:col-span-2">
                  <Field
                    label="Reply text"
                    hint={`Placeholders: ${PLACEHOLDERS.join(' ')} — a reply is skipped if a placeholder cannot be filled.`}
                  >
                    <textarea
                      className={`${inputClass} min-h-[80px]`}
                      value={draft.reply_text ?? ''}
                      onChange={(e) => setDraft({ ...draft, reply_text: e.target.value })}
                      placeholder="{{product_name}} er dam {{product_price}}. Order korte inbox korun."
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field
                    label="Private reply (optional)"
                    hint="Sent as a Messenger message to a commenter, if the channel allows it"
                  >
                    <textarea
                      className={`${inputClass} min-h-[60px]`}
                      value={draft.private_reply_text ?? ''}
                      onChange={(e) => setDraft({ ...draft, private_reply_text: e.target.value })}
                    />
                  </Field>
                </div>
              </>
            )}

            <div className="md:col-span-2 flex flex-wrap gap-4 text-sm text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={draft.stop_on_match !== false}
                  onChange={(e) => setDraft({ ...draft, stop_on_match: e.target.checked })}
                />
                Stop checking further rules once this one matches
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={draft.is_active !== false}
                  onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                />
                Active
              </label>
            </div>
          </div>
        </Card>
      )}

      {loading && rules.length === 0 ? (
        <EmptyState message="Loading…" />
      ) : rules.length === 0 ? (
        <EmptyState
          message="No rules yet"
          hint="Start with the questions you answer most: price, delivery charge, stock."
        />
      ) : (
        <Card title={`${rules.length} rule(s)`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Priority</th>
                  <th className="py-2">Name</th>
                  <th className="py-2">Patterns</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Scope</th>
                  <th className="py-2">Hits</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rules.map((rule) => (
                  <tr key={rule.id} className={rule.is_active ? '' : 'opacity-50'}>
                    <td className="py-2 text-slate-500">{rule.priority}</td>
                    <td className="py-2">
                      <span className="font-medium text-slate-800">{rule.name}</span>
                      {!rule.is_active && <span className="ml-2 text-xs text-slate-400">(off)</span>}
                    </td>
                    <td className="max-w-[280px] py-2">
                      <span className="block truncate font-mono text-xs text-slate-600">
                        {(rule.patterns || []).join(' · ')}
                      </span>
                      <span className="text-xs text-slate-400">{rule.match_type}</span>
                    </td>
                    <td className="py-2">
                      <Badge value={rule.action} />
                    </td>
                    <td className="py-2 text-xs text-slate-500">
                      {rule.channel_id
                        ? channels.find((c) => c.id === rule.channel_id)?.name || `#${rule.channel_id}`
                        : 'All channels'}
                      <br />
                      {rule.applies_to}
                    </td>
                    <td className="py-2 text-slate-600">{rule.hit_count}</td>
                    <td className="py-2 text-right">
                      {canManage && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              setDraft({ ...rule, patternsText: (rule.patterns || []).join('\n') })
                            }
                            className={buttonSecondaryClass}
                          >
                            Edit
                          </button>
                          <button onClick={() => remove(rule)} className={buttonDangerClass}>
                            <FaTrash />
                          </button>
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
