import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download, FileSpreadsheet, FileText, ChevronDown, Lock,
  CheckCircle, AlertCircle, Crown, X
} from 'lucide-react';
import { ExportColumn, exportData, ExportFormat } from '../lib/exportData';
import { SubscriptionPlan } from '../types';

interface Props<T> {
  baseFilename: string;
  columns: ExportColumn<T>[];
  rows: T[];
  sheetName?: string;
  pdfTitle?: string;
  plan: SubscriptionPlan;
  onUpgradeClick?: () => void;
}

const BASIC_ROW_LIMIT = 10;

type ToastType = 'locked' | 'limit' | 'success';
interface ToastState {
  type: ToastType;
  message: string;
  visible: boolean;
}

export default function ExportDataDropdown<T>({
  baseFilename,
  columns,
  rows,
  sheetName,
  pdfTitle,
  plan,
  onUpgradeClick,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>({ type: 'success', message: '', visible: false });
  const ref = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ type, message, visible: true });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 5000);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const safePlan: SubscriptionPlan = plan === 'basic' || plan === 'premium' ? plan : 'free';
  const isFreePlan = safePlan === 'free';

  const handleExport = (format: ExportFormat) => {
    setOpen(false);

    if (isFreePlan) {
      showToast('locked', 'Feature Locked: Please upgrade to Basic or Premium plan to export data.');
      return;
    }

    let exportRows = rows;
    let message = '';

    if (safePlan === 'basic') {
      if (rows.length > BASIC_ROW_LIMIT) {
        exportRows = rows.slice(0, BASIC_ROW_LIMIT);
        message = `Basic Plan Limit: Only the first ${BASIC_ROW_LIMIT} rows have been exported. Upgrade to Premium for unlimited downloads.`;
      }
    }

    exportData(format, baseFilename, columns, exportRows, { sheetName, pdfTitle });

    if (message) {
      showToast('limit', message);
    } else {
      const count = exportRows.length;
      showToast('success', `Successfully exported ${count} ${count === 1 ? 'record' : 'records'} to ${format.toUpperCase()}.`);
    }
  };

  const formats: { id: ExportFormat; label: string; icon: typeof FileSpreadsheet; hint: string }[] = [
    { id: 'csv', label: 'CSV', icon: FileText, hint: 'Comma-separated values' },
    { id: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet, hint: 'Microsoft Excel' },
    { id: 'pdf', label: 'PDF', icon: FileText, hint: 'Printable report' },
  ];

  return (
    <>
      <div ref={ref} className="relative no-print">
        {isFreePlan ? (
          <button
            onClick={() => showToast('locked', 'Feature Locked: Please upgrade to Basic or Premium plan to export data.')}
            disabled={rows.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock size={14} />
            Export Data
          </button>
        ) : (
          <>
            <button
              onClick={() => setOpen(o => !o)}
              disabled={rows.length === 0}
              className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              Export Data
              <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-surface-100 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-700/50">
                  <p className="text-xs text-slate-500">Choose export format</p>
                </div>
                {formats.map(fmt => {
                  const Icon = fmt.icon;
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => handleExport(fmt.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-200 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-surface-300 group-hover:bg-primary-600/20 flex items-center justify-center transition-colors">
                        <Icon size={15} className="text-slate-400 group-hover:text-primary-400 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200">{fmt.label}</p>
                        <p className="text-xs text-slate-500">{fmt.hint}</p>
                      </div>
                    </button>
                  );
                })}
                <div className="px-3 py-2 border-t border-slate-700/50 bg-surface-200/30">
                  {safePlan === 'basic' && rows.length > BASIC_ROW_LIMIT ? (
                    <p className="text-xs text-amber-400">
                      {BASIC_ROW_LIMIT} of {rows.length} records (Basic plan)
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">{rows.length} records ready</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast Notification */}
      {toast.visible && (
        <div
          className={`fixed bottom-6 right-6 z-[100] max-w-sm animate-toast-in no-print`}
          role="alert"
        >
          <div
            className={`flex items-start gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 ${
              toast.type === 'locked'
                ? 'bg-danger-600/95 border-danger-500/50'
                : toast.type === 'limit'
                ? 'bg-amber-600/95 border-amber-500/50'
                : 'bg-accent-600/95 border-accent-500/50'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'locked' ? (
                <Lock size={20} className="text-white" />
              ) : toast.type === 'limit' ? (
                <AlertCircle size={20} className="text-white" />
              ) : (
                <CheckCircle size={20} className="text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium leading-snug">
                {toast.message}
              </p>
              {(toast.type === 'locked' || toast.type === 'limit') && onUpgradeClick && (
                <button
                  onClick={() => {
                    dismissToast();
                    onUpgradeClick();
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs font-semibold transition-colors"
                >
                  <Crown size={12} />
                  Upgrade Now
                </button>
              )}
            </div>
            <button
              onClick={dismissToast}
              className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
