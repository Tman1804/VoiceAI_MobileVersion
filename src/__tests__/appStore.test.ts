import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/appStore';
import { act } from '@testing-library/react';

describe('appStore', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    const store = useAppStore.getState();
    store.reset();
    // Clear recordings
    useAppStore.setState({ recordings: [], selectedRecordingId: null });
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = useAppStore.getState();
      
      expect(state.isRecording).toBe(false);
      expect(state.recordingDuration).toBe(0);
      expect(state.audioBlob).toBeNull();
      expect(state.isTranscribing).toBe(false);
      expect(state.isEnriching).toBe(false);
      expect(state.transcription).toBe('');
      expect(state.enrichedContent).toBe('');
      expect(state.error).toBeNull();
    });

    it('has correct default settings', () => {
      const { settings } = useAppStore.getState();
      
      expect(settings.whisperModel).toBe('whisper-1');
      expect(settings.enrichmentMode).toBe('clean-transcript');
      expect(settings.autoEnrich).toBe(true);
      expect(settings.autoCopyToClipboard).toBe(false);
      expect(settings.outputLanguage).toBe('auto');
    });
  });

  describe('Recording Actions', () => {
    it('setIsRecording updates recording state', () => {
      const store = useAppStore.getState();
      
      store.setIsRecording(true);
      expect(useAppStore.getState().isRecording).toBe(true);
      
      store.setIsRecording(false);
      expect(useAppStore.getState().isRecording).toBe(false);
    });

    it('setRecordingDuration updates duration', () => {
      const store = useAppStore.getState();
      
      store.setRecordingDuration(60);
      expect(useAppStore.getState().recordingDuration).toBe(60);
    });

    it('setAudioBlob updates blob', () => {
      const store = useAppStore.getState();
      const mockBlob = new Blob(['test'], { type: 'audio/webm' });
      
      store.setAudioBlob(mockBlob);
      expect(useAppStore.getState().audioBlob).toBe(mockBlob);
    });
  });

  describe('Transcription Actions', () => {
    it('setIsTranscribing updates state', () => {
      const store = useAppStore.getState();
      
      store.setIsTranscribing(true);
      expect(useAppStore.getState().isTranscribing).toBe(true);
    });

    it('setTranscription updates transcription', () => {
      const store = useAppStore.getState();
      const text = 'This is a test transcription.';
      
      store.setTranscription(text);
      expect(useAppStore.getState().transcription).toBe(text);
    });

    it('setEnrichedContent updates enriched content', () => {
      const store = useAppStore.getState();
      const text = 'This is enriched content.';
      
      store.setEnrichedContent(text);
      expect(useAppStore.getState().enrichedContent).toBe(text);
    });
  });

  describe('Settings Actions', () => {
    it('updateSettings partially updates settings', () => {
      const store = useAppStore.getState();
      
      store.updateSettings({ enrichmentMode: 'summarize' });
      
      const { settings } = useAppStore.getState();
      expect(settings.enrichmentMode).toBe('summarize');
      // Other settings should remain unchanged
      expect(settings.autoEnrich).toBe(true);
    });

    it('updateSettings can update multiple settings at once', () => {
      const store = useAppStore.getState();
      
      store.updateSettings({
        enrichmentMode: 'meeting-notes',
        outputLanguage: 'de',
        autoCopyToClipboard: true,
      });
      
      const { settings } = useAppStore.getState();
      expect(settings.enrichmentMode).toBe('meeting-notes');
      expect(settings.outputLanguage).toBe('de');
      expect(settings.autoCopyToClipboard).toBe(true);
    });
  });

  describe('View Mode Actions', () => {
    it('setViewMode changes view mode', () => {
      const store = useAppStore.getState();
      
      store.setViewMode('settings');
      expect(useAppStore.getState().viewMode).toBe('settings');
      expect(useAppStore.getState().showSettings).toBe(true);
      
      store.setViewMode('recording');
      expect(useAppStore.getState().viewMode).toBe('recording');
      expect(useAppStore.getState().showSettings).toBe(false);
    });

    it('setShowSettings updates both showSettings and viewMode', () => {
      const store = useAppStore.getState();
      
      store.setShowSettings(true);
      expect(useAppStore.getState().showSettings).toBe(true);
      expect(useAppStore.getState().viewMode).toBe('settings');
    });
  });

  describe('Recording History Actions', () => {
    it('addRecording adds a recording with unique ID', () => {
      const store = useAppStore.getState();
      
      store.addRecording({
        timestamp: Date.now(),
        duration: 30,
        transcription: 'Test transcription',
        enrichedContent: 'Test enriched',
        mode: 'clean-transcript',
        language: 'auto',
      });
      
      const { recordings } = useAppStore.getState();
      expect(recordings).toHaveLength(1);
      expect(recordings[0].transcription).toBe('Test transcription');
      expect(recordings[0].id).toBeDefined();
    });

    it('deleteRecording removes recording by ID', () => {
      const store = useAppStore.getState();
      
      // Add a recording first
      store.addRecording({
        timestamp: Date.now(),
        duration: 30,
        transcription: 'Test',
        enrichedContent: '',
        mode: 'clean-transcript',
        language: 'auto',
      });
      
      const recordingId = useAppStore.getState().recordings[0].id;
      
      store.deleteRecording(recordingId);
      expect(useAppStore.getState().recordings).toHaveLength(0);
    });

    it('setSelectedRecordingId updates selection and view mode', () => {
      const store = useAppStore.getState();
      
      store.addRecording({
        timestamp: Date.now(),
        duration: 30,
        transcription: 'Test',
        enrichedContent: '',
        mode: 'clean-transcript',
        language: 'auto',
      });
      
      const recordingId = useAppStore.getState().recordings[0].id;
      
      store.setSelectedRecordingId(recordingId);
      expect(useAppStore.getState().selectedRecordingId).toBe(recordingId);
      expect(useAppStore.getState().viewMode).toBe('history-detail');
    });
  });

  describe('Reset Action', () => {
    it('reset clears transient state but keeps settings', () => {
      const store = useAppStore.getState();
      
      // Set some state
      store.setIsRecording(true);
      store.setRecordingDuration(100);
      store.setTranscription('Some text');
      store.setError('Some error');
      store.updateSettings({ enrichmentMode: 'summarize' });
      
      // Reset
      store.reset();
      
      const state = useAppStore.getState();
      expect(state.isRecording).toBe(false);
      expect(state.recordingDuration).toBe(0);
      expect(state.transcription).toBe('');
      expect(state.error).toBeNull();
      // Settings should be preserved (handled by persist middleware)
      expect(state.settings.enrichmentMode).toBe('summarize');
    });
  });

  describe('Error Handling', () => {
    it('setError sets and clears errors', () => {
      const store = useAppStore.getState();
      
      store.setError('Test error message');
      expect(useAppStore.getState().error).toBe('Test error message');
      
      store.setError(null);
      expect(useAppStore.getState().error).toBeNull();
    });
  });
});
