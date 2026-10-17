'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Truck, RefreshCw, Mail, Phone, MapPin } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { Supplier } from '@/src/types';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch suppliers');
      }
    } catch {
      toast.error('Network error loading suppliers');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({ name: '', email: '', phone: '', address: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({
      name: s.name,
      email: s.email,
      phone: s.phone || '',
      address: s.address || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Supplier name is required');
    if (!formData.email.trim()) return toast.error('Email is required');

    try {
      setSubmitting(true);
      const url = editingSupplier
        ? `/api/suppliers/${editingSupplier.supplier_id}`
        : '/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          editingSupplier
            ? `Supplier "${formData.name}" updated`
            : `Supplier "${formData.name}" created`
        );
        setIsModalOpen(false);
        fetchSuppliers();
      } else {
        toast.error(data.error || 'Failed to save supplier');
      }
    } catch {
      toast.error('Network error saving supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/suppliers/${deleteTarget.supplier_id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Supplier "${deleteTarget.name}" deleted`);
        setDeleteTarget(null);
        fetchSuppliers();
      } else {
        toast.error(data.error || 'Cannot delete supplier');
      }
    } catch {
      toast.error('Error deleting supplier');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone && s.phone.includes(search)) ||
        (s.address && s.address.toLowerCase().includes(search.toLowerCase()))
    );
  }, [suppliers, search]);

  const columns: Column<Supplier>[] = [
    {
      header: 'ID',
      accessorKey: 'supplier_id',
      cell: (s) => <span className="font-mono text-xs text-muted-theme">#{s.supplier_id}</span>,
    },
    {
      header: 'Supplier Name',
      accessorKey: 'name',
      cell: (s) => <span className="font-semibold text-theme">{s.name}</span>,
    },
    {
      header: 'Contact Info',
      cell: (s) => (
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center gap-1.5 text-muted-theme">
            <Mail className="w-3 h-3 text-amber-500 shrink-0" />
            <span>{s.email}</span>
          </div>
          {s.phone && (
            <div className="flex items-center gap-1.5 text-muted-theme">
              <Phone className="w-3 h-3 text-muted-theme shrink-0" />
              <span>{s.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Address',
      accessorKey: 'address',
      cell: (s) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-theme">
          <MapPin className="w-3 h-3 shrink-0" />
          <span>{s.address || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Products',
      align: 'center',
      cell: (s) => (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-surface-hover text-theme border border-theme">
          {(s as any).products_count || 0}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (s) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleOpenEdit(s)}
            className="p-1.5 rounded-lg text-muted-theme hover:text-amber-500 hover:bg-surface-hover transition-colors"
            title="Edit supplier"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(s)}
            className="p-1.5 rounded-lg text-muted-theme hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Delete supplier"
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
            Suppliers
          </h1>
          <p className="text-xs text-muted-theme mt-1">
            Vendor records, contact details, and procurement partners
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSuppliers}
            disabled={loading}
            className="btn-secondary text-xs !py-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button onClick={handleOpenAdd} className="btn-primary text-xs">
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={loading}
        rowKey={(s) => s.supplier_id}
        searchPlaceholder="Search suppliers by name, email, phone..."
        searchValue={search}
        onSearchChange={setSearch}
        emptyMessage="No suppliers found"
        emptyAction={
          <button onClick={handleOpenAdd} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />
            Add Supplier
          </button>
        }
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        subtitle="Manage vendor information"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-theme mb-1">
              Supplier Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Electronics Ltd"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-theme w-full"
            />
          </div>

          <div>
            <label className="block font-medium text-theme mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. orders@apexelectronics.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-theme w-full"
            />
          </div>

          <div>
            <label className="block font-medium text-theme mb-1">Phone Number</label>
            <input
              type="text"
              placeholder="e.g. 9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-theme w-full"
            />
          </div>

          <div>
            <label className="block font-medium text-theme mb-1">Address / City</label>
            <input
              type="text"
              placeholder="e.g. Sector 18, Noida"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-theme w-full"
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
              {submitting ? 'Saving...' : editingSupplier ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Delete Supplier"
        message={`Delete "${deleteTarget?.name}"? MySQL foreign key constraint (1451) will block deletion if this supplier has linked products or purchases.`}
      />
    </div>
  );
}
