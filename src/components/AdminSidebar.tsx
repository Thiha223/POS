import React, { useState } from 'react';
import {
  LayoutDashboard, Store, Users, Settings, LogOut, Menu, X, Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AdminPage } from '../types';

interface AdminSidebarProps {
  currentPage: AdminPage;
  onNavigate: (page: AdminPage) => void;
}

const adminNavItems: { page: AdminPage; label: string; icon: React.ReactNode }[] = [
  { page: 'admin-dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { page: 'admin-shops', label: 'Shops Overview', icon: <Store size={18} /> },
  { page: 'admin-users', label: 'User Management', icon: <Users size={18} /> },
  { page: 'admin-customers', label: 'Global Customers', icon: <Users size={18} /> },
  { page: 'admin-settings', label: 'System Settings', icon: <Settings size={18} /> },
];

export default function AdminSidebar({ currentPage, onNavigate }: AdminSidebarProps) {
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Admin Branding */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Shield size={20} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">Super Admin</p>
            <span className="text-xs px-1.5 py-0.5 rounded font-medium inline-block bg-amber-500/20 text-amber-400">
              MASTER PANEL
            </span>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {adminNavItems.map(({ page, label, icon }) => {
          const active = currentPage === page;
          return (
            <button
              key={page}
              onClick={() => { onNavigate(page); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                active
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                  : 'text-slate-400 hover:bg-surface-200 hover:text-slate-100'
              }`}
            >
              <span className={active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}>
                {icon}
              </span>
              <span>{label}</span>
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
