import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ConfirmationModal from '@/components/admin/ConfirmationModal';
import Pagination from '@/components/admin/Pagination';
import apiClient from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  FaDesktop, FaMobileAlt, FaQuestionCircle, FaRobot, FaSearch, FaSignOutAlt,
  FaSyncAlt, FaTabletAlt, FaShieldAlt,
} from 'react-icons/fa';

type SessionRow = {
  id: number;
  subjectType: string;
  userId: number | null;
  customerId: number | null;
  accountName: string;
  accountEmail?: string | null;
  roleId: number | null;
  roleName?: string | null;
  roleSlug?: string | null;
  deviceType: string;
  browser?: string | null;
  os?: string | null;
  deviceLabel?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  revokeReason?: string | null;
  revokedByName?: string | null;
  isActive: boolean;
};

type Statistics = {
  windowMinutes: number;
  generatedAt: string;
  totals: {
    activeSessions: number;
    onlineSessions: number;
    activeStaffAccounts: number;
    onlineStaffAccounts: number;
    activeCustomerAccounts: number;
    staffTotal: number;
    staffSignedOut: number;
    multiDeviceAccounts: number;
    maxDevicesOneAccount: number;
    avgDevicesPerAccount: number;
    distinctIps: number;
    loginsToday: number;
    loginsLast7Days: number;
    revokedToday: number;
    sessionsRecorded: number;
  };
  byRole: Array<{
    roleId: number | null;
    roleName: string;
    roleSlug: string | null;
    staffTotal: number;
    accountsSignedIn: number;
    activeSessions: number;
    onlineSessions: number;
    deviceKinds: number;
  }>;
  byDevice: Array<{ deviceType: string; sessions: number; accounts: number; onlineSessions: number }>;
  byBrowser: Array<{ browser: string; sessions: number; accounts: number }>;
  byOs: Array<{ os: string; sessions: number; accounts: number }>;
  byUser: Array<{
    userId: number;
    userName: string;
    email?: string | null;
    roleName: string;
    roleSlug: string | null;
    activeSessions: number;
    deviceKinds: number;
    distinctIps: number;
    onlineSessions: number;
    firstLoginAt: string;
    lastSeenAt: string;
    devices: string;
  }>;
};

type AttemptRow = {
  id: number;
  identifier: string;
  result: string;
  ipAddress?: string | null;
  deviceType?: string | null;
  deviceLabel?: string | null;
  createdAt: string;
  userId: number | null;
  userName?: string | null;
};

type AttemptStatistics = {
  policy: {
    identifier: { maxFailures: number; windowMinutes: number; lockMinutes: number };
    ip: { maxFailures: number; windowMinutes: number; lockMinutes: number };
  };
  totals: {
    failedToday: number;
    failedLast7Days: number;
    failedLastHour: number;
    successToday: number;
    identifiersFailing24h: number;
    ipsFailing24h: number;
    lockedNow: number;
  };
  locked: Array<{
    identifier: string;
    failures: number;
    newestFailure: string;
    lockedUntil: string;
    ipAddress?: string | null;
  }>;
  topIps: Array<{ ipAddress: string; failures: number; identifiers: number; newest: string }>;
  byResult: Array<{ result: string; attempts: number }>;
};

const ATTEMPT_RESULT_LABELS: Record<string, string> = {
  success: 'Signed in',
  invalid_password: 'Wrong password',
  unknown_account: 'No such account',
  inactive: 'Account inactive',
  locked: 'Locked out',
  unlocked: 'Unlocked by admin',
};

const ATTEMPT_RESULT_STYLES: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  invalid_password: 'bg-amber-100 text-amber-800',
  unknown_account: 'bg-red-100 text-red-700',
  inactive: 'bg-gray-200 text-gray-700',
  locked: 'bg-red-100 text-red-700',
  unlocked: 'bg-blue-100 text-blue-700',
};

const DEVICE_ICONS: Record<string, any> = {
  desktop: FaDesktop,
  mobile: FaMobileAlt,
  tablet: FaTabletAlt,
  bot: FaRobot,
  unknown: FaQuestionCircle,
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
  bot: 'API / bot',
  unknown: 'Unknown',
};

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatRelative(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}

function percent(part: number, whole: number) {
  if (!whole) return '0%';
  return `${Math.round((part / whole) * 100)}%`;
}

function Tile({ label, value, hint, tone = 'default' }: {
  label: string; value: string | number; hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'good' ? 'text-emerald-600'
      : tone === 'warn' ? 'text-amber-600'
        : tone === 'bad' ? 'text-red-600'
          : 'text-gray-900';
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

function DeviceBadge({ type }: { type: string }) {
  const Icon = DEVICE_ICONS[type] || FaQuestionCircle;
  return (
    <span className="inline-flex items-center gap-1.5 text-gray-700">
      <Icon className="text-gray-400" />
      {DEVICE_LABELS[type] || type}
    </span>
  );
}

export default function UserSessionsPage() {
  const { hasPermission } = useAuth();
  const toast = useToast();

  const canView = hasPermission('view-user-sessions');
  const canRevoke = hasPermission('revoke-user-sessions');

  const [stats, setStats] = useState<Statistics | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [status, setStatus] = useState('active');
  const [deviceType, setDeviceType] = useState('all');
  const [roleId, setRoleId] = useState('all');
  const [userFilter, setUserFilter] = useState<{ id: number; name: string } | null>(null);
  const [search, setSearch] = useState('');
  const [windowMinutes, setWindowMinutes] = useState(15);

  const [attemptStats, setAttemptStats] = useState<AttemptStatistics | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [attemptResult, setAttemptResult] = useState('failures');

  const [confirm, setConfirm] = useState<
    | { kind: 'session'; id: number; label: string }
    | { kind: 'user'; userId: number; name: string; count: number }
    | { kind: 'unlock'; identifier: string }
    | null
  >(null);

  const loadStatistics = useCallback(async () => {
    const res = await apiClient.get('/user-sessions/statistics', { params: { windowMinutes } });
    setStats(res.data);
  }, [windowMinutes]);

  const loadAttempts = useCallback(async () => {
    const [statsRes, listRes] = await Promise.all([
      apiClient.get('/user-sessions/login-attempts/statistics'),
      apiClient.get('/user-sessions/login-attempts', { params: { result: attemptResult, limit: 25 } }),
    ]);
    setAttemptStats(statsRes.data);
    setAttempts(Array.isArray(listRes.data?.rows) ? listRes.data.rows : []);
  }, [attemptResult]);

  const loadSessions = useCallback(async () => {
    const res = await apiClient.get('/user-sessions', {
      params: {
        status,
        deviceType,
        roleId: roleId === 'all' ? undefined : roleId,
        userId: userFilter?.id,
        q: search.trim() || undefined,
        page,
        limit,
      },
    });
    setSessions(Array.isArray(res.data?.rows) ? res.data.rows : []);
    setTotal(Number(res.data?.total) || 0);
  }, [status, deviceType, roleId, userFilter?.id, search, page, limit]);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      await Promise.all([loadStatistics(), loadSessions(), loadAttempts()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load sessions.');
    } finally {
      setLoading(false);
    }
    // toast identity is stable enough; re-running on it would loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, loadStatistics, loadSessions, loadAttempts]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, status, deviceType, roleId, userFilter?.id, page, windowMinutes, attemptResult]);

  const runRevoke = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'session') {
        await apiClient.post(`/user-sessions/${confirm.id}/revoke`);
        toast.success(`${confirm.label} signed out.`);
      } else if (confirm.kind === 'unlock') {
        await apiClient.post('/user-sessions/login-attempts/unlock', { identifier: confirm.identifier });
        toast.success(`${confirm.identifier} can sign in again.`);
      } else {
        const res = await apiClient.post(`/user-sessions/users/${confirm.userId}/revoke-all`);
        toast.success(`${confirm.name} signed out of ${res.data?.revoked ?? confirm.count} device(s).`);
      }
      setConfirm(null);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'That action could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  const roleOptions = useMemo(
    () => (stats?.byRole || []).filter((row) => row.roleId != null),
    [stats?.byRole],
  );

  const totals = stats?.totals;
  const maxRoleSessions = useMemo(
    () => Math.max(1, ...(stats?.byRole || []).map((row) => row.activeSessions)),
    [stats?.byRole],
  );

  if (!canView) {
    return (
      <AdminLayout>
        <div className="rounded-lg border border-red-100 bg-white px-4 py-3 text-sm text-red-700 shadow-sm">
          You do not have permission to view login sessions.
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          backHref="/admin/users"
          backLabel="Users"
          eyebrow="Users Module"
          icon={<FaShieldAlt />}
          title="Device Sessions"
          description="Every device each account is signed in on, with role, device and per-user counts. Sign any device out immediately."
          actions={<>
            <select
              value={windowMinutes}
              onChange={(event) => setWindowMinutes(Number(event.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              aria-label="Online window"
            >
              <option value={5}>Online = last 5 min</option>
              <option value={15}>Online = last 15 min</option>
              <option value={60}>Online = last hour</option>
            </select>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <FaSyncAlt className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </>}
        />

        {/* ---------------------------------------------------------- totals */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Tile
            label="Active sessions"
            value={totals?.activeSessions ?? 0}
            hint={`${totals?.onlineSessions ?? 0} active in the last ${stats?.windowMinutes ?? windowMinutes} min`}
          />
          <Tile
            label="Staff signed in"
            value={`${totals?.activeStaffAccounts ?? 0} / ${totals?.staffTotal ?? 0}`}
            hint={`${percent(totals?.activeStaffAccounts || 0, totals?.staffTotal || 0)} of active staff`}
          />
          <Tile
            label="On 2+ devices"
            value={totals?.multiDeviceAccounts ?? 0}
            tone={(totals?.multiDeviceAccounts ?? 0) > 0 ? 'warn' : 'good'}
            hint={`Most on one account: ${totals?.maxDevicesOneAccount ?? 0}`}
          />
          <Tile
            label="Avg devices / account"
            value={totals?.avgDevicesPerAccount ?? 0}
            hint={`${totals?.distinctIps ?? 0} distinct IP addresses`}
          />
          <Tile
            label="Logins today"
            value={totals?.loginsToday ?? 0}
            hint={`${totals?.loginsLast7Days ?? 0} in the last 7 days`}
          />
          <Tile
            label="Signed out today"
            value={totals?.revokedToday ?? 0}
            tone={(totals?.revokedToday ?? 0) > 0 ? 'bad' : 'default'}
            hint={`${totals?.activeCustomerAccounts ?? 0} customer sessions active`}
          />
        </div>

        {/* ------------------------------------------------------ role-wise */}
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <header className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">By role</h2>
            <p className="text-xs text-gray-500">Active staff per role, how many are signed in, and on how many devices.</p>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-right">Staff</th>
                  <th className="px-4 py-2 text-right">Signed in</th>
                  <th className="px-4 py-2 text-right">Coverage</th>
                  <th className="px-4 py-2 text-right">Sessions</th>
                  <th className="px-4 py-2 text-right">Online now</th>
                  <th className="px-4 py-2 text-right">Devices / user</th>
                  <th className="px-4 py-2 text-left">Share of sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stats?.byRole || []).map((row) => (
                  <tr key={row.roleSlug || row.roleName} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">{row.roleName}</td>
                    <td className="px-4 py-2 text-right">{row.staffTotal}</td>
                    <td className="px-4 py-2 text-right">{row.accountsSignedIn}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{percent(row.accountsSignedIn, row.staffTotal)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{row.activeSessions}</td>
                    <td className="px-4 py-2 text-right text-emerald-700">{row.onlineSessions}</td>
                    <td className="px-4 py-2 text-right">
                      {row.accountsSignedIn ? (row.activeSessions / row.accountsSignedIn).toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-2 w-full max-w-[160px] rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-blue-500"
                          style={{ width: `${Math.round((row.activeSessions / maxRoleSessions) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
                {(stats?.byRole || []).length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">No roles to show.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------------------------------------------------- device-wise */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <header className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">By device type</h2>
            </header>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Device</th>
                  <th className="px-4 py-2 text-right">Sessions</th>
                  <th className="px-4 py-2 text-right">Accounts</th>
                  <th className="px-4 py-2 text-right">Online</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stats?.byDevice || []).map((row) => (
                  <tr key={row.deviceType} className="hover:bg-gray-50">
                    <td className="px-4 py-2"><DeviceBadge type={row.deviceType} /></td>
                    <td className="px-4 py-2 text-right font-semibold">{row.sessions}</td>
                    <td className="px-4 py-2 text-right">{row.accounts}</td>
                    <td className="px-4 py-2 text-right text-emerald-700">{row.onlineSessions}</td>
                  </tr>
                ))}
                {(stats?.byDevice || []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No active sessions.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <header className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">By browser</h2>
            </header>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Browser</th>
                  <th className="px-4 py-2 text-right">Sessions</th>
                  <th className="px-4 py-2 text-right">Accounts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stats?.byBrowser || []).map((row) => (
                  <tr key={row.browser} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-800">{row.browser}</td>
                    <td className="px-4 py-2 text-right font-semibold">{row.sessions}</td>
                    <td className="px-4 py-2 text-right">{row.accounts}</td>
                  </tr>
                ))}
                {(stats?.byBrowser || []).length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No active sessions.</td></tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <header className="border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">By operating system</h2>
            </header>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">OS</th>
                  <th className="px-4 py-2 text-right">Sessions</th>
                  <th className="px-4 py-2 text-right">Accounts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stats?.byOs || []).map((row) => (
                  <tr key={row.os} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-800">{row.os}</td>
                    <td className="px-4 py-2 text-right font-semibold">{row.sessions}</td>
                    <td className="px-4 py-2 text-right">{row.accounts}</td>
                  </tr>
                ))}
                {(stats?.byOs || []).length === 0 && (
                  <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No active sessions.</td></tr>
                )}
              </tbody>
            </table>
          </section>
        </div>

        {/* ------------------------------------------------------ user-wise */}
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <header className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">By user</h2>
            <p className="text-xs text-gray-500">Staff accounts with at least one active session, most devices first.</p>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-right">Devices</th>
                  <th className="px-4 py-2 text-right">Kinds</th>
                  <th className="px-4 py-2 text-right">IPs</th>
                  <th className="px-4 py-2 text-left">Signed in on</th>
                  <th className="px-4 py-2 text-left">Last active</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(stats?.byUser || []).map((row) => (
                  <tr key={row.userId} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{row.userName}</div>
                      <div className="text-xs text-gray-500">{row.email || '—'}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{row.roleName}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`font-semibold ${row.activeSessions > 1 ? 'text-amber-600' : 'text-gray-900'}`}>
                        {row.activeSessions}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">{row.deviceKinds}</td>
                    <td className="px-4 py-2 text-right">{row.distinctIps}</td>
                    <td className="px-4 py-2 text-gray-600">{row.devices || '—'}</td>
                    <td className="px-4 py-2">
                      <div className="text-gray-800">{formatRelative(row.lastSeenAt)}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(row.lastSeenAt)}</div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setUserFilter({ id: row.userId, name: row.userName });
                            setStatus('active');
                            setPage(1);
                          }}
                          className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Devices
                        </button>
                        {canRevoke && (
                          <button
                            type="button"
                            onClick={() => setConfirm({
                              kind: 'user',
                              userId: row.userId,
                              name: row.userName,
                              count: row.activeSessions,
                            })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            <FaSignOutAlt />
                            Sign out all
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(stats?.byUser || []).length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">Nobody is signed in right now.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ------------------------------------------------ login attempts */}
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Sign-in attempts</h2>
              <p className="text-xs text-gray-500">
                {attemptStats
                  ? `${attemptStats.policy.identifier.maxFailures} wrong passwords in ${attemptStats.policy.identifier.windowMinutes} min locks an account for ${attemptStats.policy.identifier.lockMinutes} min; ${attemptStats.policy.ip.maxFailures} from one address locks that address for ${attemptStats.policy.ip.lockMinutes} min.`
                  : 'Failed and successful sign-ins, and the lockouts they trigger.'}
              </p>
            </div>
            <select
              value={attemptResult}
              onChange={(event) => setAttemptResult(event.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              aria-label="Attempt result filter"
            >
              <option value="failures">Failures only</option>
              <option value="success">Successful sign-ins</option>
              <option value="invalid_password">Wrong password</option>
              <option value="unknown_account">No such account</option>
              <option value="all">Everything</option>
            </select>
          </header>

          <div className="grid grid-cols-2 gap-3 border-b border-gray-100 p-4 md:grid-cols-3 xl:grid-cols-5">
            <Tile
              label="Failed today"
              value={attemptStats?.totals.failedToday ?? 0}
              tone={(attemptStats?.totals.failedToday ?? 0) > 0 ? 'warn' : 'good'}
              hint={`${attemptStats?.totals.failedLastHour ?? 0} in the last hour`}
            />
            <Tile
              label="Locked out now"
              value={attemptStats?.totals.lockedNow ?? 0}
              tone={(attemptStats?.totals.lockedNow ?? 0) > 0 ? 'bad' : 'good'}
              hint="Accounts waiting out a lockout"
            />
            <Tile
              label="Accounts targeted"
              value={attemptStats?.totals.identifiersFailing24h ?? 0}
              hint="Distinct identifiers failing, 24h"
            />
            <Tile
              label="Source addresses"
              value={attemptStats?.totals.ipsFailing24h ?? 0}
              hint="Distinct IPs failing, 24h"
            />
            <Tile
              label="Failed this week"
              value={attemptStats?.totals.failedLast7Days ?? 0}
              hint={`${attemptStats?.totals.successToday ?? 0} successful sign-ins today`}
            />
          </div>

          {(attemptStats?.locked?.length ?? 0) > 0 && (
            <div className="border-b border-gray-100 bg-red-50 px-4 py-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">
                Locked out right now
              </div>
              <div className="space-y-2">
                {attemptStats!.locked.map((row) => (
                  <div key={row.identifier} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                    <div>
                      <span className="font-semibold text-gray-900">{row.identifier}</span>
                      <span className="ml-2 text-gray-500">
                        {row.failures} failures · last from {row.ipAddress || 'unknown IP'} · unlocks {formatRelative(row.lockedUntil).replace(' ago', ' from now')}
                      </span>
                    </div>
                    {canRevoke && (
                      <button
                        type="button"
                        onClick={() => setConfirm({ kind: 'unlock', identifier: row.identifier })}
                        className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Unlock now
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(attemptStats?.topIps?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-3 text-xs">
              <span className="font-semibold uppercase tracking-wide text-gray-500">Worst addresses, 24h:</span>
              {attemptStats!.topIps.map((row) => (
                <span key={row.ipAddress} className="rounded-full border border-gray-200 px-2.5 py-1 font-mono text-gray-700">
                  {row.ipAddress} — {row.failures} failures on {row.identifiers} account{row.identifiers === 1 ? '' : 's'}
                </span>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Identifier</th>
                  <th className="px-4 py-2 text-left">Result</th>
                  <th className="px-4 py-2 text-left">IP</th>
                  <th className="px-4 py-2 text-left">Device</th>
                  <th className="px-4 py-2 text-left">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attempts.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{row.identifier}</div>
                      {row.userName && <div className="text-xs text-gray-500">{row.userName}</div>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ATTEMPT_RESULT_STYLES[row.result] || 'bg-gray-100 text-gray-700'}`}>
                        {ATTEMPT_RESULT_LABELS[row.result] || row.result}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{row.ipAddress || '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{row.deviceLabel || '—'}</td>
                    <td className="px-4 py-2">
                      <div className="text-gray-800">{formatRelative(row.createdAt)}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(row.createdAt)}</div>
                    </td>
                  </tr>
                ))}
                {attempts.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    {loading ? 'Loading attempts...' : 'Nothing recorded for this filter.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* -------------------------------------------------- session list */}
        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <header className="border-b border-gray-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-900">Sessions</h2>
            <p className="text-xs text-gray-500">
              One row per login. Signing a device out takes effect on its next request.
            </p>
          </header>

          <div className="grid grid-cols-1 gap-3 border-b border-gray-100 p-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="block xl:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Search</span>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') { setPage(1); load(); } }}
                  placeholder="Name, email, IP or device..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Status</span>
              <select
                value={status}
                onChange={(event) => { setStatus(event.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="active">Active</option>
                <option value="revoked">Signed out</option>
                <option value="expired">Expired</option>
                <option value="all">All</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Device</span>
              <select
                value={deviceType}
                onChange={(event) => { setDeviceType(event.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All devices</option>
                {Object.keys(DEVICE_LABELS).map((key) => (
                  <option key={key} value={key}>{DEVICE_LABELS[key]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Role</span>
              <select
                value={roleId}
                onChange={(event) => { setRoleId(event.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All roles</option>
                {roleOptions.map((row) => (
                  <option key={String(row.roleId)} value={String(row.roleId)}>{row.roleName}</option>
                ))}
              </select>
            </label>
          </div>

          {userFilter && (
            <div className="flex items-center justify-between gap-3 bg-blue-50 px-4 py-2 text-sm text-blue-800">
              <span>Showing devices for <strong>{userFilter.name}</strong>.</span>
              <button
                type="button"
                onClick={() => { setUserFilter(null); setPage(1); }}
                className="font-semibold text-blue-700 hover:text-blue-900"
              >
                Show everyone
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Account</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-left">Device</th>
                  <th className="px-4 py-2 text-left">IP</th>
                  <th className="px-4 py-2 text-left">Signed in</th>
                  <th className="px-4 py-2 text-left">Last active</th>
                  <th className="px-4 py-2 text-left">State</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sessions.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{row.accountName}</div>
                      <div className="text-xs text-gray-500">
                        {row.accountEmail || '—'}
                        {row.subjectType === 'customer' && (
                          <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                            Customer
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{row.roleName || '—'}</td>
                    <td className="px-4 py-2">
                      <DeviceBadge type={row.deviceType} />
                      <div className="text-xs text-gray-500">{row.deviceLabel || '—'}</div>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-gray-600">{row.ipAddress || '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{formatDateTime(row.createdAt)}</td>
                    <td className="px-4 py-2">
                      <div className="text-gray-800">{formatRelative(row.lastSeenAt)}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(row.lastSeenAt)}</div>
                    </td>
                    <td className="px-4 py-2">
                      {row.isActive ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
                      ) : row.revokedAt ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700" title={row.revokedByName ? `By ${row.revokedByName}` : undefined}>
                          {row.revokeReason === 'logout' ? 'Logged out' : 'Signed out'}
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Expired</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {canRevoke && row.isActive && (
                        <button
                          type="button"
                          onClick={() => setConfirm({
                            kind: 'session',
                            id: row.id,
                            label: `${row.accountName}'s ${row.deviceLabel || 'device'}`,
                          })}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                        >
                          <FaSignOutAlt />
                          Sign out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                    {loading ? 'Loading sessions...' : 'No sessions match these filters.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <div className="border-t border-gray-100 px-4 py-3">
              <Pagination
                currentPage={page}
                totalPages={Math.max(1, Math.ceil(total / limit))}
                onPageChange={setPage}
              />
            </div>
          )}
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
            {total} session{total === 1 ? '' : 's'} match these filters
            {stats?.totals ? ` · ${stats.totals.sessionsRecorded} recorded in total` : ''}
          </div>
        </section>
      </div>

      <ConfirmationModal
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runRevoke}
        loading={busy}
        type={confirm?.kind === 'unlock' ? 'confirm' : 'warning'}
        title={
          confirm?.kind === 'unlock'
            ? 'Clear this lockout?'
            : confirm?.kind === 'user'
              ? 'Sign out every device?'
              : 'Sign this device out?'
        }
        message={
          confirm?.kind === 'unlock'
            ? `${confirm.identifier} will be able to sign in again straight away. The failed attempts behind the lockout stay on the record.`
            : confirm?.kind === 'user'
              ? `${confirm.name} will be signed out of ${confirm.count} device${confirm.count === 1 ? '' : 's'} and will have to log in again.`
              : confirm
                ? `${confirm.label} will be signed out and will have to log in again.`
                : ''
        }
        warningMessage={
          confirm?.kind === 'unlock'
            ? 'Only do this once you know who was trying to sign in.'
            : "Takes effect on that device's next request — usually within seconds."
        }
        confirmText={confirm?.kind === 'unlock' ? 'Unlock' : 'Sign out'}
      />
    </AdminLayout>
  );
}
