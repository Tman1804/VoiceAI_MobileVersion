'use client';

import { VoiceRecorder } from '@/components/VoiceRecorder';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { SettingsPanel } from '@/components/SettingsPanel';
import { HistoryList } from '@/components/HistoryList';
import { HistoryDetail } from '@/components/HistoryDetail';
import { useAppStore, EnrichmentMode } from '@/store/appStore';
import { useTauriIntegration } from '@/hooks/useTauriIntegration';
import { Settings, Mic, X, AlertCircle, ChevronDown, Clock } from 'lucide-react';
import { getEnrichmentModeLabel } from '@/lib/enrichmentService';
import { useState } from 'react';

const ENRICHMENT_MODES: EnrichmentMode[] = ['clean-transcript', 'summarize', 'action-items', 'meeting-notes'];

export default function Home() {
  const { viewMode, setViewMode, transcription, enrichedContent, error, setError, settings, updateSettings, recordings } = useAppStore();
  const { isMobile } = useTauriIntegration();
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 safe-area-inset">
      <header className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-600 rounded-lg">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white">VoxWarp</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'history' || viewMode === 'history-detail' ? 'recording' : 'history')}
            className="p-3 hover:bg-slate-700 rounded-lg transition-colors touch-target relative"
            title="History"
          >
            <Clock className={`w-5 h-5 ${viewMode === 'history' || viewMode === 'history-detail' ? 'text-primary-400' : 'text-slate-400'}`} />
            {recordings.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'settings' ? 'recording' : 'settings')}
            className="p-3 hover:bg-slate-700 rounded-lg transition-colors touch-target"
            title="Settings"
          >
            <Settings className={`w-5 h-5 ${viewMode === 'settings' ? 'text-primary-400' : 'text-slate-400'}`} />
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-200">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 p-2 touch-target">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <div className={`container mx-auto px-4 py-6 max-w-4xl ${isMobile ? 'pb-6' : 'pb-20'}`}>
        {viewMode === 'settings' && <SettingsPanel />}
        {viewMode === 'history' && <HistoryList />}
        {viewMode === 'history-detail' && <HistoryDetail />}
        {viewMode === 'recording' && (
          <div className="space-y-6">
            {/* AI Mode Selector - Compact Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowModeDropdown(!showModeDropdown)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white hover:border-slate-600 transition-colors"
              >
                <span className="text-sm text-slate-400">AI Mode:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getEnrichmentModeLabel(settings.enrichmentMode)}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showModeDropdown ? 'rotate-180' : ''}`} />
                </div>
              </button>
              
              {showModeDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowModeDropdown(false)} />
                  <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl z-20">
                    {ENRICHMENT_MODES.map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          updateSettings({ enrichmentMode: mode });
                          setShowModeDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center justify-between ${settings.enrichmentMode === mode ? 'bg-primary-600/20 text-primary-400' : 'text-white'}`}
                      >
                        <span>{getEnrichmentModeLabel(mode)}</span>
                        {settings.enrichmentMode === mode && <span className="text-primary-400">✓</span>}
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

      {/* Only show keyboard shortcut hint on desktop */}
      {!isMobile && (
        <footer className="fixed bottom-0 left-0 right-0 p-3 bg-slate-900/80 backdrop-blur border-t border-slate-700">
          <p className="text-center text-sm text-slate-500">
            Press <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-300">Ctrl+Shift+R</kbd> to start/stop recording
          </p>
        </footer>
      )}
    </main>
  );
}
