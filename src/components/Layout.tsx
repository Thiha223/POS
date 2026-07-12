import React from 'react';
import Sidebar from './Sidebar';
import AdminSidebar from './AdminSidebar';
import { Page, AdminPage } from '../types';
import { useProfile } from '../contexts/ProfileContext';

interface LayoutProps {
  currentPage: Page | AdminPage;
  onNavigate: (page: Page | AdminPage) => void;
  children: React.ReactNode;
}

export default function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { isAdmin } = useProfile();

  return (
    <div className="min-h-screen bg-surface-DEFAULT">
      {isAdmin ? (
        <AdminSidebar currentPage={currentPage as AdminPage} onNavigate={onNavigate as (page: AdminPage) => void} />
      ) : (
        <Sidebar currentPage={currentPage as Page} onNavigate={onNavigate as (page: Page) => void} />
      )}
      <main className="lg:ml-64 min-h-screen">
        <div className="pt-16 lg:pt-0 px-4 lg:px-6 py-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
