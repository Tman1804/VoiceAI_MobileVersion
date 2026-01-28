'use client';

import { useState } from 'react';
import { Copy, Download, Check, FileText, Sparkles, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { enrichTranscript, getEnrichmentModeLabel } from '@/lib/enrichmentService';

export function ResultsDisplay() {
  const { transcription, enrichedContent, settings, isEnriching, setIsEnriching, setEnrichedContent, setError } = useAppStore();
  const [activeTab, setActiveTab] = useState<'transcription' | 'enriched'>('enriched');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) { console.error('Failed to copy:', error); }
  };

  const handleExport = async (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReEnrich = async () => {
    if (!transcription || isEnriching) return;
    setIsEnriching(true); setError(null);
    try {
      const enriched = await enrichTranscript(transcription, settings.openAiApiKey, settings.enrichmentMode, settings.customPrompt);
      setEnrichedContent(enriched);
    } catch (error: any) { setError(error.message || 'Failed to enrich transcript'); }
    finally { setIsEnriching(false); }
  };

  const displayContent = activeTab === 'transcription' ? transcription : enrichedContent;

  return (
    <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
      <div className="flex border-b border-slate-700">
        <button onClick={() => setActiveTab('transcription')} className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors ${activeTab === 'transcription' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
          <FileText className="w-4 h-4" /><span>Transcription</span>
        </button>
        <button onClick={() => setActiveTab('enriched')} className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors ${activeTab === 'enriched' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}>
          <Sparkles className="w-4 h-4" /><span>{getEnrichmentModeLabel(settings.enrichmentMode)}</span>
        </button>
      </div>
      <div className="p-6">
        {displayContent ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeTab === 'enriched' && transcription && (
                  <button onClick={handleReEnrich} disabled={isEnriching} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${isEnriching ? 'animate-spin' : ''}`} />Re-process
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleCopy(displayContent, activeTab)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
                  {copiedField === activeTab ? (<><Check className="w-4 h-4 text-green-400" />Copied!</>) : (<><Copy className="w-4 h-4" />Copy</>)}
                </button>
                <button onClick={() => handleExport(displayContent, `voice-note-${activeTab}.txt`)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />Export
                </button>
              </div>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-slate-200 text-sm font-sans leading-relaxed">{displayContent}</pre>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            {activeTab === 'enriched' && transcription ? (
              <div className="space-y-4"><p>No enriched content yet.</p>
                <button onClick={handleReEnrich} disabled={isEnriching} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50">{isEnriching ? 'Processing...' : 'Process with AI'}</button>
              </div>
            ) : (<p>Record a voice note to see results here.</p>)}
          </div>
        )}
      </div>
    </div>
  );
}
