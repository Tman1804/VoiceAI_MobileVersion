'use client';

import { ArrowLeft, Clock, Trash2, ChevronRight } from 'lucide-react';
import { useAppStore, Recording } from '@/store/appStore';
import { getEnrichmentModeLabel } from '@/lib/enrichmentService';

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return `Heute, ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Gestern, ${date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return date.toLocaleDateString('de-DE', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function RecordingItem({ recording, onSelect, onDelete }: { recording: Recording; onSelect: () => void; onDelete: () => void }) {
  const preview = recording.enrichedContent || recording.transcription;
  const previewText = preview.slice(0, 100) + (preview.length > 100 ? '...' : '');

  return (
    <div className="bg-slate-900/50 rounded-xl overflow-hidden">
      <button
        onClick={onSelect}
        className="w-full p-4 text-left hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 bg-primary-600/30 text-primary-300 rounded">
                {getEnrichmentModeLabel(recording.mode)}
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(recording.duration)}
              </span>
            </div>
            <p className="text-sm text-slate-300 line-clamp-2">{previewText || 'Keine Transkription'}</p>
            <p className="text-xs text-slate-500 mt-2">{formatDate(recording.timestamp)}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0 mt-1" />
        </div>
      </button>
      <div className="border-t border-slate-800 px-4 py-2 flex justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function HistoryList() {
  const { recordings, setViewMode, setSelectedRecordingId, deleteRecording } = useAppStore();

  return (
    <div className="bg-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => setViewMode('recording')} 
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </button>
        <h2 className="text-xl font-semibold text-white">Aufnahmen</h2>
        <span className="text-sm text-slate-500">({recordings.length})</span>
      </div>

      {recordings.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">Noch keine Aufnahmen</p>
          <p className="text-sm text-slate-500 mt-1">Deine Aufnahmen erscheinen hier</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recordings.map((recording) => (
            <RecordingItem
              key={recording.id}
              recording={recording}
              onSelect={() => setSelectedRecordingId(recording.id)}
              onDelete={() => deleteRecording(recording.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
