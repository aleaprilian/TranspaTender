import React from 'react';
import { cn } from './cn';

/**
 * Consistent empty state with optional icon and call-to-action.
 */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-6 py-12',
        'bg-white border border-slate-200 rounded-card',
        className
      )}
    >
      {Icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 mb-3">
          <Icon className="h-6 w-6" />
        </span>
      )}
      {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
      {description && (
        <p className="mt-1 max-w-md text-xs text-slate-500 leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
