import React from 'react';
import { Zap } from 'lucide-react';

interface RdbmsBadgeProps {
  type: 'trigger' | 'procedure' | 'view' | 'transaction';
  name: string;
  description?: string;
}

export default function RdbmsBadge({ type, name, description }: RdbmsBadgeProps) {
  let badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/30';
  let label = 'TRIGGER';

  if (type === 'procedure') {
    badgeColor = 'bg-sky-500/10 text-sky-500 border-sky-500/30';
    label = 'PROCEDURE';
  } else if (type === 'view') {
    badgeColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    label = 'VIEW';
  } else if (type === 'transaction') {
    badgeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
    label = 'ACID TX';
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono ${badgeColor}`}
      title={description || `MySQL ${label}: ${name}`}
    >
      <Zap className="w-3 h-3 shrink-0" />
      <span className="font-semibold text-[10px] tracking-wider opacity-75">{label}:</span>
      <span className="font-medium">{name}</span>
    </div>
  );
}
