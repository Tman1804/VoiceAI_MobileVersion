'use client';

import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '@/store/appStore';

// Platform detection - uses User Agent only (plugin-os not available on Android)
export function usePlatform() {
  const [platform, setPlatform] = useState<'desktop' | 'ios' | 'android' | 'web'>('web');
  const [isTauri, setIsTauri] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Detect platform from user agent
    if (/Android/i.test(navigator.userAgent)) {
      setPlatform('android');
    } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      setPlatform('ios');
    } else if (typeof window !== 'undefined' && '__TAURI__' in window) {
      setPlatform('desktop');
    }

    // Check if running in Tauri
    if (typeof window !== 'undefined' && '__TAURI__' in window) {
      setIsTauri(true);
    }
    
    setIsReady(true);
  }, []);

  const isMobile = platform === 'ios' || platform === 'android';
  return { platform, isTauri, isMobile, isReady };
}

export function useTauriIntegration() {
  const { isRecording } = useAppStore();
  const { platform, isTauri, isMobile, isReady } = usePlatform();

  const toggleRecording = useCallback(() => {
    window.dispatchEvent(new CustomEvent('toggle-recording'));
  }, []);

  useEffect(() => {
    // Wait until platform detection is ready
    if (!isReady) return;

    // Keyboard shortcut for web/desktop only
    if (!isTauri || isMobile) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'R') { e.preventDefault(); toggleRecording(); }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }

    // Desktop Tauri with global shortcuts
    if (isTauri && platform === 'desktop') {
      const setupGlobalShortcut = async () => {
        try {
          const { register, unregisterAll } = await import('@tauri-apps/plugin-global-shortcut');
          await unregisterAll();
          await register('CommandOrControl+Shift+R', (event) => {
            if (event.state === 'Pressed') toggleRecording();
          });
          return () => { unregisterAll(); };
        } catch (error) { 
          console.error('Failed to setup global shortcuts:', error); 
        }
      };
      const cleanup = setupGlobalShortcut();
      return () => { cleanup.then((fn) => fn?.()); };
    }
  }, [toggleRecording, isRecording, isTauri, platform, isMobile, isReady]);

  return { platform, isTauri, isMobile, isReady };
}
