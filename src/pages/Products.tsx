import React, { useState, useEffect } from 'react';
import { Package, Search, Trash2, Printer, Plus, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { Product, Page } from '../types';
import ExportDataDropdown from '../components/ExportDataDropdown';

export default function Products({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const plan = profile?.subscription_plan ?? 'free';
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('products').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setProducts(data as Product[] || []);
    setLoading(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setDeleting(id);
    await supabase.from('products').update({ is_active: false }).eq('id', id);
    setProducts(prev => prev.filter(p => p.id !== id));
    setDeleting(null);
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.name_mm.includes(search) ||
    p.barcode.includes(search)
  );

  const fmt = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-slate-400 font-myanmar text-sm mt-0.5">ကုန်ပစ္စည်းများ</p>
        </div>
        <div className="flex gap-2">
          <ExportDataDropdown
            baseFilename="products"
            sheetName="Products"
            pdfTitle="Products List"
            columns={[
              { header: 'Name', accessor: r => r.name },
              { header: 'Myanmar Name', accessor: r => r.name_mm },
              { header: 'Barcode', accessor: r => r.barcode || '' },
              { header: 'Category', accessor: r => r.category },
              { header: 'Selling Price (MMK)', accessor: r => r.selling_price },
              { header: 'Cost Price (MMK)', accessor: r => r.cost_price },
              { header: 'Current Stock', accessor: r => r.current_stock },
              { header: 'Unit', accessor: r => r.unit },
            ]}
            rows={filtered}
            plan={plan}
            onUpgradeClick={() => onNavigate('subscription')}
          />
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm no-print">
            <Printer size={14} />Print
          </button>
          <button onClick={() => onNavigate('add-product')} className="btn-primary flex items-center gap-2 text-sm no-print">
            <Plus size={14} />Add Product
          </button>
        </div>
      </div>

      <div className="card">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products..." className="input-field pl-9"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-slate-500">
            <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Package size={40} className="mb-3 opacity-30" />
            <p>No products found</p>
            <p className="text-xs font-myanmar mt-1">ကုန်ပစ္စည်းများ မရှိသေးပါ</p>
            <button onClick={() => onNavigate('add-product')} className="btn-primary mt-4 text-sm">Add First Product</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="table-th">Product</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Barcode</th>
                  <th className="table-th text-right">Cost</th>
                  <th className="table-th text-right">Price</th>
                  <th className="table-th text-center">Stock</th>
                  <th className="table-th text-center no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-surface-200/50 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-slate-700" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-surface-300 border border-slate-700 flex items-center justify-center">
                            <Package size={16} className="text-slate-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-200">{p.name}</p>
                          <p className="text-xs font-myanmar text-slate-500">{p.name_mm}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td"><span className="badge-info">{p.category}</span></td>
                    <td className="table-td text-slate-500 text-xs font-mono">{p.barcode || '—'}</td>
                    <td className="table-td text-right text-slate-400">{fmt(p.cost_price)} ကျပ်</td>
                    <td className="table-td text-right font-semibold text-accent-400">{fmt(p.selling_price)} ကျပ်</td>
                    <td className="table-td text-center">
                      <span className={`font-semibold ${p.current_stock <= 5 ? 'text-danger-400' : p.current_stock <= 20 ? 'text-warning-400' : 'text-accent-400'}`}>
                        {p.current_stock} {p.unit}
                        {p.current_stock <= 5 && <AlertTriangle size={12} className="inline ml-1" />}
                      </span>
                    </td>
                    <td className="table-td text-center no-print">
                      <button
                        onClick={() => deleteProduct(p.id)}
                        disabled={deleting === p.id}
                        className="p-1.5 text-slate-500 hover:text-danger-400 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
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
