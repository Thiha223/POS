import React, { useState, useEffect } from 'react';
import {
  Shield, Store, Users, Package, ShoppingCart, DollarSign,
  TrendingUp, TrendingDown, RefreshCw, Crown, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../contexts/ProfileContext';
import { exportToCsv } from '../../lib/exportCsv';

interface SystemStats {
  totalShops: number;
  activeShops: number;
  totalUsers: number;
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  totalCustomers: number;
  premiumSubscribers: number;
  basicSubscribers: number;
}

export default function SuperAdminDashboard() {
  const { isAdmin } = useProfile();
  const [stats, setStats] = useState<SystemStats>({
    totalShops: 0,
    activeShops: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    premiumSubscribers: 0,
    basicSubscribers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) loadStats();
  }, [isAdmin]);

  const loadStats = async () => {
    setLoading(true);

    try {
      // Get all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, subscription_plan, status, role');

      // Get all products
      const { data: products } = await supabase
        .from('products')
        .select('id');

      // Get all sales
      const { data: sales } = await supabase
        .from('sales')
        .select('total');

      // Get all customers
      const { data: customers } = await supabase
        .from('customers')
        .select('id');

      const shopProfiles = (profiles || []).filter(p => p.role !== 'admin');
      const activeProfiles = shopProfiles.filter(p => p.status === 'active' || !p.status);

      setStats({
        totalShops: shopProfiles.length,
        activeShops: activeProfiles.length,
        totalUsers: (profiles || []).length,
        totalProducts: (products || []).length,
        totalSales: (sales || []).length,
        totalRevenue: (sales || []).reduce((sum, s) => sum + Number(s.total), 0),
        totalCustomers: (customers || []).length,
        premiumSubscribers: shopProfiles.filter(p => p.subscription_plan === 'premium').length,
        basicSubscribers: shopProfiles.filter(p => p.subscription_plan === 'basic').length,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }

    setLoading(false);
  };

  const fmtMoney = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <Shield size={48} className="mb-4 opacity-30" />
        <p className="text-lg">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/20">
            <Shield size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Super Admin Dashboard</h1>
            <p className="text-slate-400 mt-1">System-wide overview and analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadStats} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => exportToCsv(`system-summary-${new Date().toISOString().slice(0, 10)}`, [
              { header: 'Metric', accessor: r => r.label },
              { header: 'Value', accessor: r => r.value },
            ], [
              { label: 'Total Shops', value: stats.totalShops },
              { label: 'Active Shops', value: stats.activeShops },
              { label: 'Total Users', value: stats.totalUsers },
              { label: 'Total Products', value: stats.totalProducts },
              { label: 'Total Sales', value: stats.totalSales },
              { label: 'Total Revenue (Ks)', value: stats.totalRevenue },
              { label: 'Total Customers', value: stats.totalCustomers },
              { label: 'Premium Subscribers', value: stats.premiumSubscribers },
              { label: 'Basic Subscribers', value: stats.basicSubscribers },
              { label: 'Free Plan Shops', value: stats.totalShops - stats.premiumSubscribers - stats.basicSubscribers },
              { label: 'Avg Products per Shop', value: stats.totalShops > 0 ? Math.round(stats.totalProducts / stats.totalShops) : 0 },
              { label: 'Avg Sales per Shop', value: stats.totalShops > 0 ? Math.round(stats.totalSales / stats.totalShops) : 0 },
              { label: 'Avg Revenue per Shop (Ks)', value: stats.totalShops > 0 ? Math.round(stats.totalRevenue / stats.totalShops) : 0 },
              { label: 'Avg Customers per Shop', value: stats.totalShops > 0 ? Math.round(stats.totalCustomers / stats.totalShops) : 0 },
              { label: 'Exported At', value: new Date().toLocaleString() },
            ])}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent-600/15 border border-accent-600/40 text-accent-300 hover:bg-accent-600/25 hover:border-accent-500 transition-all"
          >
            <Download size={16} />
            Export Summary
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6 border-l-4 border-l-primary-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary-600/20 flex items-center justify-center">
              <Store size={24} className="text-primary-400" />
            </div>
            <TrendingUp size={20} className="text-accent-400" />
          </div>
          <p className="text-sm text-slate-400 mb-1">Total Shops</p>
          <p className="text-4xl font-bold text-white">{stats.totalShops}</p>
          <p className="text-xs text-slate-500 mt-2">{stats.activeShops} active</p>
        </div>

        <div className="card p-6 border-l-4 border-l-accent-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent-600/20 flex items-center justify-center">
              <Users size={24} className="text-accent-400" />
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-1">Total Customers</p>
          <p className="text-4xl font-bold text-white">{stats.totalCustomers}</p>
          <p className="text-xs text-slate-500 mt-2">System-wide</p>
        </div>

        <div className="card p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <Package size={24} className="text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-1">Total Products</p>
          <p className="text-4xl font-bold text-white">{stats.totalProducts}</p>
          <p className="text-xs text-slate-500 mt-2">Across all shops</p>
        </div>

        <div className="card p-6 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 flex items-center justify-center">
              <ShoppingCart size={24} className="text-amber-400" />
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-1">Total Sales</p>
          <p className="text-4xl font-bold text-white">{stats.totalSales}</p>
          <p className="text-xs text-slate-500 mt-2">All transactions</p>
        </div>
      </div>

      {/* Revenue & Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Card */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-600/20 flex items-center justify-center">
              <DollarSign size={20} className="text-accent-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Total Revenue</h2>
              <p className="text-xs text-slate-400">System-wide sales volume</p>
            </div>
          </div>
          <p className="text-5xl font-bold text-accent-400 mb-4">
            {fmtMoney(stats.totalRevenue)} <span className="text-xl text-slate-400">Ks</span>
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <TrendingUp size={16} className="text-accent-400" />
            <span>Across {stats.totalSales} transactions</span>
          </div>
        </div>

        {/* Subscriptions Card */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center">
              <Crown size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Subscriptions</h2>
              <p className="text-xs text-slate-400">Paid plan distribution</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-slate-300">Premium</span>
              </div>
              <span className="text-2xl font-bold text-amber-400">{stats.premiumSubscribers}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary-500" />
                <span className="text-slate-300">Basic</span>
              </div>
              <span className="text-2xl font-bold text-primary-400">{stats.basicSubscribers}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-slate-500" />
                <span className="text-slate-300">Free</span>
              </div>
              <span className="text-2xl font-bold text-slate-400">
                {stats.totalShops - stats.premiumSubscribers - stats.basicSubscribers}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Statistics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface-200/50 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Avg Products/Shop</p>
            <p className="text-2xl font-bold text-white">
              {stats.totalShops > 0 ? Math.round(stats.totalProducts / stats.totalShops) : 0}
            </p>
          </div>
          <div className="bg-surface-200/50 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Avg Sales/Shop</p>
            <p className="text-2xl font-bold text-white">
              {stats.totalShops > 0 ? Math.round(stats.totalSales / stats.totalShops) : 0}
            </p>
          </div>
          <div className="bg-surface-200/50 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Avg Revenue/Shop</p>
            <p className="text-2xl font-bold text-white">
              {stats.totalShops > 0 ? fmtMoney(Math.round(stats.totalRevenue / stats.totalShops)) : 0}
            </p>
          </div>
          <div className="bg-surface-200/50 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Avg Customers/Shop</p>
            <p className="text-2xl font-bold text-white">
              {stats.totalShops > 0 ? Math.round(stats.totalCustomers / stats.totalShops) : 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
