'use client';

import { useState } from 'react';
import { Copy, Check, FileText, Sparkles, Share2, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { enrichTranscript, getEnrichmentModeLabel } from '@/lib/enrichmentService';
import { ShareModal } from './ShareModal';

export function ResultsDisplay() {
  const { transcription, enrichedContent, settings, isEnriching, setIsEnriching, setEnrichedContent, setError } = useAppStore();
  const { refreshUsage } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'transcription' | 'enriched'>('enriched');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) { 
      console.error('Failed to copy:', error);
    }
  };

  

  const handleReEnrich = async () => {
    if (!transcription || isEnriching) return;
    setIsEnriching(true); 
    setError(null);
    try {
      const result = await enrichTranscript(transcription, settings.enrichmentMode, settings.outputLanguage);
      setEnrichedContent(result.enrichedContent);
      await refreshUsage();
    } catch (error: unknown) { 
      setError(error instanceof Error ? error.message : 'Processing failed'); 
    }
    finally { setIsEnriching(false); }
  };

  const displayContent = activeTab === 'transcription' ? transcription : enrichedContent;

  return (
    <div className="glass-card rounded-3xl shadow-elevated overflow-hidden animate-fadeIn">
      {/* Tab Switcher */}
      <div className="flex p-1.5 m-3 gap-1 glass-card-darker rounded-xl">
        <button 
          onClick={() => setActiveTab('transcription')} 
          className={`flex-1 px-4 py-2.5 flex items-center justify-center gap-2 rounded-lg transition-all duration-200 text-sm font-medium ${
            activeTab === 'transcription' 
              ? 'bg-slate-700/80 text-white shadow-inner-glow' 
              : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Transcription</span>
        </button>
        <button 
          onClick={() => setActiveTab('enriched')} 
          className={`flex-1 px-4 py-2.5 flex items-center justify-center gap-2 rounded-lg transition-all duration-200 text-sm font-medium ${
            activeTab === 'enriched' 
              ? 'bg-slate-700/80 text-white shadow-inner-glow' 
              : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{getEnrichmentModeLabel(settings.enrichmentMode)}</span>
        </button>
      </div>

      <div className="p-5 pt-2">
        {displayContent ? (
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {activeTab === 'enriched' && transcription && (
                <button 
                  onClick={handleReEnrich} 
                  disabled={isEnriching} 
                  className="btn-secondary flex items-center justify-center gap-1.5 px-3 py-2 text-sm touch-target disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isEnriching ? 'animate-spin' : ''}`} />
                  <span>Retry</span>
                </button>
              )}
              <button 
                onClick={() => setShowShareModal(true)} 
                className="btn-primary flex items-center justify-center gap-1.5 px-3 py-2 text-sm touch-target"
              >
                <Share2 className="w-4 h-4" /><span>Share</span>
              </button>
              <button 
                onClick={() => handleCopy(displayContent, activeTab)} 
                className="btn-secondary flex items-center justify-center gap-1.5 px-3 py-2 text-sm touch-target"
              >
                {copiedField === activeTab ? (
                  <><Check className="w-4 h-4 text-green-400" /><span>Copied</span></>
                ) : (
                  <><Copy className="w-4 h-4" /><span>Copy</span></>
                )}
              </button>
            </div>

            {/* Content Display */}
            <div className="glass-card-darker rounded-2xl p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-slate-200 text-sm font-sans leading-relaxed">
                {displayContent}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-400">
            {activeTab === 'enriched' && transcription ? (
              <div className="space-y-4">
                <p className="text-sm">No processed text yet.</p>
                <button 
                  onClick={handleReEnrich} 
                  disabled={isEnriching} 
                  className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
                >
                  {isEnriching ? 'Processing...' : 'Process with AI'}
                </button>
              </div>
            ) : (
              <p className="text-sm">Record a voice note to see results.</p>
            )}
          </div>
        )}
      </div>
      
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        content={displayContent || ''}
        title={activeTab === 'transcription' ? 'Transcription' : getEnrichmentModeLabel(settings.enrichmentMode)}
      />
    </div>
  );
}
