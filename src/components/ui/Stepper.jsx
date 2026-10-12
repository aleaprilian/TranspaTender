import React from 'react';
import { cn } from './cn';

/**
 * Horizontal numbered flow, used for the vendor commit -> reveal journey.
 * steps: [{ id, label, icon: Component, disabled, optional }]
 * Numbers are shown consistently for ordered flow steps; `optional` steps
 * (e.g. Vault, Anti-curang) can be rendered without a number.
 */
export function Stepper({ steps = [], value, onChange, className }) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto', className)}>
      {steps.map((step, index) => {
        const active = value === step.id;
        const Icon = step.icon;
        const showNumber = step.number !== undefined ? step.number : index + 1;
        return (
          <React.Fragment key={step.id}>
            {index > 0 && <span className="h-px w-4 shrink-0 bg-slate-200" />}
            <button
              type="button"
              disabled={step.disabled}
              title={step.title}
              onClick={() => !step.disabled && onChange?.(step.id)}
              aria-current={active ? 'step' : undefined}
              className={cn(
                'inline-flex items-center gap-2 whitespace-nowrap rounded-control border px-2.5 py-1.5 text-xs font-medium transition-colors focus-ring',
                step.disabled && 'opacity-40 cursor-not-allowed',
                active
                  ? 'border-brand-800 bg-brand-50 text-brand-900'
                  : 'border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300'
              )}
            >
              {showNumber != null ? (
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-2xs font-bold',
                    active ? 'bg-brand-800 text-white' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {showNumber}
                </span>
              ) : (
                Icon && <Icon className="h-3.5 w-3.5" />
              )}
              {showNumber != null && Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{step.label}</span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
