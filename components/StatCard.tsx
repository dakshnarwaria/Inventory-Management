import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  trend?: string;
  variant?: 'default' | 'warning' | 'success' | 'info';
  href?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  subtitle,
  variant = 'default',
}: StatCardProps) {
  let accentColor = 'text-amber-500 bg-amber-500/10 border-amber-500/20';

  if (variant === 'warning') {
    accentColor = 'text-amber-500 bg-amber-500/15 border-amber-500/30';
  } else if (variant === 'success') {
    accentColor = 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30';
  } else if (variant === 'info') {
    accentColor = 'text-sky-500 bg-sky-500/15 border-sky-500/30';
  }

  return (
    <div className="card-theme p-5 relative overflow-hidden transition-all duration-200 hover:border-amber-500/40 hover:shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-theme mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-theme">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-theme mt-1.5 flex items-center gap-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl border ${accentColor} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
