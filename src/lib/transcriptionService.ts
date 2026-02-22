import { supabase } from './supabase';
import { OutputLanguage, EnrichmentMode } from '@/store/appStore';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

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
  if (audioBlob.size > 25 * 1024 * 1024) {
    throw new Error('Aufnahme zu lang. Bitte halte Aufnahmen unter 25MB.');
  }

  // Get current session for auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Nicht eingeloggt. Bitte melde dich an.');
  }

  // Debug: Check if URL is available
  if (!SUPABASE_URL) {
    throw new Error('SUPABASE_URL nicht konfiguriert');
  }

  // Convert blob to base64
  const arrayBuffer = await audioBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const audioBase64 = btoa(binary);

  // Call Supabase Edge Function
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: audioBase64,
        language: language === 'auto' ? undefined : language,
        mode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    return {
      transcription: result.transcription || '',
      enrichedContent: result.enrichedContent || '',
      tokensUsed: result.tokensUsed || 0,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Transkription fehlgeschlagen: ${message}`);
  }
}

