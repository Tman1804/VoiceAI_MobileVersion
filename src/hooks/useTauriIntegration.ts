'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';

export function useTauriIntegration() {
  const { isRecording } = useAppStore();

  const toggleRecording = useCallback(() => {
    window.dispatchEvent(new CustomEvent('toggle-recording'));
  }, []);

  useEffect(() => {
    const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
    
    if (!isTauri) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'R') { e.preventDefault(); toggleRecording(); }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }

    const setupTauri = async () => {
      try {
        const { register, unregisterAll } = await import('@tauri-apps/api/globalShortcut');
        const { listen } = await import('@tauri-apps/api/event');
        await unregisterAll();
        await register('CommandOrControl+Shift+R', () => toggleRecording());
        const unlisten = await listen('start-recording', () => { if (!isRecording) toggleRecording(); });
        return () => { unlisten(); unregisterAll(); };
      } catch (error) { console.error('Failed to setup Tauri integration:', error); }
    };
    const cleanup = setupTauri();
    return () => { cleanup.then((fn) => fn?.()); };
  }, [toggleRecording, isRecording]);
}
