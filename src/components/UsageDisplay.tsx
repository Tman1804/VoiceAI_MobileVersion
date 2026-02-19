'use client';

import { useEffect, useState } from 'react';
import { Zap, TrendingUp } from 'lucide-react';
import { getUserUsage, UserUsage } from '@/lib/supabase';

export function UsageDisplay() {
  const [usage, setUsage] = useState<UserUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    try {
      const data = await getUserUsage();
      setUsage(data);
    } catch (err) {
      console.error('Failed to load usage:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usage) return null;

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
