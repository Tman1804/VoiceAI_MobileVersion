# VoxWarp Backend Setup Guide

## 🚨 Wichtig: API Key Format prüfen

Der Key, den du mir gegeben hast (`sb_publishable_...`) sieht nach einem **Stripe Key** aus, nicht nach einem Supabase Key.

**Supabase Keys sehen so aus:**
- `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT-Format)

**Bitte überprüfen:**
1. Geh zu: https://supabase.com/dashboard
2. Wähle dein Projekt
3. Settings → API
4. Kopiere den `anon` `public` Key (beginnt mit `eyJ...`)

---

## Schritt 1: Database Schema anlegen

1. Geh zu Supabase → SQL Editor
2. Klicke "New Query"
3. Kopiere den gesamten Inhalt aus `supabase/schema.sql`
4. Klicke "Run"

---

## Schritt 2: OpenAI API Key als Secret speichern

1. Geh zu: Project Settings → Edge Functions
2. Unter "Secrets" klicke "Add new secret"
3. Name: `OPENAI_API_KEY`
4. Value: Dein OpenAI API Key (sk-...)

---

## Schritt 3: Edge Function deployen

Du brauchst die Supabase CLI. Installieren:

```bash
npm install -g supabase
```

Dann in deinem Projekt-Ordner:

```bash
# Login
supabase login

# Link to your project (du findest die Project ID in den Settings)
supabase link --project-ref mkjorwwmsmovymtuniyy

# Deploy function
supabase functions deploy transcribe
```

---

## Schritt 4: App-Credentials updaten

In `.env.local` sicherstellen, dass die richtigen Werte stehen:

```env
NEXT_PUBLIC_SUPABASE_URL=https://mkjorwwmsmovymtuniyy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # <-- Richtiger Key!
```

---

## Schritt 5: Dependencies installieren

```bash
npm install
# oder
pnpm install
```

---

## Schritt 6: Testen

```bash
npm run dev
```

1. App öffnen
2. Registrieren mit Email
3. Email bestätigen (Check Spam!)
4. Einloggen
5. Aufnahme machen

---

## Fehlerbehebung

### "Invalid API key"
→ Falscher Supabase Key in `.env.local`

### "Function not found"
→ Edge Function nicht deployed, siehe Schritt 3

### "Token-Limit erreicht"
→ Trial verbraucht (2500 Tokens = ~5 Min)

### Email kommt nicht an
→ Supabase Free Tier limitiert Emails. Check Spam oder aktiviere Custom SMTP in den Auth Settings.

---

## Preisstruktur (zur Erinnerung)

| Plan | Tokens | ≈ Minuten | Preis |
|------|--------|-----------|-------|
| Trial | 2.500 | ~5 Min | €0 (einmalig) |
| Pro | 50.000 | ~100 Min | €6.99/Mo |
