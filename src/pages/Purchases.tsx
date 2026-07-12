import React, { useState, useEffect } from 'react';
import { TruckIcon, Plus, Download, Printer, RefreshCw, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Purchase, Product } from '../types';

interface PurchaseWithProduct extends Purchase {
  product: Product;
}

function exportCSV(purchases: PurchaseWithProduct[]) {
  const headers = ['Date', 'Product', 'Supplier', 'Qty', 'Unit Cost', 'Total Cost', 'Note'];
  const rows = purchases.map(p => [
    new Date(p.created_at).toLocaleString(),
    p.product?.name || '',
    p.supplier_name,
    p.qty,
    p.unit_cost,
    p.total_cost,
    p.note,
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'purchases.csv'; a.click();
  URL.revokeObjectURL(url);
}

interface FormState {
  product_id: string;
  supplier_name: string;
  qty: string;
  unit_cost: string;
  note: string;
}

const EMPTY_FORM: FormState = { product_id: '', supplier_name: '', qty: '1', unit_cost: '', note: '' };

export default function Purchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<PurchaseWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [purchasesRes, productsRes] = await Promise.all([
      supabase.from('purchases').select('*, product:products(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('products').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
    ]);
    setPurchases((purchasesRes.data || []) as PurchaseWithProduct[]);
    setProducts((productsRes.data || []) as Product[]);
    setLoading(false);
  };

  const setField = (f: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id || !form.qty || !form.unit_cost) return;
    setSaving(true);
    const qty = Number(form.qty);
    const unit_cost = Number(form.unit_cost);
    const { error } = await supabase.from('purchases').insert({
      product_id: form.product_id,
      supplier_name: form.supplier_name,
      qty,
      unit_cost,
      total_cost: qty * unit_cost,
      note: form.note,
    });
    if (!error) {
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    }
    setSaving(false);
  };

  const filtered = purchases.filter(p =>
    (p.product?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    p.supplier_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalSpent = filtered.reduce((s, r) => s + Number(r.total_cost), 0);
  const fmt = (n: number) => new Intl.NumberFormat('my-MM').format(Math.round(n));

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Purchases</h1>
          <p className="text-slate-400 font-myanmar text-sm mt-0.5">ဝယ်ယူမှုများ</p>
        </div>
        <div className="flex gap-2 no-print">
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => exportCSV(filtered)} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={14} />CSV
          </button>
          <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer size={14} />Print
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancel' : 'Record Purchase'}
          </button>
        </div>
      </div>

      {/* Add Purchase Form */}
      {showForm && (
        <div className="card mb-6 animate-slide-up border-primary-600/30">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <TruckIcon size={18} className="text-primary-400" />
            Record New Purchase
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Product *</label>
              <select value={form.product_id} onChange={setField('product_id')} className="input-field" required>
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Supplier Name / ပေးသွင်းသူ</label>
              <input type="text" value={form.supplier_name} onChange={setField('supplier_name')} placeholder="Supplier name" className="input-field" />
            </div>
            <div>
              <label className="label">Quantity *</label>
              <input type="number" value={form.qty} onChange={setField('qty')} className="input-field" min="1" required />
            </div>
            <div>
              <label className="label">Unit Cost (MMK) *</label>
              <input type="number" value={form.unit_cost} onChange={setField('unit_cost')} placeholder="0" className="input-field" min="0" required />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Note / မှတ်ချက်</label>
              <input type="text" value={form.note} onChange={setField('note')} placeholder="Optional note" className="input-field" />
            </div>
            {form.qty && form.unit_cost && (
              <div className="sm:col-span-2 p-3 bg-primary-600/10 border border-primary-600/20 rounded-lg">
                <p className="text-sm text-primary-300">
                  Total Cost: <span className="font-bold text-primary-200">{fmt(Number(form.qty) * Number(form.unit_cost))} ကျပ်</span>
                </p>
              </div>
            )}
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                {saving ? 'Saving...' : <><TruckIcon size={15} />Record Purchase</>}
              </button>
              <button type="button" onClick={() => setForm(EMPTY_FORM)} className="btn-secondary">Reset</button>
            </div>
          </form>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="card py-4">
          <p className="text-2xl font-bold text-danger-400">{fmt(totalSpent)} ကျပ်</p>
          <p className="text-sm text-slate-400 mt-1">Total Spent</p>
          <p className="text-xs font-myanmar text-slate-500">စုစုပေါင်း ကုန်ကျစရိတ်</p>
        </div>
        <div className="card py-4">
          <p className="text-2xl font-bold text-primary-400">{filtered.length}</p>
          <p className="text-sm text-slate-400 mt-1">Total Purchases</p>
          <p className="text-xs font-myanmar text-slate-500">ဝယ်ယူမှု အကြိမ်ရေ</p>
        </div>
      </div>

      <div className="card">
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="input-field pl-9 text-sm" />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <TruckIcon size={40} className="mb-3 opacity-30" />
            <p>No purchase records</p>
            <p className="text-xs font-myanmar mt-1">ဝယ်ယူမှုမှတ်တမ်း မရှိသေးပါ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="table-th">Date</th>
                  <th className="table-th">Product</th>
                  <th className="table-th">Supplier</th>
                  <th className="table-th text-center">Qty</th>
                  <th className="table-th text-right">Unit Cost</th>
                  <th className="table-th text-right">Total Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-surface-200/40 transition-colors">
                    <td className="table-td text-xs text-slate-500">{new Date(p.created_at).toLocaleString('my-MM')}</td>
                    <td className="table-td">
                      <p className="font-medium text-slate-200">{p.product?.name || '—'}</p>
                      <p className="text-xs font-myanmar text-slate-500">{p.product?.name_mm || ''}</p>
                    </td>
                    <td className="table-td text-slate-400">{p.supplier_name || '—'}</td>
                    <td className="table-td text-center text-slate-300 font-medium">{p.qty} {p.product?.unit || ''}</td>
                    <td className="table-td text-right text-slate-400">{fmt(p.unit_cost)} ကျပ်</td>
                    <td className="table-td text-right font-semibold text-danger-400">{fmt(p.total_cost)} ကျပ်</td>
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
