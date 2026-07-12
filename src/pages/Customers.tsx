import React, { useState, useEffect } from 'react';
import {
  Users, Search, Phone, Mail, MapPin, Edit3, Trash2,
  X, Save, UserPlus, ShoppingBag, DollarSign
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { Customer, Page } from '../types';
import ExportDataDropdown from '../components/ExportDataDropdown';

export default function Customers({ onNavigate }: { onNavigate?: (p: Page) => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    if (user) loadCustomers();
  }, [user]);

  const loadCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomers(data);
    }
    setLoading(false);
  };

  const openAddModal = () => {
    setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
    setShowAddModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setEditingCustomer(customer);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Customer name is required');
      return;
    }
    setSaving(true);

    try {
      if (editingCustomer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update({
            name: formData.name,
            phone: formData.phone,
            email: formData.email || null,
            address: formData.address || null,
            notes: formData.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
      } else {
        // Create new customer
        const { error } = await supabase
          .from('customers')
          .insert({
            user_id: user!.id,
            name: formData.name,
            phone: formData.phone,
            email: formData.email || null,
            address: formData.address || null,
            notes: formData.notes || null,
          });

        if (error) throw error;
      }

      await loadCustomers();
      closeModal();
    } catch (error: any) {
      console.error('Failed to save customer:', error);
      alert('Failed to save customer: ' + error.message);
    }

    setSaving(false);
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('Delete this customer? This action cannot be undone.')) return;
    setDeleting(customerId);

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;
      setCustomers(prev => prev.filter(c => c.id !== customerId));
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      alert('Failed to delete customer: ' + error.message);
    }

    setDeleting(null);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const fmt = (d: string) => new Date(d).toLocaleDateString('my-MM');
  const fmtMoney = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  // Stats
  const totalCustomers = customers.length;
  const totalOrders = customers.reduce((sum, c) => sum + c.total_orders, 0);
  const totalSpent = customers.reduce((sum, c) => sum + c.total_spent, 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary-600/20 border border-primary-600/30 flex items-center justify-center">
            <Users size={22} className="text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Customers</h1>
            <p className="text-slate-400 font-myanmar text-sm">ဖောက်သည်များ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportDataDropdown
            baseFilename="customers"
            sheetName="Customers"
            pdfTitle="Customer List"
            columns={[
              { header: 'Customer Name', accessor: r => r.name },
              { header: 'Phone', accessor: r => r.phone || '' },
              { header: 'Email', accessor: r => r.email || '' },
              { header: 'Total Orders', accessor: r => r.total_orders },
              { header: 'Total Spent (Ks)', accessor: r => r.total_spent },
              { header: 'Joined Date', accessor: r => new Date(r.created_at).toLocaleDateString() },
            ]}
            rows={filteredCustomers}
            plan={profile?.subscription_plan ?? 'free'}
            onUpgradeClick={() => onNavigate?.('subscription')}
          />
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <UserPlus size={18} />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card py-5 border-l-4 border-l-primary-500">
          <div className="flex items-center gap-3 mb-2">
            <Users size={18} className="text-primary-400" />
            <span className="text-sm text-slate-400">Total Customers</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalCustomers}</p>
        </div>
        <div className="card py-5 border-l-4 border-l-accent-500">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag size={18} className="text-accent-400" />
            <span className="text-sm text-slate-400">Total Orders</span>
          </div>
          <p className="text-3xl font-bold text-accent-400">{totalOrders}</p>
        </div>
        <div className="card py-5 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={18} className="text-amber-400" />
            <span className="text-sm text-slate-400">Total Revenue</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{fmtMoney(totalSpent)} Ks</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers by name, phone, or email..."
          className="input-primary w-full pl-10"
        />
      </div>

      {/* Customers Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Users size={32} className="mb-2 opacity-30" />
            <p>{searchQuery ? 'No customers found matching your search' : 'No customers yet'}</p>
            <button onClick={openAddModal} className="mt-4 btn-secondary text-sm">
              Add your first customer
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full">
              <thead className="bg-surface-200/50">
                <tr>
                  <th className="table-th pl-6">Customer</th>
                  <th className="table-th">Contact</th>
                  <th className="table-th text-center">Orders</th>
                  <th className="table-th text-right">Total Spent</th>
                  <th className="table-th text-right">Joined</th>
                  <th className="table-th text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-surface-200/30 transition-colors">
                    <td className="table-td pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-600/20 border border-primary-600/30 flex items-center justify-center flex-shrink-0">
                          <Users size={16} className="text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">{customer.name}</p>
                          {customer.address && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={10} />
                              {customer.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-slate-500" />
                          <span className="text-sm text-slate-400">{customer.phone || '—'}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className="text-slate-500" />
                            <span className="text-xs text-slate-500">{customer.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-td text-center">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium bg-primary-600/20 text-primary-400">
                        {customer.total_orders}
                      </span>
                    </td>
                    <td className="table-td text-right">
                      <span className="text-sm text-accent-400 font-medium">
                        {fmtMoney(customer.total_spent)} Ks
                      </span>
                    </td>
                    <td className="table-td text-right">
                      <span className="text-xs text-slate-500">{fmt(customer.created_at)}</span>
                    </td>
                    <td className="table-td text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(customer)}
                          className="p-1.5 bg-primary-600/20 hover:bg-primary-600/40 border border-primary-600/30 text-primary-400 rounded-lg transition-colors"
                          title="Edit customer"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          disabled={deleting === customer.id}
                          className="p-1.5 bg-danger-600/20 hover:bg-danger-600/40 border border-danger-600/30 text-danger-400 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete customer"
                        >
                          {deleting === customer.id ? (
                            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-surface-100 rounded-2xl border border-slate-700/50 shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                  {editingCustomer ? <Edit3 size={18} className="text-white" /> : <UserPlus size={18} className="text-white" />}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {editingCustomer ? 'Edit Customer' : 'Add Customer'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingCustomer ? 'Update customer information' : 'Create a new customer'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-surface-200 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-primary w-full"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="input-primary w-full"
                  placeholder="09xxxxxxxxx"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="input-primary w-full"
                  placeholder="customer@example.com"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="input-primary w-full"
                  placeholder="Customer address"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-primary w-full min-h-[80px] resize-none"
                  placeholder="Additional notes about this customer..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/50 bg-surface-200/30 rounded-b-2xl flex-shrink-0">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2 px-5 py-2.5"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{editingCustomer ? 'Update Customer' : 'Add Customer'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
