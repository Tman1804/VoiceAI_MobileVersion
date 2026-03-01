import { supabase } from './supabase';
import { EnrichmentMode, OutputLanguage } from '@/store/appStore';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

  // Get session with auto-refresh if expired
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
      if (payload.exp && payload.exp < now + 60) {
        const { data: refreshData } = await supabase.auth.refreshSession();
        if (refreshData?.session) {
          session = refreshData.session;
        } else {
          throw new Error('Session abgelaufen. Bitte neu einloggen.');
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('abgelaufen')) throw e;
    }
  }

  // Call Supabase Edge Function
  const response = await fetch(`${SUPABASE_URL}/functions/v1/enrich`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': SUPABASE_ANON_KEY,
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
  const labels: Record<EnrichmentMode, string> = { 
    'summarize': 'Summarize', 
    'action-items': 'Extract Action Items', 
    'meeting-notes': 'Meeting Notes', 
    'clean-transcript': 'Clean Transcript', 
    'custom': 'Custom Prompt',
    'email-draft': 'Email',
    'interview': 'Interview'
  };
  return labels[mode];
}

export function getEnrichmentModeDescription(mode: EnrichmentMode): string {
  const descriptions: Record<EnrichmentMode, string> = { 
    'summarize': 'Create a concise summary', 
    'action-items': 'Extract tasks as a list', 
    'meeting-notes': 'Format as meeting notes', 
    'clean-transcript': 'Clean up filler words', 
    'custom': 'Use your own prompt',
    'email-draft': 'Create a professional email',
    'interview': 'Extract insights & action items'
  };
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
