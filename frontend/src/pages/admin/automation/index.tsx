import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FaExclamationTriangle, FaHeartbeat, FaPowerOff, FaSyncAlt } from 'react-icons/fa';
import AutomationLayout from '@/layouts/AutomationLayout';
import { useAutomationUnlocked } from '@/hooks/useAutomationGate';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { automation, AutomationChannelHealth, AutomationOverview } from '@/services/automation';
import {
  Badge,
  Card,
  EmptyState,
  StatTile,
  buttonDangerClass,
  buttonSecondaryClass,
  errorMessage,
  formatWhen,
} from '@/components/automation/AutomationUI';

/**
 * The panel's landing screen: is it running, is anything waiting for a person,
 * and is the Meta side actually wired up.
 */
export default function AutomationOverviewPage() {
  const toast = useToast();
  const unlocked = useAutomationUnlocked();
  const { hasPermission } = useAuth();
  const [data, setData] = useState<AutomationOverview | null>(null);
  const [health, setHealth] = useState<AutomationChannelHealth[]>([]);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const canManage = hasPermission('manage-automation');

  const load = useCallback(async () => {
    // Never call the panel API while the gate is closed: the request is
    // guaranteed to 403 and the error toast lands behind the password screen.
    if (!unlocked) return;
    setLoading(true);
    try {
      const [overview, healthRows] = await Promise.all([
        automation.overview(),
        automation.health().catch(() => [] as AutomationChannelHealth[]),
      ]);
      setData(overview);
      setHealth(healthRows);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not load the automation overview'));
    } finally {
      setLoading(false);
    }
  }, [toast, unlocked]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleKillSwitch = async () => {
    if (!data) return;
    const next = !data.settings.global.kill_switch;
    setBusy(true);
    try {
      await automation.setKillSwitch(next);
      toast.success(next ? 'Kill switch engaged — no replies will be sent' : 'Kill switch released');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      setHealth(await automation.runHealthCheck());
      toast.success('Connection checked');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not check the connection'));
    } finally {
      setChecking(false);
    }
  };

  const broken = health.filter((row) => row.status === 'error');
  const warned = health.filter((row) => row.status === 'warning');

  const counters = data?.counters;
  const webhook = data?.webhook;
  const global = data?.settings.global;

  return (
    <AutomationLayout
      title="Overview"
      subtitle="What the automation did in the last 24 hours, and whether anything needs you."
      actions={
        <>
          <button onClick={load} className={buttonSecondaryClass} disabled={loading}>
            <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {canManage && (
            <button onClick={runHealthCheck} className={buttonSecondaryClass} disabled={checking}>
              <FaHeartbeat className={checking ? 'animate-pulse' : ''} />
              {checking ? 'Checking…' : 'Check connection'}
            </button>
          )}
          {canManage && data && (
            <button onClick={toggleKillSwitch} className={buttonDangerClass} disabled={busy}>
              <FaPowerOff />
              {global?.kill_switch ? 'Release kill switch' : 'Kill switch'}
            </button>
          )}
        </>
      }
    >
      {loading && !data ? (
        <EmptyState message="Loading…" />
      ) : !data ? (
        <EmptyState message="No data" hint="Try refreshing." />
      ) : (
        <div className="space-y-6">
          {broken.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
              <FaExclamationTriangle className="mt-0.5 shrink-0" />
              <div className="space-y-1">
                <strong>
                  {broken.length === 1
                    ? 'A page is disconnected from Facebook.'
                    : `${broken.length} pages are disconnected from Facebook.`}
                </strong>
                {broken.map((row) => (
                  <p key={row.channelId}>
                    <span className="font-semibold">{row.name}:</span> {row.detail}
                  </p>
                ))}
                <p className="text-xs opacity-80">
                  Checked {formatWhen(broken[0].checkedAt)}. Nothing arrives while this is true —
                  an empty Events page is the symptom, not the cause.
                </p>
              </div>
            </div>
          )}

          {broken.length === 0 && warned.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
              <FaExclamationTriangle className="mt-0.5 shrink-0" />
              <div className="space-y-1">
                {warned.map((row) => (
                  <p key={row.channelId}>
                    <span className="font-semibold">{row.name}:</span> {row.detail}
                  </p>
                ))}
              </div>
            </div>
          )}

          {global?.kill_switch && (
            <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
              <FaExclamationTriangle className="mt-0.5 shrink-0" />
              <div>
                <strong>Kill switch is engaged.</strong> Events are still received and logged, but
                nothing is being sent to Facebook.
              </div>
            </div>
          )}

          {!global?.enabled && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
              Automation is switched off globally. Turn it on under{' '}
              <Link href="/admin/automation/settings" className="font-semibold underline">
                Settings
              </Link>{' '}
              when you are ready.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatTile label="Events 24h" value={counters?.events_24h ?? 0} />
            <StatTile label="Replies 24h" value={counters?.replies_24h ?? 0} tone="good" />
            <StatTile
              label="Needs a human"
              value={counters?.needs_human ?? 0}
              tone={(counters?.needs_human ?? 0) > 0 ? 'warn' : 'neutral'}
              hint="Threads waiting in the inbox"
            />
            <StatTile
              label="Held (shadow)"
              value={counters?.held_total ?? 0}
              hint="Replies written but not sent"
            />
            <StatTile
              label="Failed sends"
              value={counters?.outbox_failed ?? 0}
              tone={(counters?.outbox_failed ?? 0) > 0 ? 'bad' : 'neutral'}
            />
            <StatTile label="Skipped 24h" value={counters?.skipped_24h ?? 0} />
            <StatTile label="Queued" value={counters?.outbox_pending ?? 0} />
            <StatTile label="Active rules" value={counters?.active_rules ?? 0} />
            <StatTile
              label="Failed events 24h"
              value={counters?.failed_24h ?? 0}
              tone={(counters?.failed_24h ?? 0) > 0 ? 'bad' : 'neutral'}
            />
            <StatTile label="Last event" value={formatWhen(data.last_event_at)} />
          </div>

          <Card
            title="Connected pages"
            subtitle="Each page replies with its own brand voice and its own token."
            actions={
              <Link href="/admin/automation/channels" className={buttonSecondaryClass}>
                Manage channels
              </Link>
            }
          >
            {data.channels.length === 0 ? (
              <EmptyState
                message="No pages connected yet"
                hint="Add a channel with the Page ID and its access token to start receiving events."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="py-2">Page</th>
                      <th className="py-2">Mode</th>
                      <th className="py-2">Token</th>
                      <th className="py-2">Brand</th>
                      <th className="py-2">Last event</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.channels.map((channel) => (
                      <tr key={channel.id}>
                        <td className="py-2">
                          <span className="font-medium text-slate-800">{channel.name}</span>
                          <span className="ml-2 text-xs text-slate-400">{channel.page_id}</span>
                        </td>
                        <td className="py-2">
                          <Badge value={channel.mode} />
                        </td>
                        <td className="py-2">
                          {channel.has_token ? (
                            <span className="text-xs text-emerald-600">saved</span>
                          ) : (
                            <span className="text-xs text-red-600">missing</span>
                          )}
                        </td>
                        <td className="py-2 text-xs text-slate-500">
                          {channel.storefront_name || '—'}
                        </td>
                        <td className="py-2 text-xs text-slate-500">
                          {formatWhen(channel.last_event_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card
            title="Meta connection"
            subtitle="These come from the server environment, not from this panel."
          >
            <dl className="grid gap-3 sm:grid-cols-2">
              <ConfigRow
                label="Callback URL path"
                value={webhook?.callback_path ?? ''}
                ok
                hint="Paste this after your domain into the Meta App Dashboard"
              />
              <ConfigRow
                label="META_WEBHOOK_VERIFY_TOKEN"
                value={webhook?.verify_token_configured ? 'configured' : 'not set'}
                ok={Boolean(webhook?.verify_token_configured)}
                hint="Must match the token typed into the App Dashboard"
              />
              <ConfigRow
                label="META_APP_SECRET"
                value={webhook?.app_secret_configured ? 'configured' : 'not set'}
                ok={Boolean(webhook?.app_secret_configured)}
                hint="Without it, webhook signatures cannot be verified"
              />
              <ConfigRow
                label="ANTHROPIC_API_KEY"
                value={webhook?.ai_key_configured ? 'configured' : 'not set'}
                ok={Boolean(webhook?.ai_key_configured)}
                hint="Only needed if you turn the AI layer on"
              />
            </dl>
          </Card>
        </div>
      )}
    </AutomationLayout>
  );
}

function ConfigRow({
  label,
  value,
  ok,
  hint,
}: {
  label: string;
  value: string;
  ok: boolean;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <dt className="text-xs font-semibold text-slate-600">{label}</dt>
      <dd className={`mt-1 break-all font-mono text-sm ${ok ? 'text-emerald-700' : 'text-red-600'}`}>
        {value}
      </dd>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
