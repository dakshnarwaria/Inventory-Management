'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingCart,
  Plus,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  CreditCard,
  Banknote,
  Smartphone,
  Info,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import RdbmsBadge from '@/components/RdbmsBadge';
import { Customer, Product, PaymentMethod } from '@/src/types';

interface SaleLineItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  stock_qty?: number;
  name?: string;
  sku?: string;
}

export default function NewSalePage() {
  const router = useRouter();
  const toast = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [items, setItems] = useState<SaleLineItem[]>([
    { id: '1', product_id: '', quantity: 1, unit_price: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingInitial(true);
        const [custRes, prodRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/products'),
        ]);
        const [custData, prodData] = await Promise.all([custRes.json(), prodRes.json()]);

        if (custData.success && custData.data.length > 0) {
          setCustomers(custData.data);
          setSelectedCustomerId(String(custData.data[0].customer_id));
        }
        if (prodData.success) {
          setProducts(prodData.data);
        }
      } catch {
        toast.error('Failed to load customers and products from database');
      } finally {
        setLoadingInitial(false);
      }
    }
    loadData();
  }, [toast]);

  const handleProductChange = (index: number, productIdStr: string) => {
    const product = products.find((p) => String(p.product_id) === productIdStr);
    setItems((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        product_id: productIdStr,
        unit_price: product ? Number(product.selling_price) : 0,
        stock_qty: product ? product.stock_qty : 0,
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

  const addLine = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        product_id: '',
        quantity: 1,
        unit_price: 0,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (items.length === 1) {
      toast.warning('A sale must have at least one product line item.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Live total preview (Note: application estimates total, while the trigger after_sale_item records it)
  const estimatedTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * (item.unit_price || 0), 0);
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      return toast.error('Please select a customer.');
    }

    // Validate lines
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
        customer_id: Number(selectedCustomerId),
        payment_method: paymentMethod,
        items: items.map((item) => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          `Sale #${data.data.sale_id} processed! Stock automatically updated by MySQL trigger.`,
          'Transaction Committed'
        );
        router.push('/history');
      } else {
        // Trigger 45000: Insufficient stock
        if (data.code === 45000 || data.error?.includes('Insufficient stock')) {
          toast.error(
            'MySQL Trigger Alert: Insufficient stock in warehouse for one of the items. Transaction rolled back safely.',
            'Stock Constraint Block'
          );
        } else {
          toast.error(data.error || 'Failed to complete sale transaction');
        }
      }
    } catch {
      toast.error('Network error during transaction processing');
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
            <h1 className="text-2xl font-bold tracking-tight text-theme">New Sale Order</h1>
          </div>
          <p className="text-xs text-muted-theme flex flex-wrap items-center gap-2">
            <span>Single connection ACID transaction with MySQL stock triggers</span>
            <span>&bull;</span>
            <RdbmsBadge type="trigger" name="before_sale_item" />
            <RdbmsBadge type="trigger" name="after_sale_item" />
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Sale Form (2 columns) */}
          <div className="md:col-span-2 space-y-6">
            {/* Customer & Payment Info Card */}
            <div className="card-theme p-5 space-y-4">
              <h2 className="text-sm font-semibold text-theme pb-2 border-b border-theme flex items-center justify-between">
                <span>Customer &amp; Payment Details</span>
                <span className="text-[11px] font-normal text-muted-theme">Table: <code className="font-mono text-amber-500">sales</code></span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-theme mb-1">
                    Customer <span className="text-rose-500">*</span>
                  </label>
                  {loadingInitial ? (
                    <div className="h-9 bg-surface-hover rounded animate-pulse" />
                  ) : (
                    <select
                      required
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="input-theme w-full"
                    >
                      <option value="">Select Customer</option>
                      {customers.map((c) => (
                        <option key={c.customer_id} value={c.customer_id}>
                          {c.name} ({c.email})
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="text-[10px] text-muted-theme mt-1">
                    Can&apos;t find customer?{' '}
                    <Link href="/customers" className="text-amber-500 underline">
                      Add new in Customers
                    </Link>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-theme mb-1">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Cash', 'Card', 'UPI'] as PaymentMethod[]).map((method) => {
                      const isSelected = paymentMethod === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500 text-amber-500 font-semibold'
                              : 'bg-surface border-theme text-muted-theme hover:bg-surface-hover'
                          }`}
                        >
                          {method === 'Cash' && <Banknote className="w-4 h-4" />}
                          {method === 'Card' && <CreditCard className="w-4 h-4" />}
                          {method === 'UPI' && <Smartphone className="w-4 h-4" />}
                          <span>{method}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Card */}
            <div className="card-theme p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-theme">
                <div>
                  <h2 className="text-sm font-semibold text-theme">Order Line Items</h2>
                  <p className="text-[11px] text-muted-theme">
                    Table: <code className="font-mono text-amber-500">sale_items</code> (Checked by trigger for stock availability)
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
                {items.map((item, idx) => {
                  const product = products.find((p) => String(p.product_id) === item.product_id);
                  const isExceedingStock = product && item.quantity > product.stock_qty;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isExceedingStock
                          ? 'border-rose-500/60 bg-rose-500/5'
                          : 'border-theme bg-surface-hover/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-amber-500">Line #{idx + 1}</span>
                        {product && (
                          <span className="text-[11px] font-mono text-muted-theme">
                            Available in DB: <strong className={product.stock_qty < 10 ? 'text-amber-500' : 'text-emerald-500'}>{product.stock_qty}</strong>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        {/* Product select */}
                        <div className="sm:col-span-6">
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
                                {p.name} ({p.sku}) &bull; Stock: {p.stock_qty} &bull; &#8377;{p.selling_price}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-muted-theme mb-1">
                            Qty
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

                        {/* Unit Price (Auto-filled from selling_price) */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-muted-theme mb-1">
                            Unit Price
                          </label>
                          <div className="input-theme w-full text-xs font-mono bg-surface-hover/70 cursor-not-allowed">
                            &#8377;{item.unit_price}
                          </div>
                        </div>

                        {/* Subtotal & Delete */}
                        <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-4 sm:pt-0">
                          <div className="text-right">
                            <span className="block text-[10px] text-muted-theme">Subtotal</span>
                            <span className="font-mono text-xs font-bold text-theme">
                              {formatCurrency(item.quantity * item.unit_price)}
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

                      {/* Stock Warning Warning */}
                      {isExceedingStock && (
                        <div className="mt-2 text-[11px] text-rose-500 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Warning: Quantity ({item.quantity}) exceeds available stock ({product.stock_qty}). The MySQL trigger <code className="font-mono">before_sale_item</code> will abort with &quot;Insufficient stock&quot;.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Transaction Summary & Confirmation (1 column) */}
          <div className="space-y-6">
            <div className="card-theme p-5 sticky top-20 space-y-4">
              <h3 className="text-sm font-semibold text-theme pb-2 border-b border-theme flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-amber-500" />
                <span>Transaction Summary</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-theme">
                  <span>Customer:</span>
                  <span className="font-medium text-theme">
                    {customers.find((c) => String(c.customer_id) === selectedCustomerId)?.name || '-'}
                  </span>
                </div>

                <div className="flex justify-between text-muted-theme">
                  <span>Payment Method:</span>
                  <span className="font-medium text-theme">{paymentMethod}</span>
                </div>

                <div className="flex justify-between text-muted-theme">
                  <span>Total Line Items:</span>
                  <span className="font-mono text-theme">{items.length}</span>
                </div>

                <div className="flex justify-between text-muted-theme">
                  <span>Total Units:</span>
                  <span className="font-mono text-theme">
                    {items.reduce((acc, curr) => acc + curr.quantity, 0)}
                  </span>
                </div>

                <div className="pt-3 border-t border-theme flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-theme">Total Payable</span>
                  <span className="text-xl font-bold font-mono text-amber-500">
                    {formatCurrency(estimatedTotal)}
                  </span>
                </div>
              </div>

              {/* RDBMS Callout */}
              <div className="p-3 rounded-lg bg-surface-hover/70 border border-theme text-[11px] space-y-1 text-muted-theme">
                <div className="flex items-center gap-1 text-amber-500 font-semibold">
                  <Info className="w-3.5 h-3.5" />
                  <span>RDBMS Automation</span>
                </div>
                <p>
                  1. <code className="text-theme font-mono">before_sale_item</code> verifies stock sufficiency.
                </p>
                <p>
                  2. <code className="text-theme font-mono">after_sale_item</code> reduces product stock and updates <code className="text-theme font-mono">sales.total_amount</code>.
                </p>
                <p>
                  3. If any line fails, all changes are rolled back automatically.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full !py-2.5 shadow-md text-xs font-bold uppercase tracking-wider"
              >
                {submitting ? 'Committing Transaction...' : 'Complete & Record Sale'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
