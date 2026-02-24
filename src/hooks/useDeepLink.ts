'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useDeepLink() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    // Only run in Tauri environment
    if (typeof window === 'undefined') {
      return;
    }
    
    // Check for Tauri
    const hasTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window;
    if (!hasTauri) {
      console.log('Not in Tauri environment, skipping deep link setup');
      return;
    }

    console.log('Setting up deep link handler...');

    const handleDeepLink = async () => {
      try {
        const deepLinkModule = await import('@tauri-apps/plugin-deep-link');
        console.log('Deep link module loaded:', Object.keys(deepLinkModule));
        
        const { onOpenUrl } = deepLinkModule;
        
        // Try to get current/initial URL if available
        if ('getCurrent' in deepLinkModule) {
          try {
            const getCurrent = deepLinkModule.getCurrent as () => Promise<string[] | null>;
            const initialUrls = await getCurrent();
            console.log('Initial deep link URLs:', initialUrls);
            if (initialUrls && initialUrls.length > 0) {
              for (const url of initialUrls) {
                if (url.includes('voxwarp://')) {
                  console.log('Processing initial callback URL:', url);
                  await handleAuthCallback(url);
                }
              }
            }
          } catch (e) {
            console.log('getCurrent not available or failed:', e);
          }
        }
        
        // Listen for deep link events while app is running
        console.log('Registering onOpenUrl listener...');
        const unlisten = await onOpenUrl(async (urls) => {
          console.log('Deep link event received:', urls);
          for (const url of urls) {
            if (url.includes('voxwarp://')) {
              console.log('Processing callback URL:', url);
              await handleAuthCallback(url);
            }
          }
        });
        console.log('Deep link listener registered successfully');

        return () => {
          console.log('Cleaning up deep link listener');
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
}

async function handleAuthCallback(url: string) {
  try {
    console.log('handleAuthCallback called with:', url);
    
    // Parse the URL to extract tokens
    // The URL format from Supabase is: voxwarp://callback#access_token=...&refresh_token=...
    // Or sometimes: voxwarp://callback?access_token=...
    let params: URLSearchParams;
    
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');
    
    if (hashIndex !== -1) {
      params = new URLSearchParams(url.substring(hashIndex + 1));
      console.log('Parsing hash params');
    } else if (queryIndex !== -1) {
      params = new URLSearchParams(url.substring(queryIndex + 1));
      console.log('Parsing query params');
    } else {
      console.error('No hash or query fragment in callback URL');
      return;
    }

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    
    console.log('Tokens found:', { 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length,
      refreshTokenLength: refreshToken?.length
    });

    if (accessToken && refreshToken) {
      console.log('Setting Supabase session...');
      
      // Set the session in Supabase
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('Failed to set session:', error);
        return;
      }

      console.log('Session set successfully:', data.user?.email);

      // Directly update the auth store state (don't wait for onAuthStateChange)
      if (data.session && data.user) {
        const { setSession, setUser, setUsage, setLoading } = useAuthStore.getState();
        setSession(data.session);
        setUser(data.user);
        
        // Load usage immediately
        const { getUserUsage } = await import('@/lib/supabase');
        const usage = await getUserUsage(data.user.id);
        setUsage(usage);
        setLoading(false);
        
        console.log('Auth store updated directly, OAuth login complete!');
      }
    } else {
      console.error('Missing tokens in callback URL');
    }
  } catch (error) {
    console.error('Error handling auth callback:', error);
  }
}
