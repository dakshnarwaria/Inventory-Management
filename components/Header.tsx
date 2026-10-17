'use client';

import React, { useState } from 'react';
import { Menu, Plus, Database, Code2 } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from './ThemeToggle';
import Modal from './Modal';

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const [showRdbmsInfo, setShowRdbmsInfo] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-surface/90 backdrop-blur-md border-b border-theme px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-lg border border-theme text-theme hover:bg-surface-hover transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 font-medium border border-amber-500/20">
              College RDBMS Project
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick RDBMS Info Modal Trigger */}
          <button
            onClick={() => setShowRdbmsInfo(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-theme text-xs font-medium text-theme hover:bg-surface-hover transition-colors cursor-pointer"
            title="Inspect MySQL RDBMS Features (Triggers, Views, Stored Procedures)"
          >
            <Code2 className="w-3.5 h-3.5 text-amber-500" />
            <span>SQL Schema Info</span>
          </button>

          {/* Quick Transaction Action buttons */}
          <Link
            href="/sales/new"
            className="btn-primary text-xs !py-1.5 !px-3 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">New Sale</span>
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </header>

      {/* RDBMS Architecture Info Modal for Evaluation / College Viva */}
      <Modal
        isOpen={showRdbmsInfo}
        onClose={() => setShowRdbmsInfo(false)}
        title="MySQL Database Architecture (stockpilot)"
        subtitle="Overview of Schema, Triggers, Views & Stored Procedures"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-surface-hover/60 border border-theme">
            <h4 className="font-semibold text-theme text-sm mb-1 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-amber-500" />
              Connected Database: <span className="font-mono text-amber-500">stockpilot</span>
            </h4>
            <p className="text-muted-theme">
              Implemented using relational MySQL constraints, foreign keys with ON DELETE blocks, transactions, and automated business triggers.
            </p>
          </div>

          <div className="space-y-2">
            <h5 className="font-semibold text-theme uppercase tracking-wider text-[11px] text-amber-500">
              Active MySQL Triggers
            </h5>
            <div className="grid grid-cols-1 gap-2 font-mono">
              <div className="p-2.5 rounded bg-surface border border-theme">
                <span className="font-bold text-amber-400">before_sale_item:</span> Checks if product stock &lt; quantity; if so, raises <code className="text-rose-400">SIGNAL SQLSTATE &apos;45000&apos; SET MESSAGE_TEXT = &apos;Insufficient stock&apos;</code>.
              </div>
              <div className="p-2.5 rounded bg-surface border border-theme">
                <span className="font-bold text-emerald-400">after_sale_item:</span> Automatically updates <code className="text-emerald-400">products.stock_qty = stock_qty - qty</code> and accumulates <code className="text-emerald-400">sales.total_amount</code>.
              </div>
              <div className="p-2.5 rounded bg-surface border border-theme">
                <span className="font-bold text-sky-400">after_purchase_item:</span> Automatically increases <code className="text-sky-400">products.stock_qty = stock_qty + qty</code> and accumulates <code className="text-sky-400">purchases.total_amount</code>.
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="font-semibold text-theme uppercase tracking-wider text-[11px] text-indigo-400">
              Active MySQL Views
            </h5>
            <div className="grid grid-cols-1 gap-2 font-mono">
              <div className="p-2.5 rounded bg-surface border border-theme">
                <span className="font-bold text-indigo-400">low_stock_products:</span> Filters items where <code className="text-amber-400">stock_qty &lt;= reorder_level</code> joined with categories &amp; suppliers.
              </div>
              <div className="p-2.5 rounded bg-surface border border-theme">
                <span className="font-bold text-indigo-400">sales_summary:</span> Joins sales with customers for aggregated order overview.
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="font-semibold text-theme uppercase tracking-wider text-[11px] text-emerald-400">
              Active Stored Procedures
            </h5>
            <div className="grid grid-cols-1 gap-2 font-mono">
              <div className="p-2.5 rounded bg-surface border border-theme">
                <span className="font-bold text-emerald-400">sell_product(customer, product, qty, payment)</span>
              </div>
              <div className="p-2.5 rounded bg-surface border border-theme">
                <span className="font-bold text-emerald-400">purchase_product(supplier, product, qty, cost)</span>
              </div>
              <div className="p-2.5 rounded bg-surface border border-theme">
                <span className="font-bold text-emerald-400">update_selling_price(product, price)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setShowRdbmsInfo(false)}
              className="btn-primary text-xs"
            >
              Close Inspector
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
