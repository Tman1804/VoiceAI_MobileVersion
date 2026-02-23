import { createClient } from '@supabase/supabase-js';

// Fallback to hardcoded values if env vars are missing at build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mkjorwwmsmovymtuniyy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ram9yd3dtc21vdnltdHVuaXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4NzAwNzIsImV4cCI6MjA1NTQ0NjA3Mn0.a0hxso2V40G7BVSaVYfGiWHd21xloOUM1EI7sJxpFYU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  // Detect if running in Tauri environment
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const hasTauriGlobal = typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
  const isTauriUrl = hostname.includes('tauri') || hostname.includes('localhost');
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  
  const isTauri = hasTauriGlobal || (isAndroid && isTauriUrl);
  
  console.log('OAuth Debug:', { hostname, hasTauriGlobal, isTauriUrl, isAndroid, isTauri });
  
  if (isTauri) {
    try {
      // For Tauri/Android apps: get OAuth URL and open in external browser
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'voxwarp://callback',
          skipBrowserRedirect: true,
        },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        console.log('Opening OAuth URL with opener plugin:', data.url);
        // Use opener plugin to open URL in external browser (not WebView!)
        const { openUrl } = await import('@tauri-apps/plugin-opener');
        await openUrl(data.url);
      }
      
      return data;
    } catch (err) {
      console.error('OAuth error:', err);
      throw new Error('Google-Login fehlgeschlagen. Bitte nutze Email-Login.');
    }
  } else {
    // For web browser: normal OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });
    if (error) throw error;
    return data;
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Usage tracking
export interface UserUsage {
  tokens_used: number;
  tokens_limit: number;
  plan: 'trial' | 'starter' | 'pro' | 'unlimited';
}

export async function getUserUsage(): Promise<UserUsage | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_usage')
    .select('tokens_used, tokens_limit, plan')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // New user, return trial defaults
    if (error.code === 'PGRST116') {
      return {
        tokens_used: 0,
        tokens_limit: 2500, // Trial: 2500 tokens
        plan: 'trial',
      };
    }
    throw error;
  }

  return data;
}

// Transcription via Edge Function
export async function transcribeViaBackend(audioBlob: Blob, language: string, mode: string): Promise<{
  transcription: string;
  enrichedContent: string;
  tokensUsed: number;
}> {
  const session = await getSession();
  if (!session) {
    throw new Error('Nicht angemeldet. Bitte melde dich an.');
  }

  // Convert blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const base64Audio = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  const response = await fetch(`${supabaseUrl}/functions/v1/transcribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      audio: base64Audio,
      language,
      mode,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Transkription fehlgeschlagen');
  }

  return response.json();
}
