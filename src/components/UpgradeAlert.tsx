import { Lock, ArrowRight } from 'lucide-react';
import { Page } from '../types';

interface UpgradeAlertProps {
  message: string;
  messageMm?: string;
  onNavigate?: (page: Page) => void;
}

export default function UpgradeAlert({ message, messageMm, onNavigate }: UpgradeAlertProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4 animate-fade-in">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
        <Lock size={16} className="text-amber-400" />
      </div>
      <div className="flex-1">
        <p className="text-amber-400 font-medium text-sm">{message}</p>
        {messageMm && <p className="text-amber-400/70 text-xs font-myanmar mt-0.5">{messageMm}</p>}
      </div>
      {onNavigate && (
        <button
          onClick={() => onNavigate('subscription')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
        >
          Upgrade <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}
