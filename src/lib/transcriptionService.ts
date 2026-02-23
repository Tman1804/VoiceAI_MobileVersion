import { supabase } from './supabase';
import { OutputLanguage, EnrichmentMode } from '@/store/appStore';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface TranscriptionResult {
  transcription: string;
  enrichedContent: string;
  tokensUsed: number;
}

export async function transcribeAudio(
  audioBlob: Blob,
  language: OutputLanguage = 'auto',
  mode: EnrichmentMode = 'clean-transcript'
): Promise<TranscriptionResult> {
  // Check config
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Server-Konfiguration fehlt. Bitte App neu installieren.');
  }

  if (audioBlob.size > 25 * 1024 * 1024) {
    throw new Error('Aufnahme zu lang. Bitte halte Aufnahmen unter 25MB.');
  }

  // Get fresh session
  let { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    throw new Error(`Session-Fehler: ${sessionError.message}`);
  }
  
  if (!session?.access_token) {
    throw new Error('Nicht eingeloggt. Bitte melde dich an.');
  }

  // Check if token is expired and try to refresh
  const tokenParts = session.access_token.split('.');
  if (tokenParts.length === 3) {
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now + 60) { // Expired or expiring in 60s
        // Try to refresh with 5 second timeout
        const refreshPromise = supabase.auth.refreshSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Refresh timeout')), 5000)
        );
        
        try {
          const refreshResult = await Promise.race([refreshPromise, timeoutPromise]) as { data: { session: typeof session }, error: Error | null };
          if (refreshResult.data?.session) {
            session = refreshResult.data.session;
          }
        } catch {
          throw new Error('Session abgelaufen. Bitte neu einloggen.');
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('abgelaufen')) throw e;
      // If we can't parse token, continue - server will validate
    }
  }

  // Convert blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const audioBase64 = btoa(binary);

  // Call Supabase Edge Function with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  const fetchUrl = `${SUPABASE_URL}/functions/v1/transcribe`;

  try {
    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: audioBase64,
        language: language === 'auto' ? undefined : language,
        mode,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server-Fehler (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    return {
      transcription: result.transcription || '',
      enrichedContent: result.enrichedContent || '',
      tokensUsed: result.tokensUsed || 0,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Zeitüberschreitung. Bitte versuche es erneut.');
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Transkription fehlgeschlagen: ${message}`);
  }
}

