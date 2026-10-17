import React from 'react';

interface StockBadgeProps {
  stockQty: number;
  reorderLevel: number;
  showQty?: boolean;
}

export default function StockBadge({ stockQty, reorderLevel, showQty = true }: StockBadgeProps) {
  if (stockQty <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
        Out of Stock {showQty && `(0)`}
      </span>
    );
  }

  if (stockQty <= reorderLevel) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Low Stock {showQty && `(${stockQty}/${reorderLevel})`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      Healthy {showQty && `(${stockQty})`}
    </span>
  );
}
