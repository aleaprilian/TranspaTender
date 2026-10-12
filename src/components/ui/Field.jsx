import React from 'react';
import { cn } from './cn';

/**
 * Form field wrapper: label + control + hint/error.
 * Pass the input/select/textarea as children.
 */
export function Field({
  label,
  hint,
  error,
  required = false,
  htmlFor,
  labelAction,
  className,
  children,
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={htmlFor} className="text-xs font-medium text-slate-700 flex items-center gap-1">
            <span>{label}</span>
            {required && <span className="text-status-danger-dot">*</span>}
          </label>
          {labelAction}
        </div>
      )}
      {children}
      {error ? (
        <p className="text-2xs text-status-danger-text font-medium">{error}</p>
      ) : hint ? (
        <p className="text-2xs text-slate-500 leading-relaxed">{hint}</p>
      ) : null}
    </div>
  );
}
