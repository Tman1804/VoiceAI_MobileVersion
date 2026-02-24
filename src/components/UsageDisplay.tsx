'use client';

import { useEffect } from 'react';
import { Zap, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useAppStore } from '@/store/appStore';

// Default values for new users (Trial: 5000 tokens)
const DEFAULT_USAGE = {
  tokens_used: 0,
  tokens_limit: 5000,
  plan: 'trial' as const,
};

export function UsageDisplay() {
  const { usage, refreshUsage, loading, user } = useAuthStore();
  const { setShowUpgradeModal } = useAppStore();
  // Refresh usage when user is available but usage isn't loaded yet
  useEffect(() => {
    if (user && !usage) {
      refreshUsage();
    }
  }, [user, usage, refreshUsage]);

  // Still loading auth or no user
  if (loading || !user) return null;

  // Use actual usage or defaults (no spinner - show data immediately)
  const displayUsage = usage || DEFAULT_USAGE;

  const percentage = displayUsage.tokens_limit > 0 
    ? Math.min((displayUsage.tokens_used / displayUsage.tokens_limit) * 100, 100)
    : 0;
  const remaining = Math.max(displayUsage.tokens_limit - displayUsage.tokens_used, 0);
  const isLow = percentage > 80;
  const isUnlimited = displayUsage.plan === 'unlimited';

  const planLabels: Record<string, string> = {
    trial: 'Trial',
    starter: 'Starter',
    pro: 'Pro',
    unlimited: 'Unlimited',
  };

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${isLow && !isUnlimited ? 'bg-amber-500/20' : 'bg-primary-500/20'}`}>
            <Zap className={`w-4 h-4 ${isLow && !isUnlimited ? 'text-amber-400' : 'text-primary-400'}`} />
          </div>
          <span className="text-sm font-semibold text-white">
            {planLabels[displayUsage.plan]}
          </span>
        </div>
        <span className="text-xs font-medium text-slate-400">
          {isUnlimited ? '∞ Tokens' : `${remaining.toLocaleString()} übrig`}
        </span>
      </div>
      
      {!isUnlimited && (
        <>
          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isLow 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
                  : 'bg-gradient-to-r from-primary-500 to-cyan-400'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {displayUsage.tokens_used.toLocaleString()} / {displayUsage.tokens_limit.toLocaleString()} Tokens verwendet
          </p>
        </>
      )}

      {isLow && !isUnlimited && displayUsage.plan === 'trial' && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setShowUpgradeModal(true);
          }}
          className="mt-3 w-full btn-primary py-2.5 flex items-center justify-center gap-2 text-sm"
        >
          <TrendingUp className="w-4 h-4" />
          Upgrade
        </button>
      )}
    </div>
  );
}
