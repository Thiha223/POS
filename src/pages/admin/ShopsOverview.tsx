import React, { useState, useEffect } from 'react';
import {
  Store, RefreshCw, Search, Package, ShoppingCart, Users, DollarSign,
  Crown, TrendingUp, Eye, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../contexts/ProfileContext';
import { Profile } from '../../types';
import ShopDataModal from '../../components/ShopDataModal';
import { exportToCsv } from '../../lib/exportCsv';

interface ShopStats {
  shop: Profile;
  productCount: number;
  salesCount: number;
  revenue: number;
  customerCount: number;
}

export default function ShopsOverview() {
  const { isAdmin } = useProfile();
  const [shops, setShops] = useState<ShopStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShop, setSelectedShop] = useState<Profile | null>(null);

  useEffect(() => {
    if (isAdmin) loadShops();
  }, [isAdmin]);

  const loadShops = async () => {
    setLoading(true);

    try {
      // Get all non-admin profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'admin')
        .order('created_at', { ascending: false });

      if (!profiles) {
        setLoading(false);
        return;
      }

      // Get stats for each shop
      const shopStats: ShopStats[] = [];

      for (const profile of profiles) {
        // Get products count
        const { count: productCount } = await supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.user_id);

        // Get sales count and revenue
        const { data: salesData } = await supabase
          .from('sales')
          .select('total')
          .eq('user_id', profile.user_id);

        // Get customers count
        const { count: customerCount } = await supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.user_id);

        shopStats.push({
          shop: profile,
          productCount: productCount || 0,
          salesCount: (salesData || []).length,
          revenue: (salesData || []).reduce((sum, s) => sum + Number(s.total), 0),
          customerCount: customerCount || 0,
        });
      }

      setShops(shopStats);
    } catch (error) {
      console.error('Failed to load shops:', error);
    }

    setLoading(false);
  };

  const filteredShops = shops.filter(s =>
    s.shop.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.shop.shop_name_mm && s.shop.shop_name_mm.includes(searchQuery))
  );

  const fmtMoney = (n: number) => new Intl.NumberFormat('my-MM').format(n);
  const fmt = (d: string) => new Date(d).toLocaleDateString('my-MM');

  const planBadge = (plan: string) => {
    if (plan === 'premium') return <span className="badge-warning text-amber-300">Premium</span>;
    if (plan === 'basic') return <span className="badge-info">Basic</span>;
    return <span className="text-xs text-slate-500">Free</span>;
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <Store size={48} className="mb-4 opacity-30" />
        <p className="text-lg">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-600/20 border border-amber-600/30 flex items-center justify-center">
            <Store size={22} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Shops Overview</h1>
            <p className="text-slate-400 text-sm">All registered shops and their statistics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadShops} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => exportToCsv(`shops-overview-${new Date().toISOString().slice(0, 10)}`, [
              { header: 'Shop Name', accessor: r => r.shop.shop_name || '' },
              { header: 'Shop Name (Myanmar)', accessor: r => r.shop.shop_name_mm || '' },
              { header: 'Plan', accessor: r => r.shop.subscription_plan || 'free' },
              { header: 'Status', accessor: r => r.shop.status === 'active' || !r.shop.status ? 'Active' : 'Inactive' },
              { header: 'Products', accessor: r => r.productCount },
              { header: 'Sales', accessor: r => r.salesCount },
              { header: 'Customers', accessor: r => r.customerCount },
              { header: 'Revenue (Ks)', accessor: r => r.revenue },
              { header: 'Created Date', accessor: r => r.shop.created_at ? new Date(r.shop.created_at).toLocaleDateString() : '' },
            ], filteredShops)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent-600/15 border border-accent-600/40 text-accent-300 hover:bg-accent-600/25 hover:border-accent-500 transition-all"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card py-4 px-5">
          <div className="flex items-center gap-2 mb-1">
            <Store size={16} className="text-primary-400" />
            <span className="text-xs text-slate-400">Total Shops</span>
          </div>
          <p className="text-2xl font-bold text-white">{shops.length}</p>
        </div>
        <div className="card py-4 px-5">
          <div className="flex items-center gap-2 mb-1">
            <Crown size={16} className="text-amber-400" />
            <span className="text-xs text-slate-400">Paid Plans</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">
            {shops.filter(s => s.shop.subscription_plan !== 'free').length}
          </p>
        </div>
        <div className="card py-4 px-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-accent-400" />
            <span className="text-xs text-slate-400">Active Shops</span>
          </div>
          <p className="text-2xl font-bold text-accent-400">
            {shops.filter(s => s.shop.status === 'active' || !s.shop.status).length}
          </p>
        </div>
        <div className="card py-4 px-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-success-400" />
            <span className="text-xs text-slate-400">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-success-400">
            {fmtMoney(shops.reduce((sum, s) => sum + s.revenue, 0))} Ks
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search shops by name..."
          className="input-primary w-full pl-10"
        />
      </div>

      {/* Shops Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Store size={32} className="mb-2 opacity-30" />
            <p>No shops found</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full">
              <thead className="bg-surface-200/50">
                <tr>
                  <th className="table-th pl-6">Shop</th>
                  <th className="table-th text-center">Plan</th>
                  <th className="table-th text-center">Status</th>
                  <th className="table-th text-center">Products</th>
                  <th className="table-th text-center">Sales</th>
                  <th className="table-th text-center">Customers</th>
                  <th className="table-th text-right">Revenue</th>
                  <th className="table-th text-right">Created</th>
                  <th className="table-th text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredShops.map(({ shop, productCount, salesCount, revenue, customerCount }) => (
                  <tr key={shop.id} className="hover:bg-surface-200/30 transition-colors">
                    <td className="table-td pl-6">
                      <div className="flex items-center gap-3">
                        {shop.logo_url ? (
                          <img
                            src={shop.logo_url}
                            alt={shop.shop_name}
                            className="w-10 h-10 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-600/30 flex items-center justify-center">
                            <Store size={18} className="text-primary-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-200">{shop.shop_name}</p>
                          {shop.shop_name_mm && (
                            <p className="text-xs font-myanmar text-slate-500">{shop.shop_name_mm}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-center">{planBadge(shop.subscription_plan)}</td>
                    <td className="table-td text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                        shop.status === 'active' || !shop.status
                          ? 'bg-accent-600/20 text-accent-400'
                          : 'bg-danger-600/20 text-danger-400'
                      }`}>
                        {shop.status === 'active' || !shop.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-td text-center">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <Package size={12} className="text-slate-500" />
                        {productCount}
                      </span>
                    </td>
                    <td className="table-td text-center">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <ShoppingCart size={12} className="text-slate-500" />
                        {salesCount}
                      </span>
                    </td>
                    <td className="table-td text-center">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <Users size={12} className="text-slate-500" />
                        {customerCount}
                      </span>
                    </td>
                    <td className="table-td text-right">
                      <span className="text-accent-400 font-medium">{fmtMoney(revenue)} Ks</span>
                    </td>
                    <td className="table-td text-right">
                      <span className="text-xs text-slate-500">{fmt(shop.created_at)}</span>
                    </td>
                    <td className="table-td text-center">
                      <button
                        onClick={() => setSelectedShop(shop)}
                        className="p-1.5 bg-primary-600/20 hover:bg-primary-600/40 border border-primary-600/30 text-primary-400 rounded-lg transition-colors"
                        title="View shop data"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shop Data Modal */}
      {selectedShop && (
        <ShopDataModal
          shop={selectedShop}
          onClose={() => setSelectedShop(null)}
        />
      )}
    </div>
  );
}
