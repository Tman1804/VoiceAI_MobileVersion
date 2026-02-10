'use client';

import { VoiceRecorder } from '@/components/VoiceRecorder';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useAppStore } from '@/store/appStore';
import { useTauriIntegration } from '@/hooks/useTauriIntegration';
import { Settings, Mic, X, AlertCircle } from 'lucide-react';

export default function Home() {
  const { showSettings, setShowSettings, transcription, enrichedContent, error, setError } = useAppStore();
  
  const { isMobile } = useTauriIntegration();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 safe-area-inset">
      <header className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-600 rounded-lg">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white">Voice Note AI</h1>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 hover:bg-slate-700 rounded-lg transition-colors touch-target"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-slate-400" />
        </button>
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

      <div className={`container mx-auto px-4 py-8 max-w-4xl ${isMobile ? 'pb-8' : 'pb-20'}`}>
        {showSettings ? (
          <SettingsPanel />
        ) : (
          <div className="space-y-8">
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
