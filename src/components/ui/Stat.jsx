import React from 'react';
import { cn } from './cn';

const VALUE_TONES = {
  neutral: 'text-slate-900',
  brand: 'text-brand-800',
  commit: 'text-status-commit-dot',
  reveal: 'text-status-reveal-dot',
  done: 'text-status-done-dot',
  pending: 'text-status-pending-dot',
  danger: 'text-status-danger-dot',
};

/**
 * Compact metric card: label, value and optional hint.
 */
export function Stat({ label, value, hint, icon: Icon, tone = 'neutral', className }) {
  return (
    <div className={cn('bg-white p-4 rounded-card border border-slate-200 shadow-card', className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
        <span>{label}</span>
      </div>
      <div className={cn('mt-2 text-xl font-bold tabular-nums tracking-tight', VALUE_TONES[tone] || VALUE_TONES.neutral)}>
        {value}
      </div>
      {hint && <div className="mt-1 text-2xs text-slate-400">{hint}</div>}
    </div>
  );
}
