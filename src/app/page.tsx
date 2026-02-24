'use client';

import { useEffect, useState } from 'react';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { SettingsPanel } from '@/components/SettingsPanel';
import { HistoryList } from '@/components/HistoryList';
import { HistoryDetail } from '@/components/HistoryDetail';
import { AuthScreen } from '@/components/AuthScreen';
import { UsageDisplay } from '@/components/UsageDisplay';
import { UpgradeModal } from '@/components/UpgradeModal';
import { useAppStore, EnrichmentMode } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useTauriIntegration } from '@/hooks/useTauriIntegration';
import { useDeepLink } from '@/hooks/useDeepLink';
import { Settings, Mic, X, AlertCircle, ChevronDown, Clock, LogOut, Loader2 } from 'lucide-react';
import { getEnrichmentModeLabel } from '@/lib/enrichmentService';

const ENRICHMENT_MODES: EnrichmentMode[] = ['clean-transcript', 'summarize', 'action-items', 'meeting-notes'];

export default function Home() {
  const { viewMode, setViewMode, transcription, enrichedContent, error, setError, settings, updateSettings, recordings, showUpgradeModal, setShowUpgradeModal } = useAppStore();
  const { user, loading: authLoading, initialized, initialize, logout } = useAuthStore();
  const { isMobile } = useTauriIntegration();
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  
  // Handle deep links for OAuth callback
  useDeepLink();

  // Initialize auth on mount
  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  // Show loading while initializing auth
  if (!initialized || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Laden...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!user) {
    // No onSuccess needed - store updates reactively when user logs in
    return <AuthScreen onSuccess={() => {}} />;
  }

  return (
    <main className="min-h-screen safe-area-inset">
      {/* Header */}
      <header className="glass-card-darker sticky top-0 z-30 border-b border-slate-700/50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-glow">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">VoxWarp</h1>
              {user?.email && (
                <p className="text-xs text-slate-400 truncate max-w-[140px]">{user.email}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode(viewMode === 'history' || viewMode === 'history-detail' ? 'recording' : 'history')}
              className={`p-2.5 rounded-xl transition-all duration-200 touch-target relative ${
                viewMode === 'history' || viewMode === 'history-detail' 
                  ? 'bg-primary-500/20 text-primary-400' 
                  : 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
              }`}
              title="History"
            >
              <Clock className="w-5 h-5" />
              {recordings.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-400 rounded-full ring-2 ring-slate-900" />
              )}
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'settings' ? 'recording' : 'settings')}
              className={`p-2.5 rounded-xl transition-all duration-200 touch-target ${
                viewMode === 'settings' 
                  ? 'bg-primary-500/20 text-primary-400' 
                  : 'hover:bg-slate-700/50 text-slate-400 hover:text-white'
              }`}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                console.log('Logout button clicked');
                logout().catch(err => console.error('Logout failed:', err));
              }}
              className="p-2.5 hover:bg-red-500/20 rounded-xl transition-all duration-200 touch-target text-slate-400 hover:text-red-400"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-4 p-4 glass-card rounded-xl border border-red-500/30 flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 p-1.5 hover:bg-red-500/20 rounded-lg transition-colors touch-target">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={`container mx-auto px-4 py-6 max-w-2xl ${isMobile ? 'pb-6' : 'pb-20'}`}>
        {viewMode === 'settings' && <SettingsPanel />}
        {viewMode === 'history' && <HistoryList />}
        {viewMode === 'history-detail' && <HistoryDetail />}
        {viewMode === 'recording' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Usage Display */}
            <UsageDisplay />
            
            {/* AI Mode Selector */}
            <div className="relative">
              <button
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className="w-full flex items-center justify-between px-4 py-3.5 glass-card hover:border-slate-600/50 rounded-2xl text-white transition-all duration-200"
              >
                <span className="text-sm text-slate-400">AI Mode</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{getEnrichmentModeLabel(settings.enrichmentMode)}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showModeDropdown ? 'rotate-180' : ''}`} />
                </div>
              </button>
              
              {showModeDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowModeDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-2xl overflow-hidden shadow-elevated-lg z-20 animate-fadeIn">
                    {ENRICHMENT_MODES.map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          updateSettings({ enrichmentMode: mode });
                          setShowModeDropdown(false);
                        }}
                        className={`w-full px-4 py-3.5 text-left transition-all duration-150 flex items-center justify-between ${
                          settings.enrichmentMode === mode 
                            ? 'bg-primary-500/20 text-primary-400' 
                            : 'text-white hover:bg-slate-700/50'
                        }`}
                      >
                        <span className="font-medium text-sm">{getEnrichmentModeLabel(mode)}</span>
                        {settings.enrichmentMode === mode && (
                          <span className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <VoiceRecorder />
            {(transcription || enrichedContent) && <ResultsDisplay />}
          </div>
        )}
      </div>

      {/* Desktop keyboard shortcut hint */}
      {!isMobile && (
        <footer className="fixed bottom-0 left-0 right-0 p-3 glass-card-darker border-t border-slate-700/50">
          <p className="text-center text-sm text-slate-500">
            Press <kbd className="px-2 py-1 bg-slate-700/50 rounded-lg text-slate-300 font-mono text-xs">Ctrl+Shift+R</kbd> to start/stop recording
          </p>
        </footer>
      )}

      {/* Upgrade Modal - rendered at page level to avoid z-index issues */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
    </main>
  );
}
