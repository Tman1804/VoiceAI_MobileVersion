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
    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${isLow && !isUnlimited ? 'text-amber-400' : 'text-primary-400'}`} />
          <span className="text-sm font-medium text-white">
            {planLabels[usage.plan]}
          </span>
        </div>
        <span className="text-xs text-slate-500">
          {isUnlimited ? '∞' : `${remaining.toLocaleString()} übrig`}
        </span>
      </div>
      
      {!isUnlimited && (
        <>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${isLow ? 'bg-amber-500' : 'bg-primary-500'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {usage.tokens_used.toLocaleString()} / {usage.tokens_limit.toLocaleString()} Tokens
          </p>
        </>
      )}

      {isLow && !isUnlimited && (
        <button className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
          <TrendingUp className="w-4 h-4" />
          Upgrade
        </button>
      )}
    </div>
  );
}
