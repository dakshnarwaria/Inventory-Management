'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag,
  Plus,
  Trash2,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import RdbmsBadge from '@/components/RdbmsBadge';
import { Supplier, Product, PurchaseStatus } from '@/src/types';

interface PurchaseLineItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  name?: string;
  sku?: string;
}

function PurchaseFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const prefillProductId = searchParams.get('product_id');
  const prefillSupplierId = searchParams.get('supplier_id');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [status, setStatus] = useState<PurchaseStatus>('Received');
  const [items, setItems] = useState<PurchaseLineItem[]>([
    { id: '1', product_id: '', quantity: 10, unit_cost: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingInitial(true);
        const [supRes, prodRes] = await Promise.all([
          fetch('/api/suppliers'),
          fetch('/api/products'),
        ]);
        const [supData, prodData] = await Promise.all([supRes.json(), prodRes.json()]);

        if (supData.success && supData.data.length > 0) {
          setSuppliers(supData.data);
          if (prefillSupplierId) {
            setSelectedSupplierId(prefillSupplierId);
          } else {
            setSelectedSupplierId(String(supData.data[0].supplier_id));
          }
        }

        if (prodData.success) {
          setProducts(prodData.data);
          if (prefillProductId) {
            const prefillProd = prodData.data.find(
              (p: Product) => String(p.product_id) === prefillProductId
            );
            if (prefillProd) {
              setItems([
                {
                  id: '1',
                  product_id: prefillProductId,
                  quantity: Math.max(10, prefillProd.reorder_level * 2),
                  unit_cost: Number(prefillProd.cost_price),
                  name: prefillProd.name,
                  sku: prefillProd.sku,
                },
              ]);
            }
          }
        }
      } catch {
        toast.error('Failed to load suppliers and products');
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [prefillProductId, prefillSupplierId, toast]);

  const handleProductChange = (index: number, productIdStr: string) => {
    const product = products.find((p) => String(p.product_id) === productIdStr);
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        product_id: productIdStr,
        unit_cost: product ? Number(product.cost_price) : 0,
        name: product?.name,
        sku: product?.sku,
      };
      return next;
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const validQty = Math.max(1, Math.floor(qty) || 1);
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        quantity: validQty,
      };
      return next;
    });
  };

  const handleCostChange = (index: number, cost: number) => {
    const validCost = Math.max(0, cost || 0);
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        unit_cost: validCost,
      };
      return next;
    });
  };

  const addLine = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        product_id: '',
        quantity: 10,
        unit_cost: 0,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (items.length === 1) {
      toast.warning('A purchase order must contain at least one product line.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const estimatedTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * (item.unit_cost || 0), 0);
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSupplierId) {
      return toast.error('Please select a supplier.');
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].product_id) {
        return toast.error(`Line #${i + 1}: Please select a product.`);
      }
      if (items[i].quantity <= 0) {
        return toast.error(`Line #${i + 1}: Quantity must be greater than 0.`);
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        supplier_id: Number(selectedSupplierId),
        status,
        items: items.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          unit_cost: Number(item.unit_cost),
        })),
      };

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          `Purchase Order #${data.data.purchase_id} recorded! Warehouse stock increased via MySQL trigger after_purchase_item.`,
          'Transaction Committed'
        );
        router.push('/history');
      } else {
        toast.error(data.error || 'Failed to record purchase order');
      }
    } catch {
      toast.error('Network error during purchase transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-muted-theme hover:text-theme p-1 -ml-1 rounded transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-theme">New Purchase Order</h1>
          </div>
          <p className="text-xs text-muted-theme flex flex-wrap items-center gap-2">
            <span>Procure inventory &bull; Stock quantity automatically incremented by MySQL trigger</span>
            <span>&bull;</span>
            <RdbmsBadge type="trigger" name="after_purchase_item" />
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Purchase Details (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            <div className="card-theme p-5 space-y-4">
              <h2 className="text-sm font-semibold text-theme pb-2 border-b border-theme flex items-center justify-between">
                <span>Supplier &amp; Receipt Status</span>
                <span className="text-[11px] font-normal text-muted-theme">
                  Table: <code className="font-mono text-amber-500">purchases</code>
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-theme mb-1">
                    Supplier <span className="text-rose-500">*</span>
                  </label>
                  {loadingInitial ? (
                    <div className="h-9 bg-surface-hover rounded animate-pulse" />
                  ) : (
                    <select
                      required
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="input-theme w-full"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.supplier_id} value={s.supplier_id}>
                          {s.name} ({s.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-medium text-theme mb-1">
                    Order Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PurchaseStatus)}
                    className="input-theme w-full font-medium"
                  >
                    <option value="Received">Received (Instantly adds stock)</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Line Items Card */}
            <div className="card-theme p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-theme">
                <div>
                  <h2 className="text-sm font-semibold text-theme">Procured Items</h2>
                  <p className="text-[11px] text-muted-theme">
                    Table: <code className="font-mono text-amber-500">purchase_items</code> (Editable unit cost)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="btn-secondary text-xs !py-1 !px-2.5"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Add Line</span>
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-theme bg-surface-hover/30"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold text-amber-500">Line #{idx + 1}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-medium text-muted-theme mb-1">
                          Product
                        </label>
                        <select
                          required
                          value={item.product_id}
                          onChange={(e) => handleProductChange(idx, e.target.value)}
                          className="input-theme w-full text-xs"
                        >
                          <option value="">Select Product...</option>
                          {products.map((p) => (
                            <option key={p.product_id} value={p.product_id}>
                              {p.name} ({p.sku}) &bull; Stock: {p.stock_qty}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-muted-theme mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                          className="input-theme w-full text-xs font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-muted-theme mb-1">
                          Unit Cost (&#8377;)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={item.unit_cost}
                          onChange={(e) => handleCostChange(idx, Number(e.target.value))}
                          className="input-theme w-full text-xs font-mono"
                        />
                      </div>

                      <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-2 pt-4 sm:pt-0">
                        <div className="text-right">
                          <span className="block text-[10px] text-muted-theme">Subtotal</span>
                          <span className="font-mono text-xs font-bold text-theme">
                            {formatCurrency(item.quantity * item.unit_cost)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="p-1.5 rounded-lg text-muted-theme hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Remove line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Summary (1 col) */}
          <div className="space-y-6">
            <div className="card-theme p-5 sticky top-20 space-y-4">
              <h3 className="text-sm font-semibold text-theme pb-2 border-b border-theme flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-500" />
                <span>Purchase Summary</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-theme">
                  <span>Supplier:</span>
                  <span className="font-medium text-theme">
                    {suppliers.find((s) => String(s.supplier_id) === selectedSupplierId)?.name || '-'}
                  </span>
                </div>

                <div className="flex justify-between text-muted-theme">
                  <span>Status:</span>
                  <span className="font-medium text-theme">{status}</span>
                </div>

                <div className="flex justify-between text-muted-theme">
                  <span>Line Items:</span>
                  <span className="font-mono text-theme">{items.length}</span>
                </div>

                <div className="flex justify-between text-muted-theme">
                  <span>Total Units:</span>
                  <span className="font-mono text-theme">
                    {items.reduce((acc, curr) => acc + curr.quantity, 0)}
                  </span>
                </div>

                <div className="pt-3 border-t border-theme flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-theme">Purchase Cost</span>
                  <span className="text-xl font-bold font-mono text-amber-500">
                    {formatCurrency(estimatedTotal)}
                  </span>
                </div>
              </div>

              {/* RDBMS Callout */}
              <div className="p-3 rounded-lg bg-surface-hover/70 border border-theme text-[11px] space-y-1 text-muted-theme">
                <div className="flex items-center gap-1 text-amber-500 font-semibold">
                  <Info className="w-3.5 h-3.5" />
                  <span>MySQL Trigger Operation</span>
                </div>
                <p>
                  Upon committing, MySQL trigger <code className="text-theme font-mono">after_purchase_item</code> will automatically increment <code className="text-theme font-mono">products.stock_qty</code> and calculate <code className="text-theme font-mono">purchases.total_amount</code>.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full !py-2.5 shadow-md text-xs font-bold uppercase tracking-wider"
              >
                {submitting ? 'Committing Order...' : 'Submit Purchase Order'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewPurchasePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-muted-theme animate-pulse">
          Loading purchase order form...
        </div>
      }
    >
      <PurchaseFormContent />
    </Suspense>
  );
}
