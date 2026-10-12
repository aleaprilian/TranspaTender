import React from 'react';
import { cn } from './cn';

const VARIANTS = {
  primary: 'bg-brand-900 text-white border border-transparent hover:bg-brand-800',
  secondary: 'bg-white text-brand-900 border border-slate-300 hover:bg-slate-50 hover:border-slate-400',
  ghost: 'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-white text-status-danger-text border border-status-danger-border hover:bg-status-danger-bg',
};

const SIZES = {
  sm: 'h-8 px-2.5 text-2xs gap-1.5',
  md: 'h-9 px-3.5 text-xs gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

/**
 * Single, consistent button across the app.
 * variant: primary | secondary | ghost | danger
 * size: sm | md | lg
 */
export function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}) {
  return (
    <Tag
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-control transition-colors',
        'focus-ring disabled:opacity-50 disabled:cursor-not-allowed select-none',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
