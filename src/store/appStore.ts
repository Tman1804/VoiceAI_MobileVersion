import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EnrichmentMode = 'summarize' | 'action-items' | 'meeting-notes' | 'clean-transcript' | 'custom';

export type OutputLanguage = 'auto' | 'de' | 'en' | 'fr' | 'es' | 'it' | 'pt' | 'nl' | 'pl' | 'ru' | 'ja' | 'zh' | 'ko';

export interface Recording {
  id: string;
  timestamp: number;
  duration: number;
  transcription: string;
  enrichedContent: string;
  mode: EnrichmentMode;
  language: OutputLanguage;
}

interface Settings {
  openAiApiKey: string;
  whisperModel: 'whisper-1';
  enrichmentMode: EnrichmentMode;
  customPrompt: string;
  autoEnrich: boolean;
  autoCopyToClipboard: boolean;
  outputLanguage: OutputLanguage;
  translateToEnglish: boolean;
}

type ViewMode = 'recording' | 'settings' | 'history' | 'history-detail';

interface AppState {
  isRecording: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  isTranscribing: boolean;
  isEnriching: boolean;
  transcription: string;
  enrichedContent: string;
  showSettings: boolean;
  viewMode: ViewMode;
  error: string | null;
  settings: Settings;
  recordings: Recording[];
  selectedRecordingId: string | null;
  setIsRecording: (value: boolean) => void;
  setRecordingDuration: (value: number) => void;
  setAudioBlob: (blob: Blob | null) => void;
  setIsTranscribing: (value: boolean) => void;
  setIsEnriching: (value: boolean) => void;
  setTranscription: (value: string) => void;
  setEnrichedContent: (value: string) => void;
  setShowSettings: (value: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setError: (value: string | null) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  addRecording: (recording: Omit<Recording, 'id'>) => void;
  deleteRecording: (id: string) => void;
  setSelectedRecordingId: (id: string | null) => void;
  reset: () => void;
}

const defaultSettings: Settings = {
  openAiApiKey: '',
  whisperModel: 'whisper-1',
  enrichmentMode: 'clean-transcript',
  customPrompt: '',
  autoEnrich: true,
  autoCopyToClipboard: false,
  outputLanguage: 'auto',
  translateToEnglish: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isRecording: false,
      recordingDuration: 0,
      audioBlob: null,
      isTranscribing: false,
      isEnriching: false,
      transcription: '',
      enrichedContent: '',
      showSettings: false,
      viewMode: 'recording' as ViewMode,
      error: null,
      settings: defaultSettings,
      recordings: [],
      selectedRecordingId: null,
      setIsRecording: (value) => set({ isRecording: value }),
      setRecordingDuration: (value) => set({ recordingDuration: value }),
      setAudioBlob: (blob) => set({ audioBlob: blob }),
      setIsTranscribing: (value) => set({ isTranscribing: value }),
      setIsEnriching: (value) => set({ isEnriching: value }),
      setTranscription: (value) => set({ transcription: value }),
      setEnrichedContent: (value) => set({ enrichedContent: value }),
      setShowSettings: (value) => set({ showSettings: value, viewMode: value ? 'settings' : 'recording' }),
      setViewMode: (mode) => set({ viewMode: mode, showSettings: mode === 'settings' }),
      setError: (value) => set({ error: value }),
      updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
      addRecording: (recording) => set((state) => ({
        recordings: [{ ...recording, id: crypto.randomUUID() }, ...state.recordings]
      })),
      deleteRecording: (id) => set((state) => ({
        recordings: state.recordings.filter(r => r.id !== id),
        selectedRecordingId: state.selectedRecordingId === id ? null : state.selectedRecordingId,
        viewMode: state.selectedRecordingId === id ? 'history' : state.viewMode
      })),
      setSelectedRecordingId: (id) => set({ selectedRecordingId: id, viewMode: id ? 'history-detail' : 'history' }),
      reset: () => set({ isRecording: false, recordingDuration: 0, audioBlob: null, isTranscribing: false, isEnriching: false, transcription: '', enrichedContent: '', error: null }),
    }),
    { name: 'voice-note-ai-storage', partialize: (state) => ({ settings: state.settings, recordings: state.recordings }) }
  )
);
