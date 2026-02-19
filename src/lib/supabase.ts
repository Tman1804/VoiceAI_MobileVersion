import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Running in offline mode.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

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
  // Check if running in Tauri (mobile/desktop app)
  // Multiple checks for robustness across platforms
  const isTauri = typeof window !== 'undefined' && (
    '__TAURI__' in window || 
    '__TAURI_INTERNALS__' in window ||
    window.location.protocol === 'tauri:' ||
    window.location.hostname === 'tauri.localhost'
  );
  
  console.log('signInWithGoogle - isTauri:', isTauri, 'protocol:', window?.location?.protocol, 'hostname:', window?.location?.hostname);
  
  if (isTauri) {
    try {
      // For Tauri apps: open OAuth URL in system browser
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'voxwarp://auth/callback',
          skipBrowserRedirect: true,
        },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        console.log('Opening OAuth URL in system browser:', data.url);
        // Open in system browser using Tauri shell
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(data.url);
      }
      
      return data;
    } catch (shellError) {
      console.error('Failed to open in system browser:', shellError);
      throw new Error('Google-Login auf diesem Gerät nicht verfügbar. Bitte nutze Email-Login.');
    }
  } else {
    // For web: normal OAuth flow
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
