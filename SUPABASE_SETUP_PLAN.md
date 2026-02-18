# Supabase Backend Integration Plan

## Status: IN PROGRESS

## Was bereits erledigt ist ✅

### 1. Frontend-Code (fertig)
- `src/lib/supabase.ts` - Supabase Client + API Funktionen
- `src/store/authStore.ts` - Auth State Management
- `src/components/AuthScreen.tsx` - Login/Signup UI (Deutsch)
- `src/components/UsageDisplay.tsx` - Token-Anzeige mit Progress Bar
- `src/app/page.tsx` - Integriert Auth-Check und Usage Display
- `package.json` - @supabase/supabase-js Dependency hinzugefügt

### 2. Supabase Konfiguration
- `.env.local` erstellt mit:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://mkjorwwmsmovymtuniyy.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<dein-key>
  ```

### 3. Datenbank Schema (SQL bereits ausgeführt)
- `supabase/schema.sql` - Tabellen user_usage und usage_history
- Schema wurde im Supabase Dashboard ausgeführt ✅

### 4. OpenAI Key als Secret gespeichert ✅
- OPENAI_API_KEY ist in Supabase Secrets gespeichert

---

## Was noch zu tun ist ❌

### 1. Edge Function deployen

Die Edge Function muss manuell im Supabase Dashboard deployed werden:

1. Gehe zu: https://supabase.com/dashboard
2. Wähle Projekt: mkjorwwmsmovymtuniyy
3. Links: **Edge Functions**
4. Klicke **"Create a new function"**
5. Name: `transcribe`
6. Kopiere den Code unten rein
7. Klicke **Deploy**

### 2. npm install ausführen
```bash
npm install
```
(Benötigt Node.js - aktuell nicht installiert auf dem System)

### 3. App testen
```bash
npm run tauri:dev
```

---

## Edge Function Code (zum Kopieren in Supabase Dashboard)

```typescript
// VoxWarp Transcription Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TOKENS_PER_MINUTE = 500
const TOKENS_PER_ENRICHMENT = 200

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Nicht authentifiziert')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Ungültiger Token')
    }

    const { audio, language, mode } = await req.json()
    
    if (!audio) {
      throw new Error('Audio fehlt')
    }

    const { data: usage, error: usageError } = await supabase
      .from('user_usage')
      .select('tokens_used, tokens_limit, plan')
      .eq('user_id', user.id)
      .single()

    if (usageError && usageError.code !== 'PGRST116') {
      throw new Error('Fehler beim Laden der Nutzungsdaten')
    }

    const currentUsage = usage || { tokens_used: 0, tokens_limit: 2500, plan: 'trial' }
    
    if (currentUsage.plan !== 'unlimited' && currentUsage.tokens_used >= currentUsage.tokens_limit) {
      throw new Error('Token-Limit erreicht. Bitte upgrade deinen Plan.')
    }

    const binaryString = atob(audio)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    const audioBlob = new Blob([bytes], { type: 'audio/webm' })

    const estimatedMinutes = Math.max(1, Math.ceil(audioBlob.size / (1024 * 1024)))
    const estimatedTokens = estimatedMinutes * TOKENS_PER_MINUTE + TOKENS_PER_ENRICHMENT

    if (currentUsage.plan !== 'unlimited' && 
        currentUsage.tokens_used + estimatedTokens > currentUsage.tokens_limit) {
      throw new Error(`Nicht genug Tokens. Benötigt: ~${estimatedTokens}, Verfügbar: ${currentUsage.tokens_limit - currentUsage.tokens_used}`)
    }

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

    let enrichedContent = ''
    
    if (mode && mode !== 'clean-transcript') {
      const systemPrompts: Record<string, string> = {
        'summarize': 'Fasse den folgenden Text prägnant zusammen. Behalte die wichtigsten Punkte bei.',
        'action-items': 'Extrahiere alle Aufgaben und Action Items aus dem Text als Liste.',
        'meeting-notes': 'Formatiere den Text als strukturierte Meeting-Notizen mit Überschriften, Teilnehmern falls erwähnt, Agenda-Punkten und Entscheidungen.',
      }

      const enrichResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompts[mode] || 'Verbessere und formatiere den Text.' },
            { role: 'user', content: transcription },
          ],
          max_tokens: 2000,
        }),
      })

      if (enrichResponse.ok) {
        const enrichData = await enrichResponse.json()
        enrichedContent = enrichData.choices?.[0]?.message?.content || ''
      }
    }

    const tokensUsed = estimatedTokens

    if (usage) {
      await supabase
        .from('user_usage')
        .update({ tokens_used: currentUsage.tokens_used + tokensUsed })
        .eq('user_id', user.id)
    } else {
      await supabase
        .from('user_usage')
        .insert({ user_id: user.id, tokens_used: tokensUsed, tokens_limit: 2500, plan: 'trial' })
    }

    await supabase
      .from('usage_history')
      .insert({ user_id: user.id, tokens_used: tokensUsed, action: 'transcription' })

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
```

---

## Hinweise zur Edge Function

- **Deno.land Imports**: Supabase Edge Functions laufen auf Deno (nicht Node.js). Die `https://deno.land/...` Imports sind korrekt und werden von Supabase automatisch aufgelöst.
- **SUPABASE_URL** und **SUPABASE_SERVICE_ROLE_KEY**: Werden automatisch von Supabase bereitgestellt
- **OPENAI_API_KEY**: Muss als Secret in Supabase gesetzt sein (bereits erledigt)

---

## Pricing Modell

| Plan | Tokens | Preis | Entspricht ca. |
|------|--------|-------|----------------|
| Trial | 2.500 | Gratis | ~5 Minuten Audio |
| Pro | 50.000 | €6,99/Monat | ~100 Minuten Audio |

Token-Berechnung: ~500 Tokens pro Minute (Whisper + GPT-4o-mini)

---

## Supabase Credentials

- **Projekt URL**: https://mkjorwwmsmovymtuniyy.supabase.co
- **Projekt Ref**: mkjorwwmsmovymtuniyy
- **Anon Key**: (in .env.local gespeichert)

---

## Nächste Schritte nach Edge Function Deploy

1. Node.js installieren: https://nodejs.org/
2. `npm install` ausführen
3. `npm run tauri:dev` zum Testen
4. Login testen → Transkription testen
5. Payment Integration hinzufügen (Stripe für Pro Plan)
