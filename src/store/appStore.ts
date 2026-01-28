import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EnrichmentMode = 'summarize' | 'action-items' | 'meeting-notes' | 'clean-transcript' | 'custom';

export type OutputLanguage = 'auto' | 'de' | 'en' | 'fr' | 'es' | 'it' | 'pt' | 'nl' | 'pl' | 'ru' | 'ja' | 'zh' | 'ko';

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

interface AppState {
  isRecording: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  isTranscribing: boolean;
  isEnriching: boolean;
  transcription: string;
  enrichedContent: string;
  showSettings: boolean;
  error: string | null;
  settings: Settings;
  setIsRecording: (value: boolean) => void;
  setRecordingDuration: (value: number) => void;
  setAudioBlob: (blob: Blob | null) => void;
  setIsTranscribing: (value: boolean) => void;
  setIsEnriching: (value: boolean) => void;
  setTranscription: (value: string) => void;
  setEnrichedContent: (value: string) => void;
  setShowSettings: (value: boolean) => void;
  setError: (value: string | null) => void;
  updateSettings: (settings: Partial<Settings>) => void;
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
      error: null,
      settings: defaultSettings,
      setIsRecording: (value) => set({ isRecording: value }),
      setRecordingDuration: (value) => set({ recordingDuration: value }),
      setAudioBlob: (blob) => set({ audioBlob: blob }),
      setIsTranscribing: (value) => set({ isTranscribing: value }),
      setIsEnriching: (value) => set({ isEnriching: value }),
      setTranscription: (value) => set({ transcription: value }),
      setEnrichedContent: (value) => set({ enrichedContent: value }),
      setShowSettings: (value) => set({ showSettings: value }),
      setError: (value) => set({ error: value }),
      updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
      reset: () => set({ isRecording: false, recordingDuration: 0, audioBlob: null, isTranscribing: false, isEnriching: false, transcription: '', enrichedContent: '', error: null }),
    }),
    { name: 'voice-note-ai-storage', partialize: (state) => ({ settings: state.settings }) }
  )
);
