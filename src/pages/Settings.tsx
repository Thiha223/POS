import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Upload, Store, User, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { getPlanLimits } from '../lib/planLimits';
import UpgradeAlert from '../components/UpgradeAlert';
import { Page } from '../types';

export default function Settings({ onNavigate }: { onNavigate?: (p: Page) => void }) {
  const { user } = useAuth();
  const { profile, updateProfile, refreshProfile } = useProfile();
  const plan = profile?.subscription_plan ?? 'free';
  const limits = getPlanLimits(plan);
  const [shopName, setShopName] = useState('');
  const [shopNameMm, setShopNameMm] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setShopName(profile.shop_name || '');
      setShopNameMm(profile.shop_name_mm || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
      setLogoPreview(profile.logo_url || '');
    }
  }, [profile]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) { setError('Shop name is required'); return; }
    setError('');
    setSaving(true);

    let logoUrl = profile?.logo_url || '';

    if (logoFile && user) {
      const ext = logoFile.name.split('.').pop();
      const fileName = `logos/${user.id}/logo.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('shop-logos')
        .upload(fileName, logoFile, { upsert: true });
      if (!uploadErr) {
        const { data: { publicUrl } } = supabase.storage.from('shop-logos').getPublicUrl(fileName);
        logoUrl = publicUrl;
      }
    }

    const { error: err } = await updateProfile({
      shop_name: shopName.trim(),
      shop_name_mm: shopNameMm.trim(),
      phone: phone.trim(),
      address: address.trim(),
      logo_url: logoUrl,
    });

    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      setLogoFile(null);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 font-myanmar text-sm mt-0.5">ဆိုင်အချက်အလက်စီမံခန့်ခွဲမှု</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 bg-accent-500/10 border border-accent-500/30 rounded-xl mb-4 animate-fade-in">
          <CheckCircle size={18} className="text-accent-400" />
          <div>
            <p className="text-accent-400 font-medium">Settings saved!</p>
            <p className="text-accent-400/70 text-xs font-myanmar">ဆက်တင်များ သိမ်းဆည်းပြီးပါပြီ</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-danger-600/10 border border-danger-600/30 rounded-xl mb-4">
          <AlertCircle size={16} className="text-danger-400" />
          <p className="text-danger-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Shop Logo */}
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Store size={18} className="text-primary-400" />
            Shop Branding / ဆိုင်တံဆိပ်
            {!limits.customBranding && (
              <span className="ml-auto flex items-center gap-1 text-xs text-amber-400">
                <Lock size={11} /> Premium
              </span>
            )}
          </h2>
          {!limits.customBranding && (
            <UpgradeAlert
              message="Custom shop branding is locked on the Free plan."
              messageMm="ဆိုင်တံဆိပ် စိတ်ကြိုက်ပြင်ဆင်ခွင့်ကို အဆင့်မြှင့်တင်ပါ။"
              onNavigate={onNavigate}
            />
          )}
          <div className={`flex items-start gap-6 ${!limits.customBranding ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="shrink-0">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Shop logo"
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-primary-500/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-surface-300 border-2 border-dashed border-slate-600 flex items-center justify-center">
                  <Store size={28} className="text-slate-500" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              <label className="flex items-center gap-2 px-4 py-2 bg-surface-200 border border-slate-700 rounded-lg cursor-pointer hover:border-primary-500 transition-colors w-fit text-sm text-slate-300">
                <Upload size={14} />
                Upload Logo
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} disabled={!limits.customBranding} />
              </label>
              <div>
                <label className="label">Shop Name (English) *</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  placeholder="e.g. Ko Ko General Store"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">ဆိုင်အမည် (မြန်မာ)</label>
                <input
                  type="text"
                  value={shopNameMm}
                  onChange={e => setShopNameMm(e.target.value)}
                  placeholder="e.g. ကိုကို ကုန်စုံဆိုင်"
                  className="input-field font-myanmar"
                  disabled={!limits.customBranding}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="card">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <User size={18} className="text-primary-400" />
            Contact Information / ဆက်သွယ်ရန်
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Phone Number / ဖုန်းနံပါတ်</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="09-XXXXXXXXX"
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Address / လိပ်စာ</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="ဆိုင်လိပ်စာ"
                className="input-field font-myanmar"
              />
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="card bg-surface-200/50">
          <h2 className="text-sm font-medium text-slate-400 mb-3">Account Info</h2>
          <div className="flex items-center gap-3 p-3 bg-surface-300 rounded-lg">
            <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
              <User size={18} className="text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{user?.email}</p>
              <p className="text-xs text-slate-500 font-myanmar">
                Subscription: <span className="text-primary-400 capitalize">{profile?.subscription_plan || 'Free'}</span>
              </p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 px-8 py-3">
          {saving ? (
            <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving...</>
          ) : (
            <><Save size={16} />Save Settings</>
          )}
        </button>
      </form>
    </div>
  );
}
