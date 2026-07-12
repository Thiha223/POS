import React, { useEffect, useState } from 'react';
import {
  TrendingUp, ShoppingCart, Package, AlertTriangle,
  DollarSign, ArrowUpRight, Calendar, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { Page } from '../types';

interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  totalProducts: number;
  lowStockCount: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
}

interface RecentSale {
  id: string;
  sale_number: string;
  total: number;
  payment_method: string;
  created_at: string;
}

export default function Dashboard({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0, todayRevenue: 0, totalProducts: 0,
    lowStockCount: 0, weeklyRevenue: 0, monthlyRevenue: 0
  });
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [todaySalesRes, weekRes, monthRes, productsRes, recentRes] = await Promise.all([
      supabase.from('sales').select('id, total').eq('user_id', user.id).gte('created_at', todayStart),
      supabase.from('sales').select('total').eq('user_id', user.id).gte('created_at', weekStart),
      supabase.from('sales').select('total').eq('user_id', user.id).gte('created_at', monthStart),
      supabase.from('products').select('id, current_stock').eq('user_id', user.id).eq('is_active', true),
      supabase.from('sales').select('id, sale_number, total, payment_method, created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ]);

    const todayRevenue = (todaySalesRes.data || []).reduce((s, r) => s + Number(r.total), 0);
    const weeklyRevenue = (weekRes.data || []).reduce((s, r) => s + Number(r.total), 0);
    const monthlyRevenue = (monthRes.data || []).reduce((s, r) => s + Number(r.total), 0);
    const products = productsRes.data || [];
    const lowStockCount = products.filter(p => p.current_stock <= 5).length;

    setStats({
      todaySales: todaySalesRes.data?.length || 0,
      todayRevenue,
      totalProducts: products.length,
      lowStockCount,
      weeklyRevenue,
      monthlyRevenue,
    });
    setRecentSales(recentRes.data || []);
    setLoading(false);
  };

  useEffect(() => { loadStats(); }, [user]);

  const fmt = (n: number) => new Intl.NumberFormat('my-MM').format(Math.round(n));
  const paymentLabel: Record<string, string> = {
    cash: 'ငွေသား',
    kpay: 'KPay',
    wave: 'Wave Money',
    mobile_banking: 'Mobile Banking',
  };

  const statCards = [
    {
      title: "Today's Revenue", titleMm: 'ယနေ့ ရောင်းရငွေ',
      value: `${fmt(stats.todayRevenue)} ကျပ်`,
      sub: `${stats.todaySales} transactions`,
      icon: <DollarSign size={22} />, color: 'text-accent-400', bg: 'bg-accent-500/10 border-accent-500/20',
    },
    {
      title: 'Weekly Revenue', titleMm: 'ဤသတ္တပတ် ရောင်းရငွေ',
      value: `${fmt(stats.weeklyRevenue)} ကျပ်`,
      sub: 'Last 7 days',
      icon: <TrendingUp size={22} />, color: 'text-primary-400', bg: 'bg-primary-600/10 border-primary-600/20',
    },
    {
      title: 'Monthly Revenue', titleMm: 'ဤလ ရောင်းရငွေ',
      value: `${fmt(stats.monthlyRevenue)} ကျပ်`,
      sub: 'This month',
      icon: <Calendar size={22} />, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Total Products', titleMm: 'ကုန်ပစ္စည်း အရေအတွက်',
      value: String(stats.totalProducts),
      sub: `${stats.lowStockCount} low stock`,
      icon: <Package size={22} />, color: stats.lowStockCount > 0 ? 'text-danger-400' : 'text-slate-400',
      bg: stats.lowStockCount > 0 ? 'bg-danger-600/10 border-danger-600/20' : 'bg-surface-200 border-slate-700',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 font-myanmar text-sm mt-0.5">
            မင်္ဂလာပါ, {profile?.shop_name || 'ဆိုင်ရှင်'} ✦
          </p>
        </div>
        <button onClick={loadStats} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className={`rounded-xl p-5 border ${card.bg} transition-transform hover:scale-[1.01]`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`${card.color}`}>{card.icon}</div>
              <ArrowUpRight size={16} className="text-slate-600" />
            </div>
            <p className="text-2xl font-bold text-white mb-1">{card.value}</p>
            <p className="text-sm font-medium text-slate-300">{card.title}</p>
            <p className="text-xs font-myanmar text-slate-500 mt-0.5">{card.titleMm}</p>
            <p className="text-xs text-slate-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-warning-500/10 border border-warning-500/30 rounded-xl">
          <AlertTriangle size={18} className="text-warning-400 shrink-0" />
          <div>
            <p className="text-warning-400 font-medium text-sm">
              {stats.lowStockCount} product(s) have low stock (&le;5 units)
            </p>
            <p className="text-warning-400/70 text-xs font-myanmar">ကုန်ပစ္စည်း {stats.lowStockCount} မျိုး အနည်းငယ်သာ ကျန်ရှိသည်</p>
          </div>
          <button onClick={() => onNavigate('inventory')} className="ml-auto text-xs text-primary-400 hover:text-primary-300 font-medium whitespace-nowrap">
            View →
          </button>
        </div>
      )}

      {/* Quick Actions + Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'New Sale', mm: 'ရောင်းအားသစ်', page: 'new-sale' as Page, icon: <ShoppingCart size={16} />, color: 'bg-primary-600 hover:bg-primary-700' },
              { label: 'Add Product', mm: 'ကုန်ပစ္စည်းထည့်', page: 'add-product' as Page, icon: <Package size={16} />, color: 'bg-accent-600 hover:bg-accent-500' },
            ].map((a) => (
              <button
                key={a.page}
                onClick={() => onNavigate(a.page)}
                className={`w-full flex items-center gap-3 px-4 py-3 ${a.color} text-white rounded-lg font-medium text-sm transition-colors`}
              >
                {a.icon}
                <span className="flex flex-col items-start">
                  <span>{a.label}</span>
                  <span className="text-xs font-myanmar opacity-80">{a.mm}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Recent Sales</h3>
            <button onClick={() => onNavigate('sales-history')} className="text-xs text-primary-400 hover:text-primary-300">
              View All →
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-500">
              <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : recentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500">
              <ShoppingCart size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No sales yet</p>
              <p className="text-xs font-myanmar">ရောင်းအားများ မရှိသေးပါ</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-surface-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-200">#{sale.sale_number || sale.id.slice(0,8)}</p>
                    <p className="text-xs text-slate-500">{new Date(sale.created_at).toLocaleString('my-MM')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-accent-400">{fmt(sale.total)} ကျပ်</p>
                    <span className="badge-info text-xs">{paymentLabel[sale.payment_method] || sale.payment_method}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
