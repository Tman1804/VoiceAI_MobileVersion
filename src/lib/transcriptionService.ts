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

  // Get session - simple, no refresh to avoid hangs
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    throw new Error(`Session-Fehler: ${sessionError.message}`);
  }
  
  if (!session?.access_token) {
    throw new Error('Nicht eingeloggt. Bitte melde dich an.');
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

