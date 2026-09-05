import { useCallback, useEffect, useState } from 'react';
import { FaKey, FaSave, FaSyncAlt } from 'react-icons/fa';
import AutomationLayout from '@/layouts/AutomationLayout';
import { useAutomationUnlocked } from '@/hooks/useAutomationGate';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { automation, automationGate, AutomationSettings } from '@/services/automation';
import {
  Card,
  EmptyState,
  Field,
  buttonClass,
  buttonDangerClass,
  buttonSecondaryClass,
  errorMessage,
  inputClass,
} from '@/components/automation/AutomationUI';

/** Shown under the model field so the expected format is obvious per provider. */
const PROVIDER_HINTS: Record<string, string> = {
  anthropic: 'e.g. claude-opus-5, claude-sonnet-5',
  openai: 'e.g. gpt-4o, gpt-4o-mini',
  gemini: 'e.g. gemini-2.0-flash, gemini-1.5-pro',
  xai: 'e.g. grok-2-latest',
  custom: "Whatever model name your endpoint expects",
};

const PROVIDER_DEFAULT_MODEL: Record<string, string> = {
  anthropic: 'claude-opus-5',
  openai: 'gpt-4o',
  gemini: 'gemini-2.0-flash',
  xai: 'grok-2-latest',
  custom: '',
};

/** Every knob in one place: global behaviour, the AI layer, escalation, the password. */
export default function AutomationSettingsPage() {
  const toast = useToast();
  const unlocked = useAutomationUnlocked();
  const { hasPermission } = useAuth();
  const canManage = hasPermission('manage-automation');
  const canManageSecurity = hasPermission('manage-automation-security');

  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [keywordsText, setKeywordsText] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const load = useCallback(async () => {
    // Never call the panel API while the gate is closed: the request is
    // guaranteed to 403 and the error toast lands behind the password screen.
    if (!unlocked) return;
    setLoading(true);
    try {
      const next = await automation.getSettings();
      setSettings(next);
      setKeywordsText((next.escalation.keywords || []).join('\n'));
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load settings'));
    } finally {
      setLoading(false);
    }
  }, [toast, unlocked]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (section: 'global' | 'ai' | 'escalation' | 'order', values: Record<string, any>) => {
    if (!settings) return;
    setSettings({ ...settings, [section]: { ...settings[section], ...values } } as AutomationSettings);
  };

  const save = async (section: 'global' | 'ai' | 'escalation' | 'order') => {
    if (!settings) return;
    setSaving(section);
    try {
      const payload: Record<string, any> =
        section === 'escalation'
          ? {
              ...settings.escalation,
              keywords: keywordsText
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
            }
          : (settings[section] as any);

      await automation.updateSettings(section, payload);
      toast.success('Saved');
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not save'));
    } finally {
      setSaving(null);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await automationGate.setPassword(newPassword, currentPassword || undefined);
      toast.success('Panel password changed');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not change the password'));
    }
  };

  const resetPassword = async () => {
    if (
      !window.confirm(
        'Clear the panel password? Anyone with view-automation will then be asked to set a new one.',
      )
    ) {
      return;
    }
    try {
      await automationGate.resetPassword();
      toast.success('Password cleared — the panel is back to first-time setup');
      automationGate.lock();
      window.dispatchEvent(new Event('automation:locked'));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  if (loading && !settings) {
    return (
      <AutomationLayout title="Settings">
        <EmptyState message="Loading…" />
      </AutomationLayout>
    );
  }

  if (!settings) {
    return (
      <AutomationLayout title="Settings">
        <EmptyState message="Could not load settings" />
      </AutomationLayout>
    );
  }

  return (
    <AutomationLayout
      title="Settings"
      subtitle="Global behaviour, the AI layer, escalation rules and the panel password."
      actions={
        <button onClick={load} className={buttonSecondaryClass} disabled={loading}>
          <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Reload
        </button>
      }
    >
      <div className="space-y-6">
        <Card
          title="Global"
          subtitle="The master switches. Nothing is sent while automation is off or the kill switch is engaged."
          actions={
            canManage && (
              <button onClick={() => save('global')} className={buttonClass} disabled={saving === 'global'}>
                <FaSave /> {saving === 'global' ? 'Saving…' : 'Save'}
              </button>
            )
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Check
              label="Automation enabled"
              hint="Master switch. Off means events are logged but nothing is decided."
              checked={settings.global.enabled}
              onChange={(v) => patch('global', { enabled: v })}
              disabled={!canManage}
            />
            <Check
              label="Kill switch engaged"
              hint="Emergency stop — decisions still happen, sending does not."
              checked={settings.global.kill_switch}
              onChange={(v) => patch('global', { kill_switch: v })}
              disabled={!canManage}
            />
            <Check
              label="Typing indicator"
              hint="Shows the typing bubble in Messenger before replying"
              checked={settings.global.typing_indicator}
              onChange={(v) => patch('global', { typing_indicator: v })}
              disabled={!canManage}
            />
            <Check
              label="Mark messages as seen"
              checked={settings.global.mark_seen}
              onChange={(v) => patch('global', { mark_seen: v })}
              disabled={!canManage}
            />
            <Check
              label="Require a separate panel password"
              hint="Off: the admin login and the view-automation permission are the access control. On: this panel asks for its own password as well."
              checked={settings.global.require_panel_password}
              onChange={(v) => patch('global', { require_panel_password: v })}
              disabled={!canManage}
            />

            <Field label="Mode for newly created channels">
              <select
                className={inputClass}
                disabled={!canManage}
                value={settings.global.default_mode}
                onChange={(e) => patch('global', { default_mode: e.target.value })}
              >
                <option value="off">Off</option>
                <option value="shadow">Shadow</option>
                <option value="live">Live</option>
              </select>
            </Field>

            <Field
              label="When no rule matches and AI is off"
              hint="Escalate puts it in the inbox; ignore drops it silently."
            >
              <select
                className={inputClass}
                disabled={!canManage}
                value={settings.global.fallback_action}
                onChange={(e) => patch('global', { fallback_action: e.target.value })}
              >
                <option value="escalate">Escalate to a human</option>
                <option value="ignore">Ignore</option>
              </select>
            </Field>

            <div className="md:col-span-2">
              <Field
                label="Products the bot may quote"
                hint="“Inactive” here means not listed on the main site, not discontinued — most of the catalogue carries it and much of it still has stock. Untick it only if inactive ever comes to mean genuinely unsellable."
              >
                <div className="flex flex-wrap gap-4 pt-1">
                  {['active', 'inactive'].map((status) => {
                    const selected = (settings.global.product_statuses || []).includes(status);
                    return (
                      <label key={status} className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          disabled={!canManage}
                          checked={selected}
                          onChange={(e) => {
                            const current = new Set(settings.global.product_statuses || []);
                            if (e.target.checked) current.add(status);
                            else current.delete(status);
                            patch('global', { product_statuses: [...current] });
                          }}
                        />
                        <span className="capitalize">{status}</span>
                      </label>
                    );
                  })}
                </div>
              </Field>
              {(settings.global.product_statuses || []).length === 0 && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Nothing selected — the bot will not be able to quote any product.
                </p>
              )}
            </div>

            <div className="md:col-span-2 rounded-lg border border-slate-200 p-3">
              <Check
                label="Pace replies like a human"
                hint="Replying the instant a message arrives is the clearest sign a bot is answering. The reply is worked out immediately but held before sending, scaled by how long it would take to type."
                checked={settings.global.reply_delay_enabled}
                onChange={(v) => patch('global', { reply_delay_enabled: v })}
                disabled={!canManage}
              />
              {settings.global.reply_delay_enabled && (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field label="Milliseconds per character" hint="80 ≈ a fast typist">
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      disabled={!canManage}
                      value={settings.global.reply_delay_ms_per_char}
                      onChange={(e) =>
                        patch('global', { reply_delay_ms_per_char: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Minimum wait (ms)" hint="Floor for very short replies">
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      disabled={!canManage}
                      value={settings.global.reply_delay_min_ms}
                      onChange={(e) =>
                        patch('global', { reply_delay_min_ms: Number(e.target.value) })
                      }
                    />
                  </Field>
                  <Field label="Maximum wait (ms)" hint="Ceiling for long replies">
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      disabled={!canManage}
                      value={settings.global.reply_delay_max_ms}
                      onChange={(e) =>
                        patch('global', { reply_delay_max_ms: Number(e.target.value) })
                      }
                    />
                  </Field>
                </div>
              )}
              {settings.global.reply_delay_enabled && (
                <p className="mt-2 text-xs text-slate-500">
                  A {120}-character reply would be held about{' '}
                  {(
                    Math.min(
                      Math.max(
                        120 * (settings.global.reply_delay_ms_per_char || 0),
                        settings.global.reply_delay_min_ms || 0,
                      ),
                      settings.global.reply_delay_max_ms || Number.MAX_SAFE_INTEGER,
                    ) / 1000
                  ).toFixed(1)}
                  s before sending.
                </p>
              )}
            </div>

            <div className="md:col-span-2 rounded-lg border border-slate-200 p-3">
              <Check
                label="Answer from the FAQ without the AI"
                hint="A confident keyword match sends the stated answer word for word — no model, no API call, and it works while the AI layer is switched off. Turn this off to keep FAQ answers as prompt facts only."
                checked={settings.global.faq_direct_reply !== false}
                onChange={(v) => patch('global', { faq_direct_reply: v })}
                disabled={!canManage}
              />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field
                  label="Match strength needed"
                  hint="0 to 1. At 0.75 a two-word keyword is enough on its own, a single shared word is not — “delivery” fits both “delivery koto din” and “delivery charge koto”."
                >
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    className={inputClass}
                    disabled={!canManage || settings.global.faq_direct_reply === false}
                    value={settings.global.faq_min_score}
                    onChange={(e) => patch('global', { faq_min_score: Number(e.target.value) })}
                  />
                </Field>
                <Field
                  label="Answers given to the AI"
                  hint="These ride on every message, so the list is capped."
                >
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    disabled={!canManage}
                    value={settings.global.faq_max_in_prompt}
                    onChange={(e) => patch('global', { faq_max_in_prompt: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </div>

            <Field
              label="Log retention (days)"
              hint="Old events are pruned nightly. 0 keeps everything — the disk will grow."
            >
              <input
                type="number"
                min={0}
                className={inputClass}
                disabled={!canManage}
                value={settings.global.log_retention_days}
                onChange={(e) => patch('global', { log_retention_days: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Card>

        <Card
          title="Orders from Messenger"
          subtitle="The only part of this panel that writes to the ERP. Off until you turn it on."
          actions={
            canManage && (
              <button onClick={() => save('order')} className={buttonClass} disabled={saving === 'order'}>
                <FaSave /> {saving === 'order' ? 'Saving…' : 'Save'}
              </button>
            )
          }
        >
          <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3">
            <Check
              label="Let the bot take orders in Messenger"
              hint="Everything else in this panel can only produce words. This one creates a real order in the ERP, at status “processing”, cash on delivery. The bot reads the whole order back and waits for the customer to confirm in writing before anything is created — and it never creates an order unless the channel is live."
              checked={settings.order.enabled}
              onChange={(v) => patch('order', { enabled: v })}
              disabled={!canManage}
            />
            {settings.order.enabled && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Delivery charge inside Dhaka" hint="Quoted in the read-back and saved on the order">
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    disabled={!canManage}
                    value={settings.order.delivery_charge_inside_dhaka}
                    onChange={(e) =>
                      patch('order', { delivery_charge_inside_dhaka: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Delivery charge outside Dhaka">
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    disabled={!canManage}
                    value={settings.order.delivery_charge_outside_dhaka}
                    onChange={(e) =>
                      patch('order', { delivery_charge_outside_dhaka: Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Words that confirm an order" hint="Comma separated. Matched anywhere in the message.">
                  <input
                    className={inputClass}
                    disabled={!canManage}
                    value={(settings.order.confirm_words || []).join(', ')}
                    onChange={(e) =>
                      patch('order', {
                        confirm_words: e.target.value
                          .split(',')
                          .map((word) => word.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
                <Field label="Words that cancel an order">
                  <input
                    className={inputClass}
                    disabled={!canManage}
                    value={(settings.order.cancel_words || []).join(', ')}
                    onChange={(e) =>
                      patch('order', {
                        cancel_words: e.target.value
                          .split(',')
                          .map((word) => word.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
                <p className="sm:col-span-2 text-xs text-slate-600">
                  Cash on delivery only. The bot never asks for a bKash number or a transaction
                  ID, and never mentions stock.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card
          title="AI layer"
          subtitle="Used only for messages no rule could answer. It may quote only ERP facts."
          actions={
            canManage && (
              <button onClick={() => save('ai')} className={buttonClass} disabled={saving === 'ai'}>
                <FaSave /> {saving === 'ai' ? 'Saving…' : 'Save'}
              </button>
            )
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Check
              label="AI replies enabled"
              hint="Requires ANTHROPIC_API_KEY on the server"
              checked={settings.ai.enabled}
              onChange={(v) => patch('ai', { enabled: v })}
              disabled={!canManage}
            />

            <Field
              label="Provider"
              hint="Switching provider? Clear the model field to get that provider's default."
            >
              <select
                className={inputClass}
                disabled={!canManage}
                value={settings.ai.provider || 'anthropic'}
                onChange={(e) => patch('ai', { provider: e.target.value })}
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="xai">xAI (Grok)</option>
                <option value="custom">Other OpenAI-compatible endpoint</option>
              </select>
            </Field>

            <Field
              label="Model"
              hint={
                PROVIDER_HINTS[settings.ai.provider || 'anthropic'] ??
                'Leave blank to use the default'
              }
            >
              <input
                className={inputClass}
                disabled={!canManage}
                value={settings.ai.model}
                onChange={(e) => patch('ai', { model: e.target.value })}
                placeholder={PROVIDER_DEFAULT_MODEL[settings.ai.provider || 'anthropic'] ?? ''}
              />
            </Field>

            <Field
              label="API key"
              hint={
                settings.ai.api_key_set
                  ? 'A key is saved. Leave blank to keep it; type a new one to replace it.'
                  : 'Paste a key, or set the provider environment variable on the server.'
              }
            >
              <input
                type="password"
                className={inputClass}
                disabled={!canManage}
                value={settings.ai.api_key ?? ''}
                onChange={(e) => patch('ai', { api_key: e.target.value })}
                placeholder={settings.ai.api_key_set ? '•••••••• (saved)' : ''}
              />
            </Field>

            {(settings.ai.provider === 'custom' || settings.ai.provider === 'openai') && (
              <Field
                label="Base URL"
                hint="Required for a custom endpoint. Groq, Together, OpenRouter and a local Ollama all work here."
              >
                <input
                  className={inputClass}
                  disabled={!canManage}
                  value={settings.ai.base_url ?? ''}
                  onChange={(e) => patch('ai', { base_url: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
              </Field>
            )}

            <Check
              label="Ask the provider to return strict JSON"
              hint="Improves reliability. Turn off if your endpoint rejects the response_format field."
              checked={settings.ai.json_mode !== false}
              onChange={(v) => patch('ai', { json_mode: v })}
              disabled={!canManage}
            />

            <Field label="Effort" hint="Lower is cheaper and faster; short replies rarely need more.">
              <select
                className={inputClass}
                disabled={!canManage}
                value={settings.ai.effort}
                onChange={(e) => patch('ai', { effort: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="xhigh">Extra high</option>
                <option value="max">Max</option>
              </select>
            </Field>

            <Field label="Max tokens per reply">
              <input
                type="number"
                min={128}
                className={inputClass}
                disabled={!canManage}
                value={settings.ai.max_tokens}
                onChange={(e) => patch('ai', { max_tokens: Number(e.target.value) })}
              />
            </Field>

            <Field
              label="Minimum confidence"
              hint="Below this the reply is not sent — the thread goes to a human instead."
            >
              <input
                type="number"
                step="0.05"
                min={0}
                max={1}
                className={inputClass}
                disabled={!canManage}
                value={settings.ai.min_confidence}
                onChange={(e) => patch('ai', { min_confidence: Number(e.target.value) })}
              />
            </Field>

            <Field label="Conversation turns given to the model">
              <input
                type="number"
                min={1}
                max={40}
                className={inputClass}
                disabled={!canManage}
                value={settings.ai.history_turns}
                onChange={(e) => patch('ai', { history_turns: Number(e.target.value) })}
              />
            </Field>

            <div className="md:col-span-2 rounded-lg border border-slate-200 p-3">
              <Check
                label="Write the way the team writes"
                hint="Pastes the replies you starred on the History import page into the prompt as a voice sample. They teach shape only — every figure in them was removed at import because it was already out of date, and any example still carrying a number is withheld rather than sent."
                checked={settings.ai.style_examples_enabled !== false}
                onChange={(v) => patch('ai', { style_examples_enabled: v })}
                disabled={!canManage}
              />
              {settings.ai.style_examples_enabled !== false && (
                <div className="mt-3 max-w-xs">
                  <Field
                    label="How many starred replies"
                    hint="These ride on every message the AI answers."
                  >
                    <input
                      type="number"
                      min={0}
                      max={60}
                      className={inputClass}
                      disabled={!canManage}
                      value={settings.ai.max_style_examples}
                      onChange={(e) =>
                        patch('ai', { max_style_examples: Number(e.target.value) })
                      }
                    />
                  </Field>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <Field
                label="System prompt"
                hint="The standing instructions. Keep the 'never invent prices' rule."
              >
                <textarea
                  className={`${inputClass} min-h-[140px]`}
                  disabled={!canManage}
                  value={settings.ai.system_prompt}
                  onChange={(e) => patch('ai', { system_prompt: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card
          title="Escalation"
          subtitle="What must always reach a person instead of being auto-answered."
          actions={
            canManage && (
              <button
                onClick={() => save('escalation')}
                className={buttonClass}
                disabled={saving === 'escalation'}
              >
                <FaSave /> {saving === 'escalation' ? 'Saving…' : 'Save'}
              </button>
            )
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field
                label="Escalation keywords"
                hint="One per line. Any match hands the thread to a human before rules run."
              >
                <textarea
                  className={`${inputClass} min-h-[120px] font-mono`}
                  disabled={!canManage}
                  value={keywordsText}
                  onChange={(e) => setKeywordsText(e.target.value)}
                />
              </Field>
            </div>

            <Check
              label="Escalate when an order number is mentioned"
              checked={settings.escalation.escalate_on_order_number}
              onChange={(v) => patch('escalation', { escalate_on_order_number: v })}
              disabled={!canManage}
            />
            <Check
              label="Escalate when a phone number is mentioned"
              hint="A phone number in a public comment is usually someone trying to order."
              checked={settings.escalation.escalate_on_phone_number}
              onChange={(v) => patch('escalation', { escalate_on_phone_number: v })}
              disabled={!canManage}
            />
            <Check
              label="Open a support ticket on escalation"
              checked={settings.escalation.create_support_ticket}
              onChange={(v) => patch('escalation', { create_support_ticket: v })}
              disabled={!canManage}
            />
          </div>
        </Card>

        <Card
          title="Panel password"
          subtitle={`Unlock lasts ${settings.gate.session_minutes} minutes. ${settings.gate.max_attempts} wrong tries locks the panel for ${settings.gate.lockout_minutes} minutes.`}
        >
          {!canManageSecurity ? (
            <p className="text-sm text-slate-500">
              You need the <code>manage-automation-security</code> permission to change the panel
              password.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Current password" hint="Required when a password is already set">
                <input
                  type="password"
                  className={inputClass}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </Field>
              <Field label="New password" hint="At least 8 characters">
                <input
                  type="password"
                  className={inputClass}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Field>
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <button onClick={changePassword} className={buttonClass}>
                  <FaKey /> Change password
                </button>
                <button onClick={resetPassword} className={buttonDangerClass}>
                  Clear password (recovery)
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AutomationLayout>
  );
}

function Check({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}
