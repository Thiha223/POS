import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProfileProvider, useProfile } from './contexts/ProfileContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import NewSale from './pages/NewSale';
import SalesHistory from './pages/SalesHistory';
import AddProduct from './pages/AddProduct';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import Customers from './pages/Customers';
import Financial from './pages/Financial';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';
import SuperAdminDashboard from './pages/admin/SuperAdminDashboard';
import ShopsOverview from './pages/admin/ShopsOverview';
import AdminUserManagement from './pages/admin/AdminUserManagement';
import GlobalCustomersList from './pages/admin/GlobalCustomersList';
import SystemSettings from './pages/admin/SystemSettings';
import { Page, AdminPage } from './types';

function AppInner() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: profileLoading } = useProfile();
  const [currentPage, setCurrentPage] = useState<Page | AdminPage>('dashboard');

  // Admin redirect: If user is admin, redirect to admin dashboard
  useEffect(() => {
    if (!profileLoading && isAdmin && (currentPage === 'dashboard' || currentPage === 'admin')) {
      setCurrentPage('admin-dashboard');
    }
  }, [isAdmin, profileLoading, currentPage]);

  // RBAC route guard: redirect non-admins away from admin pages
  useEffect(() => {
    const adminPages: (Page | AdminPage)[] = ['admin-dashboard', 'admin-shops', 'admin-users', 'admin-customers', 'admin-settings'];
    if (adminPages.includes(currentPage) && !isAdmin && !profileLoading) {
      setCurrentPage('dashboard');
    }
  }, [currentPage, isAdmin, profileLoading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-DEFAULT flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-600/20 border border-primary-600/30 flex items-center justify-center">
            <svg className="animate-spin h-7 w-7 text-primary-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-slate-300 font-medium">ဈေးဆိုင်စာရင်း</p>
            <p className="text-slate-500 text-sm mt-1">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const renderPage = () => {
    // Admin pages
    if (isAdmin) {
      switch (currentPage) {
        case 'admin-dashboard': return <SuperAdminDashboard />;
        case 'admin-shops': return <ShopsOverview />;
        case 'admin-users': return <AdminUserManagement />;
        case 'admin-customers': return <GlobalCustomersList />;
        case 'admin-settings': return <SystemSettings />;
        default: return <SuperAdminDashboard />;
      }
    }

    // User pages
    switch (currentPage) {
      case 'dashboard': return <Dashboard onNavigate={setCurrentPage} />;
      case 'new-sale': return <NewSale />;
      case 'sales-history': return <SalesHistory onNavigate={setCurrentPage} />;
      case 'add-product': return <AddProduct onNavigate={setCurrentPage} />;
      case 'products': return <Products onNavigate={setCurrentPage} />;
      case 'inventory': return <Inventory onNavigate={setCurrentPage} />;
      case 'purchases': return <Purchases />;
      case 'customers': return <Customers onNavigate={setCurrentPage} />;
      case 'financial': return <Financial onNavigate={setCurrentPage} />;
      case 'subscription': return <Subscription />;
      case 'settings': return <Settings onNavigate={setCurrentPage} />;
      default: return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <AppInner />
      </ProfileProvider>
    </AuthProvider>
  );
}
