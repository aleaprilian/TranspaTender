import React from 'react';
import { cn } from './cn';

export function Card({ as: Tag = 'div', className, children, ...props }) {
  return (
    <Tag
      className={cn('bg-white border border-slate-200 rounded-card shadow-card', className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div
      className={cn('px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...props }) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={cn('px-5 py-3.5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}
