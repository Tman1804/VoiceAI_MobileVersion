// VoxWarp Enrichment Edge Function
// Deploy: supabase functions deploy enrich

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    const { transcript, mode, language } = await req.json()
    
    if (!transcript) {
      throw new Error('Transcript fehlt')
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

    const currentUsage = usage || { tokens_used: 0, tokens_limit: 2500, plan: 'trial' }
    
    // Unlimited überprüfen
    if (currentUsage.plan !== 'unlimited' && currentUsage.tokens_used >= currentUsage.tokens_limit) {
      throw new Error('Token-Limit erreicht. Bitte upgrade deinen Plan.')
    }

    // Prüfen ob genug Tokens
    if (currentUsage.plan !== 'unlimited' && 
        currentUsage.tokens_used + TOKENS_PER_ENRICHMENT > currentUsage.tokens_limit) {
      throw new Error(`Nicht genug Tokens. Benötigt: ~${TOKENS_PER_ENRICHMENT}, Verfügbar: ${currentUsage.tokens_limit - currentUsage.tokens_used}`)
    }

    // 4. GPT Enrichment
    const systemPrompts: Record<string, string> = {
      'clean-transcript': 'Bereinige das folgende Transkript. Entferne Füllwörter, korrigiere Grammatik und formatiere in Absätze. Behalte die ursprüngliche Bedeutung bei.',
      'summarize': 'Fasse den folgenden Text prägnant zusammen. Behalte die wichtigsten Punkte bei.',
      'action-items': 'Extrahiere alle Aufgaben und Action Items aus dem Text als Liste.',
      'meeting-notes': 'Formatiere den Text als strukturierte Meeting-Notizen mit Überschriften, Teilnehmern falls erwähnt, Agenda-Punkten und Entscheidungen.',
    }

    const languageInstructions: Record<string, string> = {
      'de': 'Antworte auf Deutsch.',
      'en': 'Respond in English.',
      'fr': 'Réponds en français.',
      'es': 'Responde en español.',
      'it': 'Rispondi in italiano.',
      'pt': 'Responda em português.',
      'nl': 'Antwoord in het Nederlands.',
      'pl': 'Odpowiedz po polsku.',
      'ru': 'Отвечай на русском.',
      'ja': '日本語で回答してください。',
      'zh': '请用中文回答。',
      'ko': '한국어로 답변해 주세요.',
    }

    const basePrompt = systemPrompts[mode] || systemPrompts['clean-transcript']
    const langInstruction = language && language !== 'auto' ? languageInstructions[language] || '' : 'Antworte in der gleichen Sprache wie der Input.'
    const fullPrompt = `${basePrompt}\n\n${langInstruction}`

    const enrichResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: fullPrompt },
          { role: 'user', content: transcript },
        ],
        max_tokens: 2000,
      }),
    })

    if (!enrichResponse.ok) {
      const error = await enrichResponse.json()
      throw new Error(error.error?.message || 'Verarbeitung fehlgeschlagen')
    }

    const enrichData = await enrichResponse.json()
    const enrichedContent = enrichData.choices?.[0]?.message?.content || ''

    // 5. Usage aktualisieren
    if (usage) {
      await supabase
        .from('user_usage')
        .update({ tokens_used: currentUsage.tokens_used + TOKENS_PER_ENRICHMENT })
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('user_usage')
        .insert({ user_id: user.id, tokens_used: TOKENS_PER_ENRICHMENT, tokens_limit: 2500, plan: 'trial' })
    }

    // Usage History loggen
    await supabase
      .from('usage_history')
      .insert({ user_id: user.id, tokens_used: TOKENS_PER_ENRICHMENT, action: 'enrichment' })

    // 6. Response
    return new Response(
      JSON.stringify({
        enrichedContent,
        tokensUsed: TOKENS_PER_ENRICHMENT,
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
