'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { AudioRecorder } from '@/lib/audioRecorder';
import { transcribeAudio } from '@/lib/transcriptionService';
import { enrichTranscript } from '@/lib/enrichmentService';

export function VoiceRecorder() {
  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef(0);
  const [isInitializing, setIsInitializing] = useState(false);

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

  const startRecording = useCallback(async () => {
    try {
      setIsInitializing(true); setError(null);
      if (!recorderRef.current) recorderRef.current = new AudioRecorder();
      await recorderRef.current.initialize();
      recorderRef.current.setOnDataAvailable(processAudio);
      recorderRef.current.setOnError((error) => setError(error.message));
      await recorderRef.current.startRecording();
      setIsRecording(true); 
      durationRef.current = 0;
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setRecordingDuration(durationRef.current);
      }, 1000);
    } catch (error: any) { setError(error.message || 'Failed to start recording'); }
    finally { setIsInitializing(false); }
  }, [processAudio, setError, setIsRecording, setRecordingDuration]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current) recorderRef.current.stopRecording();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
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
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105
            ${isRecording ? 'bg-red-500 hover:bg-red-600 recording-indicator' : isProcessing ? 'bg-slate-600 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700'}
            disabled:opacity-50 disabled:cursor-not-allowed`}>
          {isInitializing ? <Loader2 className="w-10 h-10 text-white animate-spin" /> : isRecording ? <Square className="w-10 h-10 text-white" /> : isProcessing ? <Loader2 className="w-10 h-10 text-white animate-spin" /> : <Mic className="w-10 h-10 text-white" />}
          {isRecording && <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-25" />}
        </button>
        <div className="text-center">
          {isRecording ? (<div className="space-y-2"><p className="text-lg font-medium text-red-400">Recording...</p><p className="text-3xl font-mono text-white">{formatDuration(recordingDuration)}</p><p className="text-sm text-slate-400">Click to stop</p></div>)
          : isTranscribing ? (<div className="space-y-2"><p className="text-lg font-medium text-primary-400">Transcribing...</p><p className="text-sm text-slate-400">Converting speech to text</p></div>)
          : isEnriching ? (<div className="space-y-2"><p className="text-lg font-medium text-primary-400">Processing with AI...</p><p className="text-sm text-slate-400">Enriching your content</p></div>)
          : (<div className="space-y-2"><p className="text-lg font-medium text-slate-300">Ready to Record</p><p className="text-sm text-slate-400">Click the microphone to start</p></div>)}
        </div>
        {isRecording && (<div className="flex items-end justify-center gap-1 h-12">{[...Array(12)].map((_, i) => (<div key={i} className="w-2 bg-red-400 rounded-full waveform-bar" style={{ animationDelay: `${i * 0.1}s`, height: `${20 + Math.random() * 80}%` }} />))}</div>)}
      </div>
    </div>
  );
}
