import { useState, useEffect, useCallback } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, Package,
  Users, Truck, Calendar, ChevronDown, Crown, Lock,
  Download, FileSpreadsheet, FileText, RefreshCw, AlertCircle, CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { Page, SubscriptionPlan } from '../types';
import {
  fetchIncomeStatement, fetchBalanceSheet, getPresetRange,
  formatMMK, DateRange, RangePreset,
  IncomeStatementData, BalanceSheetData
} from '../lib/financials';
import { exportData, ExportFormat } from '../lib/exportData';

export default function Financial({ onNavigate }: { onNavigate: (p: Page) => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const plan: SubscriptionPlan = profile?.subscription_plan ?? 'free';
  const isPremium = plan === 'premium';

  const [preset, setPreset] = useState<RangePreset>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const [incomeData, setIncomeData] = useState<IncomeStatementData | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStatement, setActiveStatement] = useState<'income' | 'balance'>('income');

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [toast, setToast] = useState<{ type: 'locked' | 'limit' | 'success'; message: string; visible: boolean }>({ type: 'success', message: '', visible: false });
  const currentRange: DateRange = preset === 'custom' && customStart && customEnd
    ? { start: new Date(customStart), end: new Date(new Date(customEnd).getTime() + 86400000) }
    : getPresetRange(preset);

  const showToast = (type: 'locked' | 'limit' | 'success', message: string) => {
    setToast({ type, message, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 5000);
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [income, balance] = await Promise.all([
        fetchIncomeStatement(user.id, currentRange),
        fetchBalanceSheet(user.id),
      ]);
      setIncomeData(income);
      setBalanceData(balance);
    } catch (err) {
      console.error('Failed to load financial data:', err);
    }
    setLoading(false);
  }, [user, preset, customStart, customEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePresetChange = (p: RangePreset) => {
    setPreset(p);
    if (p === 'custom') {
      setShowCustom(true);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setCustomStart(monthStart.toISOString().slice(0, 10));
      setCustomEnd(now.toISOString().slice(0, 10));
    } else {
      setShowCustom(false);
    }
  };

  const presetLabels: Record<RangePreset, string> = {
    today: 'Today / ယနေ့',
    week: 'This Week / ဤသတ္တပတ်',
    month: 'This Month / ဤလ',
    custom: 'Custom / စိတ်ကြိုက်',
  };

  const handleExport = (format: ExportFormat) => {
    setShowExportMenu(false);

    if (!isPremium) {
      showToast('locked', 'Feature Locked: Financial statement exports require a Premium plan.');
      return;
    }

    const dateStr = `${currentRange.start.toISOString().slice(0, 10)}_to_${currentRange.end.toISOString().slice(0, 10)}`;

    if (activeStatement === 'income' && incomeData) {
      const rows = [
        { item: 'Gross Revenue / စုစုပေါင်းဝင်ငွေ', amount: incomeData.grossRevenue },
        { item: 'Less: Discounts / လျှော့ငွေ', amount: -incomeData.totalDiscount },
        { item: 'Net Revenue / ကြွေးကျန်ဝင်ငွေ', amount: incomeData.netRevenue },
        { item: 'Less: Cost of Goods Sold / ကုန်ကျစရိတ်', amount: -incomeData.costOfGoodsSold },
        { item: 'Gross Profit / အမြတ်ချုပ်', amount: incomeData.grossProfit },
        ...incomeData.operatingExpenses.map(e => ({
          item: `  ${e.category}`,
          amount: -e.amount,
        })),
        { item: 'Total Operating Expenses / လည်ပတ်စရိတ်စုစုပေါင်း', amount: -incomeData.totalOperatingExpenses },
        { item: 'Net Profit / အသန့်စင်အမြတ်', amount: incomeData.netProfit },
      ];

      exportData(format, `income-statement-${dateStr}`,
        [
          { header: 'Line Item / စာရင်းအမျိုးအစား', accessor: (r: typeof rows[0]) => r.item },
          { header: 'Amount (MMK) / ပမာဏ', accessor: (r: typeof rows[0]) => r.amount },
        ],
        rows,
        { sheetName: 'Income Statement', pdfTitle: `Income Statement — ${dateStr}` }
      );
      showToast('success', `Income Statement exported as ${format.toUpperCase()}.`);
    } else if (activeStatement === 'balance' && balanceData) {
      const rows = [
        { item: 'CURRENT ASSETS / လက်ကျန်ပစ္စည်းများ', amount: '' as string | number },
        { item: '  Inventory Value / စာရင်းငွေတန်ဖိုး', amount: balanceData.inventoryValue },
        { item: '  Customer Debts (Receivables) / ဖောက်သည်ကြွေး', amount: balanceData.customerDebts },
        { item: '  Total Current Assets / စုစုပေါင်းပစ္စည်း', amount: balanceData.totalAssets },
        { item: '', amount: '' },
        { item: 'CURRENT LIABILITIES / လက်ကျန်ကြွေးများ', amount: '' },
        { item: '  Supplier Debts (Payables) / ပေးရန်ကြွေး', amount: balanceData.supplierDebts },
        { item: '  Total Current Liabilities / စုစုပေါင်းကြွေး', amount: balanceData.totalLiabilities },
        { item: '', amount: '' },
        { item: 'Net Working Capital / ကြွေးအသားတင်', amount: balanceData.netWorkingCapital },
      ];

      exportData(format, `balance-sheet-${dateStr}`,
        [
          { header: 'Line Item / စာရင်းအမျိုးအစား', accessor: (r: typeof rows[0]) => r.item },
          { header: 'Amount (MMK) / ပမာဏ', accessor: (r: typeof rows[0]) => r.amount },
        ],
        rows,
        { sheetName: 'Balance Sheet', pdfTitle: `Balance Sheet — ${dateStr}` }
      );
      showToast('success', `Balance Sheet exported as ${format.toUpperCase()}.`);
    }
  };

  const exportFormats: { id: ExportFormat; label: string; icon: typeof FileText }[] = [
    { id: 'csv', label: 'CSV', icon: FileText },
    { id: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
    { id: 'pdf', label: 'PDF', icon: FileText },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet size={24} className="text-primary-400" />
            Financial Statements
          </h1>
          <p className="text-slate-400 font-myanmar text-sm mt-0.5">ဘဏ္ဍာရေး အစီရင်ခံစာများ</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            {isPremium ? (
              <>
                <button
                  onClick={() => setShowExportMenu(o => !o)}
                  disabled={loading || !incomeData}
                  className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={14} />
                  Export
                  <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-surface-100 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                    {exportFormats.map(fmt => {
                      const Icon = fmt.icon;
                      return (
                        <button
                          key={fmt.id}
                          onClick={() => handleExport(fmt.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-200 transition-colors text-left"
                        >
                          <Icon size={15} className="text-slate-400" />
                          <span className="text-sm font-medium text-slate-200">{fmt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => showToast('locked', 'Feature Locked: Financial statement exports require a Premium plan.')}
                className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors hover:bg-amber-500/20"
              >
                <Lock size={14} />
                Export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Premium Lock Banner for non-premium */}
      {!isPremium && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary-600/10 to-accent-600/10 border border-primary-600/30 rounded-xl">
          <Crown size={20} className="text-primary-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {plan === 'free' ? 'Free Plan' : 'Basic Plan'} — Raw overview only
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Upgrade to Premium to unlock structured Income Statements, Balance Sheets, and PDF/Excel exports.
            </p>
          </div>
          <button
            onClick={() => onNavigate('subscription')}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            <Crown size={14} />
            Upgrade
          </button>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-300">Date Range / ကာလရွေးချယ်ရန်</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['today', 'week', 'month', 'custom'] as RangePreset[]).map(p => (
              <button
                key={p}
                onClick={() => handlePresetChange(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  preset === p
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-200 text-slate-400 hover:text-white hover:bg-surface-300'
                }`}
              >
                {presetLabels[p]}
              </button>
            ))}
          </div>
          {showCustom && (
            <div className="flex items-center gap-2 ml-auto">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="input-primary w-auto text-sm py-1.5"
              />
              <span className="text-slate-500 text-sm">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="input-primary w-auto text-sm py-1.5"
              />
            </div>
          )}
        </div>
      </div>

      {/* Statement Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveStatement('income')}
          className={`flex-1 sm:flex-none flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeStatement === 'income'
              ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
              : 'bg-surface-200 text-slate-400 hover:text-white hover:bg-surface-300 border border-transparent'
          }`}
        >
          <TrendingUp size={16} />
          Income Statement
          <span className="hidden sm:inline text-xs text-slate-500 font-myanmar">| အမြတ်စာရင်း</span>
        </button>
        <button
          onClick={() => setActiveStatement('balance')}
          className={`flex-1 sm:flex-none flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeStatement === 'balance'
              ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
              : 'bg-surface-200 text-slate-400 hover:text-white hover:bg-surface-300 border border-transparent'
          }`}
        >
          <Wallet size={16} />
          Balance Sheet
          <span className="hidden sm:inline text-xs text-slate-500 font-myanmar">| ငွေစာရင်း</span>
        </button>
      </div>

      {/* Statement Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <svg className="animate-spin h-8 w-8 text-primary-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : activeStatement === 'income' && incomeData ? (
        <IncomeStatementView data={incomeData} isPremium={isPremium} />
      ) : activeStatement === 'balance' && balanceData ? (
        <BalanceSheetView data={balanceData} isPremium={isPremium} />
      ) : null}

      {/* Toast */}
      {toast.visible && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-sm animate-toast-in">
          <div className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md ${
            toast.type === 'locked' ? 'bg-danger-600/95 border-danger-500/50'
            : toast.type === 'limit' ? 'bg-amber-600/95 border-amber-500/50'
            : 'bg-accent-600/95 border-accent-500/50'
          }`}>
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'locked' ? <Lock size={20} className="text-white" />
              : toast.type === 'limit' ? <AlertCircle size={20} className="text-white" />
              : <CheckCircle size={20} className="text-white" />}
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium leading-snug">{toast.message}</p>
              {toast.type === 'locked' && (
                <button
                  onClick={() => onNavigate('subscription')}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs font-semibold transition-colors"
                >
                  <Crown size={12} /> Upgrade Now
                </button>
              )}
            </div>
            <button onClick={() => setToast(t => ({ ...t, visible: false }))} className="text-white/70 hover:text-white">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Income Statement View ---------- */

function IncomeStatementView({ data, isPremium }: { data: IncomeStatementData; isPremium: boolean }) {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Gross Revenue" labelMm="စုစုပေါင်းဝင်ငွေ"
          value={formatMMK(data.grossRevenue)} unit="Ks"
          icon={<DollarSign size={20} />} color="text-accent-400" bg="bg-accent-500/10 border-accent-500/20"
        />
        <StatCard
          label="Gross Profit" labelMm="အမြတ်ချုပ်"
          value={formatMMK(data.grossProfit)} unit="Ks"
          icon={<TrendingUp size={20} />} color="text-primary-400" bg="bg-primary-600/10 border-primary-600/20"
        />
        <StatCard
          label="Operating Expenses" labelMm="လည်ပတ်စရိတ်"
          value={formatMMK(data.totalOperatingExpenses)} unit="Ks"
          icon={<TrendingDown size={20} />} color="text-amber-400" bg="bg-amber-500/10 border-amber-500/20"
        />
        <StatCard
          label="Net Profit" labelMm="အသန့်စင်အမြတ်"
          value={formatMMK(data.netProfit)} unit="Ks"
          icon={<DollarSign size={20} />}
          color={data.netProfit >= 0 ? 'text-accent-400' : 'text-danger-400'}
          bg={data.netProfit >= 0 ? 'bg-accent-500/10 border-accent-500/20' : 'bg-danger-600/10 border-danger-600/20'}
        />
      </div>

      {/* Detailed Statement */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Income Statement</h3>
            <p className="text-xs text-slate-500 font-myanmar">အမြတ်နှင့် ဆုံးရှုံးစာရင်း</p>
          </div>
          {!isPremium && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-medium">
              <Lock size={12} /> Premium
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody className="divide-y divide-slate-800/50">
              {/* Revenue Section */}
              <StatementRow
                label="Gross Revenue" labelMm="စုစုပေါင်းဝင်ငွေ"
                value={formatMMK(data.grossRevenue)} bold
              />
              <StatementRow
                label="Less: Discounts" labelMm="လျှော့ငွေ"
                value={`(${formatMMK(data.totalDiscount)})`} muted
              />
              <StatementRow
                label="Net Revenue" labelMm="ကြွေးကျန်ဝင်ငွေ"
                value={formatMMK(data.netRevenue)} bold
              />

              {/* COGS */}
              <tr className="border-t-2 border-slate-700/50">
                <td colSpan={2} className="px-4 py-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Cost of Goods Sold / ကုန်ကျစရိတ်
                  </span>
                </td>
              </tr>
              <StatementRow
                label="COGS" labelMm="ရောင်းကုန်ပစ္စည်းစရိတ်"
                value={`(${formatMMK(data.costOfGoodsSold)})`} muted
              />
              <StatementRow
                label="Gross Profit" labelMm="အမြတ်ချုပ်"
                value={formatMMK(data.grossProfit)} bold highlight
              />

              {/* Operating Expenses */}
              <tr className="border-t-2 border-slate-700/50">
                <td colSpan={2} className="px-4 py-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Operating Expenses / လည်ပတ်စရိတ်များ
                  </span>
                </td>
              </tr>
              {data.operatingExpenses.length === 0 ? (
                <tr>
                  <td className="px-4 py-2 text-sm text-slate-500 italic">No operating expenses recorded for this period</td>
                  <td className="px-4 py-2 text-right text-sm text-slate-500">—</td>
                </tr>
              ) : (
                data.operatingExpenses.map(exp => (
                  <StatementRow
                    key={exp.category}
                    label={exp.category} labelMm=""
                    value={`(${formatMMK(exp.amount)})`} indent
                  />
                ))
              )}
              <StatementRow
                label="Total Operating Expenses" labelMm="စုစုပေါင်းလည်ပတ်စရိတ်"
                value={`(${formatMMK(data.totalOperatingExpenses)})`} bold
              />

              {/* Net Profit */}
              <tr className="border-t-2 border-primary-600/30">
                <td className="px-4 py-3">
                  <span className="text-base font-bold text-white">Net Profit</span>
                  <span className="block text-xs font-myanmar text-slate-400">အသန့်စင်အမြတ်</span>
                </td>
                <td className={`px-4 py-3 text-right text-base font-bold ${
                  data.netProfit >= 0 ? 'text-accent-400' : 'text-danger-400'
                }`}>
                  {formatMMK(data.netProfit)} Ks
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Balance Sheet View ---------- */

function BalanceSheetView({ data, isPremium }: { data: BalanceSheetData; isPremium: boolean }) {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Assets" labelMm="စုစုပေါင်းပစ္စည်း"
          value={formatMMK(data.totalAssets)} unit="Ks"
          icon={<Package size={20} />} color="text-accent-400" bg="bg-accent-500/10 border-accent-500/20"
        />
        <StatCard
          label="Total Liabilities" labelMm="စုစုပေါင်းကြွေး"
          value={formatMMK(data.totalLiabilities)} unit="Ks"
          icon={<TrendingDown size={20} />} color="text-danger-400" bg="bg-danger-600/10 border-danger-600/20"
        />
        <StatCard
          label="Working Capital" labelMm="ကြွေးအသားတင်"
          value={formatMMK(data.netWorkingCapital)} unit="Ks"
          icon={<Wallet size={20} />}
          color={data.netWorkingCapital >= 0 ? 'text-primary-400' : 'text-danger-400'}
          bg={data.netWorkingCapital >= 0 ? 'bg-primary-600/10 border-primary-600/20' : 'bg-danger-600/10 border-danger-600/20'}
        />
      </div>

      {/* Detailed Balance Sheet */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-white">Balance Sheet Summary</h3>
            <p className="text-xs text-slate-500 font-myanmar">ငွေစာရင်း အကျဉ်းချုပ်</p>
          </div>
          {!isPremium && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-medium">
              <Lock size={12} /> Premium
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody className="divide-y divide-slate-800/50">
              {/* Assets Section */}
              <tr className="border-t border-slate-700/50">
                <td colSpan={2} className="px-4 py-2">
                  <span className="text-xs font-semibold text-accent-400 uppercase tracking-wider">
                    Current Assets / လက်ကျန်ပစ္စည်းများ
                  </span>
                </td>
              </tr>
              <StatementRow
                label="Inventory Value (Stock × Cost Price)" labelMm="စာရင်းငွေတန်ဖိုး"
                value={formatMMK(data.inventoryValue)} indent
                icon={<Package size={14} />}
              />
              <StatementRow
                label="Customer Debts (Receivables)" labelMm="ဖောက်သည်ကြွေး"
                value={formatMMK(data.customerDebts)} indent
                icon={<Users size={14} />}
              />
              <StatementRow
                label="Total Current Assets" labelMm="စုစုပေါင်းပစ္စည်း"
                value={formatMMK(data.totalAssets)} bold
              />

              {/* Liabilities Section */}
              <tr className="border-t-2 border-slate-700/50">
                <td colSpan={2} className="px-4 py-2">
                  <span className="text-xs font-semibold text-danger-400 uppercase tracking-wider">
                    Current Liabilities / လက်ကျန်ကြွေးများ
                  </span>
                </td>
              </tr>
              <StatementRow
                label="Supplier Debts (Payables)" labelMm="ပေးရန်ကြွေး"
                value={formatMMK(data.supplierDebts)} indent
                icon={<Truck size={14} />}
              />
              <StatementRow
                label="Total Current Liabilities" labelMm="စုစုပေါင်းကြွေး"
                value={formatMMK(data.totalLiabilities)} bold
              />

              {/* Working Capital */}
              <tr className="border-t-2 border-primary-600/30">
                <td className="px-4 py-3">
                  <span className="text-base font-bold text-white">Net Working Capital</span>
                  <span className="block text-xs font-myanmar text-slate-400">ကြွေးအသားတင်</span>
                </td>
                <td className={`px-4 py-3 text-right text-base font-bold ${
                  data.netWorkingCapital >= 0 ? 'text-accent-400' : 'text-danger-400'
                }`}>
                  {formatMMK(data.netWorkingCapital)} Ks
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Shared Sub-components ---------- */

function StatCard({ label, labelMm, value, unit, icon, color, bg }: {
  label: string; labelMm: string; value: string; unit: string;
  icon: React.ReactNode; color: string; bg: string;
}) {
  return (
    <div className={`rounded-xl p-5 border ${bg} transition-transform hover:scale-[1.01]`}>
      <div className="flex items-start justify-between mb-3">
        <div className={color}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value} <span className="text-sm font-normal text-slate-500">{unit}</span></p>
      <p className="text-sm font-medium text-slate-300">{label}</p>
      <p className="text-xs font-myanmar text-slate-500 mt-0.5">{labelMm}</p>
    </div>
  );
}

function StatementRow({ label, labelMm, value, bold, highlight, muted, indent, icon }: {
  label: string; labelMm: string; value: string;
  bold?: boolean; highlight?: boolean; muted?: boolean; indent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <tr>
      <td className={`px-4 py-2.5 ${indent ? 'pl-8' : ''}`}>
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-500">{icon}</span>}
          <div>
            <span className={`text-sm ${bold ? 'font-bold text-white' : muted ? 'text-slate-500' : 'text-slate-300'}`}>
              {label}
            </span>
            {labelMm && <span className="block text-xs font-myanmar text-slate-500">{labelMm}</span>}
          </div>
        </div>
      </td>
      <td className={`px-4 py-2.5 text-right text-sm ${
        highlight ? 'font-bold text-white' : bold ? 'font-semibold text-slate-200' : muted ? 'text-slate-500' : 'text-slate-300'
      }`}>
        {value} {value !== '—' && !value.startsWith('(') && <span className="text-xs text-slate-500">Ks</span>}
      </td>
    </tr>
  );
}
