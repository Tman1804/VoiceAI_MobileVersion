'use client';

import { useEffect } from 'react';
import { Zap, TrendingUp, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export function UsageDisplay() {
  const { usage, refreshUsage, loading, user } = useAuthStore();

  // Refresh usage when user is available but usage isn't loaded yet
  useEffect(() => {
    if (user && !usage) {
      refreshUsage();
    }
  }, [user, usage, refreshUsage]);

  // Still loading auth
  if (loading) return null;
  
  // No user logged in
  if (!user) return null;

  // User logged in but usage not loaded yet - show loading state
  if (!usage) {
    return (
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary-500/20">
            <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
          </div>
          <span className="text-sm text-slate-400">Lade Token-Status...</span>
        </div>
      </div>
    );
  }

  const percentage = usage.tokens_limit > 0 
    ? Math.min((usage.tokens_used / usage.tokens_limit) * 100, 100)
    : 0;
  const remaining = Math.max(usage.tokens_limit - usage.tokens_used, 0);
  const isLow = percentage > 80;
  const isUnlimited = usage.plan === 'unlimited';

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
            {planLabels[usage.plan]}
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
            {usage.tokens_used.toLocaleString()} / {usage.tokens_limit.toLocaleString()} Tokens verwendet
          </p>
        </>
      )}

      {isLow && !isUnlimited && (
        <button className="mt-3 w-full btn-primary py-2.5 flex items-center justify-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4" />
          Upgrade
        </button>
      )}
    </div>
  );
}
