import React, { useState, useEffect } from 'react';
import { History, Printer, Search, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { Sale, SaleItem } from '../types';
import ExportDataDropdown from '../components/ExportDataDropdown';

interface SaleWithItems extends Sale {
  sale_items: SaleItem[];
  expanded?: boolean;
}

const paymentLabel: Record<string, string> = {
  cash: 'ငွေသား', kpay: 'KPay', wave: 'Wave', mobile_banking: 'Mobile Banking'
};

export default function SalesHistory({ onNavigate }: { onNavigate?: (p: any) => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from('sales')
      .select('*, sale_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');
    const { data } = await q;
    setSales((data || []) as SaleWithItems[]);
    setLoading(false);
  };

  const toggle = (id: string) => {
    setSales(prev => prev.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s));
  };

  const filtered = sales.filter(s =>
    s.sale_number.toLowerCase().includes(search.toLowerCase()) ||
    s.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    s.payment_method.includes(search.toLowerCase())
  );

  const totalRevenue = filtered.reduce((s, r) => s + Number(r.total), 0);
  const fmt = (n: number) => new Intl.NumberFormat('my-MM').format(Math.round(n));

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales History</h1>
          <p className="text-slate-400 font-myanmar text-sm mt-0.5">ရောင်းအားမှတ်တမ်း</p>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh
          </button>
          <ExportDataDropdown
            baseFilename="sales-history"
            sheetName="Sales History"
            pdfTitle="Sales History Report"
            columns={[
              { header: 'Sale Number', accessor: r => r.sale_number },
              { header: 'Date', accessor: r => new Date(r.created_at).toLocaleString() },
              { header: 'Customer', accessor: r => r.customer_name || '' },
              { header: 'Items', accessor: r => r.sale_items.map(i => `${i.product_name}×${i.qty}`).join('; ') },
              { header: 'Subtotal (MMK)', accessor: r => r.subtotal },
              { header: 'Discount (MMK)', accessor: r => r.discount },
              { header: 'Total (MMK)', accessor: r => r.total },
              { header: 'Payment Method', accessor: r => paymentLabel[r.payment_method] || r.payment_method },
              { header: 'Transaction ID', accessor: r => r.transaction_id || '' },
            ]}
            rows={filtered}
            plan={profile?.subscription_plan ?? 'free'}
            onUpgradeClick={() => onNavigate?.('subscription')}
          />
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer size={14} />Print
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sales..." className="input-field pl-9 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">From:</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-sm w-36" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">To:</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-sm w-36" />
          </div>
          <button onClick={load} className="btn-primary text-sm px-4">Filter</button>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div className="card py-4">
          <p className="text-2xl font-bold text-accent-400">{fmt(totalRevenue)} ကျပ်</p>
          <p className="text-sm text-slate-400 mt-1">Total Revenue</p>
        </div>
        <div className="card py-4">
          <p className="text-2xl font-bold text-primary-400">{filtered.length}</p>
          <p className="text-sm text-slate-400 mt-1">Total Transactions</p>
        </div>
        <div className="card py-4">
          <p className="text-2xl font-bold text-amber-400">
            {filtered.length > 0 ? fmt(totalRevenue / filtered.length) : 0} ကျပ်
          </p>
          <p className="text-sm text-slate-400 mt-1">Avg. Sale Value</p>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-16 text-slate-500">
            <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <History size={40} className="mb-3 opacity-30" />
            <p>No sales records found</p>
            <p className="text-xs font-myanmar mt-1">ရောင်းအားမှတ်တမ်း မရှိသေးပါ</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(sale => (
              <div key={sale.id} className="border border-slate-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggle(sale.id)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-surface-200/50 transition-colors text-left"
                >
                  {sale.expanded ? <ChevronDown size={16} className="text-slate-400 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-200">#{sale.sale_number}</p>
                      <p className="text-xs text-slate-500">{new Date(sale.created_at).toLocaleString('my-MM')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Customer</p>
                      <p className="text-sm text-slate-300">{sale.customer_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Payment</p>
                      <span className="badge-info text-xs">{paymentLabel[sale.payment_method] || sale.payment_method}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-accent-400">{fmt(sale.total)} ကျပ်</p>
                      {sale.discount > 0 && <p className="text-xs text-danger-400">-{fmt(sale.discount)} discount</p>}
                    </div>
                  </div>
                </button>

                {sale.expanded && sale.sale_items.length > 0 && (
                  <div className="border-t border-slate-800 bg-surface-200/30 p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-500 text-xs border-b border-slate-700">
                          <th className="text-left pb-2">Item</th>
                          <th className="text-center pb-2">Qty</th>
                          <th className="text-right pb-2">Unit Price</th>
                          <th className="text-right pb-2">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sale.sale_items.map(item => (
                          <tr key={item.id} className="border-b border-slate-800/50">
                            <td className="py-1.5 text-slate-300">{item.product_name}</td>
                            <td className="py-1.5 text-center text-slate-400">{item.qty}</td>
                            <td className="py-1.5 text-right text-slate-400">{fmt(item.unit_price)} ကျပ်</td>
                            <td className="py-1.5 text-right text-slate-200 font-medium">{fmt(item.subtotal)} ကျပ်</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
