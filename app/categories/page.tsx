'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Tags, RefreshCw } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { Category } from '@/src/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ category_name: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch categories');
      }
    } catch {
      toast.error('Network error loading categories');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormData({ category_name: '', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Category) => {
    setEditingCategory(c);
    setFormData({
      category_name: c.category_name,
      description: c.description || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_name.trim()) return toast.error('Category name is required');

    try {
      setSubmitting(true);
      const url = editingCategory
        ? `/api/categories/${editingCategory.category_id}`
        : '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          editingCategory
            ? `Category "${formData.category_name}" updated`
            : `Category "${formData.category_name}" created`
        );
        setIsModalOpen(false);
        fetchCategories();
      } else {
        toast.error(data.error || 'Failed to save category');
      }
    } catch {
      toast.error('Network error saving category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/categories/${deleteTarget.category_id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Category "${deleteTarget.category_name}" deleted`);
        setDeleteTarget(null);
        fetchCategories();
      } else {
        toast.error(data.error || 'Cannot delete category');
      }
    } catch {
      toast.error('Error deleting category');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return categories.filter(
      (c) =>
        c.category_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
    );
  }, [categories, search]);

  const columns: Column<Category>[] = [
    {
      header: 'ID',
      accessorKey: 'category_id',
      cell: (c) => <span className="font-mono text-xs text-muted-theme">#{c.category_id}</span>,
    },
    {
      header: 'Category Name',
      accessorKey: 'category_name',
      cell: (c) => <span className="font-semibold text-theme">{c.category_name}</span>,
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: (c) => <span className="text-muted-theme text-xs">{c.description || '-'}</span>,
    },
    {
      header: 'Products Count',
      align: 'center',
      cell: (c) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-surface-hover text-theme border border-theme">
          {(c as any).products_count || 0}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (c) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEdit(c)}
            className="p-1.5 rounded-lg text-muted-theme hover:text-amber-500 hover:bg-surface-hover transition-colors"
            title="Edit category"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(c)}
            className="p-1.5 rounded-lg text-muted-theme hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Delete category"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-theme flex items-center gap-2">
            Categories
          </h1>
          <p className="text-xs text-muted-theme mt-1">
            Product classifications and departmental groupings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCategories}
            disabled={loading}
            className="btn-secondary text-xs !py-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button onClick={handleOpenAdd} className="btn-primary text-xs">
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={loading}
        rowKey={(c) => c.category_id}
        searchPlaceholder="Search categories..."
        searchValue={search}
        onSearchChange={setSearch}
        emptyMessage="No categories found"
        emptyAction={
          <button onClick={handleOpenAdd} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />
            Create Category
          </button>
        }
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add New Category'}
        subtitle="Manage product categories table"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-theme mb-1">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Peripherals"
              value={formData.category_name}
              onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
              className="input-theme w-full"
            />
          </div>

          <div>
            <label className="block font-medium text-theme mb-1">Description</label>
            <textarea
              rows={3}
              placeholder="Brief description of the category..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-theme w-full resize-none"
            />
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
              {submitting ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Delete Category"
        message={`Delete "${deleteTarget?.category_name}"? MySQL Foreign Key constraint (1451) will prevent deletion if any products belong to this category.`}
      />
    </div>
  );
}
