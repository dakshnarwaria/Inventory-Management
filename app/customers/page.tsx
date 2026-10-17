'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Edit2, Trash2, Users, RefreshCw, Mail, Phone, MapPin, IndianRupee } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { Customer } from '@/src/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch customers');
      }
    } catch {
      toast.error('Network error loading customers');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({ name: '', email: '', phone: '', address: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      email: c.email,
      phone: c.phone || '',
      address: c.address || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Customer name is required');
    if (!formData.email.trim()) return toast.error('Email is required');

    try {
      setSubmitting(true);
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.customer_id}`
        : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          editingCustomer
            ? `Customer "${formData.name}" updated`
            : `Customer "${formData.name}" created`
        );
        setIsModalOpen(false);
        fetchCustomers();
      } else {
        toast.error(data.error || 'Failed to save customer');
      }
    } catch {
      toast.error('Network error saving customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/customers/${deleteTarget.customer_id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Customer "${deleteTarget.name}" deleted`);
        setDeleteTarget(null);
        fetchCustomers();
      } else {
        toast.error(data.error || 'Cannot delete customer');
      }
    } catch {
      toast.error('Error deleting customer');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search)) ||
        (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
    );
  }, [customers, search]);

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  const columns: Column<Customer>[] = [
    {
      header: 'ID',
      accessorKey: 'customer_id',
      cell: (c) => <span className="font-mono text-xs text-muted-theme">#{c.customer_id}</span>,
    },
    {
      header: 'Customer Name',
      accessorKey: 'name',
      cell: (c) => <span className="font-semibold text-theme">{c.name}</span>,
    },
    {
      header: 'Contact Info',
      cell: (c) => (
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center gap-1.5 text-muted-theme">
            <Mail className="w-3 h-3 text-amber-500 shrink-0" />
            <span>{c.email}</span>
          </div>
          {c.phone && (
            <div className="flex items-center gap-1.5 text-muted-theme">
              <Phone className="w-3 h-3 text-muted-theme shrink-0" />
              <span>{c.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Address',
      accessorKey: 'address',
      cell: (c) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-theme">
          <MapPin className="w-3 h-3 shrink-0" />
          <span>{c.address || '-'}</span>
        </div>
      ),
    },
    {
      header: 'Orders',
      align: 'center',
      cell: (c) => (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-surface-hover text-theme border border-theme">
          {(c as any).sales_count || 0}
        </span>
      ),
    },
    {
      header: 'Total Spent',
      align: 'right',
      cell: (c) => (
        <span className="font-mono text-xs font-semibold text-emerald-500">
          {formatCurrency((c as any).total_spent || 0)}
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
            title="Edit customer"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTarget(c)}
            className="p-1.5 rounded-lg text-muted-theme hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Delete customer"
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
            Customers
          </h1>
          <p className="text-xs text-muted-theme mt-1">
            Registered client directory and sales order associations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCustomers}
            disabled={loading}
            className="btn-secondary text-xs !py-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button onClick={handleOpenAdd} className="btn-primary text-xs">
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={loading}
        rowKey={(c) => c.customer_id}
        searchPlaceholder="Search customers by name, email, phone..."
        searchValue={search}
        onSearchChange={setSearch}
        emptyMessage="No customers found"
        emptyAction={
          <button onClick={handleOpenAdd} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />
            Add Customer
          </button>
        }
      />

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        subtitle="Manage client contact directory"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-theme mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ananya Rao"
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
              placeholder="e.g. ananya@example.com"
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
              placeholder="e.g. Malviya Nagar, Jaipur"
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
              {submitting ? 'Saving...' : editingCustomer ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={deleting}
        title="Delete Customer"
        message={`Delete "${deleteTarget?.name}"? If this customer has existing sales invoices, MySQL foreign key constraint (1451) will safely block deletion.`}
      />
    </div>
  );
}
