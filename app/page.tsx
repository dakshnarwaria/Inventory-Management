'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  IndianRupee,
  AlertTriangle,
  TrendingUp,
  ShoppingBag,
  ShoppingCart,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Plus,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import StockBadge from '@/components/StockBadge';
import RdbmsBadge from '@/components/RdbmsBadge';
import { useToast } from '@/components/Toast';
import { DashboardStats } from '@/src/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch dashboard metrics');
      }
    } catch {
      toast.error('Network error connecting to MySQL database');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const totalCatSales = stats?.salesByCategory.reduce((acc, curr) => acc + Number(curr.total_sales), 0) || 1;

  return (
    <div className="space-y-6">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-theme">
            Warehouse Dashboard
          </h1>
          <p className="text-xs text-muted-theme mt-1 flex flex-wrap items-center gap-2">
            <span>MySQL database <code className="font-mono text-amber-500">stockpilot</code></span>
            <span>&bull;</span>
            <RdbmsBadge type="view" name="low_stock_products" />
            <RdbmsBadge type="view" name="sales_summary" />
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="btn-secondary text-xs !py-1.5 cursor-pointer"
            title="Refresh database metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link href="/sales/new" className="btn-primary text-xs !py-1.5">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>New Sale</span>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards (5 metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Products"
          value={loading ? '-' : stats?.totalProducts ?? 0}
          icon={<Package className="w-5 h-5" />}
          subtitle="Registered in database"
          variant="default"
        />

        <StatCard
          title="Total Stock Value"
          value={loading ? '-' : formatCurrency(stats?.totalStockValue)}
          icon={<IndianRupee className="w-5 h-5" />}
          subtitle="Qty &times; Cost Price"
          variant="info"
        />

        <StatCard
          title="Low Stock Alerts"
          value={loading ? '-' : stats?.lowStockCount ?? 0}
          icon={<AlertTriangle className="w-5 h-5" />}
          subtitle="At or below reorder level"
          variant={stats && stats.lowStockCount > 0 ? 'warning' : 'default'}
        />

        <StatCard
          title="Today's Sales"
          value={loading ? '-' : formatCurrency(stats?.todaySales)}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle="CURDATE() receipts"
          variant="success"
        />

        <StatCard
          title="Today's Purchases"
          value={loading ? '-' : formatCurrency(stats?.todayPurchases)}
          icon={<ShoppingBag className="w-5 h-5" />}
          subtitle="CURDATE() inventory in"
          variant="default"
        />
      </div>

      {/* Main Grid: Left (Tables) & Right (Chart + Info) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Low stock table & Recent sales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Low Stock Table from low_stock_products View */}
          <div className="card-theme overflow-hidden">
            <div className="p-4 border-b border-theme flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-theme">Low Stock Products</h3>
                  <RdbmsBadge type="view" name="low_stock_products" />
                </div>
                <p className="text-xs text-muted-theme mt-0.5">
                  Automated query from MySQL view where <code className="text-amber-500 font-mono">stock_qty &lt;= reorder_level</code>
                </p>
              </div>

              <Link
                href="/low-stock"
                className="text-xs font-medium text-amber-500 hover:text-amber-400 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-theme bg-surface-hover/50 text-xs font-semibold text-muted-theme uppercase tracking-wider">
                    <th className="px-4 py-2.5">Product</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Supplier</th>
                    <th className="px-4 py-2.5 text-center">Stock / Reorder</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {loading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="h-4 bg-surface-hover rounded w-3/4" />
                        </td>
                      </tr>
                    ))
                  ) : stats?.lowStockItems && stats.lowStockItems.length > 0 ? (
                    stats.lowStockItems.map((item) => (
                      <tr key={item.product_id} className="hover:bg-surface-hover/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-theme">{item.name}</div>
                          <div className="text-[11px] font-mono text-muted-theme">{item.sku}</div>
                        </td>
                        <td className="px-4 py-3 text-muted-theme text-xs">{item.category_name}</td>
                        <td className="px-4 py-3 text-muted-theme text-xs">{item.supplier}</td>
                        <td className="px-4 py-3 text-center">
                          <StockBadge stockQty={item.stock_qty} reorderLevel={item.reorder_level} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/purchases/new?product_id=${item.product_id}&supplier_id=${item.supplier_id}`}
                            className="btn-primary text-xs !py-1 !px-2.5"
                          >
                            Restock
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-theme">
                        All products are currently healthy! No stock deficit.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Sales from sales_summary View */}
          <div className="card-theme overflow-hidden">
            <div className="p-4 border-b border-theme flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-theme">Recent Sales</h3>
                  <RdbmsBadge type="view" name="sales_summary" />
                </div>
                <p className="text-xs text-muted-theme mt-0.5">
                  Orders with trigger-calculated <code className="text-emerald-500 font-mono">total_amount</code>
                </p>
              </div>

              <Link
                href="/history"
                className="text-xs font-medium text-amber-500 hover:text-amber-400 flex items-center gap-1"
              >
                All History <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-theme bg-surface-hover/50 text-xs font-semibold text-muted-theme uppercase tracking-wider">
                    <th className="px-4 py-2.5">Sale ID</th>
                    <th className="px-4 py-2.5">Customer</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Payment</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="h-4 bg-surface-hover rounded w-3/4" />
                        </td>
                      </tr>
                    ))
                  ) : stats?.recentSales && stats.recentSales.length > 0 ? (
                    stats.recentSales.map((sale) => (
                      <tr key={sale.sale_id} className="hover:bg-surface-hover/60 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-amber-500">
                          #{sale.sale_id}
                        </td>
                        <td className="px-4 py-3 font-medium text-theme text-xs">
                          {sale.customer}
                        </td>
                        <td className="px-4 py-3 text-muted-theme text-xs">
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-surface-hover text-theme border border-theme">
                            {sale.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-theme text-xs">
                          {formatCurrency(sale.total_amount)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-theme">
                        No sales recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Sales by Category Chart & RDBMS Info */}
        <div className="space-y-6">
          {/* Sales by Category Chart */}
          <div className="card-theme p-5">
            <h3 className="text-sm font-semibold text-theme mb-1">Sales by Category</h3>
            <p className="text-xs text-muted-theme mb-4">
              Revenue distribution across product categories
            </p>

            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse space-y-1">
                    <div className="h-3 bg-surface-hover rounded w-1/2" />
                    <div className="h-2 bg-surface-hover rounded w-full" />
                  </div>
                ))
              ) : stats?.salesByCategory && stats.salesByCategory.length > 0 ? (
                stats.salesByCategory.map((cat, idx) => {
                  const percentage = Math.round((Number(cat.total_sales) / totalCatSales) * 100);
                  const colors = [
                    'bg-amber-500',
                    'bg-sky-500',
                    'bg-emerald-500',
                    'bg-indigo-500',
                    'bg-rose-500',
                  ];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div key={cat.category_name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-theme">{cat.category_name}</span>
                        <span className="font-semibold text-theme">
                          {formatCurrency(cat.total_sales)}{' '}
                          <span className="text-muted-theme font-normal text-[10px]">
                            ({percentage}%)
                          </span>
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-hover overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all duration-500`}
                          style={{ width: `${Math.max(percentage, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-muted-theme text-center py-4">No category sales data yet.</p>
              )}
            </div>
          </div>

          {/* Database Architecture Summary Box */}
          <div className="card-theme p-5 bg-linear-to-br from-surface to-surface-hover/50">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h4 className="text-sm font-semibold text-theme">RDBMS Feature Checklist</h4>
            </div>
            <p className="text-xs text-muted-theme mb-3">
              Key MySQL database features active in this system:
            </p>

            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span><strong className="text-theme">Stock Automation:</strong> Triggers update stock quantity and order amounts automatically.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span><strong className="text-theme">ACID Transactions:</strong> Sales and Purchases use multi-table single-connection commit/rollback.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                <span><strong className="text-theme">Constraint Safety:</strong> Prevents overselling with MySQL Trigger Signal 45000 and restricts orphan deletion (1451).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span><strong className="text-theme">SQL Views:</strong> Pre-aggregated views for low stock items and sales summaries.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
