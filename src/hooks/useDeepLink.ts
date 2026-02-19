'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useDeepLink() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Only run in Tauri environment
    if (typeof window === 'undefined' || !('__TAURI__' in window)) {
      return;
    }

    const handleDeepLink = async () => {
      try {
        const { onOpenUrl, getCurrent } = await import('@tauri-apps/plugin-deep-link');
        
        // Check if app was launched via deep link (initial URL)
        try {
          const initialUrls = await getCurrent();
          if (initialUrls && initialUrls.length > 0) {
            console.log('App launched with deep link:', initialUrls);
            for (const url of initialUrls) {
              if (url.startsWith('voxwarp://callback')) {
                await handleAuthCallback(url);
              }
            }
          }
        } catch (e) {
          console.log('No initial deep link URL');
        }
        
        // Listen for deep link events while app is running
        const unlisten = await onOpenUrl(async (urls) => {
          for (const url of urls) {
            console.log('Deep link received:', url);
            
            // Check if it's an auth callback (voxwarp://callback#access_token=...)
            if (url.startsWith('voxwarp://callback')) {
              await handleAuthCallback(url);
            }
          }
        });

        return () => {
          unlisten();
        };
      } catch (error) {
        console.error('Failed to setup deep link handler:', error);
      }
    };

    const cleanup = handleDeepLink();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [initialize]);

  const handleAuthCallback = async (url: string) => {
    try {
      console.log('Processing auth callback:', url);
      
      // Parse the URL to extract tokens
      // The URL format from Supabase is: voxwarp://callback#access_token=...&refresh_token=...
      const hashIndex = url.indexOf('#');
      if (hashIndex === -1) {
        console.error('No hash fragment in callback URL');
        return;
      }

      const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        // Set the session in Supabase
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Failed to set session:', error);
          return;
        }

        // Re-initialize auth store to update UI
        const { initialize } = useAuthStore.getState();
        await initialize();
        
        console.log('OAuth login successful!');
      }
    } catch (error) {
      console.error('Error handling auth callback:', error);
    }
  };
}
