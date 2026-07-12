import React, { useState, useEffect } from 'react';
import {
  Users, RefreshCw, Search, Phone, Mail, Store, DollarSign, ShoppingBag, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../contexts/ProfileContext';
import { Customer, Profile } from '../../types';
import { exportToCsv } from '../../lib/exportCsv';

interface CustomerWithShop extends Customer {
  shop_name?: string;
}

export default function GlobalCustomersList() {
  const { isAdmin } = useProfile();
  const [customers, setCustomers] = useState<CustomerWithShop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isAdmin) loadCustomers();
  }, [isAdmin]);

  const loadCustomers = async () => {
    setLoading(true);

    try {
      // Get all customers with their shop names
      const { data: customersData, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading customers:', error);
        setLoading(false);
        return;
      }

      // Get shop names for each customer
      const userIds = [...new Set((customersData || []).map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, shop_name')
        .in('user_id', userIds);

      const profileMap: Record<string, string> = {};
      (profiles || []).forEach(p => {
        profileMap[p.user_id] = p.shop_name;
      });

      const customersWithShops: CustomerWithShop[] = (customersData || []).map(c => ({
        ...c,
        shop_name: profileMap[c.user_id] || 'Unknown Shop',
      }));

      setCustomers(customersWithShops);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }

    setLoading(false);
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    c.shop_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fmtMoney = (n: number) => new Intl.NumberFormat('my-MM').format(n);
  const fmt = (d: string) => new Date(d).toLocaleDateString('my-MM');

  // Global stats
  const totalCustomers = customers.length;
  const totalOrders = customers.reduce((sum, c) => sum + c.total_orders, 0);
  const totalSpent = customers.reduce((sum, c) => sum + c.total_spent, 0);
  const avgSpent = totalCustomers > 0 ? Math.round(totalSpent / totalCustomers) : 0;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <Users size={48} className="mb-4 opacity-30" />
        <p className="text-lg">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary-600/20 border border-primary-600/30 flex items-center justify-center">
            <Users size={22} className="text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Global Customers List</h1>
            <p className="text-slate-400 text-sm">All customers across all shops</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadCustomers} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => exportToCsv(`customers-${new Date().toISOString().slice(0, 10)}`, [
              { header: 'Customer Name', accessor: r => r.name },
              { header: 'Phone', accessor: r => r.phone || '' },
              { header: 'Email', accessor: r => r.email || '' },
              { header: 'Address', accessor: r => r.address || '' },
              { header: 'Associated Shop Name', accessor: r => r.shop_name || '' },
              { header: 'Total Purchases (Orders)', accessor: r => r.total_orders },
              { header: 'Total Spent (Ks)', accessor: r => r.total_spent },
              { header: 'Joined Date', accessor: r => r.created_at ? new Date(r.created_at).toLocaleDateString() : '' },
            ], filteredCustomers)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent-600/15 border border-accent-600/40 text-accent-300 hover:bg-accent-600/25 hover:border-accent-500 transition-all"
          >
            <Download size={16} />
            Export Customers
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card py-4 px-5 border-l-4 border-l-primary-500">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-primary-400" />
            <span className="text-xs text-slate-400">Total Customers</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalCustomers}</p>
        </div>
        <div className="card py-4 px-5 border-l-4 border-l-accent-500">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag size={16} className="text-accent-400" />
            <span className="text-xs text-slate-400">Total Orders</span>
          </div>
          <p className="text-3xl font-bold text-accent-400">{totalOrders}</p>
        </div>
        <div className="card py-4 px-5 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-amber-400" />
            <span className="text-xs text-slate-400">Total Spent</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{fmtMoney(totalSpent)} Ks</p>
        </div>
        <div className="card py-4 px-5 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-blue-400" />
            <span className="text-xs text-slate-400">Avg Spend</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">{fmtMoney(avgSpent)} Ks</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers by name, phone, email, or shop..."
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
            <p>{searchQuery ? 'No customers found matching your search' : 'No customers in the system yet'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full">
              <thead className="bg-surface-200/50">
                <tr>
                  <th className="table-th pl-6">Customer</th>
                  <th className="table-th">Contact</th>
                  <th className="table-th">Shop</th>
                  <th className="table-th text-center">Orders</th>
                  <th className="table-th text-right">Total Spent</th>
                  <th className="table-th text-right">Joined</th>
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
                        <span className="font-medium text-slate-200">{customer.name}</span>
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
                    <td className="table-td">
                      <div className="flex items-center gap-1.5">
                        <Store size={12} className="text-slate-500" />
                        <span className="text-sm text-slate-300">{customer.shop_name}</span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
