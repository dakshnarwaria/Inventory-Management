'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Package, RefreshCw, AlertCircle } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import StockBadge from '@/components/StockBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { Product, Category, Supplier } from '@/src/types';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form fields
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category_id: '',
    supplier_id: '',
    cost_price: '',
    selling_price: '',
    stock_qty: '0',
    reorder_level: '10',
  });

  const toast = useToast();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      } else {
        toast.error(data.error || 'Failed to load products');
      }
    } catch {
      toast.error('Network error loading products');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchDropdowns = useCallback(async () => {
    try {
      const [catRes, supRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/suppliers'),
      ]);
      const [catData, supData] = await Promise.all([catRes.json(), supRes.json()]);

      if (catData.success) setCategories(catData.data);
      if (supData.success) setSuppliers(supData.data);
    } catch {
      console.error('Error fetching categories/suppliers dropdowns');
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchDropdowns();
  }, [fetchProducts, fetchDropdowns]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      category_id: categories[0]?.category_id ? String(categories[0].category_id) : '',
      supplier_id: suppliers[0]?.supplier_id ? String(suppliers[0].supplier_id) : '',
      cost_price: '',
      selling_price: '',
      stock_qty: '0',
      reorder_level: '10',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      category_id: String(p.category_id),
      supplier_id: String(p.supplier_id),
      cost_price: String(p.cost_price),
      selling_price: String(p.selling_price),
      stock_qty: String(p.stock_qty),
      reorder_level: String(p.reorder_level),
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku.trim()) return toast.error('SKU is required');
    if (!formData.name.trim()) return toast.error('Product name is required');
    if (!formData.category_id) return toast.error('Category is required');
    if (!formData.supplier_id) return toast.error('Supplier is required');

    try {
      setSubmitting(true);
      const url = editingProduct
        ? `/api/products/${editingProduct.product_id}`
        : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          editingProduct
            ? `Product "${formData.name}" updated successfully`
            : `Product "${formData.name}" created successfully`
        );
        setIsModalOpen(false);
        fetchProducts();
      } else {
        toast.error(data.error || 'Failed to save product');
      }
    } catch {
      toast.error('Network error saving product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/products/${deleteTarget.product_id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Product "${deleteTarget.name}" deleted`);
        setDeleteTarget(null);
        fetchProducts();
      } else {
        toast.error(data.error || 'Cannot delete product');
      }
    } catch {
      toast.error('Error deleting product');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        selectedCategory === 'all' || String(p.category_id) === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, search, selectedCategory]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  const columns: Column<Product>[] = [
    {
      header: 'SKU',
      accessorKey: 'sku',
      cell: (p) => <span className="font-mono text-xs font-semibold text-amber-500">{p.sku}</span>,
    },
    {
      header: 'Product Name',
      accessorKey: 'name',
      cell: (p) => <span className="font-medium text-theme">{p.name}</span>,
    },
    {
      header: 'Category',
      accessorKey: 'category_name',
      cell: (p) => (
        <span className="inline-flex px-2 py-0.5 rounded text-xs bg-surface-hover text-muted-theme border border-theme">
          {p.category_name}
        </span>
      ),
    },
    {
      header: 'Supplier',
      accessorKey: 'supplier_name',
      cell: (p) => <span className="text-muted-theme text-xs">{p.supplier_name}</span>,
    },
    {
      header: 'Cost Price',
      accessorKey: 'cost_price',
      align: 'right',
      cell: (p) => <span className="text-muted-theme font-mono text-xs">{formatCurrency(p.cost_price)}</span>,
    },
    {
      header: 'Selling Price',
      accessorKey: 'selling_price',
      align: 'right',
      cell: (p) => <span className="font-semibold font-mono text-xs text-theme">{formatCurrency(p.selling_price)}</span>,
    },
    {
      header: 'Stock Status',
      accessorKey: 'stock_qty',
      align: 'center',
      cell: (p) => <StockBadge stockQty={p.stock_qty} reorderLevel={p.reorder_level} />,
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEdit(p)}
            className="p-1.5 rounded-lg text-muted-theme hover:text-amber-500 hover:bg-surface-hover transition-colors"
            title="Edit product"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(p)}
            className="p-1.5 rounded-lg text-muted-theme hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Delete product"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-theme flex items-center gap-2">
            Products Catalog
          </h1>
          <p className="text-xs text-muted-theme mt-1">
            Manage inventory items, pricing, SKUs, and reorder levels
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="btn-secondary text-xs !py-2 cursor-pointer"
            title="Refresh table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button onClick={handleOpenAdd} className="btn-primary text-xs">
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-medium text-muted-theme">Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-theme text-xs !py-1.5"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.category_id} value={String(c.category_id)}>
                {c.category_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products DataTable */}
      <DataTable
        columns={columns}
        data={filteredProducts}
        isLoading={loading}
        rowKey={(p) => p.product_id}
        searchPlaceholder="Search by SKU or name..."
        searchValue={search}
        onSearchChange={setSearch}
        emptyMessage="No products match your criteria"
        emptyAction={
          <button onClick={handleOpenAdd} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />
            Add First Product
          </button>
        }
      />

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.sku}` : 'Add New Product'}
        subtitle="Saved directly into MySQL products table"
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-theme mb-1">
                SKU <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ELE-003"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="input-theme w-full font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-medium text-theme mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mechanical Keyboard"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-theme w-full"
              />
            </div>

            <div>
              <label className="block font-medium text-theme mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="input-theme w-full"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-theme mb-1">
                Primary Supplier <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="input-theme w-full"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.supplier_id} value={s.supplier_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-theme mb-1">
                Cost Price (&#8377;) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="input-theme w-full font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-theme mb-1">
                Selling Price (&#8377;) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                className="input-theme w-full font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-theme mb-1">
                Initial Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock_qty}
                onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                className="input-theme w-full font-mono"
              />
              <span className="text-[10px] text-muted-theme mt-0.5 block">
                Subsequent stock is updated by Purchases &amp; Sales triggers.
              </span>
            </div>

            <div>
              <label className="block font-medium text-theme mb-1">
                Reorder Level Alert Threshold
              </label>
              <input
                type="number"
                min="0"
                value={formData.reorder_level}
                onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                className="input-theme w-full font-mono"
              />
              <span className="text-[10px] text-muted-theme mt-0.5 block">
                Triggers Low Stock view when stock &le; threshold.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-theme">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary text-xs"
            >
              {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Delete Product"
        message={`Are you sure you want to delete product "${deleteTarget?.name}" (${deleteTarget?.sku})? If it has existing sale or purchase records, MySQL will safely block deletion.`}
      />
    </div>
  );
}
