import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Clock, XCircle, Upload, Star, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { SubscriptionRequest } from '../types';

const PLANS = [
  {
    id: 'basic' as const,
    name: 'Basic Plan',
    nameMm: 'အခြေခံပက်ကေ့ဂျ်',
    price: 5000,
    period: '/month',
    color: 'border-primary-500',
    highlight: 'bg-primary-600',
    features: [
      'Up to 500 products',
      'Basic sales reports',
      'CSV export',
      'Email support',
    ],
    featuresMm: [
      'ကုန်ပစ္စည်း ၅၀၀ ခုအထိ',
      'အခြေခံ ရောင်းအားစာရင်း',
      'CSV ထုတ်ယူမှု',
      'အီးမေးလ် ပံ့ပိုးမှု',
    ],
  },
  {
    id: 'premium' as const,
    name: 'Premium Plan',
    nameMm: 'ပရီမီယာပက်ကေ့ဂျ်',
    price: 15000,
    period: '/month',
    color: 'border-amber-500',
    highlight: 'bg-amber-500',
    features: [
      'Unlimited products',
      'Advanced analytics',
      'Multi-user support',
      'Priority support 24/7',
      'Barcode scanning',
      'Custom shop branding',
    ],
    featuresMm: [
      'ကုန်ပစ္စည်း အကန့်အသတ်မရှိ',
      'အဆင့်မြင့် ခွဲခြမ်းစိတ်ဖြာမှု',
      'အသုံးပြုသူ အများစုနှင့် တွဲသုံးနိုင်',
      'နေ့ပတ်လုံး ပံ့ပိုးမှု',
      'ဘားကုတ် စကန်',
      'ဆိုင်ကိုယ်ပိုင် ဒီဇိုင်း',
    ],
  },
];

export default function Subscription() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | null>(null);
  const [payMethod, setPayMethod] = useState<'kpay' | 'wave'>('kpay');
  const [transactionId, setTransactionId] = useState('');
  const [slip, setSlip] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { loadRequests(); }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    const { data } = await supabase.from('subscription_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setRequests((data || []) as SubscriptionRequest[]);
  };

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlip(file);
    const reader = new FileReader();
    reader.onload = ev => setSlipPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !user) return;
    setSubmitting(true);

    let slipUrl = '';
    if (slip) {
      const fileName = `slips/${user.id}/${Date.now()}_${slip.name}`;
      const { data: uploadData } = await supabase.storage.from('subscription-slips').upload(fileName, slip, { upsert: true });
      if (uploadData) {
        const { data: { publicUrl } } = supabase.storage.from('subscription-slips').getPublicUrl(fileName);
        slipUrl = publicUrl;
      }
    }

    const plan = PLANS.find(p => p.id === selectedPlan)!;
    const { error: insertError } = await supabase.from('subscription_requests').insert({
      user_id: user.id,
      user_email: user.email,
      plan: selectedPlan,
      payment_method: payMethod,
      transaction_id: transactionId,
      transaction_slip_url: slipUrl,
      amount: plan.price,
      status: 'pending',
    });

    if (insertError) {
      console.error('Failed to submit request:', insertError);
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setTransactionId('');
    setSlip(null);
    setSlipPreview('');
    setSelectedPlan(null);
    setSubmitting(false);
    await loadRequests();
    setTimeout(() => setSubmitted(false), 5000);
  };

  const fmt = (n: number) => new Intl.NumberFormat('my-MM').format(n);

  const statusBadge = (status: string) => {
    if (status === 'approved') return <span className="badge-success">Approved</span>;
    if (status === 'rejected') return <span className="badge-danger">Rejected</span>;
    return <span className="badge-warning">Pending Review</span>;
  };

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Subscription</h1>
        <p className="text-slate-400 font-myanmar text-sm mt-0.5">အသင်းဝင်ကြေးပေးချေမှု</p>
      </div>

      {/* Current Plan */}
      <div className="card mb-6 border-primary-600/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
            <CreditCard size={20} className="text-primary-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Current Plan</p>
            <p className="text-lg font-bold text-white capitalize">{profile?.subscription_plan || 'Free'} Plan</p>
          </div>
          {profile?.subscription_plan === 'premium' && (
            <div className="ml-auto flex items-center gap-1 text-amber-400">
              <Star size={16} fill="currentColor" />
              <span className="text-sm font-medium">Premium Active</span>
            </div>
          )}
        </div>
      </div>

      {submitted && (
        <div className="flex items-center gap-3 p-4 bg-accent-500/10 border border-accent-500/30 rounded-xl mb-6 animate-fade-in">
          <CheckCircle size={18} className="text-accent-400" />
          <div>
            <p className="text-accent-400 font-medium">Subscription request submitted!</p>
            <p className="text-accent-400/70 text-sm font-myanmar">လျှောက်ထားမှု ပေးပို့ပြီးပါပြီ — ငွေပေးချေမှု စစ်ဆေးပြီးနောက် အတည်ပြုပေးပါမည်</p>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {PLANS.map(plan => (
          <div
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`card cursor-pointer border-2 transition-all duration-200 ${
              selectedPlan === plan.id ? plan.color + ' scale-[1.01]' : 'border-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {plan.id === 'premium' && <Zap size={16} className="text-amber-400" />}
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                </div>
                <p className="text-sm font-myanmar text-slate-400">{plan.nameMm}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">{fmt(plan.price)} ကျပ်</p>
                <p className="text-xs text-slate-500">{plan.period}</p>
              </div>
            </div>
            <ul className="space-y-2">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle size={14} className="text-accent-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-300">{f}</span>
                    <p className="text-xs font-myanmar text-slate-500">{plan.featuresMm[i]}</p>
                  </div>
                </li>
              ))}
            </ul>
            {selectedPlan === plan.id && (
              <div className={`mt-4 py-2 rounded-lg text-center text-sm font-semibold text-white ${plan.highlight}`}>
                Selected ✓
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Payment Form */}
      {selectedPlan && (
        <div className="card mb-8 border-primary-600/20 animate-slide-up">
          <h3 className="text-base font-semibold text-white mb-4">Payment / ငွေပေးချေမှု</h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Payment Method */}
            <div>
              <label className="label">Payment Method / ငွေပေးချေနည်း</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'kpay' as const, label: 'KBZ Pay', img: '/assets/payment-methods/Kpay.jpg' },
                  { id: 'wave' as const, label: 'Wave Money', img: '/assets/payment-methods/Wave.jpg' },
                ].map(pm => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPayMethod(pm.id)}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      payMethod === pm.id ? (pm.id === 'kpay' ? 'border-blue-500 bg-blue-500/10' : 'border-yellow-400 bg-yellow-400/10') : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <img src={pm.img} alt={pm.label} className="h-16 w-full object-contain rounded-lg" />
                      <span className={`text-sm font-medium ${payMethod === pm.id ? (pm.id === 'kpay' ? 'text-blue-400' : 'text-yellow-400') : 'text-slate-400'}`}>
                        {pm.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className={`rounded-2xl overflow-hidden border-4 ${payMethod === 'kpay' ? 'border-blue-600' : 'border-yellow-400'}`}>
                <img
                  src={payMethod === 'kpay' ? '/assets/payment-methods/Kpay.jpg' : '/assets/payment-methods/Wave.jpg'}
                  alt={`${payMethod} QR Code`}
                  className="w-64 h-auto"
                />
              </div>
            </div>

            <div className="text-center p-3 bg-surface-200 rounded-lg">
              <p className="text-sm font-myanmar text-slate-400">
                {payMethod === 'kpay' ? 'KBZ Pay' : 'Wave Money'} ဖြင့် {fmt(PLANS.find(p => p.id === selectedPlan)!.price)} ကျပ် ပေးချေပြီး
              </p>
              <p className="text-sm font-myanmar text-slate-300 mt-1">
                Transaction ID နှင့် ငွေပေးချေမှု စလစ် တင်ပေးပါ
              </p>
            </div>

            <div>
              <label className="label">Transaction ID *</label>
              <input
                type="text"
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
                placeholder="e.g. TXN123456789"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="label">Upload Payment Slip / ငွေပေးချေမှု စလစ်</label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-primary-500 transition-colors bg-surface-200">
                {slipPreview ? (
                  <img src={slipPreview} alt="Slip preview" className="h-full w-full object-contain rounded-xl" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Upload size={24} />
                    <p className="text-sm">Click to upload slip</p>
                    <p className="text-xs font-myanmar">ငွေပေးချေမှု စကရင်ရှော့ တင်ပေးပါ</p>
                  </div>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleSlipChange} />
              </label>
            </div>

            <button type="submit" disabled={submitting || !transactionId.trim()} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              {submitting ? (
                <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Submitting...</>
              ) : (
                <><CreditCard size={16} />Submit for Approval / အတည်ပြုရန် ပေးပို့မည်</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Request History */}
      {requests.length > 0 && (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4">Subscription Requests History</h3>
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-surface-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-200 capitalize">
                    {req.plan} Plan — {req.payment_method === 'kpay' ? 'KBZ Pay' : 'Wave Money'}
                  </p>
                  <p className="text-xs text-slate-500">{new Date(req.created_at).toLocaleDateString('my-MM')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-400">{fmt(req.amount)} ကျပ်</p>
                  <div className="mt-1">{statusBadge(req.status)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
