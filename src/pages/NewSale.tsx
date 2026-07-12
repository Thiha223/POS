import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart, Plus, Minus, Search, CreditCard,
  Banknote, Smartphone, X, Printer, CheckCircle, Package, Upload, Camera
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { Product, CartItem, Sale, SaleItem } from '../types';

const MOCK_PRODUCTS: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Premier Coffee',
    name_mm: 'ပရီမီယာ ကော်ဖီ',
    barcode: '8850329001015',
    category: 'Beverages',
    selling_price: 500,
    cost_price: 350,
    current_stock: 50,
    unit: 'ဗူး',
    image_url: 'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=200',
    is_active: true,
  },
  {
    name: 'Coca-Cola 330ml',
    name_mm: 'ကိုကာကိုလာ',
    barcode: '5449000000439',
    category: 'Beverages',
    selling_price: 600,
    cost_price: 450,
    current_stock: 120,
    unit: 'ဗူး',
    image_url: 'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg?auto=compress&cs=tinysrgb&w=200',
    is_active: true,
  },
  {
    name: 'Sunsilk Shampoo',
    name_mm: 'ဆန်စီလ် ရှမ်ပူ',
    barcode: '8850006281413',
    category: 'Personal Care',
    selling_price: 2500,
    cost_price: 1800,
    current_stock: 30,
    unit: 'ပုလင်း',
    image_url: 'https://images.pexels.com/photos/3735782/pexels-photo-3735782.jpeg?auto=compress&cs=tinysrgb&w=200',
    is_active: true,
  },
  {
    name: 'Yum Yum Noodles',
    name_mm: 'ယမ်ယမ် ခေါက်ဆွဲ',
    barcode: '8851655001001',
    category: 'Food',
    selling_price: 300,
    cost_price: 200,
    current_stock: 200,
    unit: 'ထုပ်',
    image_url: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=200',
    is_active: true,
  },
  {
    name: 'LED Bulb 9W',
    name_mm: 'LED မီးသီး ၉ဝပ်',
    barcode: '4895168000024',
    category: 'Electronics',
    selling_price: 3500,
    cost_price: 2500,
    current_stock: 15,
    unit: 'လုံး',
    image_url: 'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=200',
    is_active: true,
  },
];

type PayMethod = 'cash' | 'kpay' | 'wave' | 'mobile_banking';

export default function NewSale() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [transactionId, setTransactionId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [receiptPreview, setReceiptPreview] = useState('');
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const receiptFileRef = useRef<HTMLInputElement>(null);
  const receiptCameraRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [completedSale, setCompletedSale] = useState<{ sale: Sale; items: SaleItem[] } | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadProducts(); }, [user]);

  const loadProducts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('name');

    if (data && data.length > 0) {
      setProducts(data as Product[]);
    } else {
      // Use mock products with fake IDs for demo
      setProducts(MOCK_PRODUCTS.map((p, i) => ({
        ...p,
        id: `mock-${i}`,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })));
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.name_mm.includes(search) ||
    p.barcode.includes(search)
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id
            ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.unit_price }
            : i
        );
      }
      return [...prev, { product, qty: 1, unit_price: product.selling_price, subtotal: product.selling_price }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.product.id === productId
        ? { ...i, qty: Math.max(1, i.qty + delta), subtotal: Math.max(1, i.qty + delta) * i.unit_price }
        : i
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const total = Math.max(0, subtotal - discount);

  const fmt = (n: number) => new Intl.NumberFormat('my-MM').format(Math.round(n));

  const processSale = async () => {
    if (cart.length === 0) return;
    if (!user) return;
    if (payMethod !== 'cash') {
      if (!transactionId.trim()) {
        alert('Transaction ID ဖြည့်ပေးပါ');
        return;
      }
      if (!receiptUrl) {
        alert('Payment proof screenshot တင်ပေးပါ');
        return;
      }
    }
    setProcessing(true);

    const saleNumber = `SALE-${Date.now()}`;
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        sale_number: saleNumber,
        subtotal,
        discount,
        total,
        payment_method: payMethod,
        transaction_id: transactionId,
        receipt_slip_url: receiptUrl,
        customer_name: customerName,
      })
      .select()
      .single();

    if (saleError || !saleData) {
      alert('Sale failed: ' + saleError?.message);
      setProcessing(false);
      return;
    }

    const saleItems = cart.map(i => ({
      sale_id: saleData.id,
      product_id: i.product.id.startsWith('mock-') ? null : i.product.id,
      product_name: i.product.name,
      qty: i.qty,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
    }));

    // For real products, insert items (triggers update stock)
    const realItems = saleItems.filter(i => i.product_id !== null);
    if (realItems.length > 0) {
      await supabase.from('sale_items').insert(realItems);
    }

    setCompletedSale({ sale: saleData as Sale, items: cart.map(i => ({
      id: '',
      sale_id: saleData.id,
      product_id: i.product.id,
      product_name: i.product.name,
      qty: i.qty,
      unit_price: i.unit_price,
      subtotal: i.subtotal,
    }))});
    setProcessing(false);
  };

  const uploadReceipt = async (file: File): Promise<void> => {
    if (!user) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB');
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setReceiptPreview(previewUrl);
    setReceiptUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `receipts/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('payment-receipts').getPublicUrl(fileName);
      setReceiptUrl(data.publicUrl);
    } catch (err: any) {
      alert('Receipt upload failed: ' + (err.message || 'Unknown error'));
      setReceiptPreview('');
    } finally {
      setReceiptUploading(false);
    }
  };

  const clearReceipt = () => {
    setReceiptPreview('');
    setReceiptUrl('');
    if (receiptFileRef.current) receiptFileRef.current.value = '';
    if (receiptCameraRef.current) receiptCameraRef.current.value = '';
  };

  const printReceipt = () => {
    window.print();
  };

  const newSale = () => {
    setCart([]);
    setDiscount(0);
    setPayMethod('cash');
    setTransactionId('');
    setCustomerName('');
    setReceiptPreview('');
    setReceiptUrl('');
    setCompletedSale(null);
  };

  const payMethods: { id: PayMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'cash', label: 'ငွေသား', icon: <Banknote size={16} /> },
    { id: 'kpay', label: 'KPay', icon: <Smartphone size={16} /> },
    { id: 'wave', label: 'Wave', icon: <Smartphone size={16} /> },
    { id: 'mobile_banking', label: 'Mobile Bank', icon: <CreditCard size={16} /> },
  ];

  if (completedSale) {
    return (
      <div className="animate-fade-in">
        {/* Print Receipt */}
        <div ref={receiptRef} className="print-receipt max-w-sm mx-auto">
          <div className="card border-accent-500/30 print:bg-white print:text-black print:border-0 print:shadow-none">
            <div className="text-center mb-6">
              <CheckCircle size={48} className="text-accent-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white print:text-black">Sale Complete!</h2>
              <p className="text-slate-400 font-myanmar text-sm print:text-gray-600">ရောင်းချမှု အောင်မြင်သည်</p>
            </div>

            <div className="border-t border-dashed border-slate-700 print:border-gray-300 pt-4 mb-4">
              <div className="text-center mb-3">
                <p className="text-lg font-bold text-white print:text-black">
                  {profile?.shop_name || 'My Shop'}
                </p>
                {profile?.shop_name_mm && (
                  <p className="text-sm font-myanmar text-slate-400 print:text-gray-600">{profile.shop_name_mm}</p>
                )}
                <p className="text-xs text-slate-500 print:text-gray-500 mt-1">
                  Receipt #{completedSale.sale.sale_number}
                </p>
                <p className="text-xs text-slate-500 print:text-gray-500">
                  {new Date(completedSale.sale.created_at).toLocaleString('my-MM')}
                </p>
              </div>

              {completedSale.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-slate-300 print:text-gray-700">
                    {item.product_name} × {item.qty}
                  </span>
                  <span className="text-slate-200 print:text-black font-medium">{fmt(item.subtotal)} ကျပ်</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-700 print:border-gray-300 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-slate-400 print:text-gray-600">
                <span>Subtotal</span>
                <span>{fmt(completedSale.sale.subtotal)} ကျပ်</span>
              </div>
              {completedSale.sale.discount > 0 && (
                <div className="flex justify-between text-sm text-danger-400">
                  <span>Discount</span>
                  <span>-{fmt(completedSale.sale.discount)} ကျပ်</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-white print:text-black pt-1 border-t border-slate-700 print:border-gray-300">
                <span>TOTAL</span>
                <span>{fmt(completedSale.sale.total)} ကျပ်</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 print:text-gray-500 pt-1">
                <span>Payment</span>
                <span className="capitalize">{completedSale.sale.payment_method.replace('_', ' ')}</span>
              </div>
              {completedSale.sale.transaction_id && (
                <div className="flex justify-between text-xs text-slate-400 print:text-gray-500">
                  <span>Txn ID</span>
                  <span>{completedSale.sale.transaction_id}</span>
                </div>
              )}
            </div>

            <p className="text-center text-xs font-myanmar text-slate-500 print:text-gray-500 mt-4">
              ကျေးဇူးတင်ပါသည်! ✦ Thank you!
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-center mt-6 no-print">
          <button onClick={printReceipt} className="btn-secondary flex items-center gap-2">
            <Printer size={16} />
            Print Receipt
          </button>
          <button onClick={newSale} className="btn-primary flex items-center gap-2">
            <ShoppingCart size={16} />
            New Sale
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">New Sale</h1>
        <p className="text-slate-400 font-myanmar text-sm mt-0.5">ရောင်းအားသစ် ထည့်သွင်းပါ</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Product Grid */}
        <div className="xl:col-span-2 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products / ကုန်ပစ္စည်းရှာပါ..."
              className="input-field pl-9"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-surface-100 border border-slate-800 rounded-xl p-3 text-left hover:border-primary-500/50 hover:bg-surface-200 transition-all duration-150 group"
              >
                <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-surface-200">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={28} className="text-slate-600" />
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-200 truncate">{product.name}</p>
                <p className="text-xs font-myanmar text-slate-500 truncate">{product.name_mm}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-accent-400">{fmt(product.selling_price)} ကျပ်</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${product.current_stock <= 5 ? 'bg-danger-600/20 text-danger-400' : 'bg-accent-500/10 text-accent-500'}`}>
                    {product.current_stock} {product.unit}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-primary-400" />
                Cart
                {cart.length > 0 && (
                  <span className="w-5 h-5 bg-primary-600 rounded-full text-xs flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </h2>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-danger-400 hover:text-danger-300">
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <ShoppingCart size={32} className="mb-2 opacity-30" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs font-myanmar">ကုန်ပစ္စည်း ရွေးချယ်ပါ</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-2 p-2 bg-surface-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{item.product.name}</p>
                      <p className="text-xs text-slate-500">{fmt(item.unit_price)} × {item.qty}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 bg-surface-300 hover:bg-surface-400 rounded flex items-center justify-center text-slate-300">
                        <Minus size={12} />
                      </button>
                      <span className="text-xs text-white w-5 text-center font-medium">{item.qty}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 bg-surface-300 hover:bg-surface-400 rounded flex items-center justify-center text-slate-300">
                        <Plus size={12} />
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-accent-400 w-16 text-right">{fmt(item.subtotal)}</p>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-slate-600 hover:text-danger-400">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-white">Order Summary</h3>
            <div>
              <label className="label text-xs">Customer Name (optional)</label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="ဖောက်သည်အမည်"
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="label text-xs">Discount (MMK)</label>
              <input
                type="number"
                value={discount || ''}
                onChange={e => setDiscount(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="input-field text-sm"
                min="0"
              />
            </div>

            <div className="space-y-1 text-sm border-t border-slate-700 pt-3">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{fmt(subtotal)} ကျပ်</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-danger-400">
                  <span>Discount</span>
                  <span>-{fmt(discount)} ကျပ်</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-white text-base pt-1">
                <span>TOTAL</span>
                <span className="text-accent-400">{fmt(total)} ကျပ်</span>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="label text-xs">Payment Method / ငွေပေးချေပုံ</label>
              <div className="grid grid-cols-2 gap-2">
                {payMethods.map(pm => (
                  <button
                    key={pm.id}
                    onClick={() => setPayMethod(pm.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      payMethod === pm.id
                        ? 'bg-primary-600 border-primary-500 text-white'
                        : 'bg-surface-200 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {pm.icon}
                    <span className="font-myanmar">{pm.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {payMethod !== 'cash' && (
              <div className="space-y-3">
                <div>
                  <label className="label text-xs">Transaction ID *</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={e => setTransactionId(e.target.value)}
                    placeholder="Transaction reference number"
                    className="input-field text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="label text-xs">Payment Proof / Receipt *</label>
                  <input
                    ref={receiptFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadReceipt(f); }}
                  />
                  <input
                    ref={receiptCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadReceipt(f); }}
                  />
                  {receiptPreview ? (
                    <div className="relative inline-block">
                      <img src={receiptPreview} alt="Payment receipt preview" className="h-28 w-28 rounded-lg object-cover border border-slate-600" />
                      {receiptUploading && (
                        <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        </div>
                      )}
                      {!receiptUploading && (
                        <button type="button" onClick={clearReceipt} className="absolute -top-2 -right-2 w-6 h-6 bg-danger-600 rounded-full flex items-center justify-center text-white hover:bg-danger-500 transition-colors shadow-lg">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button type="button" onClick={() => receiptFileRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-slate-600 hover:border-primary-500/50 hover:bg-primary-500/5 text-slate-400 hover:text-primary-400 text-xs font-medium transition-all">
                        <Upload size={15} /> Upload Screenshot
                      </button>
                      <button type="button" onClick={() => receiptCameraRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-slate-600 hover:border-accent-500/50 hover:bg-accent-500/5 text-slate-400 hover:text-accent-400 text-xs font-medium transition-all">
                        <Camera size={15} /> Take Photo
                      </button>
                    </div>
                  )}
                  {receiptUploading && <p className="text-slate-500 text-xs mt-1">Uploading receipt...</p>}
                </div>
              </div>
            )}

            <button
              onClick={processSale}
              disabled={cart.length === 0 || processing}
              className="btn-primary w-full py-3 text-base flex items-center justify-center gap-2"
            >
              {processing ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Processing...</>
              ) : (
                <><CheckCircle size={16} />Process Sale ({fmt(total)} ကျပ်)</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
