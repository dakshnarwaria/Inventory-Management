'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  ShoppingCart,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  Calendar,
  CreditCard,
  Package,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import RdbmsBadge from '@/components/RdbmsBadge';
import { Sale, Purchase, SaleItem, PurchaseItem } from '@/src/types';

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales');
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Expanded row IDs
  const [expandedSaleIds, setExpandedSaleIds] = useState<Record<number, boolean>>({});
  const [expandedPurchaseIds, setExpandedPurchaseIds] = useState<Record<number, boolean>>({});
  const [saleDetails, setSaleDetails] = useState<Record<number, SaleItem[]>>({});
  const [purchaseDetails, setPurchaseDetails] = useState<Record<number, PurchaseItem[]>>({});
  const [loadingDetail, setLoadingDetail] = useState<Record<string, boolean>>({});

  const toast = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [salesRes, purRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/purchases'),
      ]);
      const [salesData, purData] = await Promise.all([salesRes.json(), purRes.json()]);

      if (salesData.success) setSales(salesData.data);
      if (purData.success) setPurchases(purData.data);
    } catch {
      toast.error('Network error loading transaction history');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpandSale = async (saleId: number) => {
    const isCurrentlyExpanded = !!expandedSaleIds[saleId];
    setExpandedSaleIds((prev) => ({ ...prev, [saleId]: !isCurrentlyExpanded }));

    // Fetch items if not already cached
    if (!isCurrentlyExpanded && !saleDetails[saleId]) {
      try {
        setLoadingDetail((prev) => ({ ...prev, [`s_${saleId}`]: true }));
        const res = await fetch(`/api/sales/${saleId}`);
        const data = await res.json();
        if (data.success && data.data.items) {
          setSaleDetails((prev) => ({ ...prev, [saleId]: data.data.items }));
        }
      } catch {
        toast.error(`Failed to load items for Sale #${saleId}`);
      } finally {
        setLoadingDetail((prev) => ({ ...prev, [`s_${saleId}`]: false }));
      }
    }
  };

  const toggleExpandPurchase = async (purchaseId: number) => {
    const isCurrentlyExpanded = !!expandedPurchaseIds[purchaseId];
    setExpandedPurchaseIds((prev) => ({ ...prev, [purchaseId]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded && !purchaseDetails[purchaseId]) {
      try {
        setLoadingDetail((prev) => ({ ...prev, [`p_${purchaseId}`]: true }));
        const res = await fetch(`/api/purchases/${purchaseId}`);
        const data = await res.json();
        if (data.success && data.data.items) {
          setPurchaseDetails((prev) => ({ ...prev, [purchaseId]: data.data.items }));
        }
      } catch {
        toast.error(`Failed to load items for Purchase #${purchaseId}`);
      } finally {
        setLoadingDetail((prev) => ({ ...prev, [`p_${purchaseId}`]: false }));
      }
    }
  };

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  const filteredSales = sales.filter((s) => {
    const searchLower = search.toLowerCase();
    return (
      String(s.sale_id).includes(searchLower) ||
      (s.customer_name && s.customer_name.toLowerCase().includes(searchLower)) ||
      s.payment_method.toLowerCase().includes(searchLower)
    );
  });

  const filteredPurchases = purchases.filter((p) => {
    const searchLower = search.toLowerCase();
    return (
      String(p.purchase_id).includes(searchLower) ||
      (p.supplier_name && p.supplier_name.toLowerCase().includes(searchLower)) ||
      p.status.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-theme flex items-center gap-2">
            Transaction History
          </h1>
          <p className="text-xs text-muted-theme mt-1">
            Audit logs for sales and procurement orders with expandable line items
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn-secondary text-xs !py-2 cursor-pointer"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center p-1 rounded-xl bg-surface-hover/70 border border-theme w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'sales'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-muted-theme hover:text-theme'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Sales Orders ({sales.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('purchases')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'purchases'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-muted-theme hover:text-theme'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Purchases Orders ({purchases.length})</span>
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-muted-theme absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'sales' ? 'Search sales...' : 'Search purchases...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-theme w-full pl-9 text-xs"
          />
        </div>
      </div>

      {/* Sales Table with Row Expansion */}
      {activeTab === 'sales' && (
        <div className="card-theme overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-theme bg-surface-hover/60 text-xs font-semibold text-muted-theme uppercase tracking-wider">
                  <th className="w-10 px-3 py-3" />
                  <th className="px-4 py-3">Sale ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 bg-surface-hover rounded w-3/4" />
                      </td>
                    </tr>
                  ))
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-theme">
                      No sales history found.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => {
                    const isExpanded = !!expandedSaleIds[sale.sale_id];
                    const items = saleDetails[sale.sale_id] || [];
                    const isDetailLoading = loadingDetail[`s_${sale.sale_id}`];

                    return (
                      <React.Fragment key={sale.sale_id}>
                        <tr
                          onClick={() => toggleExpandSale(sale.sale_id)}
                          className={`hover:bg-surface-hover/60 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-surface-hover/40' : ''
                          }`}
                        >
                          <td className="px-3 py-3.5 text-center text-muted-theme">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-amber-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs font-semibold text-amber-500">
                            #{sale.sale_id}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-theme">
                            {sale.customer_name}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-theme">
                            {new Date(sale.sale_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex px-2 py-0.5 rounded text-xs bg-surface border border-theme text-theme font-medium">
                              {sale.payment_method}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-surface-hover text-theme border border-theme">
                              {sale.items_count || 1}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-theme">
                            {formatCurrency(sale.total_amount)}
                          </td>
                        </tr>

                        {/* Expanded items row */}
                        {isExpanded && (
                          <tr className="bg-surface-card/90">
                            <td colSpan={7} className="px-6 py-4 border-y border-theme/60">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs font-semibold text-theme">
                                  <span className="flex items-center gap-1.5 text-amber-500">
                                    <Package className="w-3.5 h-3.5" />
                                    <span>Sale #{sale.sale_id} Line Items</span>
                                  </span>
                                  <span className="text-[11px] text-muted-theme font-normal">
                                    Source table: <code className="font-mono text-amber-500">sale_items</code>
                                  </span>
                                </div>

                                {isDetailLoading ? (
                                  <div className="py-4 text-center text-xs text-muted-theme animate-pulse">
                                    Querying line items...
                                  </div>
                                ) : items.length > 0 ? (
                                  <div className="rounded-lg border border-theme overflow-hidden bg-surface">
                                    <table className="w-full text-xs text-left border-collapse">
                                      <thead>
                                        <tr className="border-b border-theme bg-surface-hover/70 text-muted-theme font-medium">
                                          <th className="px-3 py-2">Item</th>
                                          <th className="px-3 py-2">SKU</th>
                                          <th className="px-3 py-2 text-right">Quantity</th>
                                          <th className="px-3 py-2 text-right">Unit Price</th>
                                          <th className="px-3 py-2 text-right">Subtotal</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-theme">
                                        {items.map((item) => (
                                          <tr key={item.sale_item_id} className="hover:bg-surface-hover/40">
                                            <td className="px-3 py-2 font-medium text-theme">
                                              {item.product_name}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-muted-theme">
                                              {item.sku}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono">
                                              {item.quantity}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-muted-theme">
                                              {formatCurrency(item.unit_price)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono font-semibold text-theme">
                                              {formatCurrency(item.subtotal)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-theme">No item details found.</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Purchases Table with Row Expansion */}
      {activeTab === 'purchases' && (
        <div className="card-theme overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-theme bg-surface-hover/60 text-xs font-semibold text-muted-theme uppercase tracking-wider">
                  <th className="w-10 px-3 py-3" />
                  <th className="px-4 py-3">PO #</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {loading ? (
                  Array.from({ length: 4 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 bg-surface-hover rounded w-3/4" />
                      </td>
                    </tr>
                  ))
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-theme">
                      No purchase orders recorded.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => {
                    const isExpanded = !!expandedPurchaseIds[purchase.purchase_id];
                    const items = purchaseDetails[purchase.purchase_id] || [];
                    const isDetailLoading = loadingDetail[`p_${purchase.purchase_id}`];

                    return (
                      <React.Fragment key={purchase.purchase_id}>
                        <tr
                          onClick={() => toggleExpandPurchase(purchase.purchase_id)}
                          className={`hover:bg-surface-hover/60 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-surface-hover/40' : ''
                          }`}
                        >
                          <td className="px-3 py-3.5 text-center text-muted-theme">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-amber-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs font-semibold text-amber-500">
                            #{purchase.purchase_id}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-theme">
                            {purchase.supplier_name}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-theme">
                            {new Date(purchase.purchase_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${
                                purchase.status === 'Received'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : purchase.status === 'Pending'
                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              }`}
                            >
                              {purchase.status}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-surface-hover text-theme border border-theme">
                              {purchase.items_count || 1}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono font-bold text-theme">
                            {formatCurrency(purchase.total_amount)}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-surface-card/90">
                            <td colSpan={7} className="px-6 py-4 border-y border-theme/60">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs font-semibold text-theme">
                                  <span className="flex items-center gap-1.5 text-amber-500">
                                    <Package className="w-3.5 h-3.5" />
                                    <span>Purchase #{purchase.purchase_id} Procured Lines</span>
                                  </span>
                                  <span className="text-[11px] text-muted-theme font-normal">
                                    Source table: <code className="font-mono text-amber-500">purchase_items</code>
                                  </span>
                                </div>

                                {isDetailLoading ? (
                                  <div className="py-4 text-center text-xs text-muted-theme animate-pulse">
                                    Querying line items...
                                  </div>
                                ) : items.length > 0 ? (
                                  <div className="rounded-lg border border-theme overflow-hidden bg-surface">
                                    <table className="w-full text-xs text-left border-collapse">
                                      <thead>
                                        <tr className="border-b border-theme bg-surface-hover/70 text-muted-theme font-medium">
                                          <th className="px-3 py-2">Item</th>
                                          <th className="px-3 py-2">SKU</th>
                                          <th className="px-3 py-2 text-right">Quantity</th>
                                          <th className="px-3 py-2 text-right">Unit Cost</th>
                                          <th className="px-3 py-2 text-right">Subtotal</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-theme">
                                        {items.map((item) => (
                                          <tr key={item.purchase_item_id} className="hover:bg-surface-hover/40">
                                            <td className="px-3 py-2 font-medium text-theme">
                                              {item.product_name}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-muted-theme">
                                              {item.sku}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono">
                                              {item.quantity}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-muted-theme">
                                              {formatCurrency(item.unit_cost)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono font-semibold text-theme">
                                              {formatCurrency(item.subtotal)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-theme">No item details found.</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
