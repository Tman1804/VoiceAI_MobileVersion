'use client';

import { useEffect, useCallback, useState } from 'react';
import { useAppStore } from '@/store/appStore';

// Platform detection
export function usePlatform() {
  const [platform, setPlatform] = useState<'desktop' | 'ios' | 'android' | 'web'>('web');
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    const checkPlatform = async () => {
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        setIsTauri(true);
        try {
          const { platform: osPlatform } = await import('@tauri-apps/plugin-os');
          const os = await osPlatform();
          if (os === 'ios') setPlatform('ios');
          else if (os === 'android') setPlatform('android');
          else setPlatform('desktop');
        } catch {
          setPlatform('desktop');
        }
      }
    };
    checkPlatform();
  }, []);

  return { platform, isTauri, isMobile: platform === 'ios' || platform === 'android' };
}

export function useTauriIntegration() {
  const { isRecording } = useAppStore();
  const { platform, isTauri, isMobile } = usePlatform();

  const toggleRecording = useCallback(() => {
    window.dispatchEvent(new CustomEvent('toggle-recording'));
  }, []);

  useEffect(() => {
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
  }, [toggleRecording, isRecording, isTauri, platform, isMobile]);

  return { platform, isTauri, isMobile };
}
