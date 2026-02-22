'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, Square, Loader2, X } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { AudioRecorder } from '@/lib/audioRecorder';
import { transcribeAudio } from '@/lib/transcriptionService';

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="glass-card rounded-3xl max-w-md w-full p-6 shadow-elevated-lg animate-slide-up">
        <div className="flex justify-between items-start mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-glow">
            <Mic className="w-7 h-7 text-white" />
          </div>
          <button 
            onClick={onDecline} 
            className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        
        <h2 className="text-xl font-bold text-white mb-2">
          Microphone Access Required
        </h2>
        
        <p className="text-slate-300 mb-6">
          VoxWarp needs access to your microphone to record audio for transcription.
        </p>
        
        <div className="glass-card-darker rounded-xl p-4 mb-6">
          <p className="text-sm text-slate-400 space-y-1.5">
            <span className="block text-slate-300 font-medium mb-2">How we use your audio:</span>
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 bg-primary-400 rounded-full" />
              Recordings are sent to OpenAI for transcription
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 bg-primary-400 rounded-full" />
              Audio is not stored on any server
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 bg-primary-400 rounded-full" />
              You control when recording starts and stops
            </span>
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="btn-secondary flex-1 px-4 py-3"
          >
            Not Now
          </button>
          <button
            onClick={onAccept}
            className="btn-primary flex-1 px-4 py-3"
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

  const { isRecording, setIsRecording, recordingDuration, setRecordingDuration, setAudioBlob, isTranscribing, setIsTranscribing, isEnriching, setIsEnriching, setTranscription, setEnrichedContent, setError, settings, addRecording } = useAppStore();
  const { refreshUsage } = useAuthStore();

  const processAudio = useCallback(async (blob: Blob) => {
    const finalDuration = durationRef.current;
    setAudioBlob(blob);
    setIsTranscribing(true);
    setError(null);
    let transcript = '';
    let enriched = '';
    try {
      // Call Edge Function which does transcription + enrichment in one call
      const result = await transcribeAudio(
        blob,
        settings.outputLanguage,
        settings.autoEnrich ? settings.enrichmentMode : 'clean-transcript'
      );
      
      transcript = result.transcription;
      enriched = result.enrichedContent;
      
      setTranscription(transcript);
      if (enriched) {
        setEnrichedContent(enriched);
        if (settings.autoCopyToClipboard) await navigator.clipboard.writeText(enriched);
      } else if (settings.autoCopyToClipboard && transcript) {
        await navigator.clipboard.writeText(transcript);
      }
      
      // Refresh usage after transcription
      await refreshUsage();
      
      // Auto-save to history
      if (transcript) {
        addRecording({
          timestamp: Date.now(),
          duration: finalDuration,
          transcription: transcript,
          enrichedContent: enriched,
          mode: settings.enrichmentMode,
          language: settings.outputLanguage
        });
      }
    } catch (error: any) { setError(error.message || 'Ein Fehler ist aufgetreten'); }
    finally { setIsTranscribing(false); setIsEnriching(false); }
  }, [settings, setAudioBlob, setIsTranscribing, setError, setTranscription, setIsEnriching, setEnrichedContent, addRecording, refreshUsage]);

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
    <div className="glass-card rounded-3xl p-8 shadow-elevated animate-fadeIn">
      <div className="flex flex-col items-center gap-8">
        {/* Recording Button */}
        <div className="relative">
          {/* Outer glow rings */}
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-500/20 ring-pulse" />
              <span className="absolute inset-0 rounded-full bg-red-500/10 ring-pulse" style={{ animationDelay: '0.5s' }} />
            </>
          )}
          
          <button 
            onClick={toggleRecording} 
            disabled={isInitializing || isProcessing}
            className={`
              recording-btn relative w-32 h-32 sm:w-36 sm:h-36 rounded-full 
              flex items-center justify-center touch-target
              transition-all duration-500 ease-out transform 
              hover:scale-[1.03] active:scale-[0.97]
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              focus:outline-none focus:ring-4 focus:ring-offset-4 focus:ring-offset-slate-900
              ${isRecording 
                ? 'bg-gradient-to-br from-red-500 to-red-600 recording-btn-active focus:ring-red-500/50' 
                : isProcessing 
                  ? 'bg-slate-700' 
                  : 'bg-gradient-to-br from-primary-500 to-primary-600 shadow-glow hover:shadow-glow-lg focus:ring-primary-500/50'
              }
            `}
          >
            {/* Inner shine */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-60" />
            
            {/* Icon */}
            <span className="relative z-10">
              {isInitializing ? (
                <Loader2 className="w-14 h-14 sm:w-16 sm:h-16 text-white animate-spin" />
              ) : isRecording ? (
                <Square className="w-12 h-12 sm:w-14 sm:h-14 text-white drop-shadow-lg" />
              ) : isProcessing ? (
                <Loader2 className="w-14 h-14 sm:w-16 sm:h-16 text-white/80 animate-spin" />
              ) : (
                <Mic className="w-14 h-14 sm:w-16 sm:h-16 text-white drop-shadow-lg" />
              )}
            </span>
          </button>
        </div>

        {/* Status Text */}
        <div className="text-center space-y-3">
          {isRecording ? (
            <>
              <p className="text-lg font-semibold text-red-400 tracking-wide">Recording</p>
              <p className="text-4xl font-mono font-bold text-white tabular-nums tracking-tight">
                {formatDuration(recordingDuration)}
              </p>
              <p className="text-sm text-slate-400">Tap to stop</p>
            </>
          ) : isTranscribing ? (
            <>
              <p className="text-lg font-semibold text-primary-400">Transcribing</p>
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              <p className="text-sm text-slate-400">Converting speech to text</p>
            </>
          ) : isEnriching ? (
            <>
              <p className="text-lg font-semibold text-gradient">Processing with AI</p>
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
              <p className="text-sm text-slate-400">Enriching your content</p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-slate-200">Ready to Record</p>
              <p className="text-sm text-slate-400">Tap the microphone to start</p>
            </>
          )}
        </div>

        {/* Waveform Visualization */}
        {isRecording && (
          <div className="flex items-end justify-center gap-1.5 h-16 px-4">
            {[...Array(16)].map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 bg-gradient-to-t from-red-500 to-red-400 rounded-full waveform-bar"
                style={{ 
                  animationDelay: `${i * 0.08}s`,
                  height: '100%',
                }} 
              />
            ))}
          </div>
        )}

        {/* Permission Denied Warning */}
        {permissionDenied && (
          <div className="mt-2 p-4 glass-card-darker rounded-xl border-red-500/20 text-center max-w-sm">
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
