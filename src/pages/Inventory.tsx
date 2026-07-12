import React, { useState, useEffect } from 'react';
import { BarChart2, Printer, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { Product, Page } from '../types';
import ExportDataDropdown from '../components/ExportDataDropdown';

interface InventoryRow {
  product: Product;
  openingQty: number;
  purchasedQty: number;
  soldQty: number;
  currentStock: number;
}

export default function Inventory({ onNavigate }: { onNavigate?: (p: Page) => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const [productsRes, openingRes, purchasesRes, salesRes] = await Promise.all([
      supabase.from('products').select('*').eq('user_id', user.id).eq('is_active', true),
      supabase.from('inventory_opening').select('product_id, qty').eq('user_id', user.id),
      supabase.from('purchases').select('product_id, qty').eq('user_id', user.id),
      supabase.from('sale_items').select('product_id, qty, sale_id, sales!inner(user_id)')
        .eq('sales.user_id', user.id),
    ]);

    const products = (productsRes.data || []) as Product[];

    const openingMap: Record<string, number> = {};
    (openingRes.data || []).forEach(r => {
      openingMap[r.product_id] = (openingMap[r.product_id] || 0) + r.qty;
    });

    const purchaseMap: Record<string, number> = {};
    (purchasesRes.data || []).forEach(r => {
      purchaseMap[r.product_id] = (purchaseMap[r.product_id] || 0) + r.qty;
    });

    const soldMap: Record<string, number> = {};
    (salesRes.data || []).forEach((r: any) => {
      soldMap[r.product_id] = (soldMap[r.product_id] || 0) + r.qty;
    });

    const result: InventoryRow[] = products.map(p => ({
      product: p,
      openingQty: openingMap[p.id] || 0,
      purchasedQty: purchaseMap[p.id] || 0,
      soldQty: soldMap[p.id] || 0,
      currentStock: p.current_stock,
    }));

    setRows(result);
    setLoading(false);
  };

  const fmt = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-slate-400 font-myanmar text-sm mt-0.5">ကုန်ပစ္စည်းစာရင်း</p>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh
          </button>
          <ExportDataDropdown
            baseFilename="inventory"
            sheetName="Inventory"
            pdfTitle="Inventory Report"
            columns={[
              { header: 'Product', accessor: r => r.product.name },
              { header: 'Myanmar Name', accessor: r => r.product.name_mm },
              { header: 'Category', accessor: r => r.product.category },
              { header: 'Opening Stock', accessor: r => r.openingQty },
              { header: 'Purchased', accessor: r => r.purchasedQty },
              { header: 'Sold', accessor: r => r.soldQty },
              { header: 'Current Stock', accessor: r => r.currentStock },
              { header: 'Unit', accessor: r => r.product.unit },
            ]}
            rows={rows}
            plan={profile?.subscription_plan ?? 'free'}
            onUpgradeClick={() => onNavigate?.('subscription')}
          />
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer size={14} />Print
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Products', mm: 'ကုန်ပစ္စည်း', value: rows.length, color: 'text-primary-400' },
          { label: 'Total Opening', mm: 'ဖွင့်ပွင့်ကုန်', value: rows.reduce((s, r) => s + r.openingQty, 0), color: 'text-amber-400' },
          { label: 'Total Purchased', mm: 'ဝယ်ယူမှု', value: rows.reduce((s, r) => s + r.purchasedQty, 0), color: 'text-accent-400' },
          { label: 'Total Sold', mm: 'ရောင်းချမှု', value: rows.reduce((s, r) => s + r.soldQty, 0), color: 'text-blue-400' },
        ].map((c, i) => (
          <div key={i} className="card py-4">
            <p className={`text-2xl font-bold ${c.color}`}>{fmt(c.value)}</p>
            <p className="text-sm text-slate-300 mt-1">{c.label}</p>
            <p className="text-xs font-myanmar text-slate-500">{c.mm}</p>
          </div>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="flex justify-center py-16 text-slate-500">
            <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <BarChart2 size={40} className="mb-3 opacity-30" />
            <p>No inventory data</p>
            <p className="text-xs font-myanmar mt-1">ကုန်ပစ္စည်းစာရင်း မရှိသေးပါ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="table-th">Product / ကုန်ပစ္စည်း</th>
                  <th className="table-th text-center">Category</th>
                  <th className="table-th text-center">Opening Stock</th>
                  <th className="table-th text-center">Purchased</th>
                  <th className="table-th text-center">Sold</th>
                  <th className="table-th text-center">Current Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {rows.map(row => (
                  <tr key={row.product.id} className="hover:bg-surface-200/40 transition-colors">
                    <td className="table-td">
                      <p className="font-medium text-slate-200">{row.product.name}</p>
                      <p className="text-xs font-myanmar text-slate-500">{row.product.name_mm}</p>
                    </td>
                    <td className="table-td text-center">
                      <span className="badge-info">{row.product.category}</span>
                    </td>
                    <td className="table-td text-center text-amber-400 font-medium">{fmt(row.openingQty)} {row.product.unit}</td>
                    <td className="table-td text-center text-accent-400 font-medium">{fmt(row.purchasedQty)} {row.product.unit}</td>
                    <td className="table-td text-center text-blue-400 font-medium">{fmt(row.soldQty)} {row.product.unit}</td>
                    <td className="table-td text-center">
                      <span className={`font-bold text-base ${
                        row.currentStock <= 0 ? 'text-danger-400' :
                        row.currentStock <= 5 ? 'text-warning-400' :
                        'text-accent-400'
                      }`}>
                        {fmt(row.currentStock)} {row.product.unit}
                        {row.currentStock <= 5 && row.currentStock > 0 && <AlertTriangle size={12} className="inline ml-1" />}
                      </span>
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
