import { ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FaArrowLeft,
  FaBolt,
  FaClipboardList,
  FaComments,
  FaHistory,
  FaInbox,
  FaLock,
  FaPaperPlane,
  FaRobot,
  FaSlidersH,
  FaSpinner,
  FaUnlock,
} from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { automationGate, getAutomationToken, clearAutomationToken } from '@/services/automation';
import {
  AUTOMATION_LOCKED_EVENT,
  AUTOMATION_UNLOCKED_EVENT,
} from '@/hooks/useAutomationGate';

type NavItem = { title: string; path: string; icon: any; permissions?: string[] };

const NAV: NavItem[] = [
  { title: 'Overview', path: '/admin/automation', icon: FaBolt },
  { title: 'Channels', path: '/admin/automation/channels', icon: FaRobot },
  { title: 'Rules', path: '/admin/automation/rules', icon: FaClipboardList },
  { title: 'Inbox', path: '/admin/automation/inbox', icon: FaInbox },
  { title: 'Events', path: '/admin/automation/events', icon: FaComments },
  { title: 'Outbox', path: '/admin/automation/outbox', icon: FaPaperPlane },
  { title: 'Settings', path: '/admin/automation/settings', icon: FaSlidersH },
  { title: 'History', path: '/admin/automation/audit', icon: FaHistory },
];

type GateState = 'checking' | 'setup' | 'locked' | 'unlocked' | 'unreachable';

/**
 * Shell for the Automation sub-panel.
 *
 * This is a separate panel, not a page inside the main admin: it has its own
 * navigation, its own password, and a Back button to the ERP. The password is a
 * re-authentication step on top of the normal login and RBAC — an unattended
 * admin session should not be enough to change what the brand's Facebook pages
 * say to customers.
 *
 * The unlock token lives in sessionStorage, so it dies with the browser tab and
 * is never shared with the rest of the admin's API calls.
 */
export default function AutomationLayout({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const { user, isLoading, isAuthenticated, hasPermission } = useAuth();

  const [gate, setGate] = useState<GateState>('checking');
  const [status, setStatus] = useState<{
    required: boolean;
    locked: boolean;
    locked_until: string | null;
    attempts_remaining: number;
  } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canView = hasPermission('view-automation');
  const canManageSecurity = hasPermission('manage-automation-security');

  const refreshGate = useCallback(async () => {
    try {
      const next = await automationGate.status();
      setStatus(next);

      // The panel password is optional. When it is switched off the admin login
      // and the view-automation permission are the access control, so there is
      // no second screen to show.
      if (!next.required) {
        setGate('unlocked');
        return;
      }
      if (!next.configured) {
        setGate('setup');
        return;
      }
      setGate(getAutomationToken() ? 'unlocked' : 'locked');
    } catch {
      // Do not fall back to the password screen. If the status call itself
      // failed we do not know whether a password is even required, and showing
      // a prompt turns a connection problem into an unanswerable one — the user
      // types a correct password forever and it never reaches the server.
      setGate('unreachable');
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/admin/login');
      return;
    }
    if (!canView) {
      setGate('locked');
      return;
    }
    refreshGate();
  }, [isLoading, isAuthenticated, canView, refreshGate, router]);

  // Raised by the API client when the backend reports the panel re-locked (token
  // expiry mid-session) and by the settings page after a password reset.
  // Re-reading the status rather than forcing 'locked' means a cleared password
  // correctly lands on the setup form instead of an unanswerable prompt.
  useEffect(() => {
    const onLocked = () => {
      clearAutomationToken();
      setGate('locked');
      refreshGate();
    };
    window.addEventListener(AUTOMATION_LOCKED_EVENT, onLocked);
    return () => window.removeEventListener(AUTOMATION_LOCKED_EVENT, onLocked);
  }, [refreshGate]);

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) return;

    setSubmitting(true);
    try {
      await automationGate.unlock(password);
      setPassword('');
      setGate('unlocked');
      // Panel pages are our parent, so they cannot see this state change —
      // tell them the gate opened so they can load their data.
      window.dispatchEvent(new Event(AUTOMATION_UNLOCKED_EVENT));
      toast.success('Automation panel unlocked');
    } catch (error: any) {
      // Distinguish a rejected password from a request that never arrived —
      // reporting a network or CORS failure as "incorrect password" sends you
      // hunting for the wrong problem.
      if (!error?.response) {
        toast.error('Could not reach the server. Check your connection and try again.');
      } else {
        const message = error.response.data?.message;
        const text = Array.isArray(message) ? message.join(', ') : message;
        toast.error(typeof text === 'string' && text ? text : 'Incorrect password');
      }
      await refreshGate();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('The two passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await automationGate.setPassword(password);
      await automationGate.unlock(password);
      setPassword('');
      setConfirmPassword('');
      setGate('unlocked');
      window.dispatchEvent(new Event(AUTOMATION_UNLOCKED_EVENT));
      toast.success('Panel password set');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Could not set the password';
      toast.error(Array.isArray(message) ? message.join(', ') : String(message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLock = () => {
    automationGate.lock();
    setGate('locked');
    window.dispatchEvent(new Event(AUTOMATION_LOCKED_EVENT));
    toast.info('Automation panel locked');
  };

  // ─── Gate screens ────────────────────────────────────────────────────────

  if (isLoading || gate === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300">
        <FaSpinner className="mr-3 animate-spin" /> Loading automation panel…
      </div>
    );
  }

  if (!canView) {
    return (
      <GateShell>
        <h1 className="text-xl font-bold text-white">No access</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your role does not include the <code className="text-amber-300">view-automation</code>{' '}
          permission. Ask an administrator to grant it on the Roles &amp; Permissions page.
        </p>
        <BackToAdmin />
      </GateShell>
    );
  }

  if (gate === 'unreachable') {
    return (
      <GateShell>
        <h1 className="text-xl font-bold text-white">Cannot reach the server</h1>
        <p className="mt-2 text-sm text-slate-400">
          The panel loaded but its API calls are not getting through. This is a connection
          problem, not a password problem.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-500">
          <li>Check whether an ad blocker or privacy extension is blocking the API domain</li>
          <li>Confirm the backend is running</li>
          <li>Look for a CORS error in the browser console</li>
        </ul>
        <button
          onClick={() => {
            setGate('checking');
            refreshGate();
          }}
          className="mt-5 w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-400"
        >
          Try again
        </button>
        <BackToAdmin />
      </GateShell>
    );
  }

  if (gate === 'setup') {
    if (!canManageSecurity) {
      return (
        <GateShell>
          <h1 className="text-xl font-bold text-white">Panel password not set</h1>
          <p className="mt-2 text-sm text-slate-400">
            The automation panel has no password yet. Someone with the{' '}
            <code className="text-amber-300">manage-automation-security</code> permission needs to
            set one before the panel can be opened.
          </p>
          <BackToAdmin />
        </GateShell>
      );
    }

    return (
      <GateShell>
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <FaLock />
          </span>
          <div>
            <h1 className="text-lg font-bold text-white">Set the panel password</h1>
            <p className="text-xs text-slate-400">First-time setup — at least 8 characters.</p>
          </div>
        </div>

        <form onSubmit={handleSetup} className="space-y-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New panel password"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat the password"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-400 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Set password and open the panel'}
          </button>
        </form>
        <BackToAdmin />
      </GateShell>
    );
  }

  if (gate === 'locked') {
    const lockedUntil = status?.locked_until ? new Date(status.locked_until) : null;
    const isLockedOut = Boolean(lockedUntil && lockedUntil.getTime() > Date.now());

    return (
      <GateShell>
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <FaLock />
          </span>
          <div>
            <h1 className="text-lg font-bold text-white">Automation panel</h1>
            <p className="text-xs text-slate-400">
              Signed in as {user?.email || user?.phone || 'you'} — enter the panel password.
            </p>
          </div>
        </div>

        {isLockedOut ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            Too many failed attempts. Try again after{' '}
            {lockedUntil!.toLocaleTimeString()}.
          </div>
        ) : (
          <form onSubmit={handleUnlock} className="space-y-3">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Panel password"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-amber-400 disabled:opacity-60"
            >
              {submitting ? 'Checking…' : 'Unlock'}
            </button>
            {status && status.attempts_remaining < 3 && (
              <p className="text-center text-xs text-amber-400">
                {status.attempts_remaining} attempt(s) left before a temporary lockout.
              </p>
            )}
          </form>
        )}
        <BackToAdmin />
      </GateShell>
    );
  }

  // ─── Unlocked panel ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
          >
            <FaArrowLeft /> Back to Admin
          </Link>

          <div className="flex items-center gap-2 text-amber-400">
            <FaRobot />
            <span className="text-sm font-bold uppercase tracking-wide">Automation</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Only meaningful while the panel password is switched on. */}
            {status?.required && (
              <button
                onClick={handleLock}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
                title="Lock the panel now"
              >
                <FaUnlock /> Lock
              </button>
            )}
          </div>
        </div>

        <nav className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-2 pb-2">
          {NAV.map((item) => {
            const active =
              item.path === '/admin/automation'
                ? router.pathname === '/admin/automation'
                : router.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-amber-500 font-semibold text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="text-xs" /> {item.title}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}

function GateShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function BackToAdmin() {
  return (
    <Link
      href="/admin/dashboard"
      className="mt-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
    >
      <FaArrowLeft /> Back to the admin panel
    </Link>
  );
}
