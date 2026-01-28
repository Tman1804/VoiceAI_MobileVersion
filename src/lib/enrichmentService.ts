import OpenAI from 'openai';
import { EnrichmentMode, OutputLanguage } from '@/store/appStore';

const ENRICHMENT_PROMPTS: Record<Exclude<EnrichmentMode, 'custom'>, string> = {
  'summarize': 'Summarize the following transcript concisely, capturing the main points and key information.',
  'action-items': 'Extract all action items, tasks, and to-dos from the following transcript as a numbered list.',
  'meeting-notes': 'Convert the following transcript into well-structured meeting notes with summary, key points, decisions, and action items.',
  'clean-transcript': 'Clean up the following transcript by removing filler words, fixing grammar, and breaking into paragraphs. Maintain the original meaning.',
};

const LANGUAGE_NAMES: Record<OutputLanguage, string> = {
  'auto': 'the same language as the input',
  'de': 'German',
  'en': 'English',
  'fr': 'French',
  'es': 'Spanish',
  'it': 'Italian',
  'pt': 'Portuguese',
  'nl': 'Dutch',
  'pl': 'Polish',
  'ru': 'Russian',
  'ja': 'Japanese',
  'zh': 'Chinese',
  'ko': 'Korean',
};

function getLanguageInstruction(language: OutputLanguage): string {
  if (language === 'auto') {
    return 'Respond in the same language as the transcript.';
  }
  return 'Respond in ' + LANGUAGE_NAMES[language] + '.';
}

export async function enrichTranscript(
  transcript: string, 
  apiKey: string, 
  mode: EnrichmentMode, 
  customPrompt?: string,
  outputLanguage: OutputLanguage = 'auto'
): Promise<string> {
  if (!apiKey) throw new Error('OpenAI API key is required. Please add it in Settings.');
  if (!transcript.trim()) throw new Error('No transcript to enrich.');

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const basePrompt = mode === 'custom' && customPrompt ? customPrompt : ENRICHMENT_PROMPTS[mode as Exclude<EnrichmentMode, 'custom'>];
  const languageInstruction = getLanguageInstruction(outputLanguage);
  const systemPrompt = basePrompt + '\n\n' + languageInstruction;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: transcript }],
      temperature: 0.3,
      max_tokens: 2000,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response received from AI');
    return content;
  } catch (error: any) {
    if (error?.status === 401) throw new Error('Invalid API key.');
    if (error?.status === 429) throw new Error('Rate limit exceeded.');
    throw new Error('Enrichment failed: ' + (error?.message || 'Unknown error'));
  }
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
