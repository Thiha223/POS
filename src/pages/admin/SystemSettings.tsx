import React, { useState, useEffect } from 'react';
import {
  Settings, RefreshCw, Database, Shield, Users, Store,
  CheckCircle, AlertTriangle, Server, HardDrive
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../contexts/ProfileContext';

interface SystemHealth {
  database: 'healthy' | 'unhealthy';
  tables: number;
  totalRecords: number;
  lastChecked: string;
}

export default function SystemSettings() {
  const { isAdmin } = useProfile();
  const [health, setHealth] = useState<SystemHealth>({
    database: 'healthy',
    tables: 0,
    totalRecords: 0,
    lastChecked: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) checkSystemHealth();
  }, [isAdmin]);

  const checkSystemHealth = async () => {
    setLoading(true);

    try {
      // Check database connectivity and get table info
      const tables = ['profiles', 'products', 'sales', 'sale_items', 'purchases', 'customers', 'subscription_requests', 'inventory_opening'];

      let totalRecords = 0;
      let databaseStatus: 'healthy' | 'unhealthy' = 'healthy';

      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('id', { count: 'exact', head: true });

          if (error) {
            databaseStatus = 'unhealthy';
          } else {
            totalRecords += count || 0;
          }
        } catch {
          databaseStatus = 'unhealthy';
        }
      }

      setHealth({
        database: databaseStatus,
        tables: tables.length,
        totalRecords,
        lastChecked: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to check system health:', error);
      setHealth(prev => ({
        ...prev,
        database: 'unhealthy',
        lastChecked: new Date().toISOString(),
      }));
    }

    setLoading(false);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-500">
        <Shield size={48} className="mb-4 opacity-30" />
        <p className="text-lg">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-600/20 border border-slate-600/30 flex items-center justify-center">
            <Settings size={22} className="text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">System Settings</h1>
            <p className="text-slate-400 text-sm">System health and configuration</p>
          </div>
        </div>
        <button onClick={checkSystemHealth} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Database Health */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              health.database === 'healthy'
                ? 'bg-accent-600/20'
                : 'bg-danger-600/20'
            }`}>
              {health.database === 'healthy' ? (
                <CheckCircle size={20} className="text-accent-400" />
              ) : (
                <AlertTriangle size={20} className="text-danger-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Database Status</h2>
              <p className="text-xs text-slate-400">Connection and table health</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-slate-500" />
                <span className="text-slate-300">Connection Status</span>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium ${
                health.database === 'healthy'
                  ? 'bg-accent-600/20 text-accent-400'
                  : 'bg-danger-600/20 text-danger-400'
              }`}>
                {health.database === 'healthy' ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <Server size={16} className="text-slate-500" />
                <span className="text-slate-300">Active Tables</span>
              </div>
              <span className="text-xl font-bold text-white">{health.tables}</span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <HardDrive size={16} className="text-slate-500" />
                <span className="text-slate-300">Total Records</span>
              </div>
              <span className="text-xl font-bold text-white">
                {new Intl.NumberFormat('my-MM').format(health.totalRecords)}
              </span>
            </div>

            {health.lastChecked && (
              <p className="text-xs text-slate-500 mt-4">
                Last checked: {new Date(health.lastChecked).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center">
              <Settings size={20} className="text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
              <p className="text-xs text-slate-400">System management tools</p>
            </div>
          </div>

          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-4 bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-slate-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <Users size={18} className="text-slate-400" />
                <span className="text-slate-200">Manage Users</span>
              </div>
              <span className="text-xs text-slate-500">Admin Panel</span>
            </button>

            <button className="w-full flex items-center justify-between p-4 bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-slate-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <Store size={18} className="text-slate-400" />
                <span className="text-slate-200">Monitor Shops</span>
              </div>
              <span className="text-xs text-slate-500">Dashboard</span>
            </button>

            <button className="w-full flex items-center justify-between p-4 bg-surface-200/30 hover:bg-surface-200/50 rounded-xl border border-slate-700/50 transition-colors">
              <div className="flex items-center gap-3">
                <Shield size={18} className="text-slate-400" />
                <span className="text-slate-200">Security Settings</span>
              </div>
              <span className="text-xs text-slate-500">Configure</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">System Information</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface-200/50 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Version</p>
            <p className="text-lg font-bold text-white">1.0.0</p>
          </div>
          <div className="bg-surface-200/50 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Environment</p>
            <p className="text-lg font-bold text-white">Production</p>
          </div>
          <div className="bg-surface-200/50 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Database</p>
            <p className="text-lg font-bold text-white">PostgreSQL</p>
          </div>
          <div className="bg-surface-200/50 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Backend</p>
            <p className="text-lg font-bold text-white">Supabase</p>
          </div>
        </div>
      </div>
    </div>
  );
}
