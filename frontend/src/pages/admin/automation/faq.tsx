import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaFlask, FaPlus, FaSyncAlt, FaTrash } from 'react-icons/fa';
import AutomationLayout from '@/layouts/AutomationLayout';
import { useAutomationUnlocked } from '@/hooks/useAutomationGate';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  automation,
  AutomationChannel,
  AutomationFaq,
  AutomationFaqTest,
} from '@/services/automation';
import {
  Badge,
  Card,
  EmptyState,
  Field,
  buttonClass,
  buttonDangerClass,
  buttonSecondaryClass,
  errorMessage,
  formatWhen,
  inputClass,
} from '@/components/automation/AutomationUI';

type Draft = Partial<AutomationFaq> & { keywordsText?: string };

const EMPTY_DRAFT: Draft = {
  question: '',
  answer: '',
  category: 'general',
  channel_id: null,
  keywordsText: '',
  priority: 100,
  is_active: true,
};

const CATEGORIES = ['general', 'delivery', 'payment', 'ordering', 'returns', 'product'];

/**
 * Answers to the questions no table can answer.
 *
 * Prices and order status come from the ERP because they change. Delivery time,
 * coverage and how to order live nowhere in the database — so before this page
 * existed the bot had nothing grounded to say about the most common questions
 * on the page, and correctly escalated every one of them.
 *
 * An answer here is sent to a customer word for word, which is why the tester
 * shows the score: a weak match is a wrong answer delivered confidently.
 */
export default function AutomationFaqPage() {
  const toast = useToast();
  const unlocked = useAutomationUnlocked();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('manage-automation');

  const [faqs, setFaqs] = useState<AutomationFaq[]>([]);
  const [channels, setChannels] = useState<AutomationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const [testChannel, setTestChannel] = useState<number | ''>('');
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<AutomationFaqTest | null>(null);

  const load = useCallback(async () => {
    // Never call the panel API while the gate is closed: the request is
    // guaranteed to 403 and the error toast lands behind the password screen.
    if (!unlocked) return;
    setLoading(true);
    try {
      const [faqRows, channelRows] = await Promise.all([
        automation.listFaqs(),
        automation.listChannels(),
      ]);
      setFaqs(faqRows);
      setChannels(channelRows);
      if (channelRows.length > 0) setTestChannel((prev) => (prev === '' ? channelRows[0].id : prev));
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load the FAQ'));
    } finally {
      setLoading(false);
    }
  }, [toast, unlocked]);

  useEffect(() => {
    load();
  }, [load]);

  const inactiveCount = useMemo(() => faqs.filter((f) => !f.is_active).length, [faqs]);

  const save = async () => {
    if (!draft) return;

    if (!draft.question?.trim()) {
      toast.error('Give the answer a question to sit under');
      return;
    }
    if (!draft.answer?.trim()) {
      toast.error('An FAQ needs an answer');
      return;
    }

    const keywords = String(draft.keywordsText ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        question: draft.question,
        answer: draft.answer,
        category: draft.category || 'general',
        channel_id: draft.channel_id ?? null,
        keywords,
        priority: Number(draft.priority ?? 100),
        is_active: draft.is_active !== false,
      };

      if (draft.id) {
        await automation.updateFaq(draft.id, payload);
        toast.success('Answer updated');
      } else {
        await automation.createFaq(payload);
        toast.success('Answer added');
      }
      setDraft(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save the answer'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (faq: AutomationFaq) => {
    try {
      await automation.updateFaq(faq.id, { is_active: !faq.is_active });
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const remove = async (faq: AutomationFaq) => {
    if (!window.confirm(`Delete the answer to "${faq.question}"?`)) return;
    try {
      await automation.deleteFaq(faq.id);
      toast.success('Answer deleted');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const runTest = async () => {
    if (testChannel === '' || !testText.trim()) return;
    try {
      setTestResult(await automation.testFaqs(Number(testChannel), testText));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <AutomationLayout
      title="FAQ"
      subtitle="Answers the database cannot give — delivery, payment, how to order. Sent word for word."
      actions={
        <>
          <button onClick={load} className={buttonSecondaryClass} disabled={loading}>
            <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {canManage && (
            <button onClick={() => setDraft({ ...EMPTY_DRAFT })} className={buttonClass}>
              <FaPlus /> Add answer
            </button>
          )}
        </>
      }
    >
      {inactiveCount > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {inactiveCount} answer{inactiveCount === 1 ? ' is' : 's are'} switched off and will never
          be sent. The starter answers ship off on purpose — read them, correct anything out of
          date, then turn them on.
        </div>
      )}

      <Card
        title="Test a message"
        subtitle="Dry run — shows which answer would fire and how strongly. Nothing is sent to Facebook."
        className="mb-6"
      >
        <div className="grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
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
          <Field label="Message text">
            <input
              className={inputClass}
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="delivery koto din lagbe?"
              onKeyDown={(e) => e.key === 'Enter' && runTest()}
            />
          </Field>
          <button onClick={runTest} className={buttonClass} disabled={!testText.trim()}>
            <FaFlask /> Test
          </button>
        </div>

        {testResult && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            {testResult.best ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge value="faq">would answer</Badge>
                  <span className="font-medium text-slate-800">{testResult.best.question}</span>
                  <span className="text-xs text-slate-500">
                    score {testResult.best.score} · matched {testResult.best.matched.join(', ')}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white p-3 text-slate-700">
                  {testResult.best.answer}
                </p>
              </>
            ) : (
              <p className="text-slate-600">
                No answer scored high enough. This message would go to the AI layer, or be
                escalated depending on your fallback setting.
              </p>
            )}

            {testResult.considered.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-slate-500">
                {testResult.considered.map((row) => (
                  <li key={row.id}>
                    {row.score.toFixed(2)} — {row.question}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      {draft && (
        <Card
          title={draft.id ? 'Edit answer' : 'New answer'}
          className="mb-6"
          actions={
            <>
              <button onClick={() => setDraft(null)} className={buttonSecondaryClass}>
                Cancel
              </button>
              <button onClick={save} className={buttonClass} disabled={saving}>
                {saving ? 'Saving…' : 'Save answer'}
              </button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="Question" hint="For your own reference, and used as a weak match signal.">
                <input
                  className={inputClass}
                  value={draft.question ?? ''}
                  onChange={(e) => setDraft({ ...draft, question: e.target.value })}
                  placeholder="How long does delivery take?"
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field
                label="Answer"
                hint="Sent to the customer exactly as written. No {{placeholders}} — use a rule when the reply needs a live price."
              >
                <textarea
                  className={`${inputClass} min-h-[110px]`}
                  value={draft.answer ?? ''}
                  onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
                  placeholder={'ঢাকার ভিতর - ১-২ দিন\nঢাকার বাইরে - ২-৩ দিন'}
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field
                label="Keywords"
                hint="One per line. A phrase of two or more words is enough on its own; a single word needs a second signal before an answer is sent."
              >
                <textarea
                  className={`${inputClass} min-h-[90px] font-mono`}
                  value={draft.keywordsText ?? ''}
                  onChange={(e) => setDraft({ ...draft, keywordsText: e.target.value })}
                  placeholder={'koto din\nkobe pabo\nকত দিন\nডেলিভারি'}
                />
              </Field>
            </div>

            <Field label="Category" hint="Grouping for this panel only. Never shown to a customer.">
              <select
                className={inputClass}
                value={draft.category ?? 'general'}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
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

            <Field label="Priority" hint="Lower wins a tie between two equally strong matches">
              <input
                type="number"
                className={inputClass}
                value={draft.priority ?? 100}
                onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}
              />
            </Field>

            <label className="inline-flex items-center gap-2 self-end text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={draft.is_active !== false}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              />
              Active — may be sent to customers
            </label>
          </div>
        </Card>
      )}

      {loading && faqs.length === 0 ? (
        <EmptyState message="Loading…" />
      ) : faqs.length === 0 ? (
        <EmptyState
          message="No answers yet"
          hint="Start with what you type most often: delivery time, which areas you cover, how to order."
        />
      ) : (
        <Card title={`${faqs.length} answer(s)`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Question</th>
                  <th className="py-2">Answer</th>
                  <th className="py-2">Keywords</th>
                  <th className="py-2">Scope</th>
                  <th className="py-2">Used</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {faqs.map((faq) => (
                  <tr key={faq.id} className={faq.is_active ? '' : 'opacity-50'}>
                    <td className="max-w-[220px] py-2">
                      <span className="block font-medium text-slate-800">{faq.question}</span>
                      <Badge value={faq.category} />
                      {!faq.is_active && <span className="ml-2 text-xs text-slate-400">(off)</span>}
                    </td>
                    <td className="max-w-[300px] py-2 text-slate-600">
                      <span className="block whitespace-pre-wrap text-xs">{faq.answer}</span>
                    </td>
                    <td className="max-w-[200px] py-2">
                      <span className="block truncate font-mono text-xs text-slate-600">
                        {(faq.keywords || []).join(' · ') || '—'}
                      </span>
                    </td>
                    <td className="py-2 text-xs text-slate-500">
                      {faq.channel_id
                        ? channels.find((c) => c.id === faq.channel_id)?.name || `#${faq.channel_id}`
                        : 'All channels'}
                    </td>
                    <td className="py-2 text-xs text-slate-600">
                      {faq.hit_count}
                      <br />
                      <span className="text-slate-400">{formatWhen(faq.last_hit_at)}</span>
                    </td>
                    <td className="py-2 text-right">
                      {canManage && (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => toggleActive(faq)} className={buttonSecondaryClass}>
                            {faq.is_active ? 'Turn off' : 'Turn on'}
                          </button>
                          <button
                            onClick={() =>
                              setDraft({ ...faq, keywordsText: (faq.keywords || []).join('\n') })
                            }
                            className={buttonSecondaryClass}
                          >
                            Edit
                          </button>
                          <button onClick={() => remove(faq)} className={buttonDangerClass}>
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
