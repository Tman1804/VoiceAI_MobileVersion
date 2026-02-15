'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, Square, Loader2, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { AudioRecorder } from '@/lib/audioRecorder';
import { transcribeAudio } from '@/lib/transcriptionService';
import { enrichTranscript } from '@/lib/enrichmentService';

// Haptic feedback for mobile
const triggerHaptic = (type: 'start' | 'stop') => {
  if ('vibrate' in navigator) {
    navigator.vibrate(type === 'start' ? [50] : [30, 50, 30]);
  }
};

// Screen wake lock to prevent screen from sleeping during recording
let wakeLock: WakeLockSentinel | null = null;

const requestWakeLock = async () => {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (err) {
    console.log('Wake Lock not supported or failed:', err);
  }
};

const releaseWakeLock = async () => {
  if (wakeLock) {
    await wakeLock.release();
    wakeLock = null;
  }
};

// Check if microphone permission was already granted (desktop only - not reliable on mobile WebView)
const checkMicrophonePermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
  // Skip permission pre-check on mobile - just let the browser/system handle it
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return 'granted'; // Skip rationale modal, let getUserMedia trigger native prompt
  }
  
  try {
    if (navigator.permissions) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state as 'granted' | 'denied' | 'prompt';
    }
  } catch {
    // permissions API not supported, just proceed to recording
  }
  return 'granted'; // Default to attempting recording
};

// Permission Rationale Modal Component
function PermissionRationaleModal({ 
  isOpen, 
  onAccept, 
  onDecline 
}: { 
  isOpen: boolean; 
  onAccept: () => void; 
  onDecline: () => void; 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <button onClick={onDecline} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <h2 className="text-xl font-semibold text-white mb-2">
          Microphone Access Required
        </h2>
        
        <p className="text-slate-300 mb-4">
          VoxWarp needs access to your microphone to record audio for transcription.
        </p>
        
        <div className="bg-slate-700/50 rounded-lg p-3 mb-6">
          <p className="text-sm text-slate-400">
            <strong className="text-slate-300">How we use your audio:</strong>
            <br />• Recordings are sent to OpenAI for transcription
            <br />• Audio is not stored on any server
            <br />• You control when recording starts and stops
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Not Now
          </button>
          <button
            onClick={onAccept}
            className="flex-1 px-4 py-2.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            Allow Microphone
          </button>
        </div>
      </div>
    </div>
  );
}

export function VoiceRecorder() {
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const { isRecording, setIsRecording, recordingDuration, setRecordingDuration, setAudioBlob, isTranscribing, setIsTranscribing, isEnriching, setIsEnriching, setTranscription, setEnrichedContent, setError, settings } = useAppStore();

  const processAudio = useCallback(async (blob: Blob) => {
    setAudioBlob(blob);
    setIsTranscribing(true);
    setError(null);
    try {
      const transcript = await transcribeAudio(
        blob, 
        settings.openAiApiKey, 
        settings.outputLanguage, 
        settings.translateToEnglish
      );
      setTranscription(transcript);
      if (settings.autoEnrich && transcript) {
        setIsEnriching(true);
        const enriched = await enrichTranscript(
          transcript, 
          settings.openAiApiKey, 
          settings.enrichmentMode, 
          settings.customPrompt,
          settings.outputLanguage
        );
        setEnrichedContent(enriched);
        if (settings.autoCopyToClipboard) await navigator.clipboard.writeText(enriched);
      }
    } catch (error: any) { setError(error.message || 'An error occurred'); }
    finally { setIsTranscribing(false); setIsEnriching(false); }
  }, [settings, setAudioBlob, setIsTranscribing, setError, setTranscription, setIsEnriching, setEnrichedContent]);

  const doStartRecording = useCallback(async () => {
    try {
      setIsInitializing(true); setError(null);
      if (!recorderRef.current) recorderRef.current = new AudioRecorder();
      await recorderRef.current.initialize();
      recorderRef.current.setOnDataAvailable(processAudio);
      recorderRef.current.setOnError((error) => setError(error.message));
      await recorderRef.current.startRecording();
      setPermissionDenied(false);
      triggerHaptic('start');
      await requestWakeLock();
      setIsRecording(true); 
      durationRef.current = 0;
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setRecordingDuration(durationRef.current);
      }, 1000);
    } catch (error: any) { 
      if (error.message?.includes('denied') || error.message?.includes('Permission')) {
        setPermissionDenied(true);
      }
      setError(error.message || 'Failed to start recording'); 
    }
    finally { setIsInitializing(false); }
  }, [processAudio, setError, setIsRecording, setRecordingDuration]);

  const startRecording = useCallback(async () => {
    const permissionState = await checkMicrophonePermission();
    
    if (permissionState === 'denied') {
      setPermissionDenied(true);
      setError('Microphone access was denied. Please enable it in your device settings.');
      return;
    }
    
    if (permissionState === 'prompt') {
      // Show rationale modal before requesting permission
      setShowPermissionModal(true);
      return;
    }
    
    // Permission already granted, proceed
    doStartRecording();
  }, [doStartRecording, setError]);

  const handlePermissionAccept = useCallback(() => {
    setShowPermissionModal(false);
    doStartRecording();
  }, [doStartRecording]);

  const handlePermissionDecline = useCallback(() => {
    setShowPermissionModal(false);
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current) recorderRef.current.stopRecording();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    triggerHaptic('stop');
    releaseWakeLock();
    setIsRecording(false);
  }, [setIsRecording]);

  const toggleRecording = useCallback(() => { if (isRecording) stopRecording(); else startRecording(); }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    const handleToggle = () => toggleRecording();
    window.addEventListener('toggle-recording', handleToggle);
    return () => window.removeEventListener('toggle-recording', handleToggle);
  }, [toggleRecording]);

  useEffect(() => { return () => { recorderRef.current?.cleanup(); if (timerRef.current) clearInterval(timerRef.current); }; }, []);

  const formatDuration = (seconds: number): string => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  const isProcessing = isTranscribing || isEnriching;

  return (
    <div className="bg-slate-800 rounded-2xl p-8 shadow-xl">
      <div className="flex flex-col items-center gap-6">
        <button onClick={toggleRecording} disabled={isInitializing || isProcessing}
          className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 touch-target
            ${isRecording ? 'bg-red-500 hover:bg-red-600 recording-indicator' : isProcessing ? 'bg-slate-600 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}
            disabled:opacity-50 disabled:cursor-not-allowed`}>
          {isInitializing ? <Loader2 className="w-12 h-12 sm:w-14 sm:h-14 text-white animate-spin" /> : isRecording ? <Square className="w-12 h-12 sm:w-14 sm:h-14 text-white" /> : isProcessing ? <Loader2 className="w-12 h-12 sm:w-14 sm:h-14 text-white animate-spin" /> : <Mic className="w-12 h-12 sm:w-14 sm:h-14 text-white" />}
          {isRecording && <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" />}
        </button>
        <div className="text-center">
          {isRecording ? (<div className="space-y-2"><p className="text-lg font-medium text-red-400">Recording...</p><p className="text-3xl font-mono text-white">{formatDuration(recordingDuration)}</p><p className="text-sm text-slate-400">Tap to stop</p></div>)
          : isTranscribing ? (<div className="space-y-2"><p className="text-lg font-medium text-primary-400">Transcribing...</p><p className="text-sm text-slate-400">Converting speech to text</p></div>)
          : isEnriching ? (<div className="space-y-2"><p className="text-lg font-medium text-primary-400">Processing with AI...</p><p className="text-sm text-slate-400">Enriching your content</p></div>)
          : (<div className="space-y-2"><p className="text-lg font-medium text-slate-300">Ready to Record</p><p className="text-sm text-slate-400">Tap the microphone to start</p></div>)}
        </div>
        {isRecording && (<div className="flex items-end justify-center gap-1 h-12">{[...Array(12)].map((_, i) => (<div key={i} className="w-2 bg-red-400 rounded-full waveform-bar" style={{ animationDelay: `${i * 0.1}s`, height: `${20 + Math.random() * 80}%` }} />))}</div>)}
        {permissionDenied && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-center">
            <p className="text-sm text-red-300">
              Microphone access denied. Please enable it in your device settings to use voice recording.
            </p>
          </div>
        )}
      </div>
      <PermissionRationaleModal 
        isOpen={showPermissionModal} 
        onAccept={handlePermissionAccept} 
        onDecline={handlePermissionDecline} 
      />
    </div>
  );
}
