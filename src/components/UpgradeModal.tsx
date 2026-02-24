'use client';

import { useState } from 'react';
import { X, Zap, Check, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuthStore();

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (!session?.access_token) {
      setError('Du musst eingeloggt sein');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          successUrl: 'voxwarp://payment-success',
          cancelUrl: 'voxwarp://payment-cancel',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Checkout konnte nicht erstellt werden');
      }

      // Open Stripe Checkout in browser
      if (data.url) {
        // For Tauri, we need to open in external browser
        // @ts-ignore - Tauri API
        if (window.__TAURI__) {
          const { openUrl } = await import('@tauri-apps/plugin-opener');
          await openUrl(data.url);
        } else {
          window.open(data.url, '_blank');
        }
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md glass-card rounded-3xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary-500 to-cyan-500 px-6 py-8 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          
          <div className="inline-flex p-3 bg-white/20 rounded-2xl mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">
            Upgrade auf Pro
          </h2>
          <p className="text-white/80 text-sm">
            Mehr Transkriptionen, mehr Möglichkeiten
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Pricing */}
          <div className="text-center mb-6">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-white">€3,99</span>
              <span className="text-slate-400">/Monat</span>
            </div>
            <p className="text-slate-500 text-sm mt-1">Jederzeit kündbar</p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            <Feature text="50.000 Tokens pro Monat" />
            <Feature text="~70 Aufnahmen / ~70 Minuten" />
            <Feature text="Alle AI Modi (Clean, Summarize, Action Items...)" />
            <Feature text="Unbegrenzter Verlauf" />
            <Feature text="Prioritäts-Support" />
          </div>

          {/* Comparison */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-slate-400">Trial</p>
                <p className="text-white font-medium">5.000 Tokens</p>
              </div>
              <div className="text-right">
                <p className="text-primary-400">Pro</p>
                <p className="text-white font-medium">50.000 Tokens</p>
              </div>
            </div>
            <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full w-[10%] bg-slate-500 rounded-full" />
              <div className="h-full w-full bg-gradient-to-r from-primary-500 to-cyan-400 rounded-full -mt-2" />
            </div>
            <p className="text-center text-xs text-slate-500 mt-2">10x mehr Tokens</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
              <p className="text-red-300 text-sm text-center">{error}</p>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full btn-primary py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Wird geladen...
              </>
            ) : (
              <>
                <ExternalLink className="w-5 h-5" />
                Jetzt upgraden
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-500 mt-4">
            Sichere Zahlung über Stripe. Kreditkarte, PayPal, Apple Pay & mehr.
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-5 h-5 bg-primary-500/20 rounded-full flex items-center justify-center">
        <Check className="w-3 h-3 text-primary-400" />
      </div>
      <span className="text-slate-300 text-sm">{text}</span>
    </div>
  );
}
