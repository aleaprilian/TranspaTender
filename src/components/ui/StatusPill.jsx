import React from 'react';
import { cn } from './cn';

/**
 * tone: commit | reveal | done | pending | danger | neutral
 */
const TONES = {
  commit: 'bg-status-commit-bg text-status-commit-text border-status-commit-border',
  reveal: 'bg-status-reveal-bg text-status-reveal-text border-status-reveal-border',
  done: 'bg-status-done-bg text-status-done-text border-status-done-border',
  pending: 'bg-status-pending-bg text-status-pending-text border-status-pending-border',
  danger: 'bg-status-danger-bg text-status-danger-text border-status-danger-border',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

const DOTS = {
  commit: 'bg-status-commit-dot',
  reveal: 'bg-status-reveal-dot',
  done: 'bg-status-done-dot',
  pending: 'bg-status-pending-dot',
  danger: 'bg-status-danger-dot',
  neutral: 'bg-slate-400',
};

/** Maps a tender stage (from getTenderStatus) to a status tone. */
export const STATUS_TONE = {
  COMMIT: 'commit',
  REVEAL: 'reveal',
  AWAITING_LOCK: 'pending',
  COMPLETED: 'done',
};

export function StatusPill({ tone = 'neutral', dot = true, pulse = false, className, children }) {
  const resolved = TONES[tone] ? tone : 'neutral';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-semibold',
        TONES[resolved],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[resolved], pulse && 'animate-pulse')} />}
      {children}
    </span>
  );
}
