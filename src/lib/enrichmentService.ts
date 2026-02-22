import { supabase } from './supabase';
import { EnrichmentMode, OutputLanguage } from '@/store/appStore';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export interface EnrichmentResult {
  enrichedContent: string;
  tokensUsed: number;
}

export async function enrichTranscript(
  transcript: string,
  mode: EnrichmentMode,
  outputLanguage: OutputLanguage = 'auto'
): Promise<EnrichmentResult> {
  if (!transcript.trim()) throw new Error('Kein Text zum Verarbeiten.');

  // Get current session for auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Nicht eingeloggt. Bitte melde dich an.');
  }

  // Call Supabase Edge Function
  const response = await fetch(`${SUPABASE_URL}/functions/v1/enrich`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transcript,
      mode,
      language: outputLanguage === 'auto' ? undefined : outputLanguage,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Verarbeitung fehlgeschlagen');
  }

  const result = await response.json();
  
  return {
    enrichedContent: result.enrichedContent || '',
    tokensUsed: result.tokensUsed || 0,
  };
}

export function getEnrichmentModeLabel(mode: EnrichmentMode): string {
  const labels: Record<EnrichmentMode, string> = { 'summarize': 'Summarize', 'action-items': 'Extract Action Items', 'meeting-notes': 'Meeting Notes', 'clean-transcript': 'Clean Transcript', 'custom': 'Custom Prompt' };
  return labels[mode];
}

export function getEnrichmentModeDescription(mode: EnrichmentMode): string {
  const descriptions: Record<EnrichmentMode, string> = { 'summarize': 'Create a concise summary', 'action-items': 'Extract tasks as a list', 'meeting-notes': 'Format as meeting notes', 'clean-transcript': 'Clean up filler words', 'custom': 'Use your own prompt' };
  return descriptions[mode];
}

export function getLanguageLabel(language: OutputLanguage): string {
  const labels: Record<OutputLanguage, string> = {
    'auto': 'Auto (Same as input)',
    'de': 'Deutsch',
    'en': 'English',
    'fr': 'Francais',
    'es': 'Espanol',
    'it': 'Italiano',
    'pt': 'Portugues',
    'nl': 'Nederlands',
    'pl': 'Polski',
    'ru': 'Russian',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'ko': 'Korean',
  };
  return labels[language];
}
