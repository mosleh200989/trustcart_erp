import { ReactNode } from 'react';

/** Small shared building blocks so the automation pages stay short and consistent. */

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
  hint?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'border-slate-200 bg-white text-slate-800',
    good: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    bad: 'border-red-200 bg-red-50 text-red-800',
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs opacity-70">{hint}</p>}
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  live: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  shadow: 'bg-amber-100 text-amber-700 border-amber-200',
  off: 'bg-slate-100 text-slate-600 border-slate-200',
  handled: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  sent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  received: 'bg-blue-100 text-blue-700 border-blue-200',
  pending: 'bg-blue-100 text-blue-700 border-blue-200',
  skipped: 'bg-slate-100 text-slate-600 border-slate-200',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  held: 'bg-purple-100 text-purple-700 border-purple-200',
  bot: 'bg-blue-100 text-blue-700 border-blue-200',
  needs_human: 'bg-amber-100 text-amber-700 border-amber-200',
  human: 'bg-purple-100 text-purple-700 border-purple-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
  ai: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  rule: 'bg-teal-100 text-teal-700 border-teal-200',
  erp: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  faq: 'bg-sky-100 text-sky-700 border-sky-200',
};

export function Badge({ value, children }: { value?: string; children?: ReactNode }) {
  const key = String(value ?? '').toLowerCase();
  const tone = BADGE_TONES[key] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {children ?? String(value ?? '—').replace(/_/g, ' ')}
    </span>
  );
}

export function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-600">{message}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-500';

export const buttonClass =
  'inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50';

export const buttonSecondaryClass =
  'inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50';

export const buttonDangerClass =
  'inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50';

/** Consistent relative timestamps across the panel. */
export function formatWhen(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleString();
}

/** Pulls a readable message out of an axios error. */
export function errorMessage(error: any, fallback = 'Something went wrong'): string {
  const data = error?.response?.data;
  const message = data?.message ?? data?.error ?? error?.message;
  if (Array.isArray(message)) return message.join(', ');
  return typeof message === 'string' ? message : fallback;
}
