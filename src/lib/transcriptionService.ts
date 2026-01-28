import OpenAI from 'openai';
import { OutputLanguage } from '@/store/appStore';

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function transcribeAudio(
  audioBlob: Blob, 
  apiKey: string, 
  language: OutputLanguage = 'auto',
  translateToEnglish: boolean = false
): Promise<string> {
  if (!apiKey) throw new Error('OpenAI API key is required. Please add it in Settings.');

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const file = new File([audioBlob], 'recording.webm', { type: audioBlob.type || 'audio/webm' });

  if (file.size > 25 * 1024 * 1024) {
    throw new Error('Recording too long. Please keep recordings under 25MB.');
  }

  let lastError: any;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      let response: any;
      
      if (translateToEnglish) {
        // Use translations endpoint to translate to English
        response = await openai.audio.translations.create({ 
          file, 
          model: 'whisper-1',
          response_format: 'text' 
        });
      } else {
        // Use transcriptions endpoint to keep original language
        const options: any = { 
          file, 
          model: 'whisper-1',
          response_format: 'text' 
        };
        
        // If a specific language is set, provide it as a hint to Whisper
        if (language !== 'auto') {
          options.language = language;
        }
        
        response = await openai.audio.transcriptions.create(options);
      }
      
      // Handle both string response and object response
      return typeof response === 'string' ? response : response.text || String(response);
    } catch (error: any) {
      lastError = error;
      if (error?.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key in Settings.');
      }
      if (error?.status === 429) {
        if (attempt < 3) {
          await wait(attempt * 2000);
          continue;
        }
        throw new Error('Rate limit exceeded. Check your usage limits at platform.openai.com/usage');
      }
      throw new Error('Transcription failed: ' + (error?.message || 'Unknown error'));
    }
  }
  throw new Error('Transcription failed after retries: ' + (lastError?.message || 'Unknown'));
}
