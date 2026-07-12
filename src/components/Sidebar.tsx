import React, { useState } from 'react';
import {
  LayoutDashboard, ShoppingCart, History, PackagePlus, Package,
  BarChart2, TruckIcon, CreditCard, Settings, LogOut, Menu, X, Store, Shield, Users, Wallet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { Page } from '../types';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const baseNavItems: { page: Page; label: string; labelMm: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { page: 'dashboard', label: 'Dashboard', labelMm: 'ပင်မစာမျက်နှာ', icon: <LayoutDashboard size={18} /> },
  { page: 'new-sale', label: 'New Sale', labelMm: 'ရောင်းအားသစ်', icon: <ShoppingCart size={18} /> },
  { page: 'sales-history', label: 'Sales History', labelMm: 'ရောင်းအားမှတ်တမ်း', icon: <History size={18} /> },
  { page: 'add-product', label: 'Add Product', labelMm: 'ကုန်ပစ္စည်းထည့်', icon: <PackagePlus size={18} /> },
  { page: 'products', label: 'Products', labelMm: 'ကုန်ပစ္စည်းများ', icon: <Package size={18} /> },
  { page: 'inventory', label: 'Inventory', labelMm: 'ကုန်ပစ္စည်းစာရင်း', icon: <BarChart2 size={18} /> },
  { page: 'purchases', label: 'Purchases', labelMm: 'ဝယ်ယူမှုများ', icon: <TruckIcon size={18} /> },
  { page: 'customers', label: 'Customers', labelMm: 'ဖောက်သည်များ', icon: <Users size={18} /> },
  { page: 'financial', label: 'Financial', labelMm: 'ဘဏ္ဍာရေး', icon: <Wallet size={18} /> },
  { page: 'subscription', label: 'Subscription', labelMm: 'အသင်းဝင်ကြေး', icon: <CreditCard size={18} /> },
  { page: 'settings', label: 'Settings', labelMm: 'ဆက်တင်များ', icon: <Settings size={18} /> },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { signOut } = useAuth();
  const { profile, isAdmin } = useProfile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = baseNavItems.filter(item => !item.adminOnly || isAdmin);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Shop Branding */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {profile?.logo_url ? (
            <img
              src={profile.logo_url}
              alt="Shop Logo"
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-primary-500/30"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-600/30 flex items-center justify-center">
              <Store size={20} className="text-primary-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">
              {profile?.shop_name || 'My Shop'}
            </p>
            {profile?.shop_name_mm && (
              <p className="text-xs font-myanmar text-slate-400 truncate">{profile.shop_name_mm}</p>
            )}
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block ${
              profile?.subscription_plan === 'premium'
                ? 'bg-amber-500/20 text-amber-400'
                : profile?.subscription_plan === 'basic'
                ? 'bg-primary-600/20 text-primary-400'
                : 'bg-slate-700 text-slate-400'
            }`}>
              {profile?.subscription_plan?.toUpperCase() || 'FREE'}
            </span>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(({ page, label, labelMm, icon }) => {
          const active = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => { onNavigate(page); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                active
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                  : 'text-slate-400 hover:bg-surface-200 hover:text-slate-100'
              }`}
            >
              <span className={active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}>
                {icon}
              </span>
              <span className="flex flex-col items-start leading-none">
                <span>{label}</span>
                <span className={`text-xs font-myanmar mt-0.5 ${active ? 'text-blue-200' : 'text-slate-500'}`}>
                  {labelMm}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-danger-600/10 hover:text-danger-400 transition-all duration-150"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex flex-col w-64 bg-surface-50 border-r border-slate-800 fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Menu Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-surface-100 border border-slate-800 rounded-lg text-slate-300"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-surface-50 border-r border-slate-800 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
