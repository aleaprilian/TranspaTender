import React from 'react';
import { cn } from './cn';

/**
 * items: [{ id, label, icon: Component, badge, disabled, title }]
 * variant: 'underline' | 'pill'
 */
export function Tabs({ items = [], value, onChange, variant = 'underline', className }) {
  if (variant === 'pill') {
    return (
      <div
        role="tablist"
        className={cn('inline-flex items-center gap-1 rounded-control bg-slate-100 p-1', className)}
      >
        {items.map((item) => {
          const active = value === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={active}
              disabled={item.disabled}
              title={item.title}
              onClick={() => !item.disabled && onChange?.(item.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors focus-ring',
                item.disabled && 'opacity-40 cursor-not-allowed',
                active ? 'bg-white text-slate-900 shadow-card' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{item.label}</span>
              {item.badge != null && (
                <span className="rounded-full bg-slate-200 px-1.5 text-2xs font-semibold text-slate-600">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div role="tablist" className={cn('flex items-center gap-1 border-b border-slate-200 overflow-x-auto', className)}>
      {items.map((item) => {
        const active = value === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={active}
            disabled={item.disabled}
            title={item.title}
            onClick={() => !item.disabled && onChange?.(item.id)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3.5 pb-3 pt-1 text-xs font-medium transition-colors focus-ring',
              item.disabled && 'opacity-40 cursor-not-allowed',
              active
                ? 'border-brand-800 text-brand-900 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{item.label}</span>
            {item.badge != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-2xs font-semibold',
                  active ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-600'
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
