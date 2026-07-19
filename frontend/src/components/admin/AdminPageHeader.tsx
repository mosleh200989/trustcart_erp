import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
};

export default function AdminPageHeader({
  title,
  description,
  eyebrow,
  icon,
  backHref,
  backLabel = 'Back',
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {backLabel}
          </Link>
        )}
        {(eyebrow || icon) && (
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
            {icon}
            {eyebrow && <span>{eyebrow}</span>}
          </div>
        )}
        <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-gray-600 sm:text-base">{description}</p>}
      </div>
      {actions && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end [&>button]:min-h-11 [&>button]:w-full sm:[&>button]:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
