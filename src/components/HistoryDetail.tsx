'use client';

import { ArrowLeft, Copy, Share2, Trash2, Clock, Check } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { getEnrichmentModeLabel } from '@/lib/enrichmentService';
import { useState } from 'react';

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function HistoryDetail() {
  const { recordings, selectedRecordingId, setSelectedRecordingId, deleteRecording, setViewMode } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const recording = recordings.find(r => r.id === selectedRecordingId);

  if (!recording) {
    return (
      <div className="bg-slate-800 rounded-2xl p-6 shadow-xl text-center">
        <p className="text-slate-400">Aufnahme nicht gefunden</p>
        <button 
          onClick={() => setViewMode('history')}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg"
        >
          Zurück zur Liste
        </button>
      </div>
    );
  }

  const content = showTranscript ? recording.transcription : (recording.enrichedContent || recording.transcription);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: content });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  const handleDelete = () => {
    deleteRecording(recording.id);
  };

  return (
    <div className="bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedRecordingId(null)} 
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 bg-primary-600/30 text-primary-300 rounded">
                {getEnrichmentModeLabel(recording.mode)}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(recording.duration)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{formatDate(recording.timestamp)}</p>
          </div>
          <button
            onClick={handleDelete}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toggle for transcript vs enriched */}
      {recording.enrichedContent && recording.transcription && (
        <div className="px-4 pt-4">
          <div className="flex gap-2 p-1 bg-slate-900 rounded-lg">
            <button
              onClick={() => setShowTranscript(false)}
              className={`flex-1 py-2 text-sm rounded-md transition-colors ${!showTranscript ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Verarbeitet
            </button>
            <button
              onClick={() => setShowTranscript(true)}
              className={`flex-1 py-2 text-sm rounded-md transition-colors ${showTranscript ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Original
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="bg-slate-900/50 rounded-xl p-4 max-h-[50vh] overflow-y-auto">
          <p className="text-slate-200 whitespace-pre-wrap">{content}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-700 flex gap-3">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Teilen
        </button>
        <button
          onClick={handleCopy}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Kopiert!' : 'Kopieren'}
        </button>
      </div>
    </div>
  );
}
