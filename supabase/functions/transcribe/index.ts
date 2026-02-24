// VoxWarp Transcription Edge Function
// Deploy: supabase functions deploy transcribe

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Token costs (approximate)
const TOKENS_PER_MINUTE = 500
const TOKENS_PER_ENRICHMENT = 200

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Auth prüfen
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Nicht authentifiziert')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // User aus Token extrahieren
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Ungültiger Token')
    }

    // 2. Request Body parsen
    const { audio, language, mode } = await req.json()
    
    if (!audio) {
      throw new Error('Audio fehlt')
    }

    // 3. Usage prüfen
    const { data: usage, error: usageError } = await supabase
      .from('user_usage')
      .select('tokens_used, tokens_limit, plan')
      .eq('user_id', user.id)
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      throw new Error('Fehler beim Laden der Nutzungsdaten')
    }

    const currentUsage = usage || { tokens_used: 0, tokens_limit: 5000, plan: 'trial' }
    
    // Unlimited überprüfen
    if (currentUsage.plan !== 'unlimited' && currentUsage.tokens_used >= currentUsage.tokens_limit) {
      throw new Error('Token-Limit erreicht. Bitte upgrade deinen Plan.')
    }

    // 4. Audio zu Blob konvertieren
    const binaryString = atob(audio)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const audioBlob = new Blob([bytes], { type: 'audio/webm' })

    // Audio-Dauer schätzen (grob: 1MB ≈ 1 Minute für webm)
    const estimatedMinutes = Math.max(1, Math.ceil(audioBlob.size / (1024 * 1024)))
    const estimatedTokens = estimatedMinutes * TOKENS_PER_MINUTE + TOKENS_PER_ENRICHMENT

    // Prüfen ob genug Tokens
    if (currentUsage.plan !== 'unlimited' && 
        currentUsage.tokens_used + estimatedTokens > currentUsage.tokens_limit) {
      throw new Error(`Nicht genug Tokens. Benötigt: ~${estimatedTokens}, Verfügbar: ${currentUsage.tokens_limit - currentUsage.tokens_used}`)
    }

    // 5. OpenAI Whisper aufrufen
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.webm')
    formData.append('model', 'whisper-1')
    if (language && language !== 'auto') {
      formData.append('language', language)
    }

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    })

    if (!whisperResponse.ok) {
      const error = await whisperResponse.json()
      throw new Error(error.error?.message || 'Transkription fehlgeschlagen')
    }

    const { text: transcription } = await whisperResponse.json()

    // 6. GPT Enrichment
    let enrichedContent = ''
    
    const systemPrompts: Record<string, string> = {
      'clean-transcript': 'Bereinige das folgende Transkript. Entferne Füllwörter wie "ähm", "äh", "also", korrigiere Grammatik und formatiere den Text in gut lesbare Absätze. Behalte die ursprüngliche Bedeutung bei.',
      'summarize': 'Fasse den folgenden Text prägnant zusammen. Behalte die wichtigsten Punkte bei.',
      'action-items': 'Extrahiere alle Aufgaben und Action Items aus dem Text als Liste.',
      'meeting-notes': 'Formatiere den Text als strukturierte Meeting-Notizen mit Überschriften, Teilnehmern falls erwähnt, Agenda-Punkten und Entscheidungen.',
    }

    const selectedPrompt = systemPrompts[mode] || systemPrompts['clean-transcript']

    const enrichResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: selectedPrompt },
          { role: 'user', content: transcription },
        ],
        max_tokens: 2000,
      }),
    })

    if (enrichResponse.ok) {
      const enrichData = await enrichResponse.json()
      enrichedContent = enrichData.choices?.[0]?.message?.content || ''
    }

    // 7. Usage aktualisieren
    const tokensUsed = estimatedTokens

    if (usage) {
      await supabase
        .from('user_usage')
        .update({ tokens_used: currentUsage.tokens_used + tokensUsed })
        .eq('user_id', user.id)
    } else {
      // Neuer User - Trial mit 5000 Tokens
      await supabase
        .from('user_usage')
        .insert({ user_id: user.id, tokens_used: tokensUsed, tokens_limit: 5000, plan: 'trial' })
    }

    // Usage History loggen
    await supabase
      .from('usage_history')
      .insert({ user_id: user.id, tokens_used: tokensUsed, action: 'transcription' })

    // 8. Response
    return new Response(
      JSON.stringify({
        transcription,
        enrichedContent,
        tokensUsed,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten'
    return new Response(
      JSON.stringify({ message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
