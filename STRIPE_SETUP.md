# Stripe Integration Setup

## Übersicht

| Plan | Tokens | Preis |
|------|--------|-------|
| Trial | 5.000 | Gratis |
| Pro | 50.000 | €6,99/Mo |

---

## 1. Stripe Account erstellen

1. Gehe zu https://dashboard.stripe.com/register
2. Account erstellen (E-Mail, Passwort)
3. Business-Informationen ausfüllen

## 2. Stripe Product & Price erstellen

### Im Stripe Dashboard:

1. **Products** → **Add Product**
2. Name: `VoxWarp Pro`
3. Description: `50.000 Tokens pro Monat für Transkriptionen`
4. **Add Pricing**:
   - Recurring
   - €6,99 / month
   - Currency: EUR
5. **Save Product**

### Price ID kopieren:
- Klicke auf den erstellten Price
- Kopiere die **Price ID** (z.B. `price_1ABC123...`)

## 3. Stripe Keys holen

### Im Stripe Dashboard:
1. **Developers** → **API keys**
2. Kopiere:
   - **Publishable key**: `pk_test_...` oder `pk_live_...`
   - **Secret key**: `sk_test_...` oder `sk_live_...`

## 4. Webhook einrichten

### Im Stripe Dashboard:
1. **Developers** → **Webhooks**
2. **Add endpoint**
3. URL: `https://mkjorwwmsmovymtuniyy.supabase.co/functions/v1/stripe-webhook`
4. Events auswählen:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. **Add endpoint**
6. Kopiere den **Signing secret** (z.B. `whsec_...`)

## 5. Secrets in Supabase speichern

### Im Supabase Dashboard:
1. **Project Settings** → **Edge Functions**
2. **Secrets** → **Add new secret**

Füge hinzu:
```
STRIPE_SECRET_KEY = sk_test_...
STRIPE_PRICE_ID = price_1ABC123...
STRIPE_WEBHOOK_SECRET = whsec_...
```

## 6. Database Schema ausführen

Im Supabase SQL Editor (`supabase/subscriptions_schema.sql`):

```sql
-- Führe den Inhalt von subscriptions_schema.sql aus
```

## 7. Edge Functions deployen

```bash
# Falls Supabase CLI installiert:
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook

# ODER manuell im Dashboard kopieren:
# - supabase/functions/create-checkout/index.ts
# - supabase/functions/stripe-webhook/index.ts
```

## 8. Existierende transcribe Function updaten

Die `transcribe` Function wurde bereits auf 5000 Trial-Tokens angepasst.
Re-deploye sie im Dashboard oder via CLI.

---

## Testen

### Test-Kreditkarten:
- Erfolg: `4242 4242 4242 4242`
- Ablehnung: `4000 0000 0000 0002`
- 3D Secure: `4000 0000 0000 3220`

### Test-Flow:
1. App öffnen → Login
2. Tokens verbrauchen bis >80%
3. "Upgrade" Button erscheint
4. Klick → Stripe Checkout öffnet
5. Test-Karte eingeben
6. Nach Erfolg: Plan = Pro, Tokens = 50.000

---

## Zahlungsmethoden aktivieren

Im Stripe Dashboard unter **Settings** → **Payment methods**:
- ✅ Cards (Standard)
- ✅ Apple Pay
- ✅ Google Pay
- ⬜ PayPal (optional, +0.5% Gebühren)
- ⬜ SEPA Lastschrift (optional)
- ⬜ Klarna (optional)

---

## Deep Links für Mobile

Die App nutzt diese Deep Links:
- `voxwarp://payment-success` - Nach erfolgreicher Zahlung
- `voxwarp://payment-cancel` - Bei Abbruch

Diese müssen im Tauri Config registriert sein (bereits in `tauri.conf.json`).

---

## Kosten-Übersicht

### Stripe Gebühren:
- 1.5% + €0.25 pro Transaktion (EU Karten)
- 2.9% + €0.25 (Non-EU Karten)

### Bei €6,99/Monat:
- Stripe Gebühren: ~€0.35
- Netto pro User: ~€6,64

### OpenAI Kosten bei 50.000 Tokens (~70 Min Audio):
- Whisper: ~$0.42
- GPT-4o-mini: ~$0.02
- **Total: ~$0.44 (~€0.40)**

### Marge pro Pro User:
**~€6,24/Monat**
