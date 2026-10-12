import React from 'react';
import { cn } from './cn';

/**
 * Consistent section heading: optional icon, title, short description and
 * an actions slot on the right.
 */
export function SectionHeading({
  icon: Icon,
  title,
  description,
  actions,
  className,
}) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <h2 className="text-base font-semibold tracking-tight text-slate-900 truncate">{title}</h2>
        </div>
        {description && (
          <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-3xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
