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

  const patch = (section: 'global' | 'ai' | 'escalation', values: Record<string, any>) => {
    if (!settings) return;
    setSettings({ ...settings, [section]: { ...settings[section], ...values } } as AutomationSettings);
  };

  const save = async (section: 'global' | 'ai' | 'escalation') => {
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

            <Field label="Model">
              <input
                className={inputClass}
                disabled={!canManage}
                value={settings.ai.model}
                onChange={(e) => patch('ai', { model: e.target.value })}
              />
            </Field>

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
