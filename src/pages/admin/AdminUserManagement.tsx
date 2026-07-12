import React, { useState, useEffect } from 'react';
import {
  Users, RefreshCw, ChevronDown, ChevronRight, CheckCircle, Clock,
  Shield, XCircle, Store, Mail, Edit3, Save, User, Crown, Trash2,
  UserCheck, UserX, Phone, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useProfile } from '../../contexts/ProfileContext';
import { Profile, SubscriptionRequest, Customer } from '../../types';
import ShopDataModal from '../../components/ShopDataModal';
import { exportToCsv } from '../../lib/exportCsv';

interface ShopWithRequest extends Profile {
  latest_request?: SubscriptionRequest;
}

interface EditFormData {
  id: string;
  user_id: string;
  full_name: string;
  shop_name: string;
  email: string;
  role: 'admin' | 'user';
  subscription_plan: 'free' | 'basic' | 'premium';
  status: 'active' | 'inactive';
}

export default function AdminUserManagement() {
  const { isAdmin } = useProfile();
  const [shops, setShops] = useState<ShopWithRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShop, setEditingShop] = useState<EditFormData | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showShopDataModal, setShowShopDataModal] = useState<Profile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    if (isAdmin) loadShops();
  }, [isAdmin]);

  const loadShops = async () => {
    setLoading(true);

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: requestsData } = await supabase
      .from('subscription_requests')
      .select('*')
      .order('created_at', { ascending: false });

    const requestMap: Record<string, SubscriptionRequest> = {};
    (requestsData || []).forEach(r => {
      if (!requestMap[r.user_id]) requestMap[r.user_id] = r;
    });

    const combined: ShopWithRequest[] = (profilesData || []).map(p => ({
      ...p,
      latest_request: requestMap[p.user_id],
    }));

    setShops(combined);
    setLoading(false);
  };

  const toggleUserStatus = async (shop: ShopWithRequest) => {
    const newStatus = shop.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase
      .from('profiles')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', shop.id);

    if (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update user status');
    } else {
      setShops(prev => prev.map(s =>
        s.id === shop.id ? { ...s, status: newStatus as 'active' | 'inactive' } : s
      ));
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingUser(true);

    const { data, error } = await supabase.rpc('admin_delete_user', {
      target_user_id: userId
    });

    if (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user: ' + error.message);
    } else if (data?.success === false) {
      alert(data.error || 'Failed to delete user');
    } else {
      setShops(prev => prev.filter(s => s.user_id !== userId));
      setShowDeleteConfirm(null);
    }

    setDeletingUser(false);
  };

  const handleApprove = async (request: SubscriptionRequest) => {
    if (!confirm(`Approve ${request.plan} plan for this shop?`)) return;
    setProcessing(request.id);

    const { error: reqError } = await supabase
      .from('subscription_requests')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', request.id);

    if (reqError) {
      console.error('Failed to approve request:', reqError);
      setProcessing(null);
      return;
    }

    await supabase
      .from('profiles')
      .update({ subscription_plan: request.plan, updated_at: new Date().toISOString() })
      .eq('user_id', request.user_id);

    await loadShops();
    setProcessing(null);
  };

  const handleReject = async (request: SubscriptionRequest) => {
    if (!confirm('Reject this subscription request?')) return;
    setProcessing(request.id);

    await supabase
      .from('subscription_requests')
      .update({ status: 'rejected' })
      .eq('id', request.id);

    await loadShops();
    setProcessing(null);
  };

  const [originalEmail, setOriginalEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const openEditModal = async (shop: ShopWithRequest) => {
    const fallback = shop.latest_request?.user_email || '';
    setEditingShop({
      id: shop.id,
      user_id: shop.user_id,
      full_name: shop.full_name || '',
      shop_name: shop.shop_name || '',
      email: fallback,
      role: shop.role || 'user',
      subscription_plan: shop.subscription_plan || 'free',
      status: shop.status || 'active',
    });
    setOriginalEmail(fallback);
    setShowEditModal(true);

    // Fetch the real email from auth.users via admin RPC
    setEmailLoading(true);
    const { data, error } = await supabase.rpc('admin_get_user_email', {
      target_user_id: shop.user_id,
    });
    setEmailLoading(false);
    if (!error && data) {
      setEditingShop(prev => prev ? { ...prev, email: data as string } : null);
      setOriginalEmail(data as string);
    }
  };

  const handleEditChange = (field: keyof EditFormData, value: string) => {
    if (!editingShop) return;
    setEditingShop(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSaveEdit = async () => {
    if (!editingShop) return;
    setSavingEdit(true);

    // Update email in auth.users if it changed
    if (editingShop.email.trim() && editingShop.email.trim() !== originalEmail) {
      const { error: emailError } = await supabase.rpc('admin_update_user_email', {
        target_user_id: editingShop.user_id,
        new_email: editingShop.email.trim(),
      });
      if (emailError) {
        alert('Failed to update email: ' + emailError.message);
        setSavingEdit(false);
        return;
      }
      setOriginalEmail(editingShop.email.trim());
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editingShop.full_name,
        shop_name: editingShop.shop_name,
        role: editingShop.role,
        subscription_plan: editingShop.subscription_plan,
        status: editingShop.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingShop.id);

    if (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update user. Please try again.');
      setSavingEdit(false);
      return;
    }

    setShops(prev => prev.map(shop => {
      if (shop.id === editingShop.id) {
        return {
          ...shop,
          full_name: editingShop.full_name,
          shop_name: editingShop.shop_name,
          role: editingShop.role,
          subscription_plan: editingShop.subscription_plan,
          status: editingShop.status as 'active' | 'inactive',
        };
      }
      return shop;
    }));

    setShowEditModal(false);
    setEditingShop(null);
    setSavingEdit(false);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingShop(null);
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString('my-MM');

  const statusBadge = (status?: string) => {
    if (!status) return <span className="text-slate-500 text-xs">No requests</span>;
    if (status === 'approved') return <span className="badge-success">Approved</span>;
    if (status === 'rejected') return <span className="badge-danger">Rejected</span>;
    return <span className="badge-warning">Pending</span>;
  };

  const planBadge = (plan: string) => {
    if (plan === 'premium') return <span className="badge-warning text-amber-300">Premium</span>;
    if (plan === 'basic') return <span className="badge-info">Basic</span>;
    return <span className="text-xs text-slate-500">Free</span>;
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary-600/20 border border-primary-600/30 flex items-center justify-center">
            <Users size={22} className="text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">User Management</h1>
            <p className="text-slate-400 font-myanmar text-sm">အသုံးပြုသူများ စီမံခန့်ခွဲခြင်း</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadShops} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => exportToCsv(`users-${new Date().toISOString().slice(0, 10)}`, [
              { header: 'User Name', accessor: r => r.full_name || r.shop_name || '' },
              { header: 'Shop Name', accessor: r => r.shop_name || '' },
              { header: 'Shop Name (Myanmar)', accessor: r => r.shop_name_mm || '' },
              { header: 'Email', accessor: r => r.user_id || '' },
              { header: 'Phone', accessor: r => r.phone || '' },
              { header: 'Role', accessor: r => r.role || 'user' },
              { header: 'Subscription Plan', accessor: r => r.subscription_plan || 'free' },
              { header: 'Status', accessor: r => r.status === 'active' || !r.status ? 'Active' : 'Inactive' },
              { header: 'Join Date', accessor: r => r.created_at ? new Date(r.created_at).toLocaleDateString() : '' },
            ], shops)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-accent-600/15 border border-accent-600/40 text-accent-300 hover:bg-accent-600/25 hover:border-accent-500 transition-all"
          >
            <Download size={16} />
            Export Users
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="card py-5 border-l-4 border-l-primary-500">
          <div className="flex items-center gap-3 mb-2">
            <Users size={18} className="text-primary-400" />
            <span className="text-sm text-slate-400">Total Users</span>
          </div>
          <p className="text-3xl font-bold text-white">{shops.length}</p>
        </div>
        <div className="card py-5 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3 mb-2">
            <Clock size={18} className="text-amber-400" />
            <span className="text-sm text-slate-400">Pending Approvals</span>
          </div>
          <p className="text-3xl font-bold text-amber-400">{shops.filter(s => s.latest_request?.status === 'pending').length}</p>
        </div>
        <div className="card py-5 border-l-4 border-l-accent-500">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle size={18} className="text-accent-400" />
            <span className="text-sm text-slate-400">Paid Subscriptions</span>
          </div>
          <p className="text-3xl font-bold text-accent-400">{shops.filter(s => s.subscription_plan === 'basic' || s.subscription_plan === 'premium').length}</p>
        </div>
        <div className="card py-5 border-l-4 border-l-slate-500">
          <div className="flex items-center gap-3 mb-2">
            <UserX size={18} className="text-slate-400" />
            <span className="text-sm text-slate-400">Inactive Users</span>
          </div>
          <p className="text-3xl font-bold text-slate-400">{shops.filter(s => s.status === 'inactive').length}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <h2 className="text-base font-semibold text-white mb-4">All Users / အသုံးပြုသူများ</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Store size={32} className="mb-2 opacity-30" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full">
              <thead className="bg-surface-200/50">
                <tr>
                  <th className="table-th pl-6">Shop/User</th>
                  <th className="table-th">Email</th>
                  <th className="table-th text-center">Role</th>
                  <th className="table-th text-center">Plan</th>
                  <th className="table-th text-center">Status</th>
                  <th className="table-th text-center">Request</th>
                  <th className="table-th text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {shops.map(shop => {
                  const req = shop.latest_request;
                  const isExpanded = expanded === shop.id;

                  return (
                    <React.Fragment key={shop.id}>
                      <tr className="hover:bg-surface-200/30 transition-colors">
                        <td className="table-td pl-6">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setExpanded(isExpanded ? null : shop.id)}
                              className="text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            <div>
                              <p className="font-medium text-slate-200">{shop.shop_name || shop.full_name || 'Unknown'}</p>
                              {(shop.shop_name_mm || shop.full_name) && (
                                <p className="text-xs font-myanmar text-slate-500">{shop.shop_name_mm || shop.full_name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="table-td">
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className="text-slate-500" />
                            <span className="text-sm text-slate-400">{req?.user_email || '—'}</span>
                          </div>
                        </td>
                        <td className="table-td text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                            shop.role === 'admin'
                              ? 'bg-amber-600/20 text-amber-400'
                              : 'bg-surface-200 text-slate-400'
                          }`}>
                            {shop.role === 'admin' ? <Shield size={12} className="mr-1" /> : <User size={12} className="mr-1" />}
                            {shop.role || 'user'}
                          </span>
                        </td>
                        <td className="table-td text-center">{planBadge(shop.subscription_plan)}</td>
                        <td className="table-td text-center">
                          <button
                            onClick={() => toggleUserStatus(shop)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                              shop.status === 'active' || !shop.status
                                ? 'bg-accent-600/20 text-accent-400 hover:bg-accent-600/30'
                                : 'bg-danger-600/20 text-danger-400 hover:bg-danger-600/30'
                            }`}
                            title="Click to toggle status"
                          >
                            {shop.status === 'active' || !shop.status ? (
                              <>
                                <UserCheck size={12} />
                                Active
                              </>
                            ) : (
                              <>
                                <UserX size={12} />
                                Inactive
                              </>
                            )}
                          </button>
                        </td>
                        <td className="table-td text-center">
                          {statusBadge(req?.status)}
                          {req?.status === 'pending' && (
                            <p className="text-xs text-amber-400/80 mt-0.5 font-myanmar">
                              {req.plan} — {req.payment_method === 'kpay' ? 'KPay' : 'Wave'}
                            </p>
                          )}
                        </td>
                        <td className="table-td text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {shop.role !== 'admin' && (
                              <button
                                onClick={() => setShowShopDataModal(shop)}
                                className="p-1.5 bg-accent-600/20 hover:bg-accent-600/40 border border-accent-600/30 text-accent-400 rounded-lg transition-colors"
                                title="Manage Shop Data"
                              >
                                <Store size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => openEditModal(shop)}
                              className="p-1.5 bg-primary-600/20 hover:bg-primary-600/40 border border-primary-600/30 text-primary-400 rounded-lg transition-colors"
                              title="Edit user"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(shop.user_id)}
                              className="p-1.5 bg-danger-600/20 hover:bg-danger-600/40 border border-danger-600/30 text-danger-400 rounded-lg transition-colors"
                              title="Delete user"
                            >
                              <Trash2 size={14} />
                            </button>
                            {req?.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApprove(req)}
                                  disabled={processing === req.id}
                                  className="px-2.5 py-1 bg-accent-600 hover:bg-accent-500 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                  {processing === req.id ? '...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleReject(req)}
                                  disabled={processing === req.id}
                                  className="px-2.5 py-1 bg-surface-300 hover:bg-danger-600/20 border border-danger-600/30 text-danger-400 text-xs rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && req && (
                        <tr className="bg-surface-200/30">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Requested Plan</p>
                                <p className="text-slate-200 capitalize">{req.plan}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Payment Method / Amount</p>
                                <p className="text-slate-200">
                                  {req.payment_method === 'kpay' ? 'KBZ Pay' : 'Wave Money'} —
                                  <span className="font-semibold text-amber-400 ml-1">
                                    {new Intl.NumberFormat('my-MM').format(req.amount)} ကျပ်
                                  </span>
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Transaction ID</p>
                                <p className="text-slate-300 font-mono text-xs">{req.transaction_id || '—'}</p>
                              </div>
                              {req.transaction_slip_url && (
                                <div className="sm:col-span-3">
                                  <p className="text-xs text-slate-500 mb-2">Payment Slip</p>
                                  <a
                                    href={req.transaction_slip_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block"
                                  >
                                    <img
                                      src={req.transaction_slip_url}
                                      alt="Slip"
                                      className="h-24 rounded-lg border border-slate-700 hover:border-primary-500 transition-colors"
                                    />
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && editingShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeEditModal} />
          <div className="relative w-full max-w-md bg-surface-100 rounded-2xl border border-slate-700/50 shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                  <Edit3 size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Edit User</h3>
                  <p className="text-xs text-slate-400">Update user information</p>
                </div>
              </div>
              <button onClick={closeEditModal} className="p-2 hover:bg-surface-200 rounded-lg transition-colors text-slate-400 hover:text-white">
                <Shield size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <User size={14} className="text-slate-500" />
                  User Name
                </label>
                <input
                  type="text"
                  value={editingShop.full_name}
                  onChange={(e) => handleEditChange('full_name', e.target.value)}
                  className="input-primary w-full"
                  placeholder="Enter user name"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Store size={14} className="text-slate-500" />
                  Shop Name
                </label>
                <input
                  type="text"
                  value={editingShop.shop_name}
                  onChange={(e) => handleEditChange('shop_name', e.target.value)}
                  className="input-primary w-full"
                  placeholder="Enter shop name"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Mail size={14} className="text-slate-500" />
                  Email
                </label>
                <input
                  type="email"
                  value={emailLoading ? 'Loading...' : editingShop.email}
                  onChange={(e) => handleEditChange('email', e.target.value)}
                  className="input-primary w-full"
                  placeholder="user@example.com"
                />
                <p className="text-xs text-slate-500 mt-1">
                  {emailLoading
                    ? 'Fetching email from auth...'
                    : editingShop.email
                      ? 'Edit to update the user\'s auth email'
                      : 'No email on file'}
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Shield size={14} className="text-slate-500" />
                  Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleEditChange('role', 'user')}
                    className={`px-4 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      editingShop.role === 'user'
                        ? 'bg-primary-600/20 border-primary-500 text-primary-400 shadow-lg shadow-primary-500/10'
                        : 'bg-surface-200/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <User size={16} />
                    <span className="text-sm font-medium">User</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditChange('role', 'admin')}
                    className={`px-4 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      editingShop.role === 'admin'
                        ? 'bg-warning-600/20 border-warning-500 text-warning-400 shadow-lg shadow-warning-500/10'
                        : 'bg-surface-200/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Shield size={16} />
                    <span className="text-sm font-medium">Admin</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <Crown size={14} className="text-slate-500" />
                  Subscription Plan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['free', 'basic', 'premium'].map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => handleEditChange('subscription_plan', plan)}
                      className={`px-3 py-2.5 rounded-xl border transition-all text-center ${
                        editingShop.subscription_plan === plan
                          ? plan === 'premium'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/10'
                            : plan === 'basic'
                            ? 'bg-accent-600/20 border-accent-500 text-accent-400 shadow-lg shadow-accent-500/10'
                            : 'bg-slate-600/20 border-slate-500 text-slate-300'
                          : 'bg-surface-200/50 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-sm font-medium capitalize">{plan}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                  <UserCheck size={14} className="text-slate-500" />
                  Account Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleEditChange('status', 'active')}
                    className={`px-4 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      editingShop.status === 'active'
                        ? 'bg-accent-600/20 border-accent-500 text-accent-400 shadow-lg shadow-accent-500/10'
                        : 'bg-surface-200/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <UserCheck size={16} />
                    <span className="text-sm font-medium">Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditChange('status', 'inactive')}
                    className={`px-4 py-2.5 rounded-xl border transition-all flex items-center justify-center gap-2 ${
                      editingShop.status === 'inactive'
                        ? 'bg-danger-600/20 border-danger-500 text-danger-400 shadow-lg shadow-danger-500/10'
                        : 'bg-surface-200/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <UserX size={16} />
                    <span className="text-sm font-medium">Inactive</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">Inactive users cannot log in</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/50 bg-surface-200/30 rounded-b-2xl flex-shrink-0">
              <button onClick={closeEditModal} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="btn-primary flex items-center gap-2 px-5 py-2.5">
                {savingEdit ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-surface-100 rounded-2xl border border-danger-600/50 shadow-2xl animate-fade-in">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-danger-600/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-danger-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Delete User?</h3>
              <p className="text-sm text-slate-400 mb-6">
                This action cannot be undone. The user's profile, products, sales, and all related data will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  disabled={deletingUser}
                  className="flex-1 px-4 py-2.5 bg-surface-200 hover:bg-surface-300 text-slate-300 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteUser(showDeleteConfirm)}
                  disabled={deletingUser}
                  className="flex-1 px-4 py-2.5 bg-danger-600 hover:bg-danger-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deletingUser ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shop Data Modal */}
      {showShopDataModal && (
        <ShopDataModal
          shop={showShopDataModal}
          onClose={() => setShowShopDataModal(null)}
        />
      )}
    </div>
  );
}
