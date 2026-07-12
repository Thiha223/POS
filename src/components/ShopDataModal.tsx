import React, { useState, useEffect } from 'react';
import {
  X, Package, ShoppingCart, Edit3, Trash2, Save,
  Plus, Minus, AlertTriangle, DollarSign, Box, TrendingDown,
  Users, Phone, Wallet, TrendingUp, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product, Purchase, Sale, Profile, Customer } from '../types';
import { fetchIncomeStatement, IncomeStatementData } from '../lib/financials';

interface ExpenseRow {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
}

interface ShopDataModalProps {
  shop: Profile;
  onClose: () => void;
}

type TabType = 'products' | 'inventory' | 'sales' | 'purchases' | 'customers' | 'financial';

export default function ShopDataModal({ shop, onClose }: ShopDataModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingFinancial, setLoadingFinancial] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [incomeData, setIncomeData] = useState<IncomeStatementData | null>(null);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [expenseEdit, setExpenseEdit] = useState({ category: '', description: '', amount: 0, expense_date: '' });
  const [savingExpense, setSavingExpense] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: '', name_mm: '', current_stock: 0 });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadShopData();
  }, [shop.user_id]);

  const loadShopData = async () => {
    setLoading(true);

    try {
      // Load products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', shop.user_id)
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error loading products:', productsError);
      }

      // Load sales with items
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            sale_id,
            product_id,
            product_name,
            qty,
            unit_price,
            subtotal
          )
        `)
        .eq('user_id', shop.user_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (salesError) {
        console.error('Error loading sales:', salesError);
      }

      // Load purchases
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select(`
          *,
          products (name, name_mm)
        `)
        .eq('user_id', shop.user_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (purchasesError) {
        console.error('Error loading purchases:', purchasesError);
      }

      setProducts(productsData || []);
      setSales(salesData || []);
      setPurchases(purchasesData || []);
    } catch (error) {
      console.error('Failed to load shop data:', error);
    }

    setLoading(false);
  };

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', shop.user_id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error loading customers:', error);
      }
      setCustomers(data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
    setLoadingCustomers(false);
  };

  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomers();
    }
    if (activeTab === 'financial') {
      fetchFinancialData();
    }
  }, [activeTab, shop.user_id]);

  const fetchFinancialData = async () => {
    setLoadingFinancial(true);
    try {
      const { data: expData, error: expError } = await supabase
        .from('operating_expenses')
        .select('id, category, description, amount, expense_date')
        .eq('user_id', shop.user_id)
        .order('expense_date', { ascending: false });

      if (expError) {
        console.error('Error loading expenses:', expError);
      }
      setExpenses((expData as ExpenseRow[]) || []);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const range = { start: monthStart, end: now };
      const income = await fetchIncomeStatement(shop.user_id, range);
      setIncomeData(income);
    } catch (error) {
      console.error('Failed to load financial data:', error);
    }
    setLoadingFinancial(false);
  };

  const startEditProduct = (product: Product) => {
    setEditingProduct(product.id);
    setEditData({
      name: product.name,
      name_mm: product.name_mm || '',
      current_stock: product.current_stock,
    });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditData({ name: '', name_mm: '', current_stock: 0 });
  };

  const saveProductEdit = async (productId: string) => {
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          name: editData.name,
          name_mm: editData.name_mm,
          current_stock: editData.current_stock,
          updated_at: new Date().toISOString(),
        })
        .eq('id', productId)
        .select();

      if (error) {
        console.error('Failed to update product:', error);
        alert(`Failed to update product: ${error.message || 'Unknown error'}\nCode: ${error.code || 'N/A'}`);
      } else {
        console.log('Product updated successfully:', data);
        // Update local state
        setProducts(prev => prev.map(p => {
          if (p.id === productId) {
            return {
              ...p,
              name: editData.name,
              name_mm: editData.name_mm,
              current_stock: editData.current_stock,
            };
          }
          return p;
        }));
        setEditingProduct(null);
      }
    } catch (err: any) {
      console.error('Exception during product update:', err);
      alert(`Exception: ${err.message || 'Unknown error'}`);
    }

    setSaving(false);
  };

  const adjustStock = (delta: number) => {
    const newStock = Math.max(0, editData.current_stock + delta);
    setEditData(prev => ({ ...prev, current_stock: newStock }));
  };

  const deleteSale = async (saleId: string) => {
    if (!confirm('Delete this sale? This will reverse the stock changes.')) return;
    setDeleting(saleId);

    try {
      // First get sale items to restore stock
      const { data: items, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId);

      if (itemsError) throw itemsError;

      // Restore stock for each item
      if (items) {
        for (const item of items) {
          const { data: product, error: prodError } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', item.product_id)
            .single();

          if (prodError) throw prodError;

          if (product) {
            const { error: updateError } = await supabase
              .from('products')
              .update({
                current_stock: product.current_stock + item.qty,
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.product_id);
            if (updateError) throw updateError;
          }
        }
      }

      // Delete sale items
      const { error: delItemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId);
      if (delItemsError) throw delItemsError;

      // Delete sale
      const { error: delSaleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', saleId);
      if (delSaleError) throw delSaleError;

      // Update local state
      setSales(prev => prev.filter(s => s.id !== saleId));
      await loadShopData();
    } catch (error: any) {
      console.error('Failed to delete sale:', error);
      alert(`Failed to delete sale: ${error.message || 'Unknown error'}`);
    }

    setDeleting(null);
  };

  const deletePurchase = async (purchaseId: string, productId: string, qty: number) => {
    if (!confirm('Delete this purchase? Stock will be reduced by the purchase quantity.')) return;
    setDeleting(purchaseId);

    try {
      // Get current stock
      const { data: product, error: prodError } = await supabase
        .from('products')
        .select('current_stock')
        .eq('id', productId)
        .single();

      if (prodError) throw prodError;

      // Reduce stock
      if (product) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            current_stock: Math.max(0, product.current_stock - qty),
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId);
        if (updateError) throw updateError;
      }

      // Delete purchase
      const { error: delError } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseId);
      if (delError) throw delError;

      // Update local state
      setPurchases(prev => prev.filter(p => p.id !== purchaseId));
      await loadShopData();
    } catch (error: any) {
      console.error('Failed to delete purchase:', error);
      alert(`Failed to delete purchase: ${error.message || 'Unknown error'}`);
    }

    setDeleting(null);
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('my-MM');
  const fmtMoney = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'products', label: 'Products', icon: <Package size={16} /> },
    { id: 'inventory', label: 'Stock', icon: <Box size={16} /> },
    { id: 'sales', label: 'Sales', icon: <ShoppingCart size={16} /> },
    { id: 'purchases', label: 'Purchases', icon: <TrendingDown size={16} /> },
    { id: 'customers', label: 'Customers', icon: <Users size={16} /> },
    { id: 'financial', label: 'Financial', icon: <Wallet size={16} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface-100 rounded-2xl border border-slate-700/50 shadow-2xl animate-fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {shop.shop_name}
                {shop.shop_name_mm && (
                  <span className="text-sm font-myanmar text-slate-400">({shop.shop_name_mm})</span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Manage shop data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-200 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-3 border-b border-slate-700/30 bg-surface-200/20 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-surface-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : (
            <>
              {/* Products Tab */}
              {activeTab === 'products' && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-4">
                    All Products ({products.length})
                  </h4>
                  {products.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Package size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No products found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {products.map(product => (
                        <div
                          key={product.id}
                          className="bg-surface-200/30 rounded-xl p-4 border border-slate-700/30"
                        >
                          {editingProduct === product.id ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Product Name</label>
                                  <input
                                    type="text"
                                    value={editData.name}
                                    onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                                    className="input-primary w-full text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-slate-400 mb-1 block">Myanmar Name</label>
                                  <input
                                    type="text"
                                    value={editData.name_mm}
                                    onChange={(e) => setEditData(prev => ({ ...prev, name_mm: e.target.value }))}
                                    className="input-primary w-full text-sm font-myanmar"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-slate-400 mb-1 block">Current Stock</label>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => adjustStock(-1)}
                                    className="p-2 bg-surface-300 hover:bg-danger-600/20 rounded-lg transition-colors"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <input
                                    type="number"
                                    value={editData.current_stock}
                                    onChange={(e) => setEditData(prev => ({ ...prev, current_stock: parseInt(e.target.value) || 0 }))}
                                    className="input-primary w-24 text-center text-sm"
                                  />
                                  <button
                                    onClick={() => adjustStock(1)}
                                    className="p-2 bg-surface-300 hover:bg-accent-600/20 rounded-lg transition-colors"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-2">
                                <button
                                  onClick={() => saveProductEdit(product.id)}
                                  disabled={saving}
                                  className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                                >
                                  {saving ? (
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                    </svg>
                                  ) : <Save size={14} />}
                                  Save
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-4 py-2 text-slate-400 hover:text-white text-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-slate-200 font-medium">{product.name}</p>
                                {product.name_mm && (
                                  <p className="text-xs font-myanmar text-slate-500">{product.name_mm}</p>
                                )}
                                <div className="flex items-center gap-4 mt-1">
                                  <span className="text-xs text-slate-400">
                                    Price: <span className="text-accent-400">{fmtMoney(product.selling_price)} Ks</span>
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    Stock: <span className={product.current_stock < 10 ? 'text-danger-400' : 'text-slate-300'}>{product.current_stock}</span>
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => startEditProduct(product)}
                                className="p-2 bg-primary-600/20 hover:bg-primary-600/40 border border-primary-600/30 text-primary-400 rounded-lg transition-colors"
                              >
                                <Edit3 size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Inventory Tab */}
              {activeTab === 'inventory' && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-4">
                    Stock Overview
                  </h4>
                  {products.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Box size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No inventory data</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Stock Summary */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-surface-200/30 rounded-xl p-4 border border-slate-700/30">
                          <p className="text-xs text-slate-400 mb-1">Total Products</p>
                          <p className="text-2xl font-bold text-white">{products.length}</p>
                        </div>
                        <div className="bg-surface-200/30 rounded-xl p-4 border border-slate-700/30">
                          <p className="text-xs text-slate-400 mb-1">Low Stock Items</p>
                          <p className="text-2xl font-bold text-amber-400">
                            {products.filter(p => p.current_stock < 10 && p.current_stock > 0).length}
                          </p>
                        </div>
                        <div className="bg-surface-200/30 rounded-xl p-4 border border-slate-700/30">
                          <p className="text-xs text-slate-400 mb-1">Out of Stock</p>
                          <p className="text-2xl font-bold text-danger-400">
                            {products.filter(p => p.current_stock === 0).length}
                          </p>
                        </div>
                      </div>

                      {/* Stock List */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-surface-200/50">
                            <tr>
                              <th className="text-left px-4 py-2 text-xs text-slate-400 font-medium">Product</th>
                              <th className="text-center px-4 py-2 text-xs text-slate-400 font-medium">Stock</th>
                              <th className="text-right px-4 py-2 text-xs text-slate-400 font-medium">Value</th>
                              <th className="text-center px-4 py-2 text-xs text-slate-400 font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/30">
                            {products.map(product => (
                              <tr key={product.id} className="hover:bg-surface-200/20">
                                <td className="px-4 py-3">
                                  <p className="text-slate-200 text-sm">{product.name}</p>
                                  {product.name_mm && (
                                    <p className="text-xs font-myanmar text-slate-500">{product.name_mm}</p>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {editingProduct === product.id ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => adjustStock(-1)}
                                        className="p-1.5 bg-danger-600/20 hover:bg-danger-600/40 text-danger-400 rounded-lg transition-colors"
                                      >
                                        <Minus size={14} />
                                      </button>
                                      <input
                                        type="number"
                                        value={editData.current_stock}
                                        onChange={(e) => setEditData(prev => ({ ...prev, current_stock: parseInt(e.target.value) || 0 }))}
                                        className="input-primary w-20 text-center text-sm py-1"
                                      />
                                      <button
                                        onClick={() => adjustStock(1)}
                                        className="p-1.5 bg-accent-600/20 hover:bg-accent-600/40 text-accent-400 rounded-lg transition-colors"
                                      >
                                        <Plus size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium ${
                                      product.current_stock === 0
                                        ? 'bg-danger-600/20 text-danger-400'
                                        : product.current_stock < 10
                                        ? 'bg-amber-600/20 text-amber-400'
                                        : 'bg-surface-200 text-slate-300'
                                    }`}>
                                      {product.current_stock}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-slate-300">
                                  {fmtMoney(product.current_stock * product.cost_price)} Ks
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {editingProduct === product.id ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => saveProductEdit(product.id)}
                                        disabled={saving}
                                        className="p-1.5 bg-accent-600/20 hover:bg-accent-600/40 border border-accent-600/30 text-accent-400 rounded-lg transition-colors disabled:opacity-50"
                                      >
                                        {saving ? (
                                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                          </svg>
                                        ) : <Save size={14} />}
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        className="p-1.5 bg-surface-300 hover:bg-surface-400 text-slate-400 rounded-lg transition-colors"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => startEditProduct(product)}
                                      className="p-1.5 bg-primary-600/20 hover:bg-primary-600/40 border border-primary-600/30 text-primary-400 rounded-lg transition-colors"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sales Tab */}
              {activeTab === 'sales' && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-4">
                    Recent Sales ({sales.length})
                  </h4>
                  {sales.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No sales found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sales.map(sale => (
                        <div
                          key={sale.id}
                          className="bg-surface-200/30 rounded-xl p-4 border border-slate-700/30"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-slate-300">#{sale.sale_number}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  sale.payment_method === 'cash'
                                    ? 'bg-accent-600/20 text-accent-400'
                                    : 'bg-primary-600/20 text-primary-400'
                                }`}>
                                  {sale.payment_method.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">{fmt(sale.created_at)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-accent-400">{fmtMoney(sale.total)} Ks</p>
                              {sale.discount > 0 && (
                                <p className="text-xs text-slate-500">Discount: {fmtMoney(sale.discount)} Ks</p>
                              )}
                            </div>
                          </div>

                          {/* Sale Items */}
                          {sale.sale_items && sale.sale_items.length > 0 && (
                            <div className="border-t border-slate-700/30 pt-2 mt-2">
                              <div className="space-y-1">
                                {sale.sale_items.map(item => (
                                  <div key={item.id} className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400">
                                      {item.product_name} x{item.qty}
                                    </span>
                                    <span className="text-slate-300">{fmtMoney(item.subtotal)} Ks</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Delete Button */}
                          <div className="flex justify-end mt-3 pt-2 border-t border-slate-700/30">
                            <button
                              onClick={() => deleteSale(sale.id)}
                              disabled={deleting === sale.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-danger-600/10 hover:bg-danger-600/20 border border-danger-600/30 text-danger-400 rounded-lg text-xs transition-colors disabled:opacity-50"
                            >
                              {deleting === sale.id ? (
                                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                </svg>
                              ) : <Trash2 size={14} />}
                              Delete Sale
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Purchases Tab */}
              {activeTab === 'purchases' && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-4">
                    Recent Purchases ({purchases.length})
                  </h4>
                  {purchases.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <TrendingDown size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No purchases found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {purchases.map(purchase => (
                        <div
                          key={purchase.id}
                          className="bg-surface-200/30 rounded-xl p-4 border border-slate-700/30"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-slate-200">
                                {(purchase as any).products?.name || 'Unknown Product'}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-slate-400">
                                  Qty: <span className="text-white">{purchase.qty}</span>
                                </span>
                                <span className="text-xs text-slate-400">
                                  Unit Cost: <span className="text-white">{fmtMoney(purchase.unit_cost)} Ks</span>
                                </span>
                                {purchase.supplier_name && (
                                  <span className="text-xs text-slate-400">
                                    Supplier: <span className="text-slate-300">{purchase.supplier_name}</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">{fmt(purchase.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-lg font-bold text-primary-400">{fmtMoney(purchase.total_cost)} Ks</p>
                              <button
                                onClick={() => deletePurchase(purchase.id, purchase.product_id, purchase.qty)}
                                disabled={deleting === purchase.id}
                                className="p-1.5 bg-danger-600/10 hover:bg-danger-600/20 border border-danger-600/30 text-danger-400 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {deleting === purchase.id ? (
                                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                  </svg>
                                ) : <Trash2 size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Customers Tab */}
              {activeTab === 'customers' && (
                <div>
                  <h4 className="text-sm font-medium text-slate-300 mb-4">
                    Shop Customers ({customers.length})
                  </h4>
                  {loadingCustomers ? (
                    <div className="flex justify-center py-8">
                      <svg className="animate-spin h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Users size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No customers found for this shop</p>
                      <p className="text-xs mt-1">Customers appear here when the shop owner adds them</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-2">
                      <table className="w-full">
                        <thead className="bg-surface-200/50">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer Name</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone Number</th>
                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Spent</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Join Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {customers.map(customer => (
                            <tr key={customer.id} className="hover:bg-surface-200/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-primary-600/20 border border-primary-600/30 flex items-center justify-center flex-shrink-0">
                                    <Users size={14} className="text-primary-400" />
                                  </div>
                                  <span className="font-medium text-slate-200">{customer.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <Phone size={12} className="text-slate-500" />
                                  <span className="text-sm text-slate-400">{customer.phone || '—'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-600/20 text-primary-400">
                                  {customer.total_orders}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm text-accent-400 font-medium">
                                  {fmtMoney(customer.total_spent)} Ks
                                </span>
                                  </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-xs text-slate-500">{fmt(customer.created_at)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'financial' && (
                <FinancialTab
                  expenses={expenses}
                  incomeData={incomeData}
                  loading={loadingFinancial}
                  editingExpense={editingExpense}
                  expenseEdit={expenseEdit}
                  savingExpense={savingExpense}
                  deletingExpense={deletingExpense}
                  fmtMoney={fmtMoney}
                  onStartEdit={(exp) => {
                    setEditingExpense(exp.id);
                    setExpenseEdit({
                      category: exp.category,
                      description: exp.description || '',
                      amount: exp.amount,
                      expense_date: exp.expense_date,
                    });
                  }}
                  onCancelEdit={() => setEditingExpense(null)}
                  onFieldChange={(field, value) =>
                    setExpenseEdit(prev => ({ ...prev, [field]: value }))
                  }
                  onSave={async (id) => {
                    setSavingExpense(true);
                    const { error } = await supabase
                      .from('operating_expenses')
                      .update({
                        category: expenseEdit.category,
                        description: expenseEdit.description,
                        amount: expenseEdit.amount,
                        expense_date: expenseEdit.expense_date,
                      })
                      .eq('id', id);
                    setSavingExpense(false);
                    if (error) {
                      alert('Failed to save expense: ' + error.message);
                    } else {
                      setEditingExpense(null);
                      fetchFinancialData();
                    }
                  }}
                  onDelete={async (id) => {
                    if (!confirm('Delete this expense record? This cannot be undone.')) return;
                    setDeletingExpense(id);
                    const { error } = await supabase
                      .from('operating_expenses')
                      .delete()
                      .eq('id', id);
                    setDeletingExpense(null);
                    if (error) {
                      alert('Failed to delete expense: ' + error.message);
                    } else {
                      fetchFinancialData();
                    }
                  }}
                  onRefresh={fetchFinancialData}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-700/50 bg-surface-200/30 rounded-b-2xl">
          <div className="text-xs text-slate-500">
            <AlertTriangle size={12} className="inline mr-1" />
            Changes made here will affect the user's actual data
          </div>
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Financial Tab ---------- */

const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Salaries', 'Marketing', 'Supplies', 'Transport', 'Other'
];

interface FinancialTabProps {
  expenses: ExpenseRow[];
  incomeData: IncomeStatementData | null;
  loading: boolean;
  editingExpense: string | null;
  expenseEdit: { category: string; description: string; amount: number; expense_date: string };
  savingExpense: boolean;
  deletingExpense: string | null;
  fmtMoney: (n: number) => string;
  onStartEdit: (exp: ExpenseRow) => void;
  onCancelEdit: () => void;
  onFieldChange: (field: string, value: string | number) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

function FinancialTab({
  expenses, incomeData, loading, editingExpense, expenseEdit,
  savingExpense, deletingExpense, fmtMoney,
  onStartEdit, onCancelEdit, onFieldChange, onSave, onDelete, onRefresh
}: FinancialTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="animate-spin h-8 w-8 text-primary-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Income Metrics Summary */}
      {incomeData && (
        <div>
          <h4 className="text-sm font-semibold text-slate-300 mb-3">
            Income Metrics (This Month) / ဤလ ဝင်ငွေ
          </h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-surface-200/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={15} className="text-accent-400" />
                <span className="text-xs text-slate-400">Gross Revenue</span>
              </div>
              <p className="text-lg font-bold text-accent-400">{fmtMoney(incomeData.grossRevenue)}</p>
              <p className="text-xs text-slate-500 font-myanmar">စုစုပေါင်းဝင်ငွေ</p>
            </div>
            <div className="bg-surface-200/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={15} className="text-primary-400" />
                <span className="text-xs text-slate-400">Gross Profit</span>
              </div>
              <p className="text-lg font-bold text-primary-400">{fmtMoney(incomeData.grossProfit)}</p>
              <p className="text-xs text-slate-500 font-myanmar">အမြတ်ချုပ်</p>
            </div>
            <div className="bg-surface-200/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={15} className="text-amber-400" />
                <span className="text-xs text-slate-400">Op. Expenses</span>
              </div>
              <p className="text-lg font-bold text-amber-400">{fmtMoney(incomeData.totalOperatingExpenses)}</p>
              <p className="text-xs text-slate-500 font-myanmar">လည်ပတ်စရိတ်</p>
            </div>
            <div className="bg-surface-200/50 rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={15} className={incomeData.netProfit >= 0 ? 'text-accent-400' : 'text-danger-400'} />
                <span className="text-xs text-slate-400">Net Profit</span>
              </div>
              <p className={`text-lg font-bold ${incomeData.netProfit >= 0 ? 'text-accent-400' : 'text-danger-400'}`}>
                {fmtMoney(incomeData.netProfit)}
              </p>
              <p className="text-xs text-slate-500 font-myanmar">အသန့်စင်အမြတ်</p>
            </div>
          </div>
        </div>
      )}

      {/* Expense Table Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-300">
            Operating Expenses / လည်ပတ်စရိတ်များ
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {expenses.length} records · Total: {fmtMoney(totalExpenses)} Ks
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-300 hover:bg-surface-400 text-slate-300 rounded-lg text-xs font-medium transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Expense Table */}
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Wallet size={32} className="mb-2 opacity-30" />
          <p className="text-sm">No expense records for this shop</p>
          <p className="text-xs font-myanmar mt-1">ဤဆိုင်တွင် စရိတ်မှတ်တမ်း မရှိပါ</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6">
          <table className="w-full">
            <thead className="bg-surface-200/50">
              <tr>
                <th className="table-th pl-6">Date / ရက်စွဲ</th>
                <th className="table-th">Category / အမျိုးအစား</th>
                <th className="table-th text-right">Amount (Ks) / ပမာဏ</th>
                <th className="table-th">Description / ဖော်ပြချက်</th>
                <th className="table-th text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-surface-200/30 transition-colors">
                  {editingExpense === exp.id ? (
                    <>
                      <td className="px-4 py-2.5 pl-6">
                        <input
                          type="date"
                          value={expenseEdit.expense_date}
                          onChange={(e) => onFieldChange('expense_date', e.target.value)}
                          className="input-primary w-auto text-sm py-1.5"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <select
                          value={expenseEdit.category}
                          onChange={(e) => onFieldChange('category', e.target.value)}
                          className="input-primary w-auto text-sm py-1.5"
                        >
                          {EXPENSE_CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number"
                          value={expenseEdit.amount}
                          onChange={(e) => onFieldChange('amount', Number(e.target.value))}
                          className="input-primary w-28 text-sm py-1.5 text-right"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          value={expenseEdit.description}
                          onChange={(e) => onFieldChange('description', e.target.value)}
                          className="input-primary w-full text-sm py-1.5"
                          placeholder="Description"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onSave(exp.id)}
                            disabled={savingExpense}
                            className="p-1.5 bg-accent-600/20 hover:bg-accent-600/40 border border-accent-600/30 text-accent-400 rounded-lg transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            {savingExpense ? (
                              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <Save size={14} />
                            )}
                          </button>
                          <button
                            onClick={onCancelEdit}
                            className="p-1.5 bg-surface-300 hover:bg-surface-400 border border-slate-600 text-slate-400 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 pl-6 text-sm text-slate-300">
                        {new Date(exp.expense_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge-warning">{exp.category}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-amber-400">
                        {fmtMoney(exp.amount)} Ks
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {exp.description || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onStartEdit(exp)}
                            className="p-1.5 bg-primary-600/20 hover:bg-primary-600/40 border border-primary-600/30 text-primary-400 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => onDelete(exp.id)}
                            disabled={deletingExpense === exp.id}
                            className="p-1.5 bg-danger-600/20 hover:bg-danger-600/40 border border-danger-600/30 text-danger-400 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingExpense === exp.id ? (
                              <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}